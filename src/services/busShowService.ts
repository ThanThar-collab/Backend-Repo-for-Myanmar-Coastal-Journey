import { Types } from 'mongoose';
import { generateSeatLayout } 
from '../lib/busSeatIndex';
import { IBusShow, Show, seatStatus } from '../models/busBookingShowModel';


// update seat status
export const updateSeatService = async (
  showId: string,
  row: string,
  seatNumber: string,
  status: seatStatus
) => {
  return await Show.updateOne(
    {
      _id: new Types.ObjectId(showId),
      "seatLayout.row": row,
      "seatLayout.seats.number": seatNumber,
    },
    {
      $set: {
        "seatLayout.$[r].seats.$[s].status": status,
      },
    },
    {
      arrayFilters: [
        { "r.row": row },
        { "s.number": seatNumber },
      ],
    }
  );
};

// format :

// {
//   "_id": "123456",
//   "bus": "busID",
//   "ticket": "ticketID",
//   "departureTime": "10:00 AM",
//   "price": 15000,
//   "seatLayout": [
//     {
//       "row": "A",
//       "seats": [
//         { "number": "1", "status": "Available" },
//         { "number": "2", "status": "Selected" },
//         { "number": "3", "status": "Unavailable" }
//       ]
//     },
//     {
//       "row": "B",
//       "seats": [
//         { "number": "1", "status": "Available" },
//         { "number": "2", "status": "Available" }
//       ]
//     }
//   ]
// }
