import { Types } from "mongoose";
import { IBus } from '../models/busModel';
import { IBusTicket } from '../models/busTicketModel';
import { IBusShow } from '../models/busBookingShowModel';
import { seatStatus } from "../models/busBookingShowModel";

type GroupedShow = {
    ticket: Types.ObjectId | IBusTicket;
    bus: {
        busDetails: Types.ObjectId | IBus;
        shows: Array<{
            _id: string;
            date: string;
            startTime: string;
        }>;
    };

};

// seat layout
export const generateSeatLayout = (price: number) => {
  const totalRows = 11;
  const columns = ["A", "B", "C", "D"];

  return Array.from({ length: totalRows }, (_, rowIndex) => {
    const rowNumber = rowIndex + 1;

    return {
      row: rowNumber.toString(),
      seats: columns.map((col) => ({
        number: `${rowNumber}${col}`,
        status: seatStatus.Available,
      })),
    };
  });
};

