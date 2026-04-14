import pool, { query } from '../config/database';
import crypto from 'crypto';

export interface BlacklistedToken {
	id: number;
	token_hash: string;
	expires_at: Date;
	created_at: Date;
}

/**
 * Hash a token for storage (we don't store raw tokens)
 */
export function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Add a token to the blacklist
 */
export async function addToBlacklist(token: string, expiresAt: Date): Promise<void> {
	const tokenHash = hashToken(token);
	await pool.execute(
		'INSERT INTO blacklisted_tokens (token_hash, expires_at) VALUES (?, ?)',
		[tokenHash, expiresAt]
	);
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
	const tokenHash = hashToken(token);
	const rows = await query<BlacklistedToken[]>(
		'SELECT id FROM blacklisted_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1',
		[tokenHash]
	);
	return rows && rows.length > 0;
}

/**
 * Clean up expired tokens from the blacklist
 */
export async function cleanupExpiredTokens(): Promise<void> {
	await pool.execute('DELETE FROM blacklisted_tokens WHERE expires_at <= NOW()');
}
