import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

// Import Routes
import authRoutes from './routes/auth.routes';

// Load environment variables from .env file
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// --- Global Middleware ---
// Helmet helps secure Express apps by setting various HTTP headers.
app.use(helmet());

// CORS enables cross-origin resource sharing (allowing your frontend to talk to this API)
app.use(cors());

// Parses incoming JSON requests and puts the parsed data in req.body
app.use(express.json());

// --- Routes ---
// Mount the authentication routes under the '/api/auth' prefix
app.use('/api/auth', authRoutes);

// --- Health Check Route ---
// A simple route to verify the server is running (great for Postman testing)
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'Server is healthy and running smoothly.' });
});

// --- Global Error Handler ---
// Catches any errors thrown in the routes that aren't handled explicitly
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong on the server!' });
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});