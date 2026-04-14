import pool, { query } from '../config/database';
import { ResultSetHeader, RowDataPacket, PoolConnection } from 'mysql2/promise';
import { AppError } from '../types';
import { logger } from '../utils/logger';

export interface CreateUserInput {
	username: string;
	email: string;
	password_hash: string;
	bio?: string | null;
	avatar_url?: string | null;
}

export interface UserRecord {
	id: number;
	username: string;
	email: string;
	password_hash: string;
	bio?: string | null;
	avatar_url?: string | null;
	is_verified: number | boolean;
	created_at: string;
	updated_at: string;
}

export async function findByEmail(email: string): Promise<UserRecord | null> {
	try {
		const rows = await query<RowDataPacket[]>(
			'SELECT id, username, email, password_hash, bio, avatar_url, is_verified, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
			[email],
		);
		return (rows && rows[0]) ? rows[0] as UserRecord : null;
	} catch (error) {
		logger.error('Error finding user by email', { error });
		throw new AppError('Database error', 500);
	}
}

export async function findByUsername(username: string): Promise<UserRecord | null> {
	try {
		const rows = await query<RowDataPacket[]>(
			'SELECT id, username, email, password_hash, bio, avatar_url, is_verified, created_at, updated_at FROM users WHERE username = ? LIMIT 1',
			[username],
		);
		return (rows && rows[0]) ? rows[0] as UserRecord : null;
	} catch (error) {
		logger.error('Error finding user by username', { error });
		throw new AppError('Database error', 500);
	}
}

export async function findById(id: number): Promise<UserRecord | null> {
	try {
		const rows = await query<RowDataPacket[]>(
			'SELECT id, username, email, password_hash, bio, avatar_url, is_verified, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
			[id],
		);
		return (rows && rows[0]) ? rows[0] as UserRecord : null;
	} catch (error) {
		logger.error('Error finding user by id', { error });
		throw new AppError('Database error', 500);
	}
}

export async function createUser(input: CreateUserInput, connection?: PoolConnection): Promise<UserRecord | null> {
	try {
		const conn = connection || pool;
		const [result] = await conn.execute(
			'INSERT INTO users (username, email, password_hash, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
			[input.username, input.email, input.password_hash, input.bio ?? null, input.avatar_url ?? null],
		);
		const insertResult = result as ResultSetHeader;
		if (!insertResult.insertId) return null;
		const user = await findById(insertResult.insertId);
		return user;
	} catch (error) {
		logger.error('Error creating user', { error });
		throw new AppError('Database error', 500);
	}
}

	
