import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { registerDto, loginDto, logoutDto } from '../dto/auth.dto';

const router = Router();
const controller = new AuthController();

// POST /api/v1/auth/register
router.post('/register', validate(registerDto), controller.register);

// POST /api/v1/auth/login
router.post('/login', validate(loginDto), controller.login);

// POST /api/v1/auth/logout
router.post('/logout', validate(logoutDto), controller.logout);

export default router;
