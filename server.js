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

// ─────────────────────────────────────────────
// Start the Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`🌍 Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Test route  : http://localhost:${PORT}/api/test`);
});
