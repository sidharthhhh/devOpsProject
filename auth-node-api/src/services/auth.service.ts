import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt";
import { generateMemberId } from "../utils/memberId";
import { findRoleByName } from "../repositories/role.repository";
import { createUser, findUserByEmail } from "../repositories/user.repository";

export const registerUser = async (
 email: string,
 password: string,
 role: string
) => {

 const roleData = await findRoleByName(role);

 if (!roleData) throw new Error("Invalid role");

 const hashedPassword = await bcrypt.hash(password,10);

 const memberId = generateMemberId(roleData.prefix, 0);

 await createUser(memberId,email,hashedPassword,roleData.id);

 return { memberId };

};

export const loginUser = async (email: string,password: string) => {

 const user = await findUserByEmail(email);

 if (!user) throw new Error("User not found");

 const match = await bcrypt.compare(password,user.password);

 if (!match) throw new Error("Invalid password");

 const token = generateToken(user.id,user.role);

 return { token,user };

};