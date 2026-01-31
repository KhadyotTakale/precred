import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import documentRoutes from './routes/documentRoutes.js';
import schemeRoutes from './routes/schemeRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/documents', documentRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/verify', verificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Precred API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
