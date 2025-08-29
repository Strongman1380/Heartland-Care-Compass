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

      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(dbName);
      
      console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
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