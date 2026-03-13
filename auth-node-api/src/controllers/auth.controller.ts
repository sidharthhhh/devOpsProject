import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { findUserByEmail, createUser } from "../services/auth.service";
import { generateToken } from "../utils/jwt";
import { AuthRequest } from "../middleware/auth.middleware";
import { getUserById, updateUserPassword } from "../services/auth.service";
import pool from "../config/db";


export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
) => {
  try {

    const userId = req.user?.id;

    const user = await getUserById(userId!);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await createUser(email, hashedPassword);

    const token = generateToken(userId);

    res.status(201).json({
      message: "User created successfully",
      token,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const login = async (req: Request, res: Response) => {
  try {

    const { email, password } = req.body;

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user.id!);

    res.json({
      message: "Login successful",
      token,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = (req: AuthRequest, res: Response) => {
  try {
    // Get user id from decoded JWT (added by auth middleware)
    const userId = req.user?.id;

    // Log logout event (optional)
    console.log(`User with ID ${userId} has logged out.`);

    // Send response
    return res.status(200).json({
      message: "Logout successful. Please delete the token on the client side."
    });

  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      message: "Something went wrong while logging out"
    });
  }
};

// export const refreshToken = (req: AuthRequest, res: Response) => {
//   try {
//     const userId = req.user?.id;                
//     const newToken = generateToken(userId!);

//     return res.json({
//       message: "Token refreshed successfully",
//       token: newToken
//     });
//     } catch (error) {
//         console.error("Token refresh error:", error);
//         return res.status(500).json({
//             message: "Something went wrong while refreshing the token"
//         });
//     }
// };

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password cannot be the same as current password",
      });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password using service
    await updateUserPassword(userId, hashedPassword);

    return res.status(200).json({
      message: "Password updated successfully",
    });

  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};