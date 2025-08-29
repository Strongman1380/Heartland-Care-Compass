// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { join, resolve } from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { database, COLLECTIONS } from './database.js';

// Load environment variables
dotenv.config();

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
    const collection = database.getCollection(COLLECTIONS.YOUTH);
    const youth = await collection.find({}).toArray();
    res.json(youth);
  } catch (error) {
    console.error('Error fetching youth:', error);
    res.status(500).json({ error: 'Failed to fetch youth data' });
  }
});

app.get('/api/youth/:id', async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.YOUTH);
    const youth = await collection.findOne({ id: req.params.id });
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
    const collection = database.getCollection(COLLECTIONS.YOUTH);
    const youthData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(youthData);
    res.status(201).json(youthData);
  } catch (error) {
    console.error('Error creating youth:', error);
    res.status(500).json({ error: 'Failed to create youth' });
  }
});

app.put('/api/youth/:id', async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.YOUTH);
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const result = await collection.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return res.status(404).json({ error: 'Youth not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error updating youth:', error);
    res.status(500).json({ error: 'Failed to update youth' });
  }
});

app.delete('/api/youth/:id', async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.YOUTH);
    const result = await collection.deleteOne({ id: req.params.id });
    
    if (result.deletedCount === 0) {
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
    const collection = database.getCollection(COLLECTIONS.BEHAVIOR_POINTS);
    const points = await collection.find({ youth_id: req.params.youthId })
      .sort({ date: -1 })
      .toArray();
    res.json(points);
  } catch (error) {
    console.error('Error fetching behavior points:', error);
    res.status(500).json({ error: 'Failed to fetch behavior points' });
  }
});

app.post('/api/behavior-points', async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.BEHAVIOR_POINTS);
    const pointsData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(pointsData);
    res.status(201).json(pointsData);
  } catch (error) {
    console.error('Error saving behavior points:', error);
    res.status(500).json({ error: 'Failed to save behavior points' });
  }
});

// Progress Notes API Routes
app.get('/api/progress-notes/youth/:youthId', async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.PROGRESS_NOTES);
    const notes = await collection.find({ youth_id: req.params.youthId })
      .sort({ date: -1 })
      .toArray();
    res.json(notes);
  } catch (error) {
    console.error('Error fetching progress notes:', error);
    res.status(500).json({ error: 'Failed to fetch progress notes' });
  }
});

app.post('/api/progress-notes', async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.PROGRESS_NOTES);
    const noteData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(noteData);
    res.status(201).json(noteData);
  } catch (error) {
    console.error('Error creating progress note:', error);
    res.status(500).json({ error: 'Failed to create progress note' });
  }
});

// Daily Ratings API Routes
app.get('/api/daily-ratings/youth/:youthId', async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.DAILY_RATINGS);
    const ratings = await collection.find({ youth_id: req.params.youthId })
      .sort({ date: -1 })
      .toArray();
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching daily ratings:', error);
    res.status(500).json({ error: 'Failed to fetch daily ratings' });
  }
});

app.post('/api/daily-ratings', async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.DAILY_RATINGS);
    const ratingData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(ratingData);
    res.status(201).json(ratingData);
  } catch (error) {
    console.error('Error saving daily rating:', error);
    res.status(500).json({ error: 'Failed to save daily rating' });
  }
});

// Data migration endpoint (for moving from localStorage to MongoDB)
app.post('/api/migrate', async (req, res) => {
  try {
    const { youth, behaviorPoints, progressNotes, dailyRatings } = req.body;
    
    let results = {
      youth: 0,
      behaviorPoints: 0,
      progressNotes: 0,
      dailyRatings: 0
    };

    // Migrate youth data
    if (youth && youth.length > 0) {
      const youthCollection = database.getCollection(COLLECTIONS.YOUTH);
      const youthData = youth.map(y => ({
        ...y,
        createdAt: y.createdAt ? new Date(y.createdAt) : new Date(),
        updatedAt: y.updatedAt ? new Date(y.updatedAt) : new Date()
      }));
      await youthCollection.insertMany(youthData);
      results.youth = youthData.length;
    }

    // Migrate behavior points
    if (behaviorPoints && behaviorPoints.length > 0) {
      const pointsCollection = database.getCollection(COLLECTIONS.BEHAVIOR_POINTS);
      const pointsData = behaviorPoints.map(bp => ({
        ...bp,
        date: bp.date ? new Date(bp.date) : new Date(),
        createdAt: bp.createdAt ? new Date(bp.createdAt) : new Date()
      }));
      await pointsCollection.insertMany(pointsData);
      results.behaviorPoints = pointsData.length;
    }

    // Migrate progress notes
    if (progressNotes && progressNotes.length > 0) {
      const notesCollection = database.getCollection(COLLECTIONS.PROGRESS_NOTES);
      const notesData = progressNotes.map(pn => ({
        ...pn,
        date: pn.date ? new Date(pn.date) : new Date(),
        createdAt: pn.createdAt ? new Date(pn.createdAt) : new Date()
      }));
      await notesCollection.insertMany(notesData);
      results.progressNotes = notesData.length;
    }

    // Migrate daily ratings
    if (dailyRatings && dailyRatings.length > 0) {
      const ratingsCollection = database.getCollection(COLLECTIONS.DAILY_RATINGS);
      const ratingsData = dailyRatings.map(dr => ({
        ...dr,
        date: dr.date ? new Date(dr.date) : new Date(),
        createdAt: dr.createdAt ? new Date(dr.createdAt) : new Date(),
        updatedAt: dr.updatedAt ? new Date(dr.updatedAt) : new Date()
      }));
      await ratingsCollection.insertMany(ratingsData);
      results.dailyRatings = ratingsData.length;
    }

    res.json({
      message: 'Migration completed successfully',
      results
    });
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
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
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
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