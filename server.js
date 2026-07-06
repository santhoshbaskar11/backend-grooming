// Import the 'express' package so we can create a web server
const express = require('express');

// Import the 'cors' package to allow requests from different origins (e.g. your React frontend)
const cors = require('cors');

// Create an Express application instance
const app = express();

// Define the port number the server will listen on
const PORT = 5000;

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

// Enable CORS so the frontend (running on a different port) can talk to this server
app.use(cors());

// Parse incoming requests with JSON payloads (makes req.body available)
app.use(express.json());

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

// Define a GET route at /api/test
// When someone visits http://localhost:5000/api/test, this function runs
app.get('/api/test', (req, res) => {
  // Send back a JSON response with a success message
  res.json({ message: 'Backend is working!' });
});

// ─────────────────────────────────────────────
// Start the Server
// ─────────────────────────────────────────────

// Tell the server to start listening for requests on PORT 5000
app.listen(PORT, () => {
  // This message prints to the terminal once the server is ready
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
