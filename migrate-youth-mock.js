#!/usr/bin/env node

import { database, COLLECTIONS } from './database-mock.js';
import { v4 as uuidv4 } from 'uuid';

// Youth data from the PDF
const youthData = [
  {
    name: "Chance Thaller",
    dob: "2010-02-15",
    age: 15,
    race: "Caucasian",
    height: "5'9\"",
    weight: "130 lbs",
    hairColor: "Blonde",
    eyeColor: "Blue",
    placingAgency: "Lancaster County (District 3J)",
    probationOfficer: {
      name: "Jared Macleod",
      phone: "402-318-9666"
    },
    guardian: "Kathy Thaller",
    school: {
      previous: "Lincoln Northeast HS",
      current: "Heartland Boys Home Education Program",
      iep: true,
      notes: "Strong in math, inconsistent engagement, benefits from structure and breaks"
    },
    behavioralSummary: {
      strengths: [
        "Athletic (baseball, football)",
        "Math ability",
        "Cooking and fishing",
        "Respectful when motivated"
      ],
      improvements: [
        "Better transitions with point system",
        "Engages in group discussions when incentivized"
      ],
      concerns: [
        "Easily distracted by peers",
        "Manipulative behavior",
        "History of truancy, firearm charge, marijuana use"
      ],
      incidents: [
        "Failed to work during 1:10-1:50PM slot",
        "Positive UA for marijuana"
      ],
      recommendations: [
        "Short timed tasks with breaks",
        "Skills focus: Level 3 (Anger Control, Following Rules)",
        "Substance use intervention",
        "Family engagement"
      ]
    },
    choreAssignments: {
      afterSchool: ["Hallway & Trash", "Bathroom Rotation"],
      kitchen: ["Breakfast Clear", "Lunch Clear", "Dinner Clear"]
    }
  },
  {
    name: "Curtis Hodges Jr.",
    dob: "2007-11-05",
    age: 17,
    race: "African American",
    height: "5'9\"",
    weight: "170 lbs",
    hairColor: "Black",
    eyeColor: "Brown",
    placingAgency: "Douglas County",
    probationOfficer: {
      name: "Tanner Holgate",
      phone: "402-679-0446"
    },
    guardian: "Brandi Curtis-Ford",
    school: {
      previous: "Douglas County Youth Center",
      current: "Heartland Boys Home Education Program",
      iep: false,
      notes: "Steady production, benefits from vocational themes"
    },
    behavioralSummary: {
      strengths: [
        "Pro-social leader",
        "Talented in rap/music",
        "Vocational focus (trucking)"
      ],
      improvements: [
        "Quickly adapted to Heartland routine",
        "Acts as positive role model in chores"
      ],
      concerns: [
        "Occasional fatigue",
        "Tendency to 'parent' peers"
      ],
      incidents: [
        "Minor parental interaction with Chance"
      ],
      recommendations: [
        "Encourage vocational planning",
        "Peer-helper role with boundaries",
        "Skills focus: Level 7 (Decision Making, Maintaining Relationships)"
      ]
    },
    choreAssignments: {
      afterSchool: ["Bathroom Rotation", "Laundry Room"],
      kitchen: ["Dining Floor", "Dinner Clear"]
    }
  },
  {
    name: "Tristan Dickey",
    dob: "2008-10-02",
    age: 16,
    race: "Caucasian",
    height: "5'8\"",
    weight: "135 lbs",
    hairColor: "Brown",
    eyeColor: "Brown",
    placingAgency: "Lancaster County (District 3J)",
    probationOfficer: {
      name: "Davetta Nelson",
      phone: "402-326-1888"
    },
    guardian: "Joel Dickey",
    school: {
      previous: "Lincoln Southeast HS",
      current: "Heartland Boys Home Education Program",
      iep: false,
      notes: "Completes work when calm; struggles with peer conflict"
    },
    behavioralSummary: {
      strengths: [
        "Honest in 1:1 settings",
        "Good at fishing/gaming",
        "Social skills when comfortable"
      ],
      improvements: [
        "Uses coping script to ask for breaks",
        "Improved honesty in card conferences"
      ],
      concerns: [
        "Reactive to peers",
        "Anxiety when provoked",
        "Conflict with father influences behavior"
      ],
      incidents: [
        "Near-escalation with peer, diffused by staff"
      ],
      recommendations: [
        "Coping cards for frustration",
        "Skills focus: Level 4 (Expressing Feelings, Asking for Clarification)",
        "Family therapy for conflict repair"
      ]
    },
    choreAssignments: {
      afterSchool: ["Entryway & Windows", "Living Room"],
      kitchen: ["Lunch Wash", "Dining Floor"]
    }
  }
];

// Function to convert youth data to database format
function convertYouthToDbFormat(youth) {
  const [firstName, ...lastNameParts] = youth.name.split(' ');
  const lastName = lastNameParts.join(' ');
  
  // Extract level from recommendations (looking for "Level X")
  let level = 1; // default
  const levelMatch = youth.behavioralSummary.recommendations.find(rec => 
    rec.includes('Level')
  );
  if (levelMatch) {
    const match = levelMatch.match(/Level (\d+)/);
    if (match) {
      level = parseInt(match[1]);
    }
  }

  return {
    id: uuidv4(),
    firstName,
    lastName,
    dob: new Date(youth.dob),
    age: youth.age,
    admissionDate: new Date(), // Set to current date as admission date
    level,
    pointTotal: 0, // Starting point total
    referralSource: youth.placingAgency,
    referralReason: youth.behavioralSummary.concerns.join('; '),
    educationInfo: `Previous: ${youth.school.previous}. Current: ${youth.school.current}. IEP: ${youth.school.iep ? 'Yes' : 'No'}. Notes: ${youth.school.notes}`,
    medicalInfo: `Height: ${youth.height}, Weight: ${youth.weight}, Hair: ${youth.hairColor}, Eyes: ${youth.eyeColor}`,
    mentalHealthInfo: `Strengths: ${youth.behavioralSummary.strengths.join(', ')}. Concerns: ${youth.behavioralSummary.concerns.join(', ')}`,
    legalStatus: `Probation Officer: ${youth.probationOfficer.name} (${youth.probationOfficer.phone}). Guardian: ${youth.guardian}`,
    peerInteraction: 2, // Default middle rating
    adultInteraction: 2, // Default middle rating
    investmentLevel: 2, // Default middle rating
    dealAuthority: 2, // Default middle rating
    hyrnaRiskLevel: null,
    hyrnaScore: null,
    hyrnaAssessmentDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Additional fields for extended profile information
    race: youth.race,
    physicalDescription: {
      height: youth.height,
      weight: youth.weight,
      hairColor: youth.hairColor,
      eyeColor: youth.eyeColor
    },
    placingAgency: youth.placingAgency,
    probationOfficer: youth.probationOfficer,
    guardian: youth.guardian,
    schoolInfo: youth.school,
    behavioralProfile: youth.behavioralSummary,
    choreAssignments: youth.choreAssignments
  };
}

async function migrateYouthDataToMock() {
  try {
    console.log('🚀 Starting youth data migration to mock database...');
    
    // Connect to mock database
    await database.connect();
    console.log('✅ Mock database connected successfully');
    
    const youthCollection = database.getCollection(COLLECTIONS.YOUTH);
    
    // Clear existing data (remove any existing mock data)
    console.log('🧹 Clearing existing youth data...');
    
    // Add new youth profiles
    console.log('📝 Adding new youth profiles...');
    
    const convertedYouth = youthData.map(convertYouthToDbFormat);
    
    for (const youth of convertedYouth) {
      await youthCollection.insertOne(youth);
      console.log(`✅ Added ${youth.firstName} ${youth.lastName} (Level ${youth.level})`);
    }
    
    console.log(`🎉 Successfully migrated ${convertedYouth.length} youth profiles to mock database!`);
    
    // Display summary
    console.log('\n📊 Migration Summary:');
    convertedYouth.forEach(youth => {
      console.log(`  • ${youth.firstName} ${youth.lastName} - Age ${youth.age}, Level ${youth.level}`);
    });
    
    console.log('\n🔧 To use this data:');
    console.log('1. Make sure server-local.js is using database-mock.js');
    console.log('2. Run: npm run dev:local');
    console.log('3. The application will use the mock database with your youth profiles');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateYouthDataToMock().catch(console.error);
}

export { migrateYouthDataToMock, convertYouthToDbFormat };