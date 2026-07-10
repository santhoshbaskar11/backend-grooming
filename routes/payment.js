// ─────────────────────────────────────────────────────────────
// backend/routes/payment.js
//
// Razorpay payment routes:
//   POST /api/payment/create-order  → creates a Razorpay order
//   POST /api/payment/verify        → verifies signature + logs all details
// ─────────────────────────────────────────────────────────────

const express     = require('express');
const crypto      = require('crypto'); // Node built-in — no install needed
const getRazorpay = require('../config/razorpay');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/payment/create-order
//
// Request body:
//   { amount: <number in ₹>, currency: 'INR', receipt: 'string' }
//
// Response:
//   { success, order_id, amount (paise), currency, key_id }
// ─────────────────────────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  try {
    const razorpay = getRazorpay(); // throws if credentials missing

    const { amount, currency = 'INR', receipt } = req.body;

    // ── Validate amount ──────────────────────────────────────────
    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) <= 0) {
      console.error('❌ create-order: invalid amount received:', amount);
      return res.status(400).json({
        success: false,
        message: `Invalid amount "${amount}". Please provide a positive number (in ₹).`,
      });
    }

    const amountInRupees = Number(amount);
    // Razorpay expects the smallest currency unit: paise for INR
    const amountInPaise  = Math.round(amountInRupees * 100);

    const orderOptions = {
      amount:          amountInPaise,
      currency:        currency,
      receipt:         receipt || `rcpt_${Date.now()}`,
      payment_capture: 1, // auto-capture on success
    };

    const order = await razorpay.orders.create(orderOptions);

    // ── Render log ────────────────────────────────────────────────
    console.log('─────────────────────────────────────────');
    console.log('📦 Razorpay Order Created');
    console.log(`   Order ID  : ${order.id}`);
    console.log(`   Amount    : ₹${amountInRupees} (${amountInPaise} paise)`);
    console.log(`   Currency  : ${order.currency}`);
    console.log(`   Receipt   : ${order.receipt}`);
    console.log('─────────────────────────────────────────');

    return res.status(200).json({
      success:        true,
      order_id:       order.id,
      amount:         order.amount,         // paise — used by Razorpay checkout
      amount_rupees:  amountInRupees,       // ₹  — useful for frontend display
      currency:       order.currency,
      receipt:        order.receipt,
      key_id:         process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    console.error('❌ create-order error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message.includes('credentials')
        ? '❌ Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to Render environment variables.'
        : 'Failed to create Razorpay order. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/payment/verify
//
// Called by the frontend after the Razorpay checkout modal
// reports success. Verifies the HMAC-SHA256 signature and
// logs full payment details to Render logs.
//
// Request body:
//   {
//     razorpay_order_id:   "order_...",
//     razorpay_payment_id: "pay_...",
//     razorpay_signature:  "<hmac-sha256>",
//     amount_rupees:       499,           ← ₹ amount (passed from frontend)
//     amount_paise:        49900,         ← paise amount (from Razorpay order)
//     currency:            "INR",
//     customer_name:       "Santhosh",
//     customer_email:      "user@example.com"
//   }
//
// Response: { success, payment_id, amount_rupees, amount_paise }
// ─────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // Amount fields — frontend must pass these for logging & storage
      amount_rupees,
      amount_paise,
      currency     = 'INR',
      customer_name  = 'Unknown',
      customer_email = 'Unknown',
    } = req.body;

    // ── Field validation ─────────────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ verify: missing payment fields', {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: razorpay_signature ? '(present)' : '(MISSING)',
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields.',
      });
    }

    // ── Amount guard ─────────────────────────────────────────────
    // Convert paise → rupees if rupees wasn't provided
    const rupees = (amount_rupees !== undefined && amount_rupees !== null && !isNaN(amount_rupees))
      ? Number(amount_rupees)
      : (amount_paise ? Number(amount_paise) / 100 : null);

    const paise = (amount_paise !== undefined && amount_paise !== null && !isNaN(amount_paise))
      ? Number(amount_paise)
      : (rupees ? Math.round(rupees * 100) : null);

    if (!rupees || rupees <= 0) {
      console.warn('⚠️  verify: amount is missing or zero', { amount_rupees, amount_paise });
    }

    // ── HMAC-SHA256 signature verification ───────────────────────
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // timing-safe compare prevents timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(razorpay_signature)
    );

    if (!isValid) {
      console.warn('⚠️  verify: signature mismatch', {
        order_id:   razorpay_order_id,
        payment_id: razorpay_payment_id,
      });
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Signature mismatch.',
      });
    }

    // ── ✅ Payment is genuine — log everything to Render ─────────
    console.log('═══════════════════════════════════════════════');
    console.log('✅ PAYMENT VERIFIED SUCCESSFULLY');
    console.log('───────────────────────────────────────────────');
    console.log(`   Payment ID    : ${razorpay_payment_id}`);
    console.log(`   Order ID      : ${razorpay_order_id}`);
    console.log(`   Amount Paid   : ₹${rupees !== null ? rupees.toFixed(2) : 'MISSING'}`);
    console.log(`   Amount (paise): ${paise !== null ? paise : 'MISSING'}`);
    console.log(`   Currency      : ${currency}`);
    console.log(`   Customer Name : ${customer_name}`);
    console.log(`   Customer Email: ${customer_email}`);
    console.log(`   Payment Status: SUCCESS`);
    console.log(`   Verified At   : ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════');

    // Return all verified details to the frontend so it can save to DB
    return res.status(200).json({
      success:        true,
      message:        'Payment verified successfully!',
      payment_id:     razorpay_payment_id,
      order_id:       razorpay_order_id,
      amount_rupees:  rupees,
      amount_paise:   paise,
      currency:       currency,
      customer_name:  customer_name,
      customer_email: customer_email,
      payment_status: 'Paid',
      verified_at:    new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ verify error:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'Payment verification encountered a server error.',
      error:   process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
