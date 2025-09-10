// Mock implementation of the database.js module for local development
// This allows the application to run without a real MongoDB connection

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// In-memory storage for collections
const collections = {
  youth: [],
  behaviorPoints: [],
  progressNotes: [],
  dailyRatings: [],
  assessments: []
};

class MockCollection {
  constructor(name) {
    this.name = name;
    this.data = collections[name] || [];
  }

  async find(query = {}) {
    console.log(`[MOCK DB] find in ${this.name}`, query);
    return {
      toArray: async () => {
        return this.data;
      }
    };
  }

  async findOne(query = {}) {
    console.log(`[MOCK DB] findOne in ${this.name}`, query);
    if (query.id) {
      return this.data.find(item => item.id === query.id) || null;
    }
    return this.data[0] || null;
  }

  async insertOne(document) {
    console.log(`[MOCK DB] insertOne in ${this.name}`, document);
    this.data.push(document);
    return { insertedId: document.id };
  }

  async findOneAndUpdate(query, update, options = {}) {
    console.log(`[MOCK DB] findOneAndUpdate in ${this.name}`, query, update);
    const index = this.data.findIndex(item => item.id === query.id);
    if (index === -1) return { value: null };

    // Apply updates
    if (update.$set) {
      this.data[index] = { ...this.data[index], ...update.$set };
    }

    return { value: this.data[index] };
  }

  async deleteOne(query) {
    console.log(`[MOCK DB] deleteOne in ${this.name}`, query);
    const initialLength = this.data.length;
    this.data = this.data.filter(item => item.id !== query.id);
    return { deletedCount: initialLength - this.data.length };
  }
}

class MockDatabase {
  constructor() {
    this.connected = false;
  }

  collection(name) {
    return new MockCollection(name);
  }

  async ping() {
    return true;
  }

  async listCollections() {
    return {
      toArray: async () => {
        return Object.keys(collections).map(name => ({ name }));
      }
    };
  }
}

class MockDatabaseConnection {
  constructor() {
    this.client = null;
    this.db = new MockDatabase();
  }

  async connect() {
    try {
      console.log('✅ Connected to Mock MongoDB Database');
      this.connected = true;
    } catch (error) {
      console.error('❌ Mock MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    this.connected = false;
    console.log('🔌 Disconnected from Mock MongoDB');
  }

  getDb() {
    return this.db;
  }

  getCollection(name) {
    return new MockCollection(name);
  }

  async ping() {
    return true;
  }
}

// Export singleton instance
export const database = new MockDatabaseConnection();

// Collection names as constants
export const COLLECTIONS = {
  YOUTH: 'youth',
  BEHAVIOR_POINTS: 'behaviorPoints',
  PROGRESS_NOTES: 'progressNotes',
  DAILY_RATINGS: 'dailyRatings',
  ASSESSMENTS: 'assessments'
};