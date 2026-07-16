require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI yok (.env eksik?)');
    process.exit(1);
}

mongoose.connect(uri)
    .then(async () => {
        console.log('MongoDB bağlantısı başarılı. İlk ürünü çekiyorum...');
        const p = await Product.findOne().lean();
        if (!p) {
            console.log('Veritabanında ürün bulunamadı.');
            process.exit(0);
        }
        console.log('Product._id:', p._id);
        console.log('imageUrl:', p.imageUrl);
        console.log('images:', JSON.stringify(p.images || [], null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error('MongoDB bağlantı hatası:', err.message || err);
        process.exit(1);
    });
