import pool, { query } from '../config/database';

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
	const rows = await query<UserRecord[]>(
		'SELECT id, username, email, password_hash, bio, avatar_url, is_verified, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
		[email],
	);
	return (rows && (rows as any)[0]) ?? null;
}

export async function findByUsername(username: string): Promise<UserRecord | null> {
	const rows = await query<UserRecord[]>(
		'SELECT id, username, email, password_hash, bio, avatar_url, is_verified, created_at, updated_at FROM users WHERE username = ? LIMIT 1',
		[username],
	);
	return (rows && (rows as any)[0]) ?? null;
}

export async function findById(id: number): Promise<UserRecord | null> {
	const rows = await query<UserRecord[]>(
		'SELECT id, username, email, password_hash, bio, avatar_url, is_verified, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
		[id],
	);
	return (rows && (rows as any)[0]) ?? null;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord | null> {
	const [result] = await pool.execute(
		'INSERT INTO users (username, email, password_hash, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
		[input.username, input.email, input.password_hash, input.bio ?? null, input.avatar_url ?? null],
	);
	const insertId = (result as any).insertId;
	if (!insertId) return null;
	const user = await findById(insertId);
	return user;
}
