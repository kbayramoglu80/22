const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const isAdmin = require('../controllers/isAdmin');
const upload = require('../middlewares/upload');

router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);

router.use(isAdmin); // Diğer tüm admin rotaları için isAdmin kontrolü

router.get('/', adminController.getDashboard);
router.get('/products', adminController.getProducts);
router.get('/products/add', adminController.getAddProduct);

// AJAX ön-yükleme: tek dosyayı Cloudinary'ye yükler, URL döner
router.post('/upload-temp', upload.single('file'), adminController.uploadTemp);

router.post('/products/add', upload.single('imageFile'), adminController.addProduct);
router.post('/products/edit/:id', upload.single('imageFile'), adminController.editProduct);
router.get('/products/delete/:id', adminController.deleteProduct);

router.get('/orders', adminController.getOrders);
router.post('/orders/update/:id', adminController.updateOrderStatus);

router.get('/users', adminController.getUsers);
router.get('/users/delete/:id', adminController.deleteUser);

module.exports = router;
