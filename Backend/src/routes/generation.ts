import { Router } from 'express';
import multer from 'multer';
import { generationController } from '../controllers/generation';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/original';
        // Create directory if it doesn't exist
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: uuid + original extension
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

// POST /generate/variation - Full flow: remove bg + generate variations
router.post('/variation', upload.single('file'), generationController.generateVariation);

// POST /generate/remove-bg - Just remove background (with file upload)
router.post('/remove-bg', upload.single('file'), generationController.removeBackground);

// POST /generate/upload - Upload image and get path back
router.post('/upload', upload.single('file'), generationController.uploadImage);

// POST /generate/remove-bg-by-path - Remove background using file path (optimized)
router.post('/remove-bg-by-path', generationController.removeBackgroundByPath);

export default router;
