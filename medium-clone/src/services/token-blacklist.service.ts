import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { addToBlacklist, isTokenBlacklisted } from '../repositories/token-blacklist.repository';
import { AppError } from '../types';

export class TokenBlacklistService {
	/**
	 * Blacklist a token
	 */
	async blacklistToken(token: string): Promise<void> {
		try {
			// Decode token to get expiration
			const decoded = jwt.verify(token, env.JWT_SECRET) as { exp?: number };
			
			if (!decoded.exp) {
				throw new AppError('Token has no expiration', 400);
			}

			const expiresAt = new Date(decoded.exp * 1000);
			await addToBlacklist(token, expiresAt);
		} catch (error) {
			if (error instanceof jwt.JsonWebTokenError) {
				throw new AppError('Invalid token', 400);
			}
			throw error;
		}
	}

	/**
	 * Check if a token is blacklisted
	 */
	async isBlacklisted(token: string): Promise<boolean> {
		return await isTokenBlacklisted(token);
	}
}
