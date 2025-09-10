// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { join, resolve } from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { database, COLLECTIONS } from './database-mock.js'; // Use mock database
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.set('trust proxy', 1);
app.use(helmet());
// Optionally restrict CORS via CORS_ORIGIN env (comma-separated). Defaults to permissive.
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : null;
if (allowedOrigins && allowedOrigins.length) {
  app.use(cors({ origin: allowedOrigins }));
} else {
  app.use(cors());
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
});
app.use('/api/', apiLimiter);

// Simple JWT auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Enforce auth on all API routes except health, token, and seed (for local development)
app.use('/api', (req, res, next) => {
  const open = req.path === '/health' || req.path === '/auth/token' || req.path === '/seed';
  if (open) return next();
  return requireAuth(req, res, next);
});

// Validation schemas
const youthSchema = z.object({
  id: z.string().uuid().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.coerce.date().optional().nullable(),
  age: z.number().int().min(0).max(120).optional().nullable(),
  admissionDate: z.coerce.date().optional().nullable(),
  level: z.number().int().min(0).max(10),
  pointTotal: z.number().int().min(0),
  referralSource: z.string().optional().nullable(),
  referralReason: z.string().optional().nullable(),
  educationInfo: z.string().optional().nullable(),
  medicalInfo: z.string().optional().nullable(),
  mentalHealthInfo: z.string().optional().nullable(),
  legalStatus: z.string().optional().nullable(),
  peerInteraction: z.number().min(0).max(5).optional().nullable(),
  adultInteraction: z.number().min(0).max(5).optional().nullable(),
  investmentLevel: z.number().min(0).max(5).optional().nullable(),
  dealAuthority: z.number().min(0).max(5).optional().nullable(),
  hyrnaRiskLevel: z.string().optional().nullable(),
  hyrnaScore: z.number().optional().nullable(),
  hyrnaAssessmentDate: z.coerce.date().optional().nullable(),
});

const behaviorPointsSchema = z.object({
  id: z.string().uuid().optional(),
  youth_id: z.string().min(1),
  date: z.coerce.date().optional().nullable(),
  morningPoints: z.number().int().min(0),
  afternoonPoints: z.number().int().min(0),
  eveningPoints: z.number().int().min(0),
  totalPoints: z.number().int().min(0),
  comments: z.string().optional().nullable(),
});

const progressNoteSchema = z.object({
  id: z.string().uuid().optional(),
  youth_id: z.string().min(1),
  date: z.coerce.date().optional().nullable(),
  category: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  staff: z.string().optional().nullable(),
});

const dailyRatingSchema = z.object({
  id: z.string().uuid().optional(),
  youth_id: z.string().min(1),
  date: z.coerce.date().optional().nullable(),
  peerInteraction: z.number().min(0).max(5).optional().nullable(),
  adultInteraction: z.number().min(0).max(5).optional().nullable(),
  investmentLevel: z.number().min(0).max(5).optional().nullable(),
  dealAuthority: z.number().min(0).max(5).optional().nullable(),
  staff: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
});

// Auth route: exchange ADMIN_API_KEY for a JWT (simple bootstrap)
app.post('/api/auth/token', authLimiter, (req, res) => {
  const provided = req.headers['x-api-key'] || req.body?.apiKey;
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return res.status(500).json({ error: 'Server not configured' });
  if (provided !== adminKey) return res.status(401).json({ error: 'Invalid api key' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

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
app.get('/api/youth', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.YOUTH);
    const youth = await collection.find({}).toArray();
    res.json(youth);
  } catch (error) {
    console.error('Error fetching youth:', error);
    res.status(500).json({ error: 'Failed to fetch youth data' });
  }
});

app.get('/api/youth/:id', requireAuth, async (req, res) => {
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

app.post('/api/youth', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.YOUTH);
    const parsed = youthSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const youthData = {
      ...parsed.data,
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

app.put('/api/youth/:id', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.YOUTH);
    const parsed = youthSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const updateData = {
      ...parsed.data,
      updatedAt: new Date()
    };
    
    const result = await collection.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    const updated = result && result.value;
    if (!updated) {
      return res.status(404).json({ error: 'Youth not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating youth:', error);
    res.status(500).json({ error: 'Failed to update youth' });
  }
});

app.delete('/api/youth/:id', requireAuth, async (req, res) => {
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
app.get('/api/behavior-points/youth/:youthId', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.BEHAVIOR_POINTS);
    const points = await collection.find({ youth_id: req.params.youthId })
      .toArray();
    res.json(points);
  } catch (error) {
    console.error('Error fetching behavior points:', error);
    res.status(500).json({ error: 'Failed to fetch behavior points' });
  }
});

app.post('/api/behavior-points', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.BEHAVIOR_POINTS);
    const parsed = behaviorPointsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const pointsData = {
      ...parsed.data,
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
app.get('/api/progress-notes/youth/:youthId', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.PROGRESS_NOTES);
    const notes = await collection.find({ youth_id: req.params.youthId })
      .toArray();
    res.json(notes);
  } catch (error) {
    console.error('Error fetching progress notes:', error);
    res.status(500).json({ error: 'Failed to fetch progress notes' });
  }
});

app.post('/api/progress-notes', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.PROGRESS_NOTES);
    const parsed = progressNoteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const noteData = {
      ...parsed.data,
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
app.get('/api/daily-ratings/youth/:youthId', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.DAILY_RATINGS);
    const ratings = await collection.find({ youth_id: req.params.youthId })
      .toArray();
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching daily ratings:', error);
    res.status(500).json({ error: 'Failed to fetch daily ratings' });
  }
});

app.post('/api/daily-ratings', requireAuth, async (req, res) => {
  try {
    const collection = database.getCollection(COLLECTIONS.DAILY_RATINGS);
    const parsed = dailyRatingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    const ratingData = {
      ...parsed.data,
      id: req.body.id || uuidv4(),
      createdAt: new Date()
    };
    
    const result = await collection.insertOne(ratingData);
    res.status(201).json(ratingData);
  } catch (error) {
    console.error('Error creating daily rating:', error);
    res.status(500).json({ error: 'Failed to create daily rating' });
  }
});

// Add a sample youth for testing
app.get('/api/seed', async (req, res) => {
  try {
    const youthCollection = database.getCollection(COLLECTIONS.YOUTH);
    
    // Add a sample youth
    const sampleYouth = {
      id: uuidv4(),
      firstName: 'John',
      lastName: 'Doe',
      dob: new Date('2008-01-01'),
      age: 16,
      admissionDate: new Date('2023-01-15'),
      level: 3,
      pointTotal: 120,
      referralSource: 'School Counselor',
      referralReason: 'Behavioral issues at school',
      educationInfo: 'Currently in 10th grade',
      medicalInfo: 'No known medical issues',
      mentalHealthInfo: 'Diagnosed with ADHD',
      legalStatus: 'No legal issues',
      peerInteraction: 3,
      adultInteraction: 4,
      investmentLevel: 3,
      dealAuthority: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await youthCollection.insertOne(sampleYouth);
    
    // Add sample behavior points
    const pointsCollection = database.getCollection(COLLECTIONS.BEHAVIOR_POINTS);
    const samplePoints = {
      id: uuidv4(),
      youth_id: sampleYouth.id,
      date: new Date(),
      morningPoints: 8,
      afternoonPoints: 7,
      eveningPoints: 9,
      totalPoints: 24,
      comments: 'Good day overall',
      createdAt: new Date()
    };
    
    await pointsCollection.insertOne(samplePoints);
    
    // Add sample progress note
    const notesCollection = database.getCollection(COLLECTIONS.PROGRESS_NOTES);
    const sampleNote = {
      id: uuidv4(),
      youth_id: sampleYouth.id,
      date: new Date(),
      category: 'Behavioral',
      note: 'John showed improvement in following instructions today.',
      rating: 4,
      staff: 'Jane Smith',
      createdAt: new Date()
    };
    
    await notesCollection.insertOne(sampleNote);
    
    res.json({ 
      message: 'Sample data created successfully',
      youth: sampleYouth,
      behaviorPoints: samplePoints,
      progressNote: sampleNote
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

// Connect to database and start server
const PORT = process.env.PORT || 3000;

// Initialize database connection
database.connect().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔑 API Key Authentication enabled`);
    console.log(`🌐 CORS: ${allowedOrigins ? 'Restricted to specific origins' : 'All origins allowed'}`);
    console.log(`📊 Using mock database for local development`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});