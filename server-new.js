// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { join, resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database connection and services
import { database } from './src/lib/database.js';
import { youthService } from './src/lib/services/youth.service.js';
import { behaviorPointsService } from './src/lib/services/behaviorPoints.service.js';
import { progressNotesService } from './src/lib/services/progressNotes.service.js';
import { dailyRatingsService } from './src/lib/services/dailyRatings.service.js';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const isDbConnected = await database.ping();
    res.json({
      status: 'ok',
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Youth API Routes
app.get('/api/youth', async (req, res) => {
  try {
    const youth = await youthService.findAll();
    res.json(youth);
  } catch (error) {
    console.error('Error fetching youth:', error);
    res.status(500).json({ error: 'Failed to fetch youth data' });
  }
});

app.get('/api/youth/:id', async (req, res) => {
  try {
    const youth = await youthService.findById(req.params.id);
    if (!youth) {
      return res.status(404).json({ error: 'Youth not found' });
    }
    res.json(youth);
  } catch (error) {
    console.error('Error fetching youth:', error);
    res.status(500).json({ error: 'Failed to fetch youth data' });
  }
});

app.post('/api/youth', async (req, res) => {
  try {
    const youth = await youthService.create(req.body);
    res.status(201).json(youth);
  } catch (error) {
    console.error('Error creating youth:', error);
    res.status(500).json({ error: 'Failed to create youth' });
  }
});

app.put('/api/youth/:id', async (req, res) => {
  try {
    const youth = await youthService.updateById(req.params.id, req.body);
    if (!youth) {
      return res.status(404).json({ error: 'Youth not found' });
    }
    res.json(youth);
  } catch (error) {
    console.error('Error updating youth:', error);
    res.status(500).json({ error: 'Failed to update youth' });
  }
});

app.delete('/api/youth/:id', async (req, res) => {
  try {
    const deleted = await youthService.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Youth not found' });
    }
    res.json({ message: 'Youth deleted successfully' });
  } catch (error) {
    console.error('Error deleting youth:', error);
    res.status(500).json({ error: 'Failed to delete youth' });
  }
});

// Behavior Points API Routes
app.get('/api/behavior-points/youth/:youthId', async (req, res) => {
  try {
    const points = await behaviorPointsService.getByYouthId(req.params.youthId);
    res.json(points);
  } catch (error) {
    console.error('Error fetching behavior points:', error);
    res.status(500).json({ error: 'Failed to fetch behavior points' });
  }
});

app.get('/api/behavior-points/youth/:youthId/date/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const points = await behaviorPointsService.getByYouthAndDate(req.params.youthId, date);
    res.json(points);
  } catch (error) {
    console.error('Error fetching behavior points:', error);
    res.status(500).json({ error: 'Failed to fetch behavior points' });
  }
});

app.post('/api/behavior-points', async (req, res) => {
  try {
    const points = await behaviorPointsService.createOrUpdate(req.body);
    res.status(201).json(points);
  } catch (error) {
    console.error('Error saving behavior points:', error);
    res.status(500).json({ error: 'Failed to save behavior points' });
  }
});

// Progress Notes API Routes
app.get('/api/progress-notes/youth/:youthId', async (req, res) => {
  try {
    const notes = await progressNotesService.getByYouthId(req.params.youthId);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching progress notes:', error);
    res.status(500).json({ error: 'Failed to fetch progress notes' });
  }
});

app.post('/api/progress-notes', async (req, res) => {
  try {
    const note = await progressNotesService.create(req.body);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating progress note:', error);
    res.status(500).json({ error: 'Failed to create progress note' });
  }
});

// Daily Ratings API Routes
app.get('/api/daily-ratings/youth/:youthId', async (req, res) => {
  try {
    const ratings = await dailyRatingsService.getByYouthId(req.params.youthId);
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching daily ratings:', error);
    res.status(500).json({ error: 'Failed to fetch daily ratings' });
  }
});

app.post('/api/daily-ratings', async (req, res) => {
  try {
    const rating = await dailyRatingsService.createOrUpdate(req.body);
    res.status(201).json(rating);
  } catch (error) {
    console.error('Error saving daily rating:', error);
    res.status(500).json({ error: 'Failed to save daily rating' });
  }
});

// Analytics endpoints
app.get('/api/analytics/youth/:youthId/behavior-trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = await behaviorPointsService.getBehaviorTrends(req.params.youthId, days);
    res.json(trends);
  } catch (error) {
    console.error('Error fetching behavior trends:', error);
    res.status(500).json({ error: 'Failed to fetch behavior trends' });
  }
});

app.get('/api/analytics/youth/:youthId/rating-trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = await dailyRatingsService.getRatingTrends(req.params.youthId, days);
    res.json(trends);
  } catch (error) {
    console.error('Error fetching rating trends:', error);
    res.status(500).json({ error: 'Failed to fetch rating trends' });
  }
});

// Serve static files from the dist directory
const distPath = resolve('dist');
app.use(express.static(distPath));

// Serve the index.html for all non-API routes to support SPA routing
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(join(distPath, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Initialize database connection and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();
    console.log('✅ Database connected successfully');

    // Create HTTP server
    const server = createServer(app);

    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Open http://localhost:${PORT} in your browser`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down server...');
      await database.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();