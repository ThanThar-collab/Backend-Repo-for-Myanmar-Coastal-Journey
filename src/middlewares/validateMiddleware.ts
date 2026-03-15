import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[target];
    const result = schema.safeParse(data);

    if (!result.success) {
      const error = result.error as ZodError;
      return res.status(422).json({
        success: false,
        status: 422,
        message: 'Validation failed',
        errors: error.flatten(),
      });
    }

    req[target] = result.data;
    next();
  };
};
