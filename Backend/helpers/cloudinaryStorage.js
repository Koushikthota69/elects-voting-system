const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'e-voting',
    format: async (req, file) => {
      // Determine format based on file mimetype
      if (file.mimetype === 'image/jpeg') return 'jpg';
      if (file.mimetype === 'image/png') return 'png';
      if (file.mimetype === 'image/gif') return 'gif';
      if (file.mimetype === 'image/webp') return 'webp';
      return 'jpg'; // default format
    },
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      return `${file.fieldname}-${timestamp}-${randomString}`;
    }
  }
});

module.exports = storage;