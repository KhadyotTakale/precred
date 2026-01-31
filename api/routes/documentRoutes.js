import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { analyzeDocument } from '../services/openaiService.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for file upload
const uploadDir = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Helper to extract text from files
const extractText = async (file) => {
    try {
        if (file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(file.path);
            const data = await pdf(dataBuffer);
            return `File: ${file.originalname}\nContent: ${data.text}\n\n`;

        }
        // For now, assume other files are text or we can't extract (e.g. images without OCR)
        // TODO: Add Image OCR support
        return `File: ${file.originalname}\n(Content extraction not supported for ${file.mimetype}. Using filename and metadata only.)\n\n`;
    } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        return `File: ${file.originalname}\n(Error extracting content)\n\n`;
    }
};

// Route to handle multiple document uploads
router.post('/upload', upload.any(), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log('Files received:', req.files.length);

        // Phase 1: Upload and Extract Text
        let combinedText = '';
        const fileDetails = [];

        for (const file of req.files) {
            const text = await extractText(file);
            combinedText += text;
            fileDetails.push({
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype
            });
        }

        // Phase 2: Analyze with AI
        console.log('Analyzing documents with AI...');
        const analysis = await analyzeDocument(combinedText);

        // Cleanup: Delete uploaded files after analysis
        // In a real production app involving storage, you'd upload to S3/Blob storage here.
        // For this agent, we process and delete to ensure privacy and save space.
        for (const file of req.files) {
            fs.unlink(file.path, (err) => {
                if (err) console.error(`Failed to delete ${file.path}:`, err);
            });
        }

        res.status(200).json({
            message: 'Files uploaded and analyzed successfully',
            files: fileDetails,
            analysis: analysis
        });
    } catch (error) {
        console.error('Upload/Analysis error:', error);
        res.status(500).json({ error: 'Failed to process upload or analysis' });
    }
});

export default router;
