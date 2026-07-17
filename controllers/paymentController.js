const crypto = require('crypto');
const Order = require('../models/Order');

exports.createPaymentToken = async (req, res) => {
    try {
        console.log('========================================');
        console.log('=== PAYMENT TOKEN CREATION STARTED ===');
        console.log('Timestamp:', new Date().toISOString());
        
        const { user_name, user_address, user_phone, user_email } = req.body;

        // Cart check - use test cart if empty (for testing purposes)
        if (!req.session.cart || req.session.cart.length === 0) {
            console.log('INFO: Cart is empty, using test cart for demonstration');
            req.session.cart = [
                {
                    name: 'Test Product',
                    price: 100,
                    quantity: 1,
                    productId: null  // null for test cart
                }
            ];
        }

        let cartTotal = 0;
        const cart_items = req.session.cart.map(item => {
            cartTotal += (item.price * item.quantity);
            return [item.name, item.price.toString(), item.quantity];
        });
        console.log('Cart Total:', cartTotal);
        console.log('Cart Items:', cart_items);

        // PayTR Settings
        const merchant_id = process.env.PAYTR_MERCHANT_ID;
        const merchant_key = process.env.PAYTR_MERCHANT_KEY;
        const merchant_salt = process.env.PAYTR_MERCHANT_SALT;

        console.log('PayTR Config Check:');
        console.log('  merchant_id:', merchant_id ? '✓ SET' : '✗ MISSING');
        console.log('  merchant_key:', merchant_key ? '✓ SET' : '✗ MISSING');
        console.log('  merchant_salt:', merchant_salt ? '✓ SET' : '✗ MISSING');

        if (!merchant_id || !merchant_key || !merchant_salt) {
            console.error('CRITICAL: PayTR credentials missing in environment variables');
            return res.status(500).json({ status: 'error', reason: 'PayTR konfigürasyonu eksik. Lütfen sistem yöneticisine başvurun.' });
        }

        const merchant_oid = 'OID' + Date.now();
        const payment_amount = Math.round(cartTotal * 100);
        const host = req.get('host');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const baseUrl = process.env.PAYTR_BASE_URL || `${protocol}://${host}`;
        const merchant_ok_url = `${baseUrl}/payment/success`;
        const merchant_fail_url = `${baseUrl}/payment/fail`;
        const user_basket = Buffer.from(JSON.stringify(cart_items)).toString('base64');
        const timeout_limit = "30";
        const isTestMode = ['1', 'true', 'yes', 'on'].includes((process.env.PAYTR_TEST_MODE || '').toLowerCase());
        const debug_on = isTestMode ? 1 : 0;
        const test_mode = isTestMode ? 1 : 0;
        const no_installment = 0;
        const max_installment = 0;
        const user_ip = req.ip || '127.0.0.1';
        const email = req.session.user ? req.session.user.email : (user_email || 'guest@test.com');
        const currency = "TL";

        console.log('Request Parameters:');
        console.log('  merchant_oid:', merchant_oid);
        console.log('  payment_amount:', payment_amount, '(Kuruş)');
        console.log('  email:', email);
        console.log('  user_ip:', user_ip);
        console.log('  merchant_ok_url:', merchant_ok_url);
        console.log('  merchant_fail_url:', merchant_fail_url);
        console.log('  test_mode:', test_mode);

        // Hash oluşturma
        const hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
        const paytr_token = crypto.createHmac('sha256', merchant_key).update(hash_str + merchant_salt).digest('base64');

        console.log('Token Generation:');
        console.log('  hash_str length:', hash_str.length);
        console.log('  paytr_token:', paytr_token.substring(0, 30) + '...');

        // Siparişi veritabanına "Pending" olarak kaydet
        try {
            const newOrder = new Order({
                user: req.session.user ? (req.session.user._id || req.session.user.id) : null,
                guestName: !req.session.user ? user_name : undefined,
                guestEmail: !req.session.user ? email : undefined,
                guestPhone: !req.session.user ? user_phone : undefined,
                items: req.session.cart.map(item => ({
                    product: item.productId || new require('mongoose').Types.ObjectId(),  // Generate a fake ID if not provided
                    quantity: item.quantity,
                    price: item.price,
                    selectedCarat: item.selectedCarat || null,
                    selectedSize: item.selectedSize || null
                })),
                totalAmount: cartTotal,
                shippingAddress: user_address + " - " + user_phone + " - " + user_name,
                merchant_oid: merchant_oid,
                paymentStatus: 'Pending'
            });
            await newOrder.save();
            console.log('Order created in DB:', merchant_oid);
        } catch (orderErr) {
            console.warn('Warning: Could not save order:', orderErr.message);
            // Continue anyway - payment token creation is more important
        }

        // For Basic API, we'll return the form data that needs to be submitted
        // The frontend will handle the form submission
        const formData = {
            merchant_id: merchant_id,
            user_ip: user_ip,
            merchant_oid: merchant_oid,
            email: email,
            payment_amount: payment_amount,
            paytr_token: paytr_token,
            user_basket: user_basket,
            debug_on: debug_on,
            no_installment: no_installment,
            max_installment: max_installment,
            user_name: user_name,
            user_address: user_address,
            user_phone: user_phone,
            merchant_ok_url: merchant_ok_url,
            merchant_fail_url: merchant_fail_url,
            timeout_limit: timeout_limit,
            currency: currency,
            test_mode: test_mode
        };

        console.log('✓ SUCCESS: Using PayTR Basic API with form submission');
        console.log('  merchant_oid:', merchant_oid);
        console.log('========================================');
        
        res.json({ 
            status: 'success',
            formData: formData,
            paytrFormUrl: 'https://www.paytr.com/odeme/api/get-token',
            isBasicApi: true
        });
    } catch (err) {
        console.error('========================================');
        console.error('✗ EXCEPTION: Payment Token Creation Error');
        console.error('Error:', err.message);
        console.error('Stack:', err.stack);
        console.error('========================================');
        res.status(500).json({ status: 'error', reason: 'Ödeme başlatılamadı: ' + err.message });
    }
};

exports.testPayTRConfig = async (req, res) => {
    console.log('========================================');
    console.log('=== PAYTR CONFIGURATION TEST ===');
    const testResult = {
        timestamp: new Date().toISOString(),
        environment_variables: {},
        connectivity_test: {},
        recommendations: []
    };

    // 1. Check environment variables
    const merchant_id = process.env.PAYTR_MERCHANT_ID;
    const merchant_key = process.env.PAYTR_MERCHANT_KEY;
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT;
    const base_url = process.env.PAYTR_BASE_URL;
    const test_mode = process.env.PAYTR_TEST_MODE;

    testResult.environment_variables = {
        PAYTR_MERCHANT_ID: merchant_id ? `✓ ${merchant_id}` : '✗ MISSING',
        PAYTR_MERCHANT_KEY: merchant_key ? `✓ (${merchant_key.length} chars)` : '✗ MISSING',
        PAYTR_MERCHANT_SALT: merchant_salt ? `✓ (${merchant_salt.length} chars)` : '✗ MISSING',
        PAYTR_BASE_URL: base_url || '✗ MISSING',
        PAYTR_TEST_MODE: test_mode || 'not set (default 0)'
    };

    if (!merchant_id || !merchant_key || !merchant_salt) {
        testResult.recommendations.push('❌ PayTR credentials are missing in .env file');
    } else {
        testResult.recommendations.push('✓ All PayTR credentials are set');
    }

    // 2. Test PayTR API connectivity
    try {
        console.log('Testing PayTR API connectivity...');
        const testPayload = new URLSearchParams({
            merchant_id: merchant_id || 'TEST',
            user_ip: '127.0.0.1',
            merchant_oid: 'TEST_' + Date.now(),
            email: 'test@example.com',
            payment_amount: 100,
            paytr_token: 'test_token_for_connectivity_check',
            user_basket: Buffer.from(JSON.stringify([['Test Item', '1', '1']])).toString('base64'),
            debug_on: 1,
            no_installment: 0,
            max_installment: 0,
            user_name: 'Test User',
            user_address: 'Test Address',
            user_phone: '05301234567',
            merchant_ok_url: 'https://example.com/success',
            merchant_fail_url: 'https://example.com/fail',
            timeout_limit: '30',
            currency: 'TL',
            test_mode: 1
        });

        const response = await Promise.race([
            fetch('https://www.paytr.com/odeme/api/get-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: testPayload
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        testResult.connectivity_test = {
            status: '✓ API reachable',
            http_status: response.status,
            timestamp: new Date().toISOString()
        };
        testResult.recommendations.push('✓ PayTR API is reachable');
    } catch (error) {
        testResult.connectivity_test = {
            status: '✗ API not reachable',
            error: error.message,
            timestamp: new Date().toISOString()
        };
        testResult.recommendations.push(`❌ Cannot reach PayTR API: ${error.message}`);
    }

    // 3. Provide recommendations
    if (!base_url) {
        testResult.recommendations.push('⚠️ PAYTR_BASE_URL is not set. Your checkout callback URLs may be incorrect.');
    }

    if (test_mode !== '1' && test_mode !== '0') {
        testResult.recommendations.push(`⚠️ PAYTR_TEST_MODE should be "1" (test) or "0" (production), currently: ${test_mode}`);
    }

    console.log('Test Result:', JSON.stringify(testResult, null, 2));
    console.log('========================================');

    res.json(testResult);
};

exports.createPaymentTokenDirect = async (req, res) => {
    console.log('========================================');
    console.log('=== DIRECT PAYMENT TOKEN TEST ===');
    console.log('Timestamp:', new Date().toISOString());
    
    try {
        // Test parameters
        const merchant_id = process.env.PAYTR_MERCHANT_ID;
        const merchant_key = process.env.PAYTR_MERCHANT_KEY;
        const merchant_salt = process.env.PAYTR_MERCHANT_SALT;
        
        const test_items = [['Test Ürün', '100.00', '1']];
        const payment_amount = 10000; // 100 TL in cents
        const merchant_oid = 'TEST_' + Date.now();
        const user_ip = req.ip || '127.0.0.1';
        const email = 'test@example.com';
        const user_basket = Buffer.from(JSON.stringify(test_items)).toString('base64');
        const baseUrl = process.env.PAYTR_BASE_URL;
        const merchant_ok_url = `${baseUrl}/payment/success`;
        const merchant_fail_url = `${baseUrl}/payment/fail`;
        
        const no_installment = 0;
        const max_installment = 0;
        const currency = "TL";
        const test_mode = 1; // Always use test mode for this endpoint
        
        console.log('Creating token with:');
        console.log('  merchant_id:', merchant_id);
        console.log('  payment_amount:', payment_amount);
        console.log('  merchant_oid:', merchant_oid);
        
        const hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
        const paytr_token = crypto.createHmac('sha256', merchant_key).update(hash_str + merchant_salt).digest('base64');
        
        const postData = new URLSearchParams({
            merchant_id: merchant_id,
            user_ip: user_ip,
            merchant_oid: merchant_oid,
            email: email,
            payment_amount: payment_amount,
            paytr_token: paytr_token,
            user_basket: user_basket,
            debug_on: 1,
            no_installment: no_installment,
            max_installment: max_installment,
            user_name: 'Test User',
            user_address: 'Test Address',
            user_phone: '05301234567',
            merchant_ok_url: merchant_ok_url,
            merchant_fail_url: merchant_fail_url,
            timeout_limit: '30',
            currency: currency,
            test_mode: test_mode
        });

        console.log('Sending request to PayTR...');
        const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: postData
        });

        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw response:', responseText.substring(0, 500));
        
        const responseData = JSON.parse(responseText);
        console.log('Parsed response:', JSON.stringify(responseData, null, 2));
        console.log('========================================');
        
        res.json({
            success: responseData.status === 'success',
            response: responseData,
            debug_info: {
                merchant_oid: merchant_oid,
                test_mode: test_mode,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('========================================');
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.paymentCallback = async (req, res) => {
    // ------------------------------
    // 1. ADIM: HER ŞEYDEN ÖNCE "OK" YANITINI DÖN!
    // Bu, PayTR'nin isteği başarıyla aldığımızı bildirsin
    // ------------------------------
    console.log('========================================');
    console.log('=== PAYTR WEBHOOK ALINDI ===');
    console.log('Zaman:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('IP:', req.ip);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body || {}, null, 2));

    // HEMEN "OK" YANITINI DÖN - PayTR bunu bekliyor!
    res.send('OK');

    // ------------------------------
    // 2. ADIM: ARKADAN İSTEĞİ İŞLE
    // ------------------------------
    try {
        const body = req.body || {};
        const merchant_oid = body.merchant_oid;
        const status = body.status;
        const total_amount = body.total_amount;
        const hash = body.hash;
        const payment_type = body.payment_type;

        console.log('Alınan Alanlar:');
        console.log('  merchant_oid:', merchant_oid);
        console.log('  status:', status);
        console.log('  total_amount:', total_amount);
        console.log('  hash:', hash);
        console.log('  payment_type:', payment_type);

        // Gerekli alanları kontrol et
        if (!merchant_oid || !status || !total_amount || !hash) {
            console.error('HATA: Eksik alanlar!');
            console.log('========================================');
            return;
        }

        const merchant_key = process.env.PAYTR_MERCHANT_KEY;
        const merchant_salt = process.env.PAYTR_MERCHANT_SALT;

        if (!merchant_key || !merchant_salt) {
            console.error('HATA: Çevre değişkenleri eksik!');
            console.log('========================================');
            return;
        }

        // Hash oluştur
        // PayTR dökümanına göre hash kontrolü
        const hash_str = merchant_oid + merchant_salt + status + total_amount;
        const calculated_hash = crypto.createHmac('sha256', merchant_key).update(hash_str).digest('base64');

        console.log('Hash Kontrolü:');
        console.log('  Gelen Hash:', hash);
        console.log('  Hesaplanan Hash:', calculated_hash);
        console.log('  Eşleşiyor mu?', hash === calculated_hash ? 'EVET ✓' : 'HAYIR ✗');

        if (hash !== calculated_hash) {
            console.error('HATA: Hash eşleşmesi başarısız!');
            console.log('========================================');
            return;
        }

        // Siparişi bul ve güncelle
        const order = await Order.findOne({ merchant_oid });

        if (!order) {
            console.warn('UYARI: Sipariş veritabanında bulunamadı! merchant_oid:', merchant_oid);
        } else {
            order.paymentStatus = status === 'success' ? 'Paid' : 'Failed';
            await order.save();
            console.log('BAŞARILI: Sipariş durumu güncellendi:', merchant_oid, '->', order.paymentStatus);
        }

        console.log('=== PAYTR İŞLEMİ TAMAMLANDI ===');
        console.log('========================================');
    } catch (error) {
        console.error('========================================');
        console.error('=== PAYTR WEBHOOK İŞLEM HATASI (AMA OK yanıtı zaten gönderildi) ===');
        console.error('Hata:', error);
        console.error('Stack:', error.stack);
        console.error('========================================');
    }
};

exports.paymentDebug = (req, res) => {
    const debugInfo = {
        server_status: 'running',
        endpoint: '/payment/callback',
        notification_url: 'https://yourdomain.com/payment/callback',
        timestamp: new Date().toISOString(),
        env_check: {
            PAYTR_MERCHANT_ID: process.env.PAYTR_MERCHANT_ID ? 'Set' : 'Not Set',
            PAYTR_MERCHANT_KEY: process.env.PAYTR_MERCHANT_KEY ? 'Set' : 'Not Set',
            PAYTR_MERCHANT_SALT: process.env.PAYTR_MERCHANT_SALT ? 'Set' : 'Not Set',
            NODE_ENV: process.env.NODE_ENV || 'development',
            MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set'
        },
        test_instructions: [
            '1. Check if your server is running',
            '2. Go to PayTR Panel -> Ayarlar',
            '3. Verify Notification URL is: https://yourdomain.com/payment/callback',
            '4. Make sure there are no redirects (HTTP -> HTTPS or www -> non-www)',
            '5. Check server logs for incoming requests'
        ]
    };

    console.log('=== PAYTR DEBUG SAYFASI ===');
    console.log(debugInfo);

    res.render('payment_debug', { debugInfo });
};

exports.paymentTest = (req, res) => {
    const testData = {
        status: 'success',
        message: 'Payment callback endpoint is working!',
        endpoint: '/payment/callback',
        method: 'POST',
        expected_fields: ['merchant_oid', 'status', 'total_amount', 'hash'],
        documentation: 'Bu endpoint sadece POST isteklerini kabul eder. PayTR bildirimleri bu adrese gönderilir.',
        server_time: new Date().toISOString()
    };

    console.log('=== PAYTR TEST ENDPOINT ÇAĞRILDI ===');
    console.log('Zaman:', testData.server_time);

    res.json(testData);
};

exports.paymentSuccess = (req, res) => {
    // Sepeti temizle
    if (req.session) {
        req.session.cart = [];
    }
    res.render('payment_success');
};

exports.paymentFail = (req, res) => {
    res.render('payment_fail');
};

exports.paymentCallbackGet = (req, res) => {
    console.error('========================================');
    console.error('=== DİKKAT: POST YERİNE GET İSTEĞİ ULAŞTI! ===');
    console.error('Zaman:', new Date().toISOString());
    console.error('URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
    console.error('Headers:', JSON.stringify(req.headers, null, 2));
    console.error('========================================');

    const currentUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    res.status(405).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>PayTR Callback Hatası</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; line-height: 1.6; }
                .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .info { background: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                .success { background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                code { background: #f8f9fa; padding: 3px 8px; border-radius: 4px; }
                h1 { color: #333; }
            </style>
        </head>
        <body>
            <h1>⚠️ PayTR Callback Yönlendirme Sorunu</h1>
            
            <div class="error">
                <strong>HATA:</strong> Sunucunuza POST yerine GET isteği ulaştı!
            </div>
            
            <div class="info">
                <strong>Şu anki URL:</strong> <code>${currentUrl}</code>
            </div>
            
            <div class="info">
                <h3>Bu hatanın sebebi:</h3>
                <p>Sitenizde otomatik bir yönlendirme (redirect) var:</p>
                <ul>
                    <li><code>http://</code> → <code>https://</code> yönlendirmesi</li>
                    <li><code>www.helpaline.com.tr</code> → <code>helpaline.com.tr</code> yönlendirmesi</li>
                    <li>veya tam tersi</li>
                </ul>
                <p>Yönlendirmeler POST isteklerini GET'e çevirir ve PayTR verileri kaybolur!</p>
            </div>
            
            <div class="success">
                <h3>✅ ÇÖZÜM:</h3>
                <p><strong>1. PayTR Panelinde Bildirim URL'sini güncelleyin:</strong></p>
                <p>Aşağıdaki URL'lerden hangisi <strong>yönlendirme yapmadan</strong> direkt çalışıyorsa onu kullanın:</p>
                <ul>
                    <li><code>https://www.helpaline.com.tr/payment/callback</code></li>
                    <li><code>https://helpaline.com.tr/payment/callback</code></li>
                </ul>
                
                <p><strong>2. Hangisini kullanmalısınız?</strong></p>
                <p>Her ikisini de tarayıcıda açıp hangisi yönlendirme yapmadan kalıyorsa onu PayTR panelinde ayarlayın.</p>
                
                <p><strong>3. Veya sunucu ayarlarınızı düzenleyin:</strong></p>
                <p>/payment/callback adresine gelen istekleri yönlendirmeden direkt Node.js uygulamanıza gönderin.</p>
            </div>
            
            <div class="info">
                <h3>Test Edin:</h3>
                <p><a href="/payment/debug">Debug sayfasına git</a></p>
            </div>
        </body>
        </html>
    `);
};
