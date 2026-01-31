import dotenv from 'dotenv';
import { searchCompany } from './tavilyService.js';
dotenv.config();

/**
 * Business Verification Service
 * Verifies business location and online presence
 */

// Verify business on Google Maps
export const verifyGoogleLocation = async (businessName, address) => {
    try {
        const query = `"${businessName}" ${address} site:google.com/maps OR site:maps.google.com`;
        const results = await searchCompany(query);

        const googleResult = results.find(r =>
            r.url?.includes('google.com/maps') ||
            r.url?.includes('maps.google.com') ||
            r.content?.toLowerCase().includes('google maps')
        );

        if (googleResult) {
            return {
                found: true,
                url: googleResult.url,
                title: googleResult.title,
                snippet: googleResult.content?.substring(0, 200),
                source: 'Google Maps'
            };
        }

        // Fallback: Search for the business directly
        const directQuery = `${businessName} ${address} location`;
        const directResults = await searchCompany(directQuery);

        return {
            found: directResults.length > 0,
            results: directResults.slice(0, 3).map(r => ({
                url: r.url,
                title: r.title,
                snippet: r.content?.substring(0, 150)
            })),
            source: 'Web Search'
        };
    } catch (error) {
        console.error('Google Location Verification Error:', error);
        return { found: false, error: error.message };
    }
};

// Check Swiggy/Zomato for food businesses
export const checkFoodPlatforms = async (businessName, city) => {
    try {
        const results = {
            swiggy: null,
            zomato: null
        };

        // Search Swiggy
        const swiggyQuery = `"${businessName}" ${city} site:swiggy.com`;
        const swiggyResults = await searchCompany(swiggyQuery);

        const swiggyResult = swiggyResults.find(r => r.url?.includes('swiggy.com'));
        if (swiggyResult) {
            // Try to extract rating from content
            const ratingMatch = swiggyResult.content?.match(/(\d+\.?\d*)\s*(out of|\/)\s*5/i) ||
                swiggyResult.content?.match(/rating[:\s]*(\d+\.?\d*)/i);
            results.swiggy = {
                found: true,
                url: swiggyResult.url,
                title: swiggyResult.title,
                rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
                snippet: swiggyResult.content?.substring(0, 150)
            };
        }

        // Search Zomato
        const zomatoQuery = `"${businessName}" ${city} site:zomato.com`;
        const zomatoResults = await searchCompany(zomatoQuery);

        const zomatoResult = zomatoResults.find(r => r.url?.includes('zomato.com'));
        if (zomatoResult) {
            // Try to extract rating from content
            const ratingMatch = zomatoResult.content?.match(/(\d+\.?\d*)\s*(out of|\/)\s*5/i) ||
                zomatoResult.content?.match(/rating[:\s]*(\d+\.?\d*)/i) ||
                zomatoResult.content?.match(/(\d+\.?\d*)\s*★/);
            results.zomato = {
                found: true,
                url: zomatoResult.url,
                title: zomatoResult.title,
                rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
                snippet: zomatoResult.content?.substring(0, 150)
            };
        }

        return results;
    } catch (error) {
        console.error('Food Platform Check Error:', error);
        return { swiggy: null, zomato: null, error: error.message };
    }
};

// Check Google My Business / Reviews
export const checkGoogleBusiness = async (businessName, address) => {
    try {
        const query = `"${businessName}" ${address} reviews ratings`;
        const results = await searchCompany(query);

        // Look for Google reviews or business listing
        const reviewResult = results.find(r =>
            r.content?.toLowerCase().includes('review') ||
            r.content?.toLowerCase().includes('rating') ||
            r.url?.includes('google.com')
        );

        if (reviewResult) {
            // Try to extract rating
            const ratingMatch = reviewResult.content?.match(/(\d+\.?\d*)\s*(out of|\/)\s*5/i) ||
                reviewResult.content?.match(/(\d+\.?\d*)\s*stars?/i) ||
                reviewResult.content?.match(/rating[:\s]*(\d+\.?\d*)/i);

            const reviewCountMatch = reviewResult.content?.match(/(\d+)\s*reviews?/i);

            return {
                found: true,
                rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
                reviewCount: reviewCountMatch ? parseInt(reviewCountMatch[1]) : null,
                url: reviewResult.url,
                snippet: reviewResult.content?.substring(0, 200)
            };
        }

        return { found: false };
    } catch (error) {
        console.error('Google Business Check Error:', error);
        return { found: false, error: error.message };
    }
};

// Main verification function
export const verifyBusiness = async (businessName, address, city, businessType) => {
    const verification = {
        businessName,
        address,
        city,
        businessType,
        timestamp: new Date().toISOString(),
        googleLocation: null,
        googleBusiness: null,
        foodPlatforms: null,
        overallScore: 0,
        verificationStatus: 'unknown'
    };

    // Check Google Location
    verification.googleLocation = await verifyGoogleLocation(businessName, address);

    // Check Google Business/Reviews
    verification.googleBusiness = await checkGoogleBusiness(businessName, address);

    // Check food platforms if applicable
    const foodTypes = ['restaurant', 'cafe', 'hotel', 'food', 'bakery', 'sweet', 'dhaba', 'canteen', 'tiffin', 'catering'];
    const isFood = foodTypes.some(type =>
        businessType?.toLowerCase().includes(type) ||
        businessName?.toLowerCase().includes(type)
    );

    if (isFood && city) {
        verification.foodPlatforms = await checkFoodPlatforms(businessName, city);
    }

    // Calculate overall verification score
    let score = 0;
    let maxScore = 0;

    // Google location (30 points)
    maxScore += 30;
    if (verification.googleLocation?.found) score += 30;

    // Google business/reviews (30 points)
    maxScore += 30;
    if (verification.googleBusiness?.found) {
        score += 15;
        if (verification.googleBusiness.rating >= 3.5) score += 15;
        else if (verification.googleBusiness.rating >= 2.5) score += 10;
        else if (verification.googleBusiness.rating) score += 5;
    }

    // Food platforms (40 points if applicable)
    if (isFood) {
        maxScore += 40;
        if (verification.foodPlatforms?.swiggy?.found) {
            score += 10;
            if (verification.foodPlatforms.swiggy.rating >= 4) score += 10;
            else if (verification.foodPlatforms.swiggy.rating >= 3) score += 5;
        }
        if (verification.foodPlatforms?.zomato?.found) {
            score += 10;
            if (verification.foodPlatforms.zomato.rating >= 4) score += 10;
            else if (verification.foodPlatforms.zomato.rating >= 3) score += 5;
        }
    }

    verification.overallScore = Math.round((score / maxScore) * 100);

    // Determine status
    if (verification.overallScore >= 70) {
        verification.verificationStatus = 'verified';
    } else if (verification.overallScore >= 40) {
        verification.verificationStatus = 'partial';
    } else {
        verification.verificationStatus = 'unverified';
    }

    return verification;
};

export default { verifyBusiness, verifyGoogleLocation, checkFoodPlatforms, checkGoogleBusiness };
