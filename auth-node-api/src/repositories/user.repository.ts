import pool from "../config/db";

export const createUser = async (
 memberId: string,
 email: string,
 password: string,
 roleId: number
) => {

 await pool.query(
  "INSERT INTO users (member_id,email,password,role_id) VALUES (?,?,?,?)",
  [memberId,email,password,roleId]
 );

};

export const findUserByEmail = async (email: string) => {

 const [rows]: any = await pool.query(
  `SELECT u.*, r.name as role
   FROM users u
   JOIN roles r ON r.id = u.role_id
   WHERE email = ?`,
  [email]
 );

 return rows[0];

};