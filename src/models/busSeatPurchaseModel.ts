import mongoose, { Types } from 'mongoose';

export interface IBusSeatPurchase {
  user: Types.ObjectId;
  show: Types.ObjectId;
  seatIds: string[];
  totalPrice: number;
  currency: string;
  source: string;
  destination: string;
  departureTime: string;
  travelDate: Date;
  ticketLabel?: string;
  transportType?: 'Bus' | 'Flight';
  passengerName?: string;
  passengerNrc?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const busSeatPurchaseSchema = new mongoose.Schema<IBusSeatPurchase>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    seatIds: [{ type: String, required: true }],
    totalPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'MMK', trim: true },
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    departureTime: { type: String, required: true, trim: true },
    travelDate: { type: Date, required: true },
    ticketLabel: { type: String, trim: true },
    transportType: { type: String, enum: ['Bus', 'Flight'], default: 'Bus' },
    passengerName: { type: String, trim: true },
    passengerNrc: { type: String, trim: true },
  },
  { timestamps: true }
);

export const BusSeatPurchase = mongoose.model<IBusSeatPurchase>(
  'BusSeatPurchase',
  busSeatPurchaseSchema
);
