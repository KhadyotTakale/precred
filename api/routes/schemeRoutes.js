import express from 'express';
import { performSearch } from '../services/tavilyService.js';

const router = express.Router();

// Route to discover schemes
router.post('/discover', async (req, res) => {
    try {
        const { query } = req.body;
        // Default query targeting the user's specific request context
        const searchQuery = query || "latest government MSME loan schemes India January 2026 new NBFC business loans";

        console.log(`Searching for schemes with query: ${searchQuery}`);

        const results = await performSearch(searchQuery);

        res.status(200).json({
            message: 'Scheme discovery successful',
            query: searchQuery,
            results: results
        });
    } catch (error) {
        console.error('Scheme discovery error:', error);
        res.status(500).json({ error: 'Failed to discover schemes' });
    }
});

export default router;
