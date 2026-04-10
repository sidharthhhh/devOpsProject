import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendCreated, sendSuccess } from '../utils/response';

/**
 * Controller handling authentication endpoints.
 */
export class AuthController {
	private service: AuthService;

	constructor() {
		this.service = new AuthService();
	}

	/**
	 * POST /api/v1/auth/register
	 */
	register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const result = await this.service.register(req.body);
			sendCreated(res, result, 'User registered successfully');
		} catch (error) {
			next(error);
		}
	};

	/**
	 * POST /api/v1/auth/login
	 */
	login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const result = await this.service.login(req.body);
			sendSuccess(res, result, 'Logged in successfully');
		} catch (error) {
			next(error);
		}
	};
}
