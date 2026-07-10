// ─────────────────────────────────────────────
// server.js  –  Grooming Store Express Backend
// Deployed at: https://backend-grooming-1.onrender.com
// ─────────────────────────────────────────────

// Load environment variables from .env (local development only)
require('dotenv').config();

// Import Express – our web-server framework
const express = require('express');

// Import CORS – allows the browser to call this API from a different origin
const cors = require('cors');

// Import the Razorpay payment routes
const paymentRoutes = require('./routes/payment');

// Create the Express application
const app = express();

// ─────────────────────────────────────────────
// Port
// Render sets process.env.PORT automatically.
// Falls back to 5000 when running locally.
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
// CORS — allow requests from our frontend origins
// ─────────────────────────────────────────────
const allowedOrigins = [
  'https://santhoshbaskar11.github.io', // GitHub Pages (production frontend)
  'http://localhost:5173',               // Vite dev server (local development)
  'http://localhost:3000',               // CRA dev server (alternative local)
];

// Enable CORS with the whitelist above
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin header (e.g. Postman, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        // Origin is allowed — proceed
        callback(null, true);
      } else {
        // Origin is NOT in the whitelist — reject
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Parse incoming JSON request bodies
app.use(express.json());

// ─────────────────────────────────────────────
// Routes  (existing routes kept unchanged)
// ─────────────────────────────────────────────

// Root health-check — confirms the server is online
app.get('/', (req, res) => {
  res.json({ status: 'Grooming Store API is online 🚀' });
});

// Test route — used by the frontend to verify connectivity
// GET https://backend-grooming-1.onrender.com/api/test
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Diagnostic route — tests Supabase credentials and connection schema
app.get('/api/test-supabase', async (req, res) => {
  const getSupabase = require('./config/supabase');
  const diagnostics = {
    supabaseUrlSet:            !!process.env.SUPABASE_URL,
    supabaseServiceRoleKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl:               process.env.SUPABASE_URL || 'NOT SET',
    errors:                    []
  };

  try {
    const supabase = getSupabase();
    
    // 1. Check customers table
    const { data: custData, error: custError } = await supabase.from('customers').select('id').limit(1);
    diagnostics.customersTableConnection = {
      success:  !custError,
      message:  custError ? custError.message : 'Successfully connected to customers table.',
      rowCount: custData ? custData.length : 0
    };

    // 2. Check payments table
    const { data: payData, error: payError } = await supabase.from('payments').select('*').limit(1);
    diagnostics.paymentsTableConnection = {
      success: !payError,
      message: payError ? payError.message : 'Successfully connected to payments table.',
      columns: payData && payData[0] ? Object.keys(payData[0]) : []
    };

  } catch (err) {
    diagnostics.errors.push(err.message);
  }

  return res.json(diagnostics);
});


// ─────────────────────────────────────────────
// Payment Routes (Razorpay)
// ─────────────────────────────────────────────
// Mounts all routes in routes/payment.js under /api/payment
// POST /api/payment/create-order  — create a Razorpay order
// POST /api/payment/verify        — verify payment signature
app.use('/api/payment', paymentRoutes);

// ─────────────────────────────────────────────
// Start the Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`🌍 Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Test route  : http://localhost:${PORT}/api/test`);
});
