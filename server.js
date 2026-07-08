// ─────────────────────────────────────────────
// server.js  –  Grooming Store Express Backend
// ─────────────────────────────────────────────

// Load environment variables from a .env file (if present locally)
require('dotenv').config();

// Import Express – our web-server framework
const express = require('express');

// Import CORS – allows browsers on different origins to call this API
const cors = require('cors');

// Create the Express application
const app = express();

// ─────────────────────────────────────────────
// Port
// Use the PORT env variable Render sets automatically,
// or fall back to 5000 when running locally.
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
// CORS Configuration
// Allow requests from:
//   • your deployed GitHub Pages / Vercel frontend
//   • localhost during local development
// ─────────────────────────────────────────────
const allowedOrigins = [
  'https://santhoshbaskar11.github.io', // GitHub Pages frontend
  'http://localhost:5173',               // Vite dev server (local)
  'http://localhost:3000',               // CRA dev server (local)
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        // Origin is in the allowed list – permit the request
        callback(null, true);
      } else {
        // Origin is NOT allowed – reject with an error
        callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Permitted HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'],     // Permitted request headers
    credentials: true,                                     // Allow cookies / auth headers
  })
);

// Parse JSON request bodies (makes req.body available in POST / PUT routes)
app.use(express.json());

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

// Health-check / test route
// GET https://YOUR-BACKEND.onrender.com/api/test
app.get('/api/test', (req, res) => {
  // Return a JSON response so the frontend can confirm connectivity
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(), // Useful for debugging cache issues
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root route – helpful if someone visits the bare domain
app.get('/', (req, res) => {
  res.json({ status: 'Grooming Store API is online 🚀' });
});

// ─────────────────────────────────────────────
// Start the Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`🌍 Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Test route  : http://localhost:${PORT}/api/test`);
});
