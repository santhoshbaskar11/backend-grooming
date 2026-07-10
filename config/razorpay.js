// ─────────────────────────────────────────────────────────────
// backend/config/razorpay.js
//
// Initialises and exports a single Razorpay SDK instance.
// All payment routes import this file — credentials are read
// from environment variables, NEVER hardcoded here.
// ─────────────────────────────────────────────────────────────

const Razorpay = require('razorpay');

// Validate that both keys exist before starting the server
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error(
    '❌ Razorpay credentials are missing!\n' +
    '   Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env'
  );
}

// Create and export the Razorpay instance
const razorpayInstance = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,     // rzp_test_TBoGLRLCURaigU
  key_secret: process.env.RAZORPAY_KEY_SECRET, // poSX7HoZnSVCzkWoJE5kPJ4c
});

module.exports = razorpayInstance;
