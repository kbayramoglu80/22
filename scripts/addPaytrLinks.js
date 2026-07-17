require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function addPaytrLinks() {
    try {
        console.log('MongoDB bağlanılıyor...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ MongoDB bağlantısı başarılı');

        // Örnek: "Alina için Destek Kartı - 100 TL" ürününe link ekle
        const result100 = await Product.findOneAndUpdate(
            { name: 'Aline için Destek Kartı - 100 TL' },
            { 
                paytrLink: 'https://www.paytr.com/link/UjN3KZs'
            },
            { new: true }
        );

        if (result100) {
            console.log('✓ "Aline için Destek Kartı - 100 TL" güncellendi:', result100.paytrLink);
        } else {
            console.log('✗ "Aline için Destek Kartı - 100 TL" ürünü bulunamadı');
        }

        // Örnek: "Alina için Destek Kartı - 250 TL" ürününe link ekle
        const result250 = await Product.findOneAndUpdate(
            { name: 'Alina için Destek Kartı - 250 TL' },
            { 
                paytrLink: 'https://www.paytr.com/link/UjN3KZs'
            },
            { new: true }
        );

        if (result250) {
            console.log('✓ "Alina için Destek Kartı - 250 TL" güncellendi:', result250.paytrLink);
        } else {
            console.log('✗ "Alina için Destek Kartı - 250 TL" ürünü bulunamadı');
        }

        // Tüm ürünleri listele
        const allProducts = await Product.find({}, 'name paytrLink price');
        console.log('\n📦 Tüm Ürünler:');
        allProducts.forEach((p, idx) => {
            const link = p.paytrLink ? '✓ ' + p.paytrLink : '✗ Yok';
            console.log(`${idx + 1}. ${p.name} (${p.price} TL) - ${link}`);
        });

        console.log('\n✅ İşlem tamamlandı!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Hata:', err.message);
        process.exit(1);
    }
}

addPaytrLinks();
