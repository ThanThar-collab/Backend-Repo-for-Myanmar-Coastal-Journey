import mongoose from 'mongoose';
import { IRoute } from './routeModel';
export interface IBus {
    route: mongoose.Schema.Types.ObjectId | IRoute;
    noOfSeats: number;
    departureTime: string;
    isAvailable: boolean;
}
const busSchema = new mongoose.Schema<IBus>({
    route: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    noOfSeats: {
        type: Number,
        required: true
    },
    departureTime: {
        type: String,
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
   },
    { timestamps: true }
);

export const Bus = mongoose.model('Bus', busSchema);