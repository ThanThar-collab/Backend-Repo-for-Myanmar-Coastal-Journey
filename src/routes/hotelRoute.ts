import { Router } from 'express';
import {
  createHotel,
  getAllHotels,
  getHotelsByBeach,
  getHotelsByBeachName,
  getHotelById,
  updateHotel,
  deleteHotel,
} from '../controllers/hotelController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  createHotelSchema,
  updateHotelSchema,
  listHotelsQuerySchema,
  getHotelByIdParamsSchema,
  hotelsByBeachQuerySchema,
  hotelsByBeachNameQuerySchema,
} from '../validations/hotelSchema';

const hotelRouter = Router();

/** Public catalog: browse by beach name (mobile app). */
hotelRouter.get(
  '/filter/beach-name',
  validate(hotelsByBeachNameQuerySchema, 'query'),
  getHotelsByBeachName
);
hotelRouter.get(
  '/filter/beach',
  authenticateToken,
  validate(hotelsByBeachQuerySchema, 'query'),
  getHotelsByBeach
);

hotelRouter.post('/', authenticateToken, validate(createHotelSchema, 'body'), createHotel);
hotelRouter.get('/', authenticateToken, validate(listHotelsQuerySchema, 'query'), getAllHotels);
/** Public catalog: hotel detail (must stay after /filter/* routes). */
hotelRouter.get('/:id', validate(getHotelByIdParamsSchema, 'params'), getHotelById);
hotelRouter.put(
  '/:id',
  authenticateToken,
  validate(getHotelByIdParamsSchema, 'params'),
  validate(updateHotelSchema, 'body'),
  updateHotel
);
hotelRouter.delete('/:id', authenticateToken, validate(getHotelByIdParamsSchema, 'params'), deleteHotel);

export default hotelRouter;
