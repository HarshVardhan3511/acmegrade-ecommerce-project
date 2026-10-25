const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, '../../public/uploads')
);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'product-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
    cb(null, true);
  } else {
    const error = new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed.');
    error.statusCode = 400;
    cb(error);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter,
});

module.exports = upload;
module.exports.uploadDir = uploadDir;
