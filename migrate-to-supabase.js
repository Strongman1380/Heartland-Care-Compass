#!/usr/bin/env node

/**
 * Migration script to move data from MongoDB to Supabase
 * 
 * Usage:
 * 1. Make sure your MongoDB connection is working
 * 2. Set up your Supabase environment variables
 * 3. Run: node migrate-to-supabase.js
 */

import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'heartlandCareCompass';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase credentials not found in environment variables');
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Initialize clients
const mongoClient = new MongoClient(MONGODB_URI);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateCollection(collectionName, tableName, transformFn = null) {
  console.log(`\n📦 Migrating ${collectionName} to ${tableName}...`);
  
  try {
    // Get MongoDB data
    const db = mongoClient.db(MONGODB_DB_NAME);
    const collection = db.collection(collectionName);
    const documents = await collection.find({}).toArray();
    
    console.log(`   Found ${documents.length} documents in ${collectionName}`);
    
    if (documents.length === 0) {
      console.log(`   ✅ No data to migrate for ${collectionName}`);
      return;
    }
    
    // Transform data if needed
    const transformedData = transformFn ? documents.map(transformFn) : documents;
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from(tableName)
      .insert(transformedData);
    
    if (error) {
      console.error(`   ❌ Error migrating ${collectionName}:`, error);
      return;
    }
    
    console.log(`   ✅ Successfully migrated ${documents.length} records to ${tableName}`);
    
  } catch (error) {
    console.error(`   ❌ Error migrating ${collectionName}:`, error);
  }
}

// Transform functions for each collection
const transformYouth = (doc) => {
  const { _id, ...rest } = doc;
  return {
    id: _id.toString(),
    ...rest,
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString()
  };
};

const transformBehaviorPoints = (doc) => {
  const { _id, youthId, ...rest } = doc;
  return {
    id: _id.toString(),
    youth_id: youthId,
    ...rest,
    createdAt: doc.createdAt || new Date().toISOString()
  };
};

const transformCaseNotes = (doc) => {
  const { _id, youthId, ...rest } = doc;
  return {
    id: _id.toString(),
    youth_id: youthId,
    ...rest,
    createdAt: doc.createdAt || new Date().toISOString()
  };
};

const transformDailyRatings = (doc) => {
  const { _id, youthId, ...rest } = doc;
  return {
    id: _id.toString(),
    youth_id: youthId,
    ...rest,
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString()
  };
};

async function main() {
  console.log('🚀 Starting migration from MongoDB to Supabase...');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    
    // Test Supabase connection
    console.log('📡 Testing Supabase connection...');
    const { data, error } = await supabase.from('youth').select('count').limit(1);
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    console.log('✅ Connected to Supabase');
    
    // Migrate collections
    await migrateCollection('youth', 'youth', transformYouth);
    await migrateCollection('behaviorPoints', 'behavior_points', transformBehaviorPoints);
    await migrateCollection('progressNotes', 'case_notes', transformCaseNotes);
    await migrateCollection('dailyRatings', 'daily_ratings', transformDailyRatings);
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Migration interrupted');
  await mongoClient.close();
  process.exit(0);
});

// Run migration
main().catch(console.error);