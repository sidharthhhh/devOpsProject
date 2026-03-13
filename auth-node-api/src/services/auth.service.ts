import pool from "../config/db";
import { User } from "../types/user";

export const findUserByEmail = async (email: string) => {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  return (rows as User[])[0];
};

export const createUser = async (email: string, password: string) => {
  const [result]: any = await pool.query(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, password]
  );

  return result.insertId;
};

export const getUserById = async (id: number) => {
  const [rows]: any = await pool.query(
    "SELECT id, email, password FROM users WHERE id = ?",
    [id]
  );

  return rows[0];
};

export const updateUserPassword = async (
  userId: number,
  hashedPassword: string
) => {
  await pool.query(
    "UPDATE users SET password = ? WHERE id = ?",
    [hashedPassword, userId]
  );
};