import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

/**
 * Validation middleware factory.
 * Validates the request body against a Zod schema.
 *
 * Usage:
 *   router.post('/resource', validate(createResourceDto), controller.create);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        sendError(_res, 'Validation failed', 400, formattedErrors);
        return;
      }
      next(error);
    }
  };
}
