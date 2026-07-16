const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary yapılandırması
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage — resource_type explicitly set to support large video and image uploads correctly
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isVideo = file.mimetype.startsWith('video/');
        return {
            folder:        isVideo ? 'mucevher-video' : 'mucevher-urun',
            resource_type: isVideo ? 'video' : 'image'
        };
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

module.exports = upload;
module.exports.cloudinary = cloudinary;
