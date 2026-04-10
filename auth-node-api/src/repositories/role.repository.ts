import pool from "../config/db";

export const findRoleByName = async (role: string) => {

 const [rows]: any = await pool.query(
  "SELECT * FROM roles WHERE name = ?",
  [role]
 );

 return rows[0];

};