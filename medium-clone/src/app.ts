import express from 'express'; // Express framework
import cors from 'cors'; // Cross-origin resource sharing
import helmet from 'helmet'; // Security headers
import morgan from 'morgan'; // HTTP request logging
import { errorMiddleware } from './middleware/error.middleware'; // Global error handler
import healthRoutes from './routes/health.routes'; // Health check route
import authRoutes from './routes/auth.routes'; // Authentication routes

const app = express(); // Create Express application

// ---------------------------------------------------------------------------
// Security & parsing middleware
// ---------------------------------------------------------------------------
app.use(helmet()); // Set secure HTTP headers
app.use(cors()); // Enable CORS for all origins
app.use(express.json({ limit: '10mb' })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ---------------------------------------------------------------------------
// HTTP request logging
// ---------------------------------------------------------------------------
app.use(morgan('dev')); // Log HTTP requests in dev format

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/v1/health', healthRoutes); // Health check endpoint
app.use('/api/v1/auth', authRoutes); // Authentication endpoints

// ---------------------------------------------------------------------------
// Global error handler (must be AFTER routes)
// ---------------------------------------------------------------------------
app.use(errorMiddleware); // Catch and format all errors

export default app;
