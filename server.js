// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { join, resolve } from 'path';
import fs from 'fs';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the dist directory
const distPath = resolve('dist');
app.use(express.static(distPath));

// Serve the index.html for all routes to support SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// Create HTTP server
const server = createServer(app);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
