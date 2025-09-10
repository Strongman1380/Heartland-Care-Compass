import { STORAGE_KEYS, setItem } from '@/utils/local-storage-utils';
import { v4 as uuidv4 } from '@/utils/uuid';
import { Youth, BehaviorPoints, ProgressNote, DailyRating } from '@/types/app-types';

export const seedMockData = () => {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const youths: Youth[] = [
    {
      id: uuidv4(),
      firstName: 'Alex',
      lastName: 'Miller',
      dob: new Date('2008-04-12'),
      age: 16,
      sex: 'M',
      race: 'Caucasian',
      religion: 'Christian',
      placeOfBirth: 'Portland, ME',
      admissionDate: daysAgo(120),
      level: 2,
      pointTotal: 3400,
      peerInteraction: 4,
      adultInteraction: 4,
      investmentLevel: 3,
      dealAuthority: 4,
      hyrnaRiskLevel: 'Medium',
      hyrnaScore: 12,
      hyrnaAssessmentDate: daysAgo(60),
      createdAt: daysAgo(120),
      updatedAt: now,
      
      // Personal Information
      idNumber: 'HBH-2024-001',
      legalGuardian: 'Sarah Miller',
      guardianRelationship: 'Mother',
      guardianContact: '(207) 555-0123',
      guardianPhone: '(207) 555-0123',
      guardianEmail: 'sarah.miller@email.com',
      probationOfficer: 'Officer Johnson',
      probationContact: '(207) 555-0456',
      probationPhone: '(207) 555-0456',
      placementAuthority: 'DHHS',
      estimatedStay: '9-12 months',
      referralSource: 'Cumberland County Probation',
      referralReason: 'Repeated truancy, defiant behavior at home, minor theft charges',
      
      // Background Information
      priorPlacements: ['Foster Care - 6 months', 'Relative Care - 3 months'],
      numPriorPlacements: '2',
      lengthRecentPlacement: '3 months',
      courtInvolvement: ['Juvenile Court', 'Probation'],
      legalStatus: 'Juvenile Court, Probation',
      
      // Education Information
      currentSchool: 'Portland Middle School',
      grade: '10th Grade',
      hasIEP: true,
      academicStrengths: 'Mathematics, Creative Writing',
      academicChallenges: 'Reading Comprehension, Social Studies',
      educationGoals: 'Improve reading level, complete high school',
      schoolContact: 'Ms. Anderson',
      schoolPhone: '(207) 555-0789',
      educationInfo: 'School: Portland Middle School; Grade: 10th Grade; Has IEP; Strengths: Mathematics, Creative Writing; Challenges: Reading Comprehension, Social Studies',
      
      // Medical Information
      physician: 'Dr. Smith',
      physicianPhone: '(207) 555-0321',
      insuranceProvider: 'MaineCare',
      policyNumber: 'MC-123456789',
      allergies: 'Peanuts, Shellfish',
      medicalConditions: 'Asthma',
      medicalRestrictions: 'No contact sports due to asthma',
      medicalInfo: 'Asthma; Allergies: Peanuts, Shellfish; Restrictions: No contact sports due to asthma',
      
      // Mental Health Information
      currentDiagnoses: 'ADHD, Oppositional Defiant Disorder',
      diagnoses: 'ADHD, Oppositional Defiant Disorder',
      traumaHistory: ['Parental Divorce', 'Neglect'],
      previousTreatment: 'Outpatient counseling for 2 years',
      currentCounseling: ['Individual Therapy', 'Group Therapy'],
      therapistName: 'Dr. Wilson',
      therapistContact: '(207) 555-0654',
      sessionFrequency: 'Weekly',
      sessionTime: 'Tuesdays 2:00 PM',
      selfHarmHistory: [],
      lastIncidentDate: '',
      hasSafetyPlan: false,
      mentalHealthInfo: 'ADHD, Oppositional Defiant Disorder; Trauma history: Parental Divorce, Neglect; Previous treatment: Outpatient counseling for 2 years',
      
      // Behavior tracking
      onSubsystem: false,
      pointsInCurrentLevel: 1400,
      dailyPointsForPrivileges: 15,
    },
    {
      id: uuidv4(),
      firstName: 'Brianna',
      lastName: 'Lopez',
      dob: new Date('2007-11-03'),
      age: 17,
      sex: 'F',
      race: 'Hispanic',
      religion: 'Catholic',
      placeOfBirth: 'Lewiston, ME',
      admissionDate: daysAgo(200),
      level: 3,
      pointTotal: 5200,
      peerInteraction: 5,
      adultInteraction: 4,
      investmentLevel: 4,
      dealAuthority: 5,
      hyrnaRiskLevel: 'Low',
      hyrnaScore: 7,
      hyrnaAssessmentDate: daysAgo(45),
      createdAt: daysAgo(200),
      updatedAt: now,
      
      // Personal Information
      idNumber: 'HBH-2024-002',
      legalGuardian: 'Maria Lopez',
      guardianRelationship: 'Grandmother',
      guardianContact: '(207) 555-0234',
      guardianPhone: '(207) 555-0234',
      guardianEmail: 'maria.lopez@email.com',
      probationOfficer: 'Officer Davis',
      probationContact: '(207) 555-0567',
      probationPhone: '(207) 555-0567',
      placementAuthority: 'Probation',
      estimatedStay: '6-9 months',
      referralSource: 'Androscoggin County Probation',
      referralReason: 'Substance abuse, running away from home, academic failure',
      
      // Background Information
      priorPlacements: ['Group Home - 8 months', 'Residential Treatment - 4 months'],
      numPriorPlacements: '2',
      lengthRecentPlacement: '4 months',
      courtInvolvement: ['Juvenile Court', 'Drug Court'],
      legalStatus: 'Juvenile Court, Drug Court',
      
      // Education Information
      currentSchool: 'Lewiston High School',
      grade: '11th Grade',
      hasIEP: false,
      academicStrengths: 'Art, Spanish Language',
      academicChallenges: 'Science, Attendance',
      educationGoals: 'Graduate high school, pursue art education',
      schoolContact: 'Mr. Rodriguez',
      schoolPhone: '(207) 555-0890',
      educationInfo: 'School: Lewiston High School; Grade: 11th Grade; Strengths: Art, Spanish Language; Challenges: Science, Attendance',
      
      // Medical Information
      physician: 'Dr. Garcia',
      physicianPhone: '(207) 555-0432',
      insuranceProvider: 'MaineCare',
      policyNumber: 'MC-987654321',
      allergies: 'None known',
      medicalConditions: 'None',
      medicalRestrictions: 'None',
      medicalInfo: 'No known medical conditions or restrictions',
      
      // Mental Health Information
      currentDiagnoses: 'Depression, Substance Use Disorder',
      diagnoses: 'Depression, Substance Use Disorder',
      traumaHistory: ['Physical Abuse', 'Substance Abuse in Family'],
      previousTreatment: 'Inpatient substance abuse treatment - 30 days',
      currentCounseling: ['Individual Therapy', 'Substance Abuse Counseling'],
      therapistName: 'Dr. Martinez',
      therapistContact: '(207) 555-0765',
      sessionFrequency: 'Twice weekly',
      sessionTime: 'Mondays 10:00 AM, Thursdays 3:00 PM',
      selfHarmHistory: ['Cutting - 6 months ago'],
      lastIncidentDate: '2024-06-15',
      hasSafetyPlan: true,
      mentalHealthInfo: 'Depression, Substance Use Disorder; Trauma history: Physical Abuse, Substance Abuse in Family; Previous treatment: Inpatient substance abuse treatment - 30 days',
      
      // Behavior tracking
      onSubsystem: false,
      pointsInCurrentLevel: 2200,
      dailyPointsForPrivileges: 18,
    },
    {
      id: uuidv4(),
      firstName: 'Chris',
      lastName: 'Nguyen',
      dob: new Date('2009-02-18'),
      age: 15,
      sex: 'M',
      race: 'Asian',
      religion: 'Buddhist',
      placeOfBirth: 'Bangor, ME',
      admissionDate: daysAgo(45),
      level: 1,
      pointTotal: 900,
      peerInteraction: 3,
      adultInteraction: 3,
      investmentLevel: 2,
      dealAuthority: 3,
      hyrnaRiskLevel: 'Medium',
      hyrnaScore: 15,
      hyrnaAssessmentDate: daysAgo(20),
      createdAt: daysAgo(45),
      updatedAt: now,
      
      // Personal Information
      idNumber: 'HBH-2024-003',
      legalGuardian: 'Linh Nguyen',
      guardianRelationship: 'Mother',
      guardianContact: '(207) 555-0345',
      guardianPhone: '(207) 555-0345',
      guardianEmail: 'linh.nguyen@email.com',
      probationOfficer: 'Officer Thompson',
      probationContact: '(207) 555-0678',
      probationPhone: '(207) 555-0678',
      placementAuthority: 'DHHS',
      estimatedStay: '12+ months',
      referralSource: 'Penobscot County DHHS',
      referralReason: 'Aggressive behavior, property destruction, family conflict',
      
      // Background Information
      priorPlacements: ['Emergency Shelter - 2 weeks'],
      numPriorPlacements: '1',
      lengthRecentPlacement: '2 weeks',
      courtInvolvement: ['DHHS Case'],
      legalStatus: 'DHHS Case',
      
      // Education Information
      currentSchool: 'Bangor Middle School',
      grade: '9th Grade',
      hasIEP: true,
      academicStrengths: 'Computer Science, Mathematics',
      academicChallenges: 'English Language Arts, Social Skills',
      educationGoals: 'Improve social skills, maintain academic progress',
      schoolContact: 'Mrs. Chen',
      schoolPhone: '(207) 555-0901',
      educationInfo: 'School: Bangor Middle School; Grade: 9th Grade; Has IEP; Strengths: Computer Science, Mathematics; Challenges: English Language Arts, Social Skills',
      
      // Medical Information
      physician: 'Dr. Kim',
      physicianPhone: '(207) 555-0543',
      insuranceProvider: 'MaineCare',
      policyNumber: 'MC-456789123',
      allergies: 'Latex',
      medicalConditions: 'None',
      medicalRestrictions: 'Latex-free environment required',
      medicalInfo: 'Allergies: Latex; Restrictions: Latex-free environment required',
      
      // Mental Health Information
      currentDiagnoses: 'Autism Spectrum Disorder, Anxiety Disorder',
      diagnoses: 'Autism Spectrum Disorder, Anxiety Disorder',
      traumaHistory: ['Bullying at School'],
      previousTreatment: 'Applied Behavior Analysis therapy for 3 years',
      currentCounseling: ['Individual Therapy', 'Social Skills Group'],
      therapistName: 'Dr. Park',
      therapistContact: '(207) 555-0876',
      sessionFrequency: 'Weekly',
      sessionTime: 'Wednesdays 1:00 PM',
      selfHarmHistory: [],
      lastIncidentDate: '',
      hasSafetyPlan: false,
      mentalHealthInfo: 'Autism Spectrum Disorder, Anxiety Disorder; Trauma history: Bullying at School; Previous treatment: Applied Behavior Analysis therapy for 3 years',
      
      // Behavior tracking
      onSubsystem: true,
      pointsInCurrentLevel: 400,
      dailyPointsForPrivileges: 12,
    },
  ];

  // Generate comprehensive points/ratings/notes for last 30 days per youth for troubleshooting
  const points: BehaviorPoints[] = [];
  const ratings: DailyRating[] = [];
  const notes: ProgressNote[] = [];

  // Helper functions for generating realistic data
  const generateBehaviorComment = (name: string, dayIndex: number, totalPoints: number): string => {
    const comments = [
      `${name} showed excellent leadership during group activities today.`,
      `Good participation in therapy session. ${name} shared insights about coping strategies.`,
      `${name} helped a newer resident adjust to program expectations.`,
      `Demonstrated improved conflict resolution skills during peer interaction.`,
      `${name} completed all assigned tasks without reminders.`,
      `Showed empathy and support for struggling peer during group time.`,
      `${name} took initiative in organizing recreational activities.`,
      `Good focus during educational programming today.`,
      `${name} practiced new coping skills when feeling frustrated.`,
      `Excellent cooperation with staff throughout the day.`,
      `${name} showed improvement in emotional regulation during challenging situation.`,
      `Participated actively in family therapy session via video call.`,
      `${name} demonstrated responsibility by helping with facility maintenance.`,
      `Good problem-solving skills during group project.`,
      `${name} showed patience and understanding with younger residents.`
    ];
    
    if (totalPoints >= 50) return comments[Math.floor(Math.random() * 5)]; // Excellent day comments
    if (totalPoints >= 40) return comments[Math.floor(Math.random() * 10) + 5]; // Good day comments
    return `${name} had some challenges today but responded well to staff support.`; // Challenging day
  };

  const generateProgressNote = (name: string, category: string, youth: any): string => {
    const noteTemplates = {
      'Behavioral': [
        `${name} demonstrated excellent self-control during a peer conflict situation. Used learned de-escalation techniques effectively.`,
        `Observed ${name} helping newer residents understand program expectations. Shows developing leadership skills.`,
        `${name} had difficulty with authority today but was able to process the situation in individual session.`,
        `Significant improvement in ${name}'s ability to accept feedback and make behavioral adjustments.`,
        `${name} showed frustration during group activity but used appropriate coping strategies to manage emotions.`
      ],
      'Academic': [
        `${name} completed all assignments on time and showed particular strength in ${youth.academicStrengths || 'mathematics'}.`,
        `Working with ${name} on ${youth.academicChallenges || 'reading comprehension'}. Making steady progress with additional support.`,
        `${name} participated actively in classroom discussions and helped peers with difficult concepts.`,
        `${youth.hasIEP ? name + ' is meeting IEP goals consistently. Accommodations are working well.' : name + ' is performing at grade level in most subjects.'}`,
        `${name} expressed interest in vocational training opportunities. Discussed potential career paths.`
      ],
      'Social': [
        `${name} initiated positive interactions with peers during recreational time. Building healthy friendships.`,
        `Observed ${name} practicing conflict resolution skills during disagreement with roommate. Successful outcome.`,
        `${name} participated in group therapy and shared personal insights about family relationships.`,
        `Working with ${name} on appropriate boundaries in peer relationships. Making good progress.`,
        `${name} showed empathy and support for peer who received difficult news from home.`
      ],
      'Therapeutic': [
        `Individual session with ${name} focused on ${youth.traumaHistory?.length ? 'trauma processing and coping skill development' : 'behavioral goals and emotional regulation'}.`,
        `${name} is making progress on treatment goals related to ${youth.currentDiagnoses || 'emotional and behavioral challenges'}.`,
        `Family therapy session included ${name} and ${youth.legalGuardian || 'guardian'}. Worked on communication skills.`,
        `${name} demonstrated increased insight into behavioral triggers and practiced new coping strategies.`,
        `Group therapy participation: ${name} shared experiences and offered support to peers facing similar challenges.`
      ],
      'Medical': [
        `${name} attended scheduled medical appointment. All vital signs normal. ${youth.allergies ? 'Reminded about allergy precautions.' : 'No medical concerns noted.'}`,
        `Medication compliance excellent. ${name} reports no side effects from current medications.`,
        `${youth.medicalConditions ? name + ' managing ' + youth.medicalConditions + ' well with current treatment plan.' : name + ' reports feeling physically well with no health concerns.'}`,
        `Annual physical exam completed. ${name} is in good health overall.`,
        `${name} participated in health education session about nutrition and exercise.`
      ],
      'Family Contact': [
        `${name} had positive phone contact with ${youth.legalGuardian || 'family'}. Discussed progress and upcoming visits.`,
        `Family visit went well. ${name} and ${youth.legalGuardian || 'guardian'} practiced communication skills learned in therapy.`,
        `${name} expressed some anxiety about family contact. Processed feelings in individual session.`,
        `Coordinated with ${youth.legalGuardian || 'family'} regarding discharge planning and community resources.`,
        `${name} wrote letter to family member. Good therapeutic exercise in expressing feelings appropriately.`
      ],
      'Recreational': [
        `${name} participated enthusiastically in basketball game. Good sportsmanship and teamwork.`,
        `Art therapy session: ${name} created meaningful artwork expressing personal growth journey.`,
        `${name} took leadership role in organizing movie night for residents. Excellent planning skills.`,
        `Outdoor recreation time: ${name} enjoyed hiking and discussed connection between physical activity and mental health.`,
        `${name} participated in music therapy and shared personal song that has meaning for recovery journey.`
      ]
    };
    
    const templates = noteTemplates[category as keyof typeof noteTemplates] || noteTemplates['Behavioral'];
    return templates[Math.floor(Math.random() * templates.length)];
  };

  const generateRatingComment = (name: string, dayIndex: number): string => {
    const comments = [
      `${name} showed excellent peer interactions and leadership today.`,
      `Good cooperation with staff throughout all shifts.`,
      `${name} demonstrated improved emotional regulation during challenging situation.`,
      `Positive attitude and engagement in all program activities.`,
      `${name} showed respect for authority and followed all program expectations.`,
      `Excellent investment in treatment goals and therapeutic activities.`,
      `${name} supported peers and contributed positively to milieu.`,
      `Good problem-solving and conflict resolution skills demonstrated.`,
      `${name} showed patience and understanding in difficult peer situation.`,
      `Consistent positive behavior across all program areas.`
    ];
    
    return comments[Math.floor(Math.random() * comments.length)];
  };

  youths.forEach((y) => {
    // Generate 30 days of comprehensive data for each youth
    for (let d = 0; d < 30; d++) {
      const date = daysAgo(d);
      
      // Create realistic point patterns based on youth level and progress
      const basePoints = y.level >= 3 ? 18 : y.level >= 2 ? 15 : 12;
      const variation = Math.floor(Math.random() * 6) - 3; // -3 to +3 variation
      
      const morning = Math.max(8, Math.min(20, basePoints + variation + Math.floor(Math.random() * 3)));
      const afternoon = Math.max(8, Math.min(20, basePoints + variation + Math.floor(Math.random() * 3)));
      const evening = Math.max(8, Math.min(20, basePoints + variation + Math.floor(Math.random() * 3)));
      
      // Add weekend variations
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendAdjustment = isWeekend ? Math.floor(Math.random() * 4) - 2 : 0;
      
      const adjustedMorning = Math.max(5, Math.min(20, morning + weekendAdjustment));
      const adjustedAfternoon = Math.max(5, Math.min(20, afternoon + weekendAdjustment));
      const adjustedEvening = Math.max(5, Math.min(20, evening + weekendAdjustment));
      const totalPoints = adjustedMorning + adjustedAfternoon + adjustedEvening;
      
      points.push({
        id: uuidv4(),
        youth_id: y.id,
        date,
        morningPoints: adjustedMorning,
        afternoonPoints: adjustedAfternoon,
        eveningPoints: adjustedEvening,
        totalPoints,
        comments: d % 3 === 0 ? generateBehaviorComment(y.firstName, d, totalPoints) : undefined,
        createdAt: date,
      });

      // Generate daily ratings with realistic patterns
      const basePeer = y.peerInteraction || 4;
      const baseAdult = y.adultInteraction || 4;
      const baseInvestment = y.investmentLevel || 3;
      const baseAuthority = y.dealAuthority || 4;
      
      ratings.push({
        id: uuidv4(),
        youth_id: y.id,
        date,
        peerInteraction: Math.max(1, Math.min(5, basePeer + Math.floor(Math.random() * 3) - 1)),
        adultInteraction: Math.max(1, Math.min(5, baseAdult + Math.floor(Math.random() * 3) - 1)),
        investmentLevel: Math.max(1, Math.min(5, baseInvestment + Math.floor(Math.random() * 3) - 1)),
        dealAuthority: Math.max(1, Math.min(5, baseAuthority + Math.floor(Math.random() * 3) - 1)),
        staff: ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Wilson', 'Dr. Martinez'][Math.floor(Math.random() * 5)],
        comments: d % 4 === 0 ? generateRatingComment(y.firstName, d) : undefined,
        createdAt: date,
        updatedAt: date,
      });

      // Generate progress notes (not every day, but frequently)
      if (d % 2 === 0 || Math.random() > 0.6) {
        const categories = ['Behavioral', 'Academic', 'Social', 'Therapeutic', 'Medical', 'Family Contact', 'Recreational'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        
        notes.push({
          id: uuidv4(),
          youth_id: y.id,
          date,
          category,
          note: generateProgressNote(y.firstName, category, y),
          rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
          staff: ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Wilson', 'Dr. Martinez', 'Ms. Anderson', 'Officer Thompson'][Math.floor(Math.random() * 7)],
          createdAt: date,
        });
      }
    }
  });

  setItem(STORAGE_KEYS.YOUTHS, youths);
  setItem(STORAGE_KEYS.POINTS, points);
  setItem(STORAGE_KEYS.RATINGS, ratings);
  setItem(STORAGE_KEYS.NOTES, notes);
};
