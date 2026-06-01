const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/3gpp', 'video/quicktime',
  'audio/mpeg', 'audio/ogg', 'audio/webm',
  'audio/aac', 'audio/mp4', 'audio/3gpp', 'audio/amr', 'audio/wav', 'audio/x-m4a',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAGIC_BYTES = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'video/mp4': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  'video/3gpp': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  'video/quicktime': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  'audio/mpeg': [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2]],
  'audio/ogg': [[0x4F, 0x67, 0x67, 0x53]],
  'audio/webm': [[0x1A, 0x45, 0xDF, 0xA3]],
  'audio/aac': [[0xFF, 0xF1], [0xFF, 0xF9]],
  'audio/mp4': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  'audio/3gpp': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  'audio/amr': [[0x23, 0x21, 0x41, 0x4D, 0x52]],
  'audio/wav': [[0x52, 0x49, 0x46, 0x46]],
  'audio/x-m4a': [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
};

const validateMagicBytes = (filePath, mimeType) => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    const signatures = MAGIC_BYTES[mimeType];
    if (!signatures) return true;

    return signatures.some(sig => {
      return sig.every((byte, i) => buffer[i] === byte);
    });
  } catch {
    return false;
  }
};

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'));
    }
    cb(null, true);
  },
});

const uploadToCloudinary = (filePath, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        folder: folder || 'whatsapp-clone',
        resource_type: 'auto',
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
};

exports.uploadFile = async (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!validateMagicBytes(req.file.path, req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Invalid file content' });
    }

    try {
      const result = await uploadToCloudinary(req.file.path);
      fs.unlink(req.file.path, () => {});

      res.json({
        fileUrl: result.secure_url,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        publicId: result.public_id,
      });
    } catch (uploadErr) {
      console.error('Cloudinary upload error:', uploadErr.message, uploadErr.http_code, uploadErr);
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: `Upload failed: ${uploadErr.message}` });
    }
  });
};

exports.uploadMultiple = async (req, res) => {
  upload.array('files', 10)(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    for (const f of req.files) {
      if (!validateMagicBytes(f.path, f.mimetype)) {
        fs.unlink(f.path, () => {});
        continue;
      }
      try {
        const result = await uploadToCloudinary(f.path);
        results.push({
          fileUrl: result.secure_url,
          fileName: f.originalname,
          fileSize: f.size,
          mimeType: f.mimetype,
          publicId: result.public_id,
        });
      } catch (uploadErr) {
        console.error('Cloudinary upload error (multi):', uploadErr.message);
      }
      fs.unlink(f.path, () => {});
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'No valid files uploaded' });
    }

    res.json({ files: results });
  });
};