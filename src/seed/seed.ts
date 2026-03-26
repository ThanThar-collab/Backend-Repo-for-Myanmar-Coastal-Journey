import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import path from 'path';
import { readFile } from 'fs/promises';

import connectDB from '../database/connectdb';
import { City } from '../models/cityModel';
import { Region } from '../models/regionModel';
import { Beach } from '../models/beachModel';
import { Route } from '../models/routeModel';
import { Bus } from '../models/busModel';
import { Ticket } from '../models/busTicketModel';
import { Restaurant } from '../models/restaurantModel';
import { Food } from '../models/foodModel';
import { Show } from '../models/busBookingShowModel';
import { generateSeatLayout } from '../lib/busSeatIndex';

const toBool = (v: string | undefined) => v?.toLowerCase() === 'true';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

const uniqueBy = <T>(items: T[], key: (t: T) => string) => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
};

const cityNamePool = uniqueBy(
  [
    'Yangon',
    'Mandalay',
    'Naypyitaw'
  ],
  (s) => s.toLowerCase()
);

const regionNamePool = uniqueBy(
  [
    'Ayeyarwady',
    'Rakhine',
    'Tanintharyi',
    
  ],
  (s) => s.toLowerCase()
);

const beachNamePool = uniqueBy(
  [
    'Chaung Thar',
    'Ngwe Saung',
    'Goyangyi',
    'Ngapali',
    'Sittwe',
    'Gwa',
    'Kyeintali',
    'Kantharyar',
    'Nabule',
    'Pa Nyint',
    'Grandfather Beach',
    'Maungmagan',
    'Boulder Bay Island',
    'Naung Oo Phee',
    'Paradise Beach'
  ],
  (s) => s.toLowerCase()
);

type RouteKey = `${string}__${string}`; // `${sourceCity}__${beach}`
const routeKey = (sourceCity: string, beach: string): RouteKey =>
  `${sourceCity.trim()}__${beach.trim()}`;

type RouteMetrics = { distanceMiles: number; durationMins: number };

type SeedTicketPriceSnapshot = Record<
  RouteKey,
  {
    localMMK: number;
    foreignerMMK?: number;
  }
>;

type SeedRouteMetricsSnapshot = Record<
  RouteKey,
  {
    distanceMiles: number;
    durationMins: number;
    source?: 'google-maps';
    updatedAtISO?: string;
  }
>;

type SeedFoodPriceSnapshot = Record<
  string, // food name
  {
    minMMK: number;
    maxMMK: number;
  }
>;

async function tryReadJSON<T>(relativePathFromSeedDir: string): Promise<T | null> {
  try {
    const abs = path.resolve(__dirname, relativePathFromSeedDir);
    const raw = await readFile(abs, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Ticket price heuristic (MMK) inspired by typical Myanmar intercity bus fares
 * shown on portals like mmbusticket.com. We model it mainly from distance,
 * then add small variance and foreigner uplift.
 */
function estimateTicketPriceMMK(distanceMiles: number, isForeigner: boolean) {
  // ~70–140 MMK per mile baseline, plus a fixed boarding fee.
  const perMile = faker.number.int({ min: 70, max: 140 });
  const base = 4000;
  const variance = faker.number.int({ min: -1500, max: 2500 });
  const raw = base + distanceMiles * perMile + variance;
  const uplift = isForeigner ? 1.1 : 1;
  // Clamp to reasonable band and round to 500 kyat.
  return roundTo(clamp(Math.round(raw * uplift), 6000, 65000), 500);
}

/**
 * Food price heuristic (MMK) inspired by common Foodpanda menu pricing in Myanmar.
 */
function estimateFoodPriceMMK() {
  const bands = [
    { min: 1500, max: 3500 }, // snacks / drinks
    { min: 3000, max: 7000 }, // basic dishes
    { min: 6000, max: 13000 }, // premium dishes
  ];
  const band = faker.helpers.weightedArrayElement([
    { weight: 4, value: bands[0] },
    { weight: 5, value: bands[1] },
    { weight: 2, value: bands[2] },
  ]);
  return roundTo(faker.number.int({ min: band.min, max: band.max }), 100);
}

async function main() {
  const shouldDrop = process.env.SEED_DROP ? toBool(process.env.SEED_DROP) : true;
  const seedDays = Number(process.env.SEED_DAYS ?? 14);
  const departureTimes = ['08:00', '17:00'] as const;
  const busSeats = 44; // system constraint: 2+2 express (11 rows x 4)

  const [priceSnapshot, routeMetricsSnapshot, foodPriceSnapshot] = await Promise.all([
    tryReadJSON<SeedTicketPriceSnapshot>('data/ticketPrices.mmbusticket.snapshot.json'),
    tryReadJSON<SeedRouteMetricsSnapshot>('data/routeMetrics.googlemaps.snapshot.json'),
    tryReadJSON<SeedFoodPriceSnapshot>('data/foodPrices.foodpanda.snapshot.json'),
  ]);

  await connectDB();

  if (shouldDrop) {
    await Promise.all([
      City.deleteMany({}),
      Region.deleteMany({}),
      Beach.deleteMany({}),
      Route.deleteMany({}),
      Bus.deleteMany({}),
      Ticket.deleteMany({}),
      Restaurant.deleteMany({}),
      Food.deleteMany({}),
      Show.deleteMany({}),
    ]);
  }

  // Cities
  const cityDocs = await City.insertMany(cityNamePool.map((cityName) => ({ cityName })));

  // Regions
  const regionDocs = await Region.insertMany(regionNamePool.map((regionName) => ({ regionName })));

  // Beaches - attach random region (kept simple unless you want a strict mapping)
  const beachDocs = await Beach.insertMany(
    beachNamePool.map((beachName) => ({
      beachName,
      region: faker.helpers.arrayElement(regionDocs)._id,
      currentSafe: faker.datatype.boolean({ probability: 0.85 }),
      imageUrl: [
        // Use placeholder but valid URLs (keeps Zod url() validation happy)
        `https://picsum.photos/seed/${encodeURIComponent(beachName)}-1/800/600`,
        `https://picsum.photos/seed/${encodeURIComponent(beachName)}-2/800/600`,
      ],
    }))
  );

  // Routes: ALL city -> beach combinations (requirement-driven)
  // Distance/duration:
  // - Prefer Google Maps snapshot if provided (routeMetrics.googlemaps.snapshot.json)
  // - Otherwise use a safe heuristic so the seed still runs without API keys/snapshots.
  const routesToCreate: Array<{ source: any; destination: any; duration: number; distance: number }> = [];
  for (const city of cityDocs as any[]) {
    for (const beach of beachDocs as any[]) {
      const key = routeKey(city.cityName, beach.beachName);
      const metrics = routeMetricsSnapshot?.[key];
      const distanceMiles = metrics?.distanceMiles ?? faker.number.int({ min: 60, max: 520 });
      const durationMins =
        metrics?.durationMins ??
        faker.number.int({
          min: Math.round(distanceMiles * 1.8),
          max: Math.round(distanceMiles * 2.6),
        });
      routesToCreate.push({
        source: city._id,
        destination: beach._id,
        duration: durationMins,
        distance: distanceMiles,
      });
    }
  }
  const routeDocs = await Route.insertMany(routesToCreate);

  // Buses: EXACTLY 2 per route (08:00 + 17:00), EXACTLY 44 seats (2+2 express)
  const busDocs = await Bus.insertMany(
    routeDocs.flatMap((r: any) =>
      departureTimes.map((departureTime) => ({
        route: r._id,
        noOfSeats: busSeats,
        departureTime,
        isAvailable: true,
      }))
    )
  );

  // Tickets + Shows
  // For each bus, create tickets for the next N days (env: SEED_DAYS, default 14).
  const routeById = new Map(routeDocs.map((r: any) => [r._id.toString(), r]));
  const cityById = new Map(cityDocs.map((c: any) => [c._id.toString(), c]));
  const beachById = new Map(beachDocs.map((b: any) => [b._id.toString(), b]));

  const ticketsToCreate: any[] = [];
  for (const bus of busDocs as any[]) {
    const route = routeById.get(bus.route.toString()) as any;
    const city = cityById.get(route.source.toString()) as any;
    const beach = beachById.get(route.destination.toString()) as any;
    const key = routeKey(city.cityName, beach.beachName);
    const snap = priceSnapshot?.[key];
    const localMMK = snap?.localMMK ?? estimateTicketPriceMMK(route.distance, false);
    const foreignerMMK = snap?.foreignerMMK ?? estimateTicketPriceMMK(route.distance, true);

    const days = Number.isFinite(seedDays) && seedDays > 0 ? Math.floor(seedDays) : 14;
    for (let d = 0; d < days; d++) {
      const departureDate = faker.date.soon({ days: d + 1 });
      // Local ticket
      ticketsToCreate.push({
        ticketName: `Ticket ${city.cityName} → ${beach.beachName} (${bus.departureTime})`,
        busId: bus._id,
        source: city.cityName,
        destination: beach.beachName,
        departureDate,
        ticketPrice: localMMK,
        noOfPassenger: faker.number.int({ min: 1, max: 4 }),
        isForeigner: false,
      });
      // Foreigner ticket
      ticketsToCreate.push({
        ticketName: `Ticket ${city.cityName} → ${beach.beachName} (${bus.departureTime})`,
        busId: bus._id,
        source: city.cityName,
        destination: beach.beachName,
        departureDate,
        ticketPrice: foreignerMMK,
        noOfPassenger: faker.number.int({ min: 1, max: 4 }),
        isForeigner: true,
      });
    }
  }

  const ticketDocs = await Ticket.insertMany(ticketsToCreate);

  const showsToCreate = ticketDocs.map((t: any) => {
    const bus = busDocs.find((b: any) => b._id.equals(t.busId)) as any;
    return {
      bus: t.busId,
      ticket: t._id,
      departureTime: bus?.departureTime ?? '08:00',
      price: t.ticketPrice,
      seatLayout: generateSeatLayout(t.ticketPrice),
    };
  });
  await Show.insertMany(showsToCreate);

  // Restaurants: exactly 4 for EACH beach
  const restaurantsToCreate: any[] = [];
  for (const beach of beachDocs as any[]) {
    const beachRegion =
      regionDocs.find((r: any) => r._id.equals(beach.region)) ?? faker.helpers.arrayElement(regionDocs);
    for (let idx = 0; idx < 4; idx++) {
      restaurantsToCreate.push({
        restaurantName: `${beach.beachName} Restaurant ${idx + 1}`,
        region: beachRegion._id,
        beach: beach._id,
        phone: faker.phone.number(),
      });
    }
  }
  const restaurantDocs = await Restaurant.insertMany(restaurantsToCreate);

  // Foods: 20 per restaurant (=> 80 foods per beach)
  const foodNamePool = [
    'Fried Rice',
    'Shan Noodles',
    'Mohinga',
    'Tea Leaf Salad',
    'Grilled Fish',
    'Chicken Curry',
    'Pork Curry',
    'Seafood Soup',
    'Fried Noodles',
    'Hot Pot Set',
    'BBQ Skewers',
    'Coconut Rice',
    'Burmese Salad',
    'Spring Rolls',
    'Fresh Juice',
    'Milk Tea',
    'Coffee',
    'Dessert',
    'Seafood Platter',
    'Fried Prawns',
  ];
  const foodsToCreate: any[] = [];
  for (const r of restaurantDocs as any[]) {
    for (let i = 0; i < 20; i++) {
      const baseName = faker.helpers.arrayElement(foodNamePool);
      const band = foodPriceSnapshot?.[baseName];
      const price =
        band != null
          ? roundTo(faker.number.int({ min: band.minMMK, max: band.maxMMK }), 100)
          : estimateFoodPriceMMK();
      foodsToCreate.push({
        restaurant: r._id,
        foodName: `${baseName} (${i + 1})`,
        foodPrice: price,
      });
    }
  }
  await Food.insertMany(foodsToCreate);

  // eslint-disable-next-line no-console
  console.log('Seed completed successfully');
  // eslint-disable-next-line no-console
  console.log({
    cities: cityDocs.length,
    regions: regionDocs.length,
    beaches: beachDocs.length,
    routes: routeDocs.length,
    buses: busDocs.length,
    tickets: ticketDocs.length,
    shows: showsToCreate.length,
    restaurants: restaurantDocs.length,
    foods: foodsToCreate.length,
    departuresPerRoute: departureTimes.length,
    busSeats,
    seedDays,
    usedTicketPriceSnapshot: Boolean(priceSnapshot),
    usedRouteMetricsSnapshot: Boolean(routeMetricsSnapshot),
    usedFoodPriceSnapshot: Boolean(foodPriceSnapshot),
  });

  await mongoose.disconnect();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try {
    await mongoose.disconnect();
  } finally {
    process.exit(1);
  }
});

