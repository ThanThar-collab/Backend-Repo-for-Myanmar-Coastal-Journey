import { Router } from 'express';
import {
    createBusShow,
    updateSeatStatus,
    getBusShowById
} from '../controllers/busShowController';
import { authenticateToken } from '../middlewares/authMiddleware';

const busSeatShowRouter = Router();

busSeatShowRouter.post(
    '/',
    authenticateToken,
    createBusShow
)

busSeatShowRouter.get(
    '/:id',
    authenticateToken,
    getBusShowById
)

busSeatShowRouter.put(
    '/:showId',
    authenticateToken,
    updateSeatStatus
)

export default busSeatShowRouter;