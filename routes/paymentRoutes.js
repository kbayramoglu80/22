const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Middleware to set up test cart if needed
const setupTestCart = (req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [
            {
                name: 'Test Ürün 1',
                price: 100,
                quantity: 1,
                productId: 'test-001',
                selectedCarat: '18 kt'
            }
        ];
    }
    next();
};

router.post('/create-token', setupTestCart, paymentController.createPaymentToken);
// NOT: POST /payment/callback zaten server.js'de en üstte tanımlandı!
router.get('/callback', paymentController.paymentCallbackGet);
router.get('/test', paymentController.paymentTest);
router.get('/test-config', paymentController.testPayTRConfig);
router.get('/test-direct', paymentController.createPaymentTokenDirect);
router.get('/test-form', setupTestCart, (req, res) => {
    // Test endpoint to simulate checkout form submission
    res.json({
        message: 'Test endpoint for form-based payment',
        sessionCart: req.session.cart,
        instructions: 'POST to /payment/create-token with user details'
    });
});
router.get('/debug', paymentController.paymentDebug);

router.get('/success', paymentController.paymentSuccess);
router.get('/fail', paymentController.paymentFail);

module.exports = router;
