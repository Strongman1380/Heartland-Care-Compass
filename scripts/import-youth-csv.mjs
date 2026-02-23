/**
 * Import Youth Profiles from CSV data into Firebase Firestore
 *
 * Usage: node scripts/import-youth-csv.mjs
 *
 * Uses the Firebase client SDK with anonymous auth / no auth needed for Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Using the Vercel/production Firebase project
const firebaseConfig = {
  apiKey: "AIzaSyBtgwWsM9uKbK1gTFmKL6prT9hyzgGoPPA",
  authDomain: "heartland-care-compass-506bf.firebaseapp.com",
  projectId: "heartland-care-compass-506bf",
  storageBucket: "heartland-care-compass-506bf.firebasestorage.app",
  messagingSenderId: "415382629657",
  appId: "1:415382629657:web:013c5f08fae0d2529ca988",
  measurementId: "G-QY4NTS0LC5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Calculate age from DOB
function calculateAge(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Parse boolean-like CSV values
function parseBool(val) {
  if (!val || val === '' || val === 'N/A') return null;
  const v = val.trim().toUpperCase();
  if (v === 'TRUE' || v === 'YES') return true;
  if (v === 'FALSE' || v === 'NO') return false;
  return null;
}

// Parse nullable string
function parseStr(val) {
  if (!val || val.trim() === '' || val.trim() === 'N/A') return null;
  return val.trim();
}

// Parse array from comma-separated string
function parseArray(val) {
  if (!val || val.trim() === '' || val.trim() === 'N/A' || val.trim() === 'None') return null;
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

// Parse treatment focus booleans from treatmentGoals string
function parseTreatmentFocus(goals) {
  if (!goals) return null;
  const g = goals.toLowerCase();
  return {
    excessiveDependency: g.includes('excessive dependency'),
    withdrawalIsolation: g.includes('withdrawal'),
    parentChildRelationship: g.includes('parent/child') || g.includes('parent-child'),
    peerRelationship: g.includes('peer relationship'),
    acceptanceOfAuthority: g.includes('acceptance of authority'),
    lying: g.includes('lying'),
    poorAcademicAchievement: g.includes('poor academic'),
    poorSelfEsteem: g.includes('poor self'),
    manipulative: g.includes('manipulative'),
    propertyDestruction: g.includes('property destruction'),
    hyperactivity: g.includes('hyperactivity'),
    anxiety: g.includes('anxiety'),
    verbalAggression: g.includes('verbal aggression'),
    assaultive: g.includes('assaultive'),
    depression: g.includes('depression'),
    stealing: g.includes('stealing'),
  };
}

// All 11 youth records from CSV
const youthRecords = [
  {
    firstName: "Amos",
    lastName: "Tamang",
    dob: "2009-12-07",
    sex: "M",
    admissionDate: "2025-01-27",
    socialSecurityNumber: null,
    placeOfBirth: "Omaha NE",
    race: "Asian",
    religion: "Christian",
    address: { street: "1812 Corby St.", city: "Omaha", state: "NE", zip: "68111" },
    physicalDescription: { height: "5' 10\"", weight: "198", hairColor: "Black", eyeColor: "Dark Brown", tattoosScars: "Tattoo (Loyalty) on right side of neck" },
    mother: { name: "Anuja Tamang", phone: "(402) 321-3741", contact: null },
    father: { name: "Dahn Tamang", phone: "(402) 321-3741", contact: null },
    legalGuardian: { name: "Parents", phone: "(402) 321-3741", relationship: "Parents", contact: null },
    nextOfKin: { name: "Dahn Tamang", relationship: "Father", phone: null },
    placingAgencyCounty: "Douglas County District 4J",
    probationOfficer: { name: "Kassandra Minino", phone: "(402) 658-1146", email: "Kassandra.minino@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: { name: "Joseph Bradley", phone: null },
    attorney: null,
    judge: "Joseph Kuehl",
    lastSchoolAttended: "Central High School",
    currentSchool: "Brown",
    currentGrade: "10th",
    hasIEP: false,
    academicStrengths: "Used to play soccer",
    academicChallenges: "Poor Academic Achievement",
    allergies: "N/A",
    currentMedications: "Trazadone, Qelbree",
    significantHealthConditions: "Got shot in right leg 3 years ago",
    insuranceProvider: null,
    policyNumber: null,
    currentDiagnoses: "Conduct disorder cannabis use",
    traumaHistory: null,
    therapistName: null,
    selfHarmHistory: ["Self-harm mentioned (assaultive check)"],
    strengthsTalents: "Used to play soccer",
    interests: "Be a gunsmith",
    behaviorProblems: "Gang member (RNS), Physical hurt, Vandalism",
    treatmentGoals: "Parent/child relationship, Lying, Stealing",
    tobaccoPast6To12Months: false,
    alcoholPast6To12Months: false,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Non-compliance, increased community safety risk, criminal activity",
    priorPlacements: ["Radius", "DCYC"],
    gangInvolvement: true,
    historyPhysicallyHurting: true,
    historyVandalism: true,
  },
  {
    firstName: "Chance",
    lastName: "Thaller",
    dob: "2010-02-15",
    sex: "M",
    admissionDate: "2025-07-29",
    socialSecurityNumber: null,
    placeOfBirth: "Lincoln NE",
    race: "Caucasian",
    religion: "Christian",
    address: { street: "6733 Francis St.", city: "Lincoln", state: "NE", zip: "68505" },
    physicalDescription: { height: "5' 9\"", weight: "130", hairColor: "Blonde", eyeColor: "Blue", tattoosScars: "N/A" },
    mother: { name: "Kathy Thaller", phone: "(402) 450-4367", contact: null },
    father: { name: "Harry Thaller", phone: null, contact: null },
    legalGuardian: { name: "Kathy Thaller", phone: "(308) 450-4367", relationship: "Mother", contact: null },
    nextOfKin: { name: "Kathy Thaller", relationship: "Mother", phone: null },
    placingAgencyCounty: "Lancaster County District 3J",
    probationOfficer: { name: "Jared MacLeod", phone: "(402) 318-9666", email: "jared.macleod@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: null,
    attorney: null,
    judge: "Jacinta Dai-Klabunde",
    lastSchoolAttended: "Lincoln North East",
    currentSchool: "Heideman",
    currentGrade: "9th",
    hasIEP: true,
    academicStrengths: "Sports (baseball, football) & Math",
    academicChallenges: "Poor Academic Achievement",
    allergies: "None",
    currentMedications: "None",
    significantHealthConditions: "None",
    insuranceProvider: null,
    policyNumber: null,
    currentDiagnoses: "ADHD",
    traumaHistory: null,
    therapistName: null,
    selfHarmHistory: null,
    strengthsTalents: "Sports, Math",
    interests: "Fishing, Cooking",
    behaviorProblems: "Lying, Manipulative, Hyperactivity, Verbal Aggression",
    treatmentGoals: "Parent/child relationship, Lying, Poor Academic Achievement",
    tobaccoPast6To12Months: false,
    alcoholPast6To12Months: false,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Court Ordered",
    priorPlacements: null,
    gangInvolvement: false,
    historyPhysicallyHurting: false,
    historyVandalism: false,
  },
  {
    firstName: "Dagen",
    lastName: "Dickey",
    dob: "2009-10-02",
    sex: "M",
    admissionDate: "2025-08-27",
    socialSecurityNumber: null,
    placeOfBirth: "Lincoln NE",
    race: "Caucasian",
    religion: null,
    address: { street: "3643 S 16th St.", city: "Lincoln", state: "NE", zip: "68502" },
    physicalDescription: { height: "5' 8\"", weight: "135", hairColor: "Brown", eyeColor: "Brown", tattoosScars: "N/A" },
    mother: { name: "Melanie Garringer", phone: null, contact: null },
    father: { name: "Joel Dickey", phone: "(402) 450-7305", contact: null },
    legalGuardian: { name: "Dad", phone: "(402) 450-7305", relationship: "Father", contact: null },
    nextOfKin: { name: "Joel Dickey", relationship: "Father", phone: null },
    placingAgencyCounty: "Lancaster District 3J",
    probationOfficer: { name: "Davetta Nelson", phone: "(402) 326-1888", email: "Davetta.nelson@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: { name: "N/A", phone: null },
    attorney: null,
    judge: "Deanna Hobbs",
    lastSchoolAttended: "Lincoln Southeast High School",
    currentSchool: "Ryder",
    currentGrade: "11th",
    hasIEP: null,
    academicStrengths: "Playing xbox, fishing",
    academicChallenges: "Poor Academic Achievement",
    allergies: null,
    currentMedications: "Melatonin, Lexapro, Trazadone, Albuterol, Prazosin",
    significantHealthConditions: "None",
    insuranceProvider: null,
    policyNumber: null,
    currentDiagnoses: "Anxiety",
    traumaHistory: null,
    therapistName: null,
    selfHarmHistory: null,
    strengthsTalents: "Playing xbox, fishing",
    interests: "Flag football",
    behaviorProblems: "Anxiety",
    treatmentGoals: "Parent/child relationship, Poor Academic Achievement, Anxiety",
    tobaccoPast6To12Months: false,
    alcoholPast6To12Months: false,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Court Ordered",
    priorPlacements: null,
    gangInvolvement: false,
    historyPhysicallyHurting: false,
    historyVandalism: false,
  },
  {
    firstName: "Elijah",
    lastName: "Christian",
    dob: "2010-10-28",
    sex: "M",
    admissionDate: "2025-06-30",
    socialSecurityNumber: null,
    placeOfBirth: "Lincoln NE",
    race: "Caucasian",
    religion: "Christian",
    address: { street: "321 S. 48th", city: "Lincoln", state: "NE", zip: "68510" },
    physicalDescription: { height: "5' 5\"", weight: "175", hairColor: "Dark Brown", eyeColor: "Brown", tattoosScars: "N/A" },
    mother: { name: "Larissa Christian", phone: "(402) 450-9879", contact: null },
    father: null,
    legalGuardian: { name: "Mother", phone: "(308) 450-9879", relationship: "Mother", contact: null },
    nextOfKin: { name: "Larissa Christian", relationship: "Mother", phone: null },
    placingAgencyCounty: "Butler County District 3J",
    probationOfficer: { name: "Jared MacLeod", phone: "(402) 318-9666", email: "jared.macleod@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: null,
    attorney: null,
    judge: "N/A",
    lastSchoolAttended: "Neurenberger",
    currentSchool: "Petersen",
    currentGrade: "9th",
    hasIEP: true,
    academicStrengths: "Football and sports",
    academicChallenges: "Poor Academic Achievement",
    allergies: "None",
    currentMedications: "None",
    significantHealthConditions: "None",
    insuranceProvider: null,
    policyNumber: null,
    currentDiagnoses: null,
    traumaHistory: ["Physical Abuse (implied by safe plan context)", "Neglect"],
    therapistName: null,
    selfHarmHistory: null,
    strengthsTalents: "People person",
    interests: "None at this time",
    behaviorProblems: "Manipulative, Property Destruction, Hyperactivity, Lying, Stealing",
    treatmentGoals: "Manipulative, Property Destruction, Hyperactivity, Lying, Stealing",
    tobaccoPast6To12Months: true,
    alcoholPast6To12Months: false,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Court Ordered",
    priorPlacements: null,
    gangInvolvement: false,
    historyPhysicallyHurting: false,
    historyVandalism: false,
  },
  {
    firstName: "Elijah",
    lastName: "Poppert",
    dob: "2007-11-20",
    sex: "M",
    admissionDate: "2025-11-04",
    socialSecurityNumber: null,
    placeOfBirth: "Minden NE",
    race: "Caucasian",
    religion: "Catholic",
    address: { street: "1804 31 Road", city: "Minden", state: "NE", zip: "68959" },
    physicalDescription: { height: "6' 1\"", weight: "300", hairColor: "Brown", eyeColor: "Brown", tattoosScars: "very thing on right arm & Loyalty on right wrist" },
    mother: null,
    father: { name: "Earon Poppert", phone: "(308) 296-3263", contact: null },
    legalGuardian: { name: "Father", phone: "(308) 296-3263", relationship: "Father", contact: null },
    nextOfKin: { name: "Earon Poppert", relationship: "Father", phone: null },
    placingAgencyCounty: "Kearney County District 10",
    probationOfficer: { name: "Shawn Maloley", phone: "(402) 984-2562", email: "Shawn.maloley@nejudicial.gov", contact: null },
    caseworker: { name: "Jill Burry", phone: "308 430-1248" },
    guardianAdLitem: { name: "Tana Fye", phone: null },
    attorney: null,
    judge: "Tom Stewart",
    lastSchoolAttended: "Minden High School",
    currentSchool: "Mead",
    currentGrade: "12th",
    hasIEP: false,
    academicStrengths: "Drawing and communications",
    academicChallenges: "Poor Academic Achievement",
    allergies: "None",
    currentMedications: "None",
    significantHealthConditions: "None",
    insuranceProvider: null,
    policyNumber: null,
    currentDiagnoses: "Anxiety Depression",
    traumaHistory: ["Mom in York State Pen"],
    therapistName: null,
    selfHarmHistory: null,
    strengthsTalents: "Drawing and communications",
    interests: "Construction work",
    behaviorProblems: "Vandalized police station, Anxiety, Depression",
    treatmentGoals: "Poor Academic Achievement, Anxiety, Depression",
    tobaccoPast6To12Months: true,
    alcoholPast6To12Months: false,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Court Ordered",
    priorPlacements: null,
    gangInvolvement: false,
    historyPhysicallyHurting: false,
    historyVandalism: true,
  },
  {
    firstName: "Jaeden",
    lastName: "Forbes",
    dob: "2008-05-21",
    sex: "M",
    admissionDate: "2025-08-12",
    socialSecurityNumber: null,
    placeOfBirth: "Hastings NE",
    race: "Caucasian",
    religion: null,
    address: { street: "1246 N Pine", city: "Hastings", state: "NE", zip: "68901" },
    physicalDescription: { height: "5' 7\"", weight: "135", hairColor: "Blonde", eyeColor: "Blue", tattoosScars: "Right forearm (faith in cursive), Cross on right thumb" },
    mother: { name: "Jasmin Forbes", phone: "(402) 705-7642", contact: null },
    father: { name: "Andrew (AJ) Hoit", phone: "(402) 460-7018", contact: null },
    legalGuardian: { name: "Mom/Dad", phone: "Both parents", relationship: "Parents", contact: null },
    nextOfKin: { name: "Susan Hoit", relationship: "Grandma", phone: null },
    placingAgencyCounty: "Adams County District 10",
    probationOfficer: { name: "Kelsey Meyer", phone: "(402) 519-3117", email: "Kelsey.meyer@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: null,
    attorney: null,
    judge: null,
    lastSchoolAttended: "Adams Central Public School",
    currentSchool: null,
    currentGrade: "12th",
    hasIEP: null,
    academicStrengths: "Fast learner, Science class",
    academicChallenges: null,
    allergies: "None",
    currentMedications: "See Medication List",
    significantHealthConditions: "None",
    insuranceProvider: null,
    policyNumber: null,
    currentDiagnoses: null,
    traumaHistory: ["Broke a kid's nose (Assault history)"],
    therapistName: null,
    selfHarmHistory: null,
    strengthsTalents: "Fast learner",
    interests: "Video Games, Cars",
    behaviorProblems: "Physically hurt someone, Anxiety (crowds)",
    treatmentGoals: null,
    tobaccoPast6To12Months: false,
    alcoholPast6To12Months: false,
    drugsVapingMarijuanaPast6To12Months: false,
    referralReason: "Court Ordered",
    priorPlacements: null,
    gangInvolvement: false,
    historyPhysicallyHurting: true,
    historyVandalism: false,
  },
  {
    firstName: "Jason",
    lastName: "Masters",
    dob: "2008-08-25",
    sex: "M",
    admissionDate: "2025-04-14",
    socialSecurityNumber: "508-53-5958",
    placeOfBirth: "Minden NE",
    race: "Caucasian",
    religion: null,
    address: { street: "507 N. Nebraska Av.", city: "Minden", state: "NE", zip: "68959" },
    physicalDescription: { height: "5' 7\"", weight: "140", hairColor: "Dirty Blonde", eyeColor: "Blue", tattoosScars: "Numbers on his left fist, Burn mark on left Thumb/wrist" },
    mother: { name: "Savannah Masters", phone: "(402) 469-7555, (308) 832-7112", contact: null },
    father: null,
    legalGuardian: { name: "Mother", phone: "(308) 469-7555", relationship: "Mother", contact: null },
    nextOfKin: { name: "Grandma", relationship: null, phone: null },
    placingAgencyCounty: "Kearney County",
    probationOfficer: { name: "Shawn Maloley", phone: "(402) 984-2562", email: "Shawn.maloley@nejudicial.gov", contact: null },
    caseworker: { name: "Michelle Mick", phone: "N/A" },
    guardianAdLitem: null,
    attorney: null,
    judge: "Shon Lieske",
    lastSchoolAttended: "Minden High School",
    currentSchool: "Mead",
    currentGrade: "10th",
    hasIEP: true,
    academicStrengths: "Not scared of heights, Freestyle",
    academicChallenges: "Poor Academic Achievement",
    allergies: "None",
    currentMedications: "None",
    significantHealthConditions: "None",
    insuranceProvider: "NTC",
    policyNumber: "01508502004",
    currentDiagnoses: "Excessive Dependency, Withdrawal, Anxiety, Depression",
    traumaHistory: ["Abuse in the past"],
    therapistName: null,
    selfHarmHistory: null,
    strengthsTalents: "Freestyle",
    interests: "Electricians",
    behaviorProblems: "Assaultive (Fight in school), Anxiety, Depression",
    treatmentGoals: "Excessive Dependency, Withdrawal, Acceptance of Authority, Anxiety, Assaultive, Poor Academic Achievement",
    tobaccoPast6To12Months: true,
    alcoholPast6To12Months: true,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Court Ordered",
    priorPlacements: null,
    gangInvolvement: false,
    historyPhysicallyHurting: false,
    historyVandalism: false,
  },
  {
    firstName: "Ryan",
    lastName: "Cruise",
    dob: "2010-09-09",
    sex: "M",
    admissionDate: "2026-02-10",
    socialSecurityNumber: null,
    placeOfBirth: "Pleasanton NE",
    race: "White",
    religion: "Christian",
    address: { street: "27915 Sweet water RD", city: "Pleasanton", state: "NE", zip: "68866" },
    physicalDescription: { height: "5' 11\"", weight: "170", hairColor: "Brown", eyeColor: "Brown", tattoosScars: "No" },
    mother: { name: "Anna Cruise", phone: "(308) 627-2724", contact: null },
    father: { name: "Rory Cruise", phone: "(308) 627-4419", contact: null },
    legalGuardian: { name: "Parents", phone: "(402) 321-3741", relationship: "Parents", contact: null },
    nextOfKin: { name: "Tony Cruise", relationship: "Grandfather", phone: null },
    placingAgencyCounty: "Buffalo County District 9",
    probationOfficer: { name: "Tyler Mertens", phone: "(308) 390-9521", email: "tyler.mertens@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: { name: "Isabella Zito", phone: null },
    attorney: null,
    judge: "Jeffrey Ensz",
    lastSchoolAttended: "Pleasanton Public Schools",
    currentSchool: "Rademacher",
    currentGrade: "8th",
    hasIEP: false,
    academicStrengths: "Athletic",
    academicChallenges: "Poor Academic Achievement",
    allergies: "N/A",
    currentMedications: "None",
    significantHealthConditions: "None",
    insuranceProvider: "Ambetter/Medicaid",
    policyNumber: "70006859, 00260559806",
    currentDiagnoses: "Unspecified Bipolar, ADHD, Conduct Disorder",
    traumaHistory: ["Parent-Child Relational Problems"],
    therapistName: "Chris Wicks",
    selfHarmHistory: null,
    strengthsTalents: "Athletic",
    interests: "Sports/Video Games",
    behaviorProblems: "Property Destruction, Peer relationship, Anxiety, Verbal Aggression, Lying, Assaultive, Gang (Lo Mas)",
    treatmentGoals: "Property Destruction, Peer relationship, Anxiety, Acceptance of Authority, Verbal Aggression, Lying, Assaultive",
    tobaccoPast6To12Months: true,
    alcoholPast6To12Months: true,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Struggling with behaviors, high supervision needed",
    priorPlacements: ["Hope Spoke THGH", "Boys Town In-Home", "Professional Foster Care"],
    gangInvolvement: true,
    historyPhysicallyHurting: true,
    historyVandalism: true,
  },
  {
    firstName: "Lucas",
    lastName: "Murphy",
    dob: "2008-04-29",
    sex: "M",
    admissionDate: "2025-12-30",
    socialSecurityNumber: null,
    placeOfBirth: "Betrand NE",
    race: "Caucasian",
    religion: null,
    address: { street: "405 Melbourne Av.", city: "Bertrand", state: "NE", zip: "68937" },
    physicalDescription: { height: "5' 7\"", weight: "160", hairColor: "Brown/Dirty Blonde", eyeColor: "Brown", tattoosScars: "2024 BERTRAND" },
    mother: { name: "Jennifer Murphy", phone: null, contact: null },
    father: null,
    legalGuardian: { name: "Willa Murphy (Grandmother)", phone: "(308) 999-1640", relationship: "Grandmother", contact: null },
    nextOfKin: { name: "Willa Murphy (Grandmother)", relationship: "Grandmother", phone: null },
    placingAgencyCounty: "Phelps County District 10",
    probationOfficer: { name: "Shawn Maloley", phone: "(402) 984-2562", email: "Shawn.maloley@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: null,
    attorney: null,
    judge: "Remington Slama",
    lastSchoolAttended: "Bertrand High School",
    currentSchool: "Nelsen-Pacey",
    currentGrade: "11th",
    hasIEP: true,
    academicStrengths: "Weightlifting, Wrestling",
    academicChallenges: "Poor Academic Achievement",
    allergies: null,
    currentMedications: "Dexmethylphenidate Aripiprazole",
    significantHealthConditions: "None",
    insuranceProvider: "Nebraska Total Care",
    policyNumber: null,
    currentDiagnoses: "Depression, Hyperactivity, Anxiety",
    traumaHistory: ["Severe trauma from bio-father", "physical/verbal abuse"],
    therapistName: "Katrina Lucepro",
    selfHarmHistory: null,
    strengthsTalents: "Weightlifting Wrestling",
    interests: "Farming, How to Fly Planes",
    behaviorProblems: "Lying, Hyperactivity, Anxiety, Depression, Vandalism",
    treatmentGoals: "Lying, Hyperactivity, Anxiety, Depression",
    tobaccoPast6To12Months: true,
    alcoholPast6To12Months: true,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Court ordered out of home placement, criminal mischief, attempted burglary",
    priorPlacements: ["Northeast Nebraska Juvenile Services Detention", "OMNI DD Group Home"],
    gangInvolvement: false,
    historyPhysicallyHurting: false,
    historyVandalism: true,
  },
  {
    firstName: "Terrell",
    lastName: "Ramos",
    dob: "2009-01-26",
    sex: "M",
    admissionDate: "2025-10-21",
    socialSecurityNumber: "505-55-7777",
    placeOfBirth: "Hemingford NE",
    race: "Caucasian",
    religion: "Catholic",
    address: { street: "517 Shoshone Av.", city: "Hemingford", state: "NE", zip: "69348" },
    physicalDescription: { height: "5' 11\"", weight: "140", hairColor: "Brown", eyeColor: "Brown", tattoosScars: "Wings on right forearm reads PAPA 9-17-21" },
    mother: { name: "Latosha Fester", phone: "(308) 760-3121", contact: null },
    father: null,
    legalGuardian: { name: "Mother", phone: "(308) 760-3121", relationship: "Mother", contact: null },
    nextOfKin: { name: "Latosha Fester", relationship: null, phone: null },
    placingAgencyCounty: "Box Butte District 12",
    probationOfficer: { name: "Kressa Hansen", phone: "(308) 762-3168", email: "Kressa.hansen@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: null,
    attorney: null,
    judge: "Audrey Long",
    lastSchoolAttended: "Hemingford High School",
    currentSchool: "Wess",
    currentGrade: "10th",
    hasIEP: false,
    academicStrengths: null,
    academicChallenges: "Poor Academic Achievement",
    allergies: "None",
    currentMedications: "None",
    significantHealthConditions: "None",
    insuranceProvider: null,
    policyNumber: null,
    currentDiagnoses: null,
    traumaHistory: null,
    therapistName: null,
    selfHarmHistory: null,
    strengthsTalents: null,
    interests: "Joining the Army working",
    behaviorProblems: "Lying, Poor Academic Achievement",
    treatmentGoals: "Lying, Poor Academic Achievement",
    tobaccoPast6To12Months: true,
    alcoholPast6To12Months: false,
    drugsVapingMarijuanaPast6To12Months: false,
    referralReason: "Court Ordered",
    priorPlacements: null,
    gangInvolvement: false,
    historyPhysicallyHurting: false,
    historyVandalism: false,
  },
  {
    firstName: "Zayne",
    lastName: "McDonald",
    dob: "2009-09-23",
    sex: "M",
    admissionDate: "2026-01-13",
    socialSecurityNumber: null,
    placeOfBirth: "Gothenburg NE",
    race: "Caucasian",
    religion: null,
    address: { street: "803 17th st.", city: "Gothenburg", state: "NE", zip: "69138" },
    physicalDescription: { height: "5' 5\"", weight: "105", hairColor: "Brown", eyeColor: "Hazel", tattoosScars: "N/A" },
    mother: { name: "Christle McDonald (stepmom)", phone: "(308) 325-6830", contact: null },
    father: { name: "Josh McDonald", phone: "(308) 537-6005", contact: null },
    legalGuardian: { name: "Parents", phone: "(308)-325-6830", relationship: "Parents", contact: null },
    nextOfKin: { name: "Josh McDonald", relationship: null, phone: null },
    placingAgencyCounty: "Dawson County District 11",
    probationOfficer: { name: "Shirley Jimenez", phone: "(308) 417-0508", email: "Shirley.jimenez@nejudicial.gov", contact: null },
    caseworker: null,
    guardianAdLitem: { name: "Yes", phone: null },
    attorney: "Kenneth Harbison",
    judge: "Jeffrey M. Wightman",
    lastSchoolAttended: "Gothenburg High School",
    currentSchool: null,
    currentGrade: "9th",
    hasIEP: true,
    academicStrengths: "Creative, Smart",
    academicChallenges: "Poor Academic Achievement",
    allergies: "N/A",
    currentMedications: "Escitalopran, hydroxyzine, Lamotrigine, Vyvanse",
    significantHealthConditions: "Spina-bifida",
    insuranceProvider: "Nebraska Total Care",
    policyNumber: "04757636602",
    currentDiagnoses: "ADHD, depression, anxiety",
    traumaHistory: null,
    therapistName: "Elizabeth Gibbens",
    selfHarmHistory: null,
    strengthsTalents: "Creative, Smart",
    interests: "Work with animals, video games",
    behaviorProblems: "Theft, Physical Aggression (hit a kid), Substance use",
    treatmentGoals: "Emotional regulation, reduce criminogenic thinking, abstain from substance",
    tobaccoPast6To12Months: true,
    alcoholPast6To12Months: true,
    drugsVapingMarijuanaPast6To12Months: true,
    referralReason: "Probation violation (theft, money/phones), not thriving in current placement",
    priorPlacements: ["YES Center in Cherokee Iowa"],
    gangInvolvement: false,
    historyPhysicallyHurting: true,
    historyVandalism: false,
  },
];

async function getNextIdNumber() {
  const snapshot = await getDocs(collection(db, 'youth'));
  let maxNumber = 0;

  snapshot.docs.forEach(d => {
    const id = d.id;
    // Match any HBH-YYYY-NNN pattern
    const match = id && id.match(/^HBH-\d{4}-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) maxNumber = num;
    }
  });

  return maxNumber;
}

// Build professionals array from parsed contact data
function buildProfessionals(record) {
  const professionals = [];

  if (record.caseworker?.name && record.caseworker.name !== 'N/A') {
    professionals.push({
      type: 'caseworker',
      name: record.caseworker.name,
      phone: parseStr(record.caseworker.phone) || null,
      email: parseStr(record.caseworker.email) || null,
    });
  }

  if (record.probationOfficer?.name && record.probationOfficer.name !== 'N/A') {
    professionals.push({
      type: 'probationOfficer',
      name: record.probationOfficer.name,
      phone: parseStr(record.probationOfficer.phone) || null,
      email: parseStr(record.probationOfficer.email) || null,
    });
  }

  if (record.attorney && record.attorney !== 'N/A') {
    professionals.push({
      type: 'attorney',
      name: record.attorney,
      phone: null,
      email: null,
    });
  }

  if (record.judge && record.judge !== 'N/A') {
    professionals.push({
      type: 'judge',
      name: record.judge,
      phone: null,
      email: null,
    });
  }

  if (record.guardianAdLitem?.name && record.guardianAdLitem.name !== 'N/A' && record.guardianAdLitem.name !== 'Yes') {
    professionals.push({
      type: 'guardianAdLitem',
      name: record.guardianAdLitem.name,
      phone: parseStr(record.guardianAdLitem.phone) || null,
      email: null,
    });
  }

  return professionals.length > 0 ? professionals : null;
}

// Build summary info strings for composite fields
function buildEducationInfo(record) {
  const parts = [
    record.currentSchool && `School: ${record.currentSchool}`,
    record.currentGrade && `Grade: ${record.currentGrade}`,
    record.hasIEP && 'Has IEP',
    record.lastSchoolAttended && `Previously attended: ${record.lastSchoolAttended}`,
    record.academicStrengths && `Strengths: ${record.academicStrengths}`,
    record.academicChallenges && `Challenges: ${record.academicChallenges}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : null;
}

function buildMedicalInfo(record) {
  const parts = [
    record.allergies && record.allergies !== 'None' && record.allergies !== 'N/A' && `Allergies: ${record.allergies}`,
    record.currentMedications && record.currentMedications !== 'None' && `Medications: ${record.currentMedications}`,
    record.significantHealthConditions && record.significantHealthConditions !== 'None' && `Conditions: ${record.significantHealthConditions}`,
    record.insuranceProvider && `Insurance: ${record.insuranceProvider}`,
    record.policyNumber && `Policy: ${record.policyNumber}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : null;
}

function buildMentalHealthInfo(record) {
  const parts = [
    record.currentDiagnoses && `Diagnoses: ${record.currentDiagnoses}`,
    record.traumaHistory?.length > 0 && `Trauma history: ${record.traumaHistory.join(', ')}`,
    record.selfHarmHistory?.length > 0 && `Self-harm history: ${record.selfHarmHistory.join(', ')}`,
    record.therapistName && `Therapist: ${record.therapistName}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : null;
}

function buildYouthDoc(record, idNumber) {
  const now = new Date().toISOString();
  const admissionYear = record.admissionDate ? new Date(record.admissionDate).getFullYear() : new Date().getFullYear();
  const id = `HBH-${admissionYear}-${idNumber.toString().padStart(3, '0')}`;

  // Extract flat fields from nested objects for legacy/form compatibility
  const guardian = record.legalGuardian || {};
  const po = record.probationOfficer || {};
  const cw = record.caseworker || {};
  const gal = record.guardianAdLitem || {};
  const mom = record.mother || {};
  const dad = record.father || {};
  const nok = record.nextOfKin || {};

  // Resolve guardian phone: prefer guardian's own, then mother, then father
  const guardianPhone = parseStr(guardian.phone) || parseStr(mom.phone) || parseStr(dad.phone) || null;

  return {
    id,
    idNumber: id,
    firstName: record.firstName,
    lastName: record.lastName,
    dob: record.dob || null,
    age: record.dob ? calculateAge(record.dob) : null,
    sex: record.sex || null,
    socialSecurityNumber: record.socialSecurityNumber || null,
    placeOfBirth: record.placeOfBirth || null,
    race: record.race || null,
    religion: record.religion || null,

    // Structured address object
    address: record.address || null,

    // Physical description object + individual flat fields for search
    physicalDescription: record.physicalDescription || null,

    // Admission / Discharge
    admissionDate: record.admissionDate || null,
    admissionTime: null,
    rcsIn: null,
    dischargeDate: null,
    dischargeTime: null,
    rcsOut: null,
    dischargeCategory: null,
    dischargeReason: null,
    dischargeNotes: null,
    dischargedBy: null,

    // Family - structured objects
    mother: record.mother || null,
    father: record.father || null,
    legalGuardian: record.legalGuardian || null,
    nextOfKin: record.nextOfKin || null,

    // Family - flat/legacy fields fanned out from nested objects
    guardianRelationship: parseStr(guardian.relationship) || null,
    guardianContact: parseStr(guardian.contact) || guardianPhone,
    guardianPhone: guardianPhone,
    guardianEmail: parseStr(guardian.email) || null,

    // Placement contacts - structured objects
    probationOfficer: record.probationOfficer || null,
    caseworker: record.caseworker || null,
    guardianAdLitem: record.guardianAdLitem || null,

    // Placement contacts - flat/legacy fields fanned out
    probationContact: parseStr(po.email) || parseStr(po.phone) || null,
    probationPhone: parseStr(po.phone) || null,
    caseworkerName: parseStr(cw.name) || null,
    caseworkerPhone: parseStr(cw.phone) || null,
    caseworkerEmail: parseStr(cw.email) || null,
    guardianAdLitemName: parseStr(gal.name) || null,

    // Professionals array (canonical source for all contacts)
    professionals: buildProfessionals(record),

    // Other legal contacts
    attorney: record.attorney || null,
    judge: record.judge || null,
    placingAgencyCounty: record.placingAgencyCounty || null,
    placementAuthority: null,
    estimatedStay: null,

    // Education - all fields populated
    lastSchoolAttended: record.lastSchoolAttended || null,
    currentSchool: record.currentSchool || null,
    currentGrade: record.currentGrade || null,
    grade: record.currentGrade || null,
    hasIEP: record.hasIEP ?? null,
    academicStrengths: record.academicStrengths || null,
    academicChallenges: record.academicChallenges || null,
    educationGoals: null,
    schoolContact: null,
    schoolPhone: null,
    educationInfo: buildEducationInfo(record),

    // Medical - all fields populated
    allergies: record.allergies || null,
    currentMedications: record.currentMedications || null,
    significantHealthConditions: record.significantHealthConditions || null,
    physician: null,
    physicianPhone: null,
    insuranceProvider: record.insuranceProvider || null,
    policyNumber: record.policyNumber || null,
    medicalConditions: record.significantHealthConditions || null,
    medicalRestrictions: null,
    medicalInfo: buildMedicalInfo(record),

    // Mental Health - all fields populated
    currentDiagnoses: record.currentDiagnoses || null,
    diagnoses: record.currentDiagnoses || null,
    traumaHistory: record.traumaHistory || null,
    previousTreatment: null,
    currentCounseling: null,
    therapistName: record.therapistName || null,
    therapistContact: null,
    sessionFrequency: null,
    sessionTime: null,
    selfHarmHistory: record.selfHarmHistory || null,
    lastIncidentDate: null,
    hasSafetyPlan: null,
    mentalHealthInfo: buildMentalHealthInfo(record),

    // Behavioral / Psychosocial
    strengthsTalents: record.strengthsTalents || null,
    interests: record.interests || null,
    behaviorProblems: record.behaviorProblems || null,
    angerTriggers: null,
    getAlongWithOthers: null,
    dislikesAboutSelf: null,
    socialStrengths: null,
    socialDeficiencies: null,

    // Risk & History booleans
    gangInvolvement: record.gangInvolvement ?? false,
    historyPhysicallyHurting: record.historyPhysicallyHurting ?? false,
    historyVandalism: record.historyVandalism ?? false,
    familyViolentCrimes: null,

    // Substance Use
    tobaccoPast6To12Months: record.tobaccoPast6To12Months ?? false,
    alcoholPast6To12Months: record.alcoholPast6To12Months ?? false,
    drugsVapingMarijuanaPast6To12Months: record.drugsVapingMarijuanaPast6To12Months ?? false,
    drugTestingDates: null,

    // Referral & Background
    referralSource: null,
    referralReason: record.referralReason || null,
    legalStatus: null,
    priorPlacements: record.priorPlacements || null,
    numPriorPlacements: record.priorPlacements ? String(record.priorPlacements.length) : null,
    lengthRecentPlacement: null,
    courtInvolvement: null,

    // Treatment
    treatmentFocus: parseTreatmentFocus(record.treatmentGoals),
    treatmentGoals: record.treatmentGoals || null,
    communityResources: null,
    dischargePlan: null,
    emergencyShelterCare: null,

    // Behavioral tracking defaults
    level: 0,
    pointTotal: 0,
    pointsInCurrentLevel: 0,
    dailyPointsForPrivileges: 0,
    onSubsystem: false,
    peerInteraction: null,
    adultInteraction: null,
    investmentLevel: null,
    dealAuthority: null,

    // Risk assessment defaults
    hyrnaRiskLevel: null,
    hyrnaScore: null,
    hyrnaAssessmentDate: null,

    // Restriction defaults
    restrictionLevel: null,
    restrictionPointsRequired: null,
    restrictionStartDate: null,
    restrictionPointsEarned: null,
    restrictionReason: null,
    subsystemActive: null,
    subsystemPointsRequired: null,
    subsystemStartDate: null,
    subsystemPointsEarned: null,
    subsystemReason: null,

    // Other defaults
    realColorsResult: null,
    profilePhoto: null,

    // Timestamps
    createdAt: now,
    updatedAt: now,
  };
}

async function importYouth() {
  console.log('Starting youth profile import...');
  console.log(`Found ${youthRecords.length} records to import.\n`);

  // Rules temporarily open - no auth needed for import
  console.log('Firestore rules open for import...\n');

  // Wait for rules propagation
  console.log('Waiting for rules propagation...');
  await new Promise(r => setTimeout(r, 5000));

  // Try to get the current max ID number
  let currentMax = 0;
  try {
    currentMax = await getNextIdNumber();
    console.log(`Current max ID number in database: ${currentMax}`);
  } catch (err) {
    console.log(`Could not query existing IDs (${err.message}), starting from 001`);
  }

  let idCounter = currentMax;
  const results = [];

  for (const record of youthRecords) {
    idCounter++;
    const youthDoc = buildYouthDoc(record, idCounter);

    try {
      await setDoc(doc(db, 'youth', youthDoc.id), youthDoc);
      console.log(`  Imported: ${youthDoc.firstName} ${youthDoc.lastName} -> ${youthDoc.id}`);
      results.push({ name: `${youthDoc.firstName} ${youthDoc.lastName}`, id: youthDoc.id, status: 'success' });
    } catch (err) {
      console.error(`  FAILED: ${youthDoc.firstName} ${youthDoc.lastName} -> ${err.message}`);
      results.push({ name: `${youthDoc.firstName} ${youthDoc.lastName}`, id: youthDoc.id, status: 'failed', error: err.message });
    }
  }

  console.log('\n--- Import Summary ---');
  const succeeded = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  console.log(`Total: ${results.length} | Success: ${succeeded.length} | Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed records:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }

  console.log('\nImported profiles:');
  succeeded.forEach(s => console.log(`  - ${s.name} (${s.id})`));

  process.exit(0);
}

importYouth().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
