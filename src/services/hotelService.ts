import { Hotel } from '../models/hotelModel';
import { Beach } from '../models/beachModel';
import { Room } from '../models/roomModel';
import type { CreateHotelInput, UpdateHotelInput } from '../validations/hotelSchema';
import type { PaginationQuery } from '../validations/commonSchema';

export const createHotelService = async (data: CreateHotelInput) => {
  const hotel = new Hotel({
    hotelName: data.hotelName,
    beach: data.beach,
    hotelRating: data.hotelRating,
  });
  return hotel.save();
};

export const getAllHotelsService = async (pagination: PaginationQuery) => {
  const { page, limit, sortBy = 'hotelName', sortOrder } = pagination;
  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [data, total] = await Promise.all([
    Hotel.find().populate('beach', 'beachName').sort(sort).skip(skip).limit(limit).lean(),
    Hotel.countDocuments(),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getHotelsByBeachService = async (
  beachId: string,
  pagination: PaginationQuery
) => {
  const { page, limit, sortBy = 'hotelName', sortOrder } = pagination;
  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const filter = { beach: beachId } as any;

  const [data, total] = await Promise.all([
    Hotel.find(filter)
      .populate('beach', 'beachName')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Hotel.countDocuments(filter),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getHotelsByBeachNameService = async (
  beachName: string,
  pagination: PaginationQuery
) => {
  const { page, limit, sortBy = 'hotelName', sortOrder } = pagination;
  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const beaches = await Beach.find(
    { beachName: { $regex: beachName, $options: 'i' } },
    { _id: 1 }
  ).lean();

  const beachIds = beaches.map((b) => b._id);
  const filter = (beachIds.length ? { beach: { $in: beachIds } } : { beach: { $in: [] } }) as any;

  const [data, total] = await Promise.all([
    Hotel.find(filter).populate('beach', 'beachName').sort(sort).skip(skip).limit(limit).lean(),
    Hotel.countDocuments(filter),
  ]);

  const hotelIds = (data as any[]).map((h) => h._id);
  let minByHotel = new Map<string, number>();
  if (hotelIds.length > 0) {
    const rooms = await Room.find({ hotel: { $in: hotelIds } })
      .select('hotel roomPricePerNight')
      .lean();
    for (const r of rooms as any[]) {
      const hid = r.hotel.toString();
      const p = r.roomPricePerNight as number;
      const cur = minByHotel.get(hid);
      if (cur === undefined || p < cur) minByHotel.set(hid, p);
    }
  }

  const dataWithMin = (data as any[]).map((h) => ({
    ...h,
    minRoomPrice: minByHotel.get(h._id.toString()) ?? null,
  }));

  return {
    data: dataWithMin,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getHotelByIdService = async (id: string) => {
  const hotel = await Hotel.findById(id).populate('beach', 'beachName');
  if (!hotel) throw new Error('Invalid HotelId. Wrong Parameter Passed');
  return hotel;
};

export const updateHotelService = async (id: string, data: UpdateHotelInput) => {
  const hotel = await Hotel.findByIdAndUpdate(id, { $set: data }, { new: true }).populate(
    'beach',
    'beachName'
  );
  if (!hotel) throw new Error('Invalid HotelId. Wrong Parameter Passed');
  return hotel;
};

export const deleteHotelService = async (id: string) => {
  const hotel = await Hotel.findByIdAndDelete(id);
  if (!hotel) throw new Error('Invalid HotelId. Wrong Parameter Passed');
  return hotel;
};
