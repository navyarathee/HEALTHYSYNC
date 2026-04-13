const fs = require('fs');
const path = require('path');

/**
 * compressUpload – Post-upload middleware that compresses image files.
 *
 * For JPEG/PNG images:
 *   - Resizes to max 1920px width (maintains aspect ratio)
 *   - Compresses quality to 80%
 *
 * Requires: npm install sharp
 * Falls back gracefully if sharp is not installed.
 */
const compressUpload = async (req, _res, next) => {
    try {
        if (!req.file) return next();

        const ext = path.extname(req.file.originalname).toLowerCase();
        const imageExts = ['.jpg', '.jpeg', '.png'];

        // Only compress images (leave PDFs untouched)
        if (!imageExts.includes(ext)) return next();

        let sharp;
        try {
            sharp = require('sharp');
        } catch {
            // sharp not installed — skip compression silently
            console.log('ℹ️  sharp not installed — skipping image compression');
            return next();
        }

        const filePath = req.file.path;
        const tempPath = filePath + '.tmp';

        await sharp(filePath)
            .resize({ width: 1920, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(tempPath);

        // Replace original with compressed
        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);

        // Update file size in req.file
        const stats = fs.statSync(filePath);
        req.file.size = stats.size;

        next();
    } catch (err) {
        console.error('⚠️  Image compression failed (continuing without compression):', err.message);
        next(); // Don't block upload if compression fails
    }
};

module.exports = { compressUpload };
