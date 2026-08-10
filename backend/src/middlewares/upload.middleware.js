const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const memoryStorage = multer.memoryStorage();

function pdfFileFilter(req, file, cb) {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = (file.originalname || '').toLowerCase().endsWith('.pdf');

  if (!isPdfMime && !isPdfExt) {
    return cb(new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE'), false);
  }

  return cb(null, true);
}

function imageFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(
      new AppError('Only JPEG, PNG, WebP, or GIF images are allowed', 400, 'INVALID_FILE_TYPE'),
      false
    );
  }
  return cb(null, true);
}

const uploadSinglePdf = multer({
  storage: memoryStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
}).single('file');

const uploadMultiplePdfs = multer({
  storage: memoryStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024,
    files: 20,
  },
}).array('files', 20);

const uploadSingleImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
}).single('photo');

function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) return next();
      if (err instanceof AppError) return next(err);
      if (err instanceof multer.MulterError) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        const code = err.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'UPLOAD_ERROR';
        return next(new AppError(err.message, status, code));
      }
      return next(err);
    });
  };
}

module.exports = {
  uploadSinglePdf: handleUpload(uploadSinglePdf),
  uploadMultiplePdfs: handleUpload(uploadMultiplePdfs),
  uploadSingleImage: handleUpload(uploadSingleImage),
};
