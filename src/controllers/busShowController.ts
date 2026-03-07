import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { seatStatus, Show } from '../models/busBookingShowModel';
import { generateSeatLayout } from '../lib/busSeatIndex';
import { Bus } from '../models/busModel';
import { Ticket } from '../models/busTicketModel';
import { updateSeatService } from '../services/busShowService'

/*
   Create bus show
*/

export const createBusShow = asyncHandler(
  async (
    req: Request,
    res: Response
  ) => {
    const { ticket, busId, departureTime } = req.body;

    //Validate ticket
    const targetTicket = await Ticket.findById(ticket);
    if (!targetTicket) {
      res.status(404);
      throw new Error("Ticket not found");
    }

    // Validate bus
    const targetBus = await Bus.findById(busId);
    if (!targetBus) {
      res.status(404);
      throw new Error("Bus not found");
    }

    // Generate seat layout using ticket price
    const seatLayout = generateSeatLayout(targetTicket.ticketPrice);

     const newShow = await Show.create({
      bus: targetBus._id,
      ticket: targetTicket._id,
      departureTime: departureTime || targetBus.departureTime,
      price: targetTicket.ticketPrice,
      seatLayout: seatLayout, // dynamic seat layout
    });

    res.status(201).json({
      success: true,
      status: 201,
      message: "Seaat show created successfully",
      data: newShow,
    });
  }
);

/*
  Update seat status
*/
export const updateSeatStatus = asyncHandler(
    async (
    req: Request,
    res: Response
  )  => {
      const { showId, row, seatNumber, status } = req.query;

      const updatedShow = await updateSeatService(showId as string, row as string, seatNumber as string, status as seatStatus);

      res.status(200).json({
        success: true,
        status: 200,
        message: "Seat show updated successfully",
        data: updatedShow,
      })
});

/*
  Get bus show by id
*/

export const getBusShowById = asyncHandler(
    async (
    req: Request,
    res: Response
) => {
        const id = req.params.id;
        const ExistedBusShow = await Show.findById(id);
        if (!ExistedBusShow) {
            res.status(403)
            throw new Error("Invalid Bus ShowId. Wrong Parameter Passed")
        }else {
            res.status(200).json({ 
                success: true,
                status: 200,
                message: "Bus Seat Show Displayed",
                data: ExistedBusShow,
         });
        }
});