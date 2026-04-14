import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../types';
import { TokenBlacklistService } from '../services/token-blacklist.service';

const tokenBlacklistService = new TokenBlacklistService();

/**
 * Middleware to verify JWT token and check if it's blacklisted
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

		if (!token) {
			throw new AppError('No token provided', 401);
		}

		// Check if token is blacklisted
		const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
		if (isBlacklisted) {
			throw new AppError('Token has been revoked', 401);
		}

		// Verify token
		const decoded = jwt.verify(token, env.JWT_SECRET);
		(req as any).user = decoded;

		next();
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			next(new AppError('Invalid token', 401));
		} else {
			next(error);
		}
	}
};
