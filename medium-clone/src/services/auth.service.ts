import { AppError } from '../types';
import { CreateUserInput, createUser, findByEmail, findByUsername, UserRecord } from '../repositories/auth.repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { TokenBlacklistService } from './token-blacklist.service';
import { sanitizeEmail, sanitizeUsername } from '../utils/sanitize';
import pool from '../config/database';
import { securityLogger } from '../utils/logger';

export class AuthService {
  private tokenBlacklistService: TokenBlacklistService;

  constructor() {
    this.tokenBlacklistService = new TokenBlacklistService();
  }

  async register(input: { username: string; email: string; password: string; bio?: string; avatar_url?: string }) {
    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(input.email);
    const sanitizedUsername = sanitizeUsername(input.username);

    const existingEmail = await findByEmail(sanitizedEmail);
    if (existingEmail) {
      securityLogger.logRegistration(sanitizedEmail, sanitizedUsername, false, { reason: 'email_already_exists' });
      throw new AppError('Email already in use', 400);
    }
    const existingUser = await findByUsername(sanitizedUsername);
    if (existingUser) {
      securityLogger.logRegistration(sanitizedEmail, sanitizedUsername, false, { reason: 'username_already_exists' });
      throw new AppError('Username already in use', 400);
    }

    const password_hash = await bcrypt.hash(input.password, 12);

    // Use transaction for user creation
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const created = await createUser({
        username: sanitizedUsername,
        email: sanitizedEmail,
        password_hash,
        bio: input.bio ?? null,
        avatar_url: input.avatar_url ?? null,
      } as CreateUserInput, connection);

      if (!created) {
        securityLogger.logRegistration(sanitizedEmail, sanitizedUsername, false, { reason: 'creation_failed' });
        throw new AppError('Failed to create user', 500);
      }

      await connection.commit();

      securityLogger.logRegistration(sanitizedEmail, sanitizedUsername, true, { userId: created.id });

      // @ts-ignore - jwt.sign types are overly strict, this is the correct usage
      const token: string = jwt.sign(
        { sub: created.id, username: created.username },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      const { password_hash: _p, ...publicUser } = created as any;

      return { user: publicUser as Partial<UserRecord>, token };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async login(input: { email: string; password: string }) {
    // Sanitize email input
    const sanitizedEmail = sanitizeEmail(input.email);

    const user = await findByEmail(sanitizedEmail);
    if (!user) {
      securityLogger.logLogin(sanitizedEmail, false, { reason: 'user_not_found' });
      throw new AppError('Invalid credentials', 401);
    }

    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) {
      securityLogger.logLogin(sanitizedEmail, false, { reason: 'invalid_password', userId: user.id });
      throw new AppError('Invalid credentials', 401);
    }

    securityLogger.logLogin(sanitizedEmail, true, { userId: user.id });

    // @ts-ignore - jwt.sign types are overly strict, this is the correct usage
    const token: string = jwt.sign(
      { sub: user.id, username: user.username },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    const { password_hash: _p, ...publicUser } = user as any;
    return { user: publicUser as Partial<UserRecord>, token };
  }

  async logout(token: string): Promise<void> {
    if (!token) {
      throw new AppError('No token provided', 400);
    }
    
    try {
      // Decode token to get user ID for logging
      const decoded = jwt.verify(token, env.JWT_SECRET) as { sub?: number };
      
      // Blacklist the token server-side
      await this.tokenBlacklistService.blacklistToken(token);
      
      if (decoded.sub) {
        securityLogger.logLogout(decoded.sub);
      }
    } catch (error) {
      // Still try to blacklist even if token is invalid
      await this.tokenBlacklistService.blacklistToken(token);
      throw error;
    }
  }
}

