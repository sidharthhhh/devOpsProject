import { z } from 'zod';

/**
 * DTO schema for user registration.
 */
export const registerDto = z.object({
	username: z.string().min(3).max(50),
	email: z.string().email().max(150),
	password: z.string()
		.min(8)
		.max(128)
		.regex(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
			'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
		),
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

// DTO schema for user logout
export const logoutDto = z.object({
	token: z.string(),
});


