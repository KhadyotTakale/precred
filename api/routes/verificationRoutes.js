import express from 'express';
import { verifyBusiness } from '../services/businessVerificationService.js';

const router = express.Router();

/**
 * POST /api/verify/business
 * Verify a business location and online presence
 * 
 * Body: {
 *   businessName: string,
 *   address: string,
 *   city: string,
 *   businessType?: string
 * }
 */
router.post('/business', async (req, res) => {
    try {
        const { businessName, address, city, businessType } = req.body;

        if (!businessName || !address) {
            return res.status(400).json({
                success: false,
                error: 'Business name and address are required'
            });
        }

        console.log(`Verifying business: ${businessName} at ${address}, ${city}`);

        const verification = await verifyBusiness(businessName, address, city, businessType);

        res.json({
            success: true,
            data: verification
        });
    } catch (error) {
        console.error('Business verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify business',
            details: error.message
        });
    }
});

/**
 * GET /api/verify/map-embed
 * Get Google Maps embed URL for an address
 */
router.get('/map-embed', (req, res) => {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({
            success: false,
            error: 'Address is required'
        });
    }

    // Google Maps embed URL (no API key needed for basic embed)
    const encodedAddress = encodeURIComponent(address);
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_MAPS_API_KEY || ''}&q=${encodedAddress}`;

    // Fallback to OpenStreetMap if no Google API key
    const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodedAddress}&layer=mapnik&marker=true`;

    res.json({
        success: true,
        data: {
            googleMapsUrl: process.env.GOOGLE_MAPS_API_KEY ? embedUrl : null,
            osmUrl: osmUrl,
            searchUrl: `https://www.google.com/maps/search/${encodedAddress}`
        }
    });
});

export default router;
