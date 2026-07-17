require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    let result = await Product.findOne({ name: 'Alina için Destek Kartı - 1000 TL' });

    if (!result) {
      result = await Product.create({
        name: 'Alina için Destek Kartı - 1000 TL',
        description: 'Alina için destek ve yardım amacıyla oluşturulmuş 1000 TL paket.',
        price: 1000,
        stock: 999,
        imageUrl: '/assets/img/gallery/popular1.png',
        isPopular: true,
        paytrLink: 'https://www.paytr.com/link/8uAHUg8'
      });
    } else {
      result.description = 'Alina için destek ve yardım amacıyla oluşturulmuş 1000 TL paket.';
      result.price = 1000;
      result.stock = 999;
      result.imageUrl = '/assets/img/gallery/popular1.png';
      result.isPopular = true;
      result.paytrLink = 'https://www.paytr.com/link/8uAHUg8';
      await result.save();
    }

    console.log('✓ Paket oluşturuldu/güncellendi');
    console.log('Ürün:', result.name);
    console.log('Fiyat:', result.price);
    console.log('Link:', result.paytrLink);
    process.exit(0);
  } catch (error) {
    console.error('✗ Hata:', error.message);
    process.exit(1);
  }
})();
