// ─────────────────────────────────────────────────────────────
// backend/routes/payment.js
//
// Razorpay payment routes:
//   POST /api/payment/create-order  → creates a Razorpay order
//   POST /api/payment/verify        → verifies payment signature
// ─────────────────────────────────────────────────────────────

const express  = require('express');
const crypto   = require('crypto');          // Node built-in — no install needed
const razorpay = require('../config/razorpay');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/payment/create-order
//
// Called by the frontend when the user clicks "Pay Now".
// Creates a Razorpay order and returns the order details +
// the public key_id so the frontend can open the checkout.
//
// Request body:  { amount: <number in ₹>, currency: 'INR', receipt: 'string' }
// Response:      { order_id, amount, currency, key_id }
// ─────────────────────────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Please provide a positive number.',
      });
    }

    // Razorpay expects amount in the smallest currency unit (paise for INR)
    // So ₹499 → 49900 paise
    const amountInPaise = Math.round(Number(amount) * 100);

    // Build the Razorpay order options
    const orderOptions = {
      amount:   amountInPaise,
      currency: currency,
      receipt:  receipt || `receipt_${Date.now()}`,
      // payment_capture: 1 means auto-capture on success (no manual capture needed)
      payment_capture: 1,
    };

    // Call Razorpay API to create the order
    const order = await razorpay.orders.create(orderOptions);

    // Return order details + the public key_id to the frontend
    return res.status(200).json({
      success:  true,
      order_id: order.id,             // e.g. "order_OFdkls..."
      amount:   order.amount,         // amount in paise
      currency: order.currency,       // "INR"
      key_id:   process.env.RAZORPAY_KEY_ID, // safe to send — this is the PUBLIC key
    });

  } catch (error) {
    console.error('❌ Razorpay create-order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay order. Please try again.',
      error:   process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payment/verify
//
// Called by the frontend AFTER the user completes payment in
// the Razorpay checkout modal. Verifies the HMAC signature to
// confirm the payment is genuine and not tampered with.
//
// Request body:
//   {
//     razorpay_order_id:   "order_OFdkls...",
//     razorpay_payment_id: "pay_OFdkls...",
//     razorpay_signature:  "<hmac-sha256 hash>"
//   }
// Response: { success: true, payment_id } on success
// ─────────────────────────────────────────────────────────────
router.post('/verify', (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // All three fields are required
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification fields.',
      });
    }

    // Generate the expected HMAC-SHA256 signature using our secret key
    // Formula: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // Compare signatures using a timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(razorpay_signature)
    );

    if (isValid) {
      // ✅ Payment is genuine
      console.log(`✅ Payment verified: ${razorpay_payment_id}`);
      return res.status(200).json({
        success:    true,
        message:    'Payment verified successfully!',
        payment_id: razorpay_payment_id,
      });
    } else {
      // ❌ Signature mismatch — possible tampering
      console.warn(`⚠️  Signature mismatch for order: ${razorpay_order_id}`);
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Signature does not match.',
      });
    }

  } catch (error) {
    console.error('❌ Razorpay verify error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification encountered an error.',
      error:   process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
