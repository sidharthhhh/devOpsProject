import { Router } from "express";
import {
  register,
  login,
  logout,
  changePassword,
  getCurrentUser
} from "../controllers/auth.controller";



import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.patch("/change-password", authenticate, changePassword);

// protected route
router.get("/me", authenticate, getCurrentUser);

export default router;