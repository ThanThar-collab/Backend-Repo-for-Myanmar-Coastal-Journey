import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import {
  createRouteService,
  getAllRoutesService,
  getRouteByIdService,
  updateRouteService,
  deleteRouteService,
} from '../services/routeService';
import { parsePagination } from '../validations/commonSchema';

export const createRoute = asyncHandler(async (req: Request, res: Response) => {
  const savedRoute = await createRouteService(req.body);
  res.status(201).json({
    success: true,
    status: 201,
    message: 'Route Created Successfully',
    data: savedRoute,
  });
});

export const getAllRoute = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query);
  const result = await getAllRoutesService(pagination);

  res.status(200).json({
    success: true,
    status: 200,
    message: 'Route Displayed',
    ...result,
  });
});
