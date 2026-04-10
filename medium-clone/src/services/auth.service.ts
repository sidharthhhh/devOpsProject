import { AppError } from '../types';
import { CreateUserInput, createUser, findByEmail, findByUsername, UserRecord } from '../repositories/auth.repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export class AuthService {
  async register(input: { username: string; email: string; password: string; bio?: string; avatar_url?: string }) {
    const existingEmail = await findByEmail(input.email);
    if (existingEmail) {
      throw new AppError('Email already in use', 400);
    }
    const existingUser = await findByUsername(input.username);
    if (existingUser) {
      throw new AppError('Username already in use', 400);
    }

    const password_hash = await bcrypt.hash(input.password, 10);

    const created = await createUser({
      username: input.username,
      email: input.email,
      password_hash,
      bio: input.bio ?? null,
      avatar_url: input.avatar_url ?? null,
    } as CreateUserInput);

    if (!created) throw new AppError('Failed to create user', 500);

    const token = (jwt.sign as any)({ sub: created.id, username: created.username }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    const { password_hash: _p, ...publicUser } = created as any;

    return { user: publicUser as Partial<UserRecord>, token };
  }

  async login(input: { email: string; password: string }) {
    const user = await findByEmail(input.email);
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const token = (jwt.sign as any)({ sub: user.id, username: user.username }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });

    const { password_hash: _p, ...publicUser } = user as any;
    return { user: publicUser as Partial<UserRecord>, token };
  }
}

