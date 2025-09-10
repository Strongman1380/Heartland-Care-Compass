#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { join, resolve } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

console.log('🔍 Heartland Youth Compass Troubleshooting Tool');
console.log('===============================================\n');

// Check environment variables
console.log('📋 Checking environment variables...');
const requiredEnvVars = ['MONGODB_URI', 'MONGODB_DB_NAME', 'JWT_SECRET', 'ADMIN_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.log('   Please check your .env file and ensure all required variables are set.');
} else {
  console.log('✅ All required environment variables are set.');
}

// Check MongoDB connection
console.log('\n📊 Testing MongoDB connection...');
async function testMongoConnection() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  
  if (!uri || !dbName) {
    console.error('❌ MongoDB URI or database name not found in environment variables');
    return;
  }
  
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    await db.admin().ping();
    console.log('✅ Successfully connected to MongoDB Atlas');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`   Found ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('   Troubleshooting tips:');
    console.log('   - Check if your MongoDB Atlas cluster is running');
    console.log('   - Verify your connection string in the .env file');
    console.log('   - Ensure your IP address is whitelisted in MongoDB Atlas');
  } finally {
    if (client) await client.close();
  }
}

// Check file structure
console.log('\n📁 Checking critical files...');
const criticalFiles = [
  'server-mongodb.js',
  'database.js',
  'vite.config.ts',
  'package.json',
  'src/main.tsx',
  'src/App.tsx'
];

const missingFiles = criticalFiles.filter(file => !fs.existsSync(file));
if (missingFiles.length > 0) {
  console.error('❌ Missing critical files:', missingFiles.join(', '));
} else {
  console.log('✅ All critical files are present.');
}

// Check port availability
console.log('\n🔌 Checking port availability...');
const ports = [3000, 8080]; // Backend and frontend ports

function checkPort(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.on('error', () => {
      console.log(`❌ Port ${port} is already in use.`);
      resolve(false);
    });
    
    server.on('listening', () => {
      server.close();
      console.log(`✅ Port ${port} is available.`);
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Run all checks
async function runChecks() {
  await testMongoConnection();
  
  console.log('\n🔌 Checking port availability...');
  for (const port of ports) {
    await checkPort(port);
  }
  
  console.log('\n📝 Troubleshooting complete!');
  console.log('\nTo run the application locally:');
  console.log('1. Start the backend server: npm run start');
  console.log('2. In a separate terminal, start the frontend: npm run dev');
  console.log('3. Or run both together: npm run dev:full');
}

runChecks().catch(console.error);