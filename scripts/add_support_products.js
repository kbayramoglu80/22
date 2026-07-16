const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı.');

    const supportProducts = [
      {
        name: 'Aline için Destek Kartı - 100 TL',
        description: 'Aline için destek ve yardım amaçlı bir bağış kartı. Teşekkürler! 🧡',
        price: 100,
        categories: [],
        stock: 999,
        imageUrl: '/assets/img/gallery/support-100tl.jpeg',
        isPopular: false
      },
      {
        name: 'Aline için Destek Kartı - 200 TL',
        description: 'Aline için güç ve yardım amaçlı destek kartı. Katkılarınız değerli.',
        price: 200,
        categories: [],
        stock: 999,
        imageUrl: '/assets/img/gallery/support-200tl.jpeg',
        isPopular: false
      }
    ];

    for (const product of supportProducts) {
      const exists = await Product.findOne({ name: product.name });
      if (!exists) {
        await Product.create(product);
        console.log('Eklendi:', product.name);
      } else {
        console.log('Zaten var:', product.name);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
})();
