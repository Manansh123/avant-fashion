const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary ko credentials se connect karna
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage engine define karna (Folder ka naam "Avant_Closet" rakhenge)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'Avant_Closet',
        allowed_formats: ['jpg', 'png', 'jpeg'], // Sirf image formats allow karein
    },
});

const upload = multer({ storage: storage });

module.exports = upload;