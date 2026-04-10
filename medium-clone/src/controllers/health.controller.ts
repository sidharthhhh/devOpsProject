import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

/**
 * Health check controller.
 */
export class HealthController {
  /**
   * GET /health
   */
  async check(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'node-backend-template',
    });
  }
}
