// ─────────────────────────────────────────────────────────────
// backend/config/razorpay.js
//
// Returns a Razorpay instance on demand.
// Uses a lazy singleton pattern so the server starts successfully
// even if keys aren't loaded yet, and only fails when a payment
// route is actually called without valid credentials.
// ─────────────────────────────────────────────────────────────

const Razorpay = require('razorpay');

let _instance = null;

/**
 * getRazorpay()
 * Returns the shared Razorpay SDK instance.
 * Throws a clear error if credentials are missing in the environment.
 */
const getRazorpay = () => {
  // Return cached instance if already created
  if (_instance) return _instance;

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Validate credentials at call-time, not at require-time
  // This way the server starts even if keys are missing,
  // and only the payment routes fail with a clear message.
  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials are missing. ' +
      'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your Render environment variables.'
    );
  }

  _instance = new Razorpay({
    key_id:     keyId,
    key_secret: keySecret,
  });

  return _instance;
};

module.exports = getRazorpay;
