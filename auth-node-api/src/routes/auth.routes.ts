import { Router, Response } from "express";
import {
 register,
 login
} from "../controllers/auth.controller";

import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import { authorizeRole } from "../middleware/role.middleware";

const router = Router();

router.post("/register",register);

router.post("/login",login);

router.get("/me",authenticate,(req: AuthRequest,res: Response)=>{
 res.json(req.user);
});

router.get(
 "/admin/test",
 authenticate,
 authorizeRole("admin"),
 (req,res)=>{
  res.json({message:"Admin route"});
 }
);

export default router;