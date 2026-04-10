import { z } from 'zod';

/**
 * DTO schema for user registration.
 */
export const registerDto = z.object({
	username: z.string().min(3).max(50),
	email: z.string().email().max(150),
	password: z.string().min(8).max(128),
	bio: z.string().optional(),
	avatar_url: z.string().url().optional(),
});

export type RegisterDto = z.infer<typeof registerDto>;

/**
 * DTO schema for user login.
 */
export const loginDto = z.object({
	email: z.string().email().max(150),
	password: z.string().min(8).max(128),
});

export type LoginDto = z.infer<typeof loginDto>;

