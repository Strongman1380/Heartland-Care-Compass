import { database, COLLECTIONS } from './database';

/**
 * Initialize database with indexes and basic structure
 * This will be called automatically when the application starts
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔧 Initializing database...');
    
    const db = database.getDb();
    
    // Create indexes for better performance
    
    // Youth collection indexes
    await db.collection(COLLECTIONS.YOUTH).createIndex({ firstName: 1, lastName: 1 });
    await db.collection(COLLECTIONS.YOUTH).createIndex({ level: 1 });
    await db.collection(COLLECTIONS.YOUTH).createIndex({ createdAt: -1 });
    
    // Behavior Points collection indexes
    await db.collection(COLLECTIONS.BEHAVIOR_POINTS).createIndex({ youthId: 1, date: -1 });
    await db.collection(COLLECTIONS.BEHAVIOR_POINTS).createIndex({ date: -1 });
    await db.collection(COLLECTIONS.BEHAVIOR_POINTS).createIndex({ youthId: 1 });
    
    // Progress Notes collection indexes
    await db.collection(COLLECTIONS.PROGRESS_NOTES).createIndex({ youthId: 1, date: -1 });
    await db.collection(COLLECTIONS.PROGRESS_NOTES).createIndex({ category: 1 });
    await db.collection(COLLECTIONS.PROGRESS_NOTES).createIndex({ rating: 1 });
    await db.collection(COLLECTIONS.PROGRESS_NOTES).createIndex({ date: -1 });
    
    // Daily Ratings collection indexes
    await db.collection(COLLECTIONS.DAILY_RATINGS).createIndex({ youthId: 1, date: -1 });
    await db.collection(COLLECTIONS.DAILY_RATINGS).createIndex({ date: -1 });
    
    // Assessments collection indexes
    await db.collection(COLLECTIONS.ASSESSMENTS).createIndex({ youthId: 1, createdAt: -1 });
    await db.collection(COLLECTIONS.ASSESSMENTS).createIndex({ type: 1 });
    
    console.log('✅ Database initialized successfully');
    
    // Log collection stats
    const stats = await getDatabaseStats();
    console.log('📊 Database stats:', stats);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const db = database.getDb();
    
    const stats = {
      youth: await db.collection(COLLECTIONS.YOUTH).countDocuments(),
      behaviorPoints: await db.collection(COLLECTIONS.BEHAVIOR_POINTS).countDocuments(),
      progressNotes: await db.collection(COLLECTIONS.PROGRESS_NOTES).countDocuments(),
      dailyRatings: await db.collection(COLLECTIONS.DAILY_RATINGS).countDocuments(),
      assessments: await db.collection(COLLECTIONS.ASSESSMENTS).countDocuments(),
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

/**
 * Check if database has any data
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  try {
    const stats = await getDatabaseStats();
    return Object.values(stats).every(count => count === 0);
  } catch (error) {
    console.error('Error checking if database is empty:', error);
    return true;
  }
}

/**
 * Create sample data for testing (optional)
 */
export async function createSampleData(): Promise<void> {
  try {
    const isEmpty = await isDatabaseEmpty();
    if (!isEmpty) {
      console.log('📝 Database already has data, skipping sample data creation');
      return;
    }
    
    console.log('📝 Creating sample data...');
    
    const db = database.getDb();
    
    // Create sample youth
    const sampleYouth = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('2008-05-15'),
      level: 2,
      pointTotal: 45000,
      peerInteraction: 3,
      adultInteraction: 3,
      investmentLevel: 2,
      dealAuthority: 3,
      educationInfo: '10th Grade',
      currentGrade: '10th Grade',
      academicStrengths: 'Mathematics, Science',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const youthResult = await db.collection(COLLECTIONS.YOUTH).insertOne(sampleYouth);
    const youthId = youthResult.insertedId.toString();
    
    // Create sample behavior points
    const today = new Date();
    const sampleBehaviorPoints = {
      youthId: youthId,
      date: today,
      morningPoints: 5000,
      afternoonPoints: 4500,
      eveningPoints: 4000,
      totalPoints: 13500,
      comments: 'Good behavior throughout the day',
      createdAt: new Date()
    };
    
    await db.collection(COLLECTIONS.BEHAVIOR_POINTS).insertOne(sampleBehaviorPoints);
    
    // Create sample progress note
    const sampleProgressNote = {
      youthId: youthId,
      date: today,
      category: 'Behavior',
      note: 'Youth demonstrated excellent cooperation during group activities',
      rating: 3,
      staff: 'Sample Staff',
      createdAt: new Date()
    };
    
    await db.collection(COLLECTIONS.PROGRESS_NOTES).insertOne(sampleProgressNote);
    
    // Create sample daily rating
    const sampleDailyRating = {
      youthId: youthId,
      date: today,
      peerInteraction: 3,
      adultInteraction: 3,
      investmentLevel: 2,
      dealAuthority: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection(COLLECTIONS.DAILY_RATINGS).insertOne(sampleDailyRating);
    
    console.log('✅ Sample data created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create sample data:', error);
    throw error;
  }
}