import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
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

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public getCollection<T = any>(name: string): Collection<T> {
    return this.getDb().collection<T>(name);
  }

  // Health check method
  public async ping(): Promise<boolean> {
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
export const database = DatabaseConnection.getInstance();

// Collection names as constants
export const COLLECTIONS = {
  YOUTH: 'youth',
  BEHAVIOR_POINTS: 'behaviorPoints',
  PROGRESS_NOTES: 'progressNotes',
  DAILY_RATINGS: 'dailyRatings',
  ASSESSMENTS: 'assessments'
} as const;

// Export types for better TypeScript support
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];