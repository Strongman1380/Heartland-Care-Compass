#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  
  console.log('🔍 Testing MongoDB connection...');
  console.log('URI (masked):', uri.replace(/\/\/.*@/, '//***:***@'));
  console.log('Database:', dbName);
  
  const client = new MongoClient(uri);
  
  try {
    console.log('📡 Connecting...');
    await client.connect();
    
    console.log('✅ Connected successfully!');
    
    // Test database access
    const db = client.db(dbName);
    await db.admin().ping();
    console.log('✅ Database ping successful!');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📊 Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check MongoDB Atlas Database Access:');
      console.log('   - Go to Database Access in MongoDB Atlas');
      console.log('   - Verify user "bhinrichs1380" exists');
      console.log('   - Ensure user has "readWrite" role on the database');
      console.log('');
      console.log('2. Check Network Access:');
      console.log('   - Go to Network Access in MongoDB Atlas');
      console.log('   - Add your current IP address or use 0.0.0.0/0 for testing');
      console.log('');
      console.log('3. Verify credentials:');
      console.log('   - Username: bhinrichs1380');
      console.log('   - Password: m0n3jt9ZVwY4HQZQ');
    }
  } finally {
    await client.close();
  }
}

testConnection().catch(console.error);