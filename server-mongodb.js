import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'heartland_compass';

let db;
let client;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'MongoDB', timestamp: new Date().toISOString() });
});

// Youth endpoints
app.get('/api/youths', async (req, res) => {
  try {
    const youths = await db.collection('youths').find({}).sort({ createdAt: -1 }).toArray();
    res.json(youths);
  } catch (error) {
    console.error('Error fetching youths:', error);
    res.status(500).json({ error: 'Failed to fetch youths' });
  }
});

app.get('/api/youths/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const youth = await db.collection('youths').findOne({ _id: new ObjectId(id) });
    if (!youth) {
      return res.status(404).json({ error: 'Youth not found' });
    }
    res.json(youth);
  } catch (error) {
    console.error('Error fetching youth:', error);
    res.status(500).json({ error: 'Failed to fetch youth' });
  }
});

app.post('/api/youths', async (req, res) => {
  try {
    const youthData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await db.collection('youths').insertOne(youthData);
    const youth = await db.collection('youths').findOne({ _id: result.insertedId });
    res.status(201).json(youth);
  } catch (error) {
    console.error('Error creating youth:', error);
    res.status(500).json({ error: 'Failed to create youth' });
  }
});

app.put('/api/youths/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    delete updateData._id; // Remove _id from update data
    
    const result = await db.collection('youths').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Youth not found' });
    }
    
    const youth = await db.collection('youths').findOne({ _id: new ObjectId(id) });
    res.json(youth);
  } catch (error) {
    console.error('Error updating youth:', error);
    res.status(500).json({ error: 'Failed to update youth' });
  }
});

app.delete('/api/youths/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.collection('youths').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Youth not found' });
    }
    
    res.json({ message: 'Youth deleted successfully' });
  } catch (error) {
    console.error('Error deleting youth:', error);
    res.status(500).json({ error: 'Failed to delete youth' });
  }
});

// Behavior Points endpoints
app.get('/api/behavior-points/youth/:youthId', async (req, res) => {
  try {
    const { youthId } = req.params;
    const points = await db.collection('behaviorPoints')
      .find({ youthId })
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
    const pointData = {
      ...req.body,
      createdAt: new Date()
    };
    const result = await db.collection('behaviorPoints').insertOne(pointData);
    const point = await db.collection('behaviorPoints').findOne({ _id: result.insertedId });
    res.status(201).json(point);
  } catch (error) {
    console.error('Error creating behavior point:', error);
    res.status(500).json({ error: 'Failed to create behavior point' });
  }
});

// Progress Notes endpoints
app.get('/api/progress-notes/youth/:youthId', async (req, res) => {
  try {
    const { youthId } = req.params;
    const notes = await db.collection('progressNotes')
      .find({ youthId })
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
    const noteData = {
      ...req.body,
      createdAt: new Date()
    };
    const result = await db.collection('progressNotes').insertOne(noteData);
    const note = await db.collection('progressNotes').findOne({ _id: result.insertedId });
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating progress note:', error);
    res.status(500).json({ error: 'Failed to create progress note' });
  }
});

// Daily Ratings endpoints
app.get('/api/daily-ratings/youth/:youthId', async (req, res) => {
  try {
    const { youthId } = req.params;
    const ratings = await db.collection('dailyRatings')
      .find({ youthId })
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
    const ratingData = {
      ...req.body,
      createdAt: new Date()
    };
    const result = await db.collection('dailyRatings').insertOne(ratingData);
    const rating = await db.collection('dailyRatings').findOne({ _id: result.insertedId });
    res.status(201).json(rating);
  } catch (error) {
    console.error('Error creating daily rating:', error);
    res.status(500).json({ error: 'Failed to create daily rating' });
  }
});

// Populate mock data endpoint
app.post('/api/populate-mock-data', async (req, res) => {
  try {
    // Check if data already exists
    const existingCount = await db.collection('youths').countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ error: 'Data already exists. Clear database first.' });
    }

    // Mock data (same as in your mockData.ts but adapted for MongoDB)
    const mockYouthData = [
      {
        firstName: "Michael",
        lastName: "Johnson",
        age: 16,
        dob: new Date("2008-03-15"),
        admissionDate: new Date("2024-01-15"),
        level: 2,
        pointTotal: 145000,
        referralSource: "County Social Services",
        referralReason: "Family conflict and truancy issues",
        legalStatus: "Court ordered placement",
        educationInfo: "Currently in 10th grade, struggles with math",
        medicalInfo: "No known allergies, regular checkups",
        mentalHealthInfo: "Diagnosed with ADHD, taking medication",
        peerInteraction: 4,
        adultInteraction: 3,
        investmentLevel: 4,
        dealAuthority: 2,
        hyrnaRiskLevel: "Medium",
        hyrnaScore: 65,
        hyrnaAssessmentDate: new Date("2024-01-20"),
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15")
      },
      {
        firstName: "David",
        lastName: "Williams",
        age: 15,
        dob: new Date("2009-07-22"),
        admissionDate: new Date("2024-02-01"),
        level: 1,
        pointTotal: 89000,
        referralSource: "Department of Children Services",
        referralReason: "Behavioral issues at home and school",
        legalStatus: "Voluntary placement",
        educationInfo: "9th grade, good in English and history",
        medicalInfo: "Asthma, uses inhaler as needed",
        mentalHealthInfo: "Anxiety disorder, seeing counselor weekly",
        peerInteraction: 2,
        adultInteraction: 3,
        investmentLevel: 2,
        dealAuthority: 1,
        hyrnaRiskLevel: "Low",
        hyrnaScore: 35,
        hyrnaAssessmentDate: new Date("2024-02-05"),
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01")
      },
      {
        firstName: "James",
        lastName: "Brown",
        age: 17,
        dob: new Date("2007-11-08"),
        admissionDate: new Date("2024-01-10"),
        level: 3,
        pointTotal: 234000,
        referralSource: "Juvenile Court",
        referralReason: "Probation violation and substance abuse",
        legalStatus: "Court ordered residential treatment",
        educationInfo: "11th grade, working toward GED",
        medicalInfo: "Previous sports injury, left knee",
        mentalHealthInfo: "Substance abuse counseling, group therapy",
        peerInteraction: 5,
        adultInteraction: 4,
        investmentLevel: 5,
        dealAuthority: 4,
        hyrnaRiskLevel: "High",
        hyrnaScore: 85,
        hyrnaAssessmentDate: new Date("2024-01-15"),
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-01-10")
      },
      {
        firstName: "Christopher",
        lastName: "Davis",
        age: 14,
        dob: new Date("2010-05-30"),
        admissionDate: new Date("2024-03-01"),
        level: 1,
        pointTotal: 56000,
        referralSource: "School District",
        referralReason: "Chronic absenteeism and behavioral problems",
        legalStatus: "Educational placement",
        educationInfo: "8th grade, strong in science",
        medicalInfo: "Type 1 diabetes, insulin dependent",
        mentalHealthInfo: "Depression, individual therapy sessions",
        peerInteraction: 1,
        adultInteraction: 2,
        investmentLevel: 1,
        dealAuthority: 1,
        hyrnaRiskLevel: "Medium",
        hyrnaScore: 55,
        hyrnaAssessmentDate: new Date("2024-03-05"),
        createdAt: new Date("2024-03-01"),
        updatedAt: new Date("2024-03-01")
      }
    ];

    const result = await db.collection('youths').insertMany(mockYouthData);
    res.json({ 
      message: `Successfully inserted ${result.insertedCount} youth profiles`,
      insertedIds: result.insertedIds 
    });
  } catch (error) {
    console.error('Error populating mock data:', error);
    res.status(500).json({ error: 'Failed to populate mock data' });
  }
});

// Clear all data endpoint
app.delete('/api/clear-all-data', async (req, res) => {
  try {
    const collections = ['youths', 'behaviorPoints', 'progressNotes', 'dailyRatings'];
    let totalDeleted = 0;
    
    for (const collectionName of collections) {
      const result = await db.collection(collectionName).deleteMany({});
      totalDeleted += result.deletedCount;
    }
    
    res.json({ 
      message: `Successfully cleared all data. Deleted ${totalDeleted} documents.`
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// Start server
async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`MongoDB API server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (client) {
    await client.close();
  }
  process.exit(0);
});

startServer().catch(console.error);