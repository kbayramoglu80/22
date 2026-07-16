const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

router.get('/', indexController.getHome);
router.get('/shop', (req, res) => res.redirect('/urunler'));
router.get('/urunler', indexController.getUrunler);
router.get('/urunler/:id', indexController.getUrunDetay);
router.get('/kategori/:slug', indexController.getCategory);
router.get('/product/:id', indexController.getProductDetails);

// Auth Shortcuts
const authController = require('../controllers/authController');
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

// Cart Routes
router.get('/cart', indexController.getCart);
router.post('/cart/add', indexController.addToCart);
router.post('/cart/remove', indexController.removeFromCart);

// Checkout Route
router.get('/checkout', indexController.getCheckout);

module.exports = router;
