import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class DatabaseConnection {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      const uri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DB_NAME;

      if (!uri || !dbName) {
        throw new Error('MongoDB URI or database name not found in environment variables');
      }

      // Check if URI is still the placeholder
      if (uri.includes('username:password') || uri.includes('YOUR_USERNAME')) {
        console.log('⚠️  MongoDB URI contains placeholder values. Please update your .env file with actual MongoDB Atlas credentials.');
        console.log('📖 See setup-mongodb.md for detailed setup instructions.');
        return;
      }

      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(dbName);
      
      console.log('✅ Connected to MongoDB Atlas');
      
      // Initialize database indexes and structure
      await this.initializeDatabase();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      console.log('💡 Make sure your MongoDB Atlas credentials are correct in the .env file');
      console.log('📖 See setup-mongodb.md for setup instructions');
      throw error;
    }
  }

  async initializeDatabase() {
    try {
      console.log('🔧 Initializing database indexes...');
      
      // Create indexes for better performance
      
      // Youth collection indexes
      await this.db.collection(COLLECTIONS.YOUTH).createIndex({ firstName: 1, lastName: 1 });
      await this.db.collection(COLLECTIONS.YOUTH).createIndex({ level: 1 });
      await this.db.collection(COLLECTIONS.YOUTH).createIndex({ createdAt: -1 });
      
      // Behavior Points collection indexes
      await this.db.collection(COLLECTIONS.BEHAVIOR_POINTS).createIndex({ youth_id: 1, date: -1 });
      await this.db.collection(COLLECTIONS.BEHAVIOR_POINTS).createIndex({ date: -1 });
      
      // Progress Notes collection indexes
      await this.db.collection(COLLECTIONS.PROGRESS_NOTES).createIndex({ youth_id: 1, date: -1 });
      await this.db.collection(COLLECTIONS.PROGRESS_NOTES).createIndex({ category: 1 });
      await this.db.collection(COLLECTIONS.PROGRESS_NOTES).createIndex({ rating: 1 });
      
      // Daily Ratings collection indexes
      await this.db.collection(COLLECTIONS.DAILY_RATINGS).createIndex({ youth_id: 1, date: -1 });
      await this.db.collection(COLLECTIONS.DAILY_RATINGS).createIndex({ date: -1 });
      
      // Assessments collection indexes
      await this.db.collection(COLLECTIONS.ASSESSMENTS).createIndex({ youth_id: 1, createdAt: -1 });
      
      console.log('✅ Database indexes initialized successfully');
      
      // Log collection stats
      const stats = await this.getDatabaseStats();
      console.log('📊 Database stats:', stats);
      
    } catch (error) {
      console.error('Database initialization error:', error);
      // Don't throw here - connection is still valid even if initialization fails
    }
  }

  async getDatabaseStats() {
    try {
      const stats = {
        youth: await this.db.collection(COLLECTIONS.YOUTH).countDocuments(),
        behaviorPoints: await this.db.collection(COLLECTIONS.BEHAVIOR_POINTS).countDocuments(),
        progressNotes: await this.db.collection(COLLECTIONS.PROGRESS_NOTES).countDocuments(),
        dailyRatings: await this.db.collection(COLLECTIONS.DAILY_RATINGS).countDocuments(),
        assessments: await this.db.collection(COLLECTIONS.ASSESSMENTS).countDocuments(),
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        youth: 0,
        behaviorPoints: 0,
        progressNotes: 0,
        dailyRatings: 0,
        assessments: 0,
      };
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getCollection(name) {
    return this.getDb().collection(name);
  }

  async ping() {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch (error) {
      console.error('Database ping failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const database = new DatabaseConnection();

// Collection names as constants
export const COLLECTIONS = {
  YOUTH: 'youth',
  BEHAVIOR_POINTS: 'behaviorPoints',
  PROGRESS_NOTES: 'progressNotes',
  DAILY_RATINGS: 'dailyRatings',
  ASSESSMENTS: 'assessments'
};