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
    },
    {
      id: uuidv4(),
      firstName: 'Brianna',
      lastName: 'Lopez',
      dob: new Date('2007-11-03'),
      age: 17,
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
    },
    {
      id: uuidv4(),
      firstName: 'Chris',
      lastName: 'Nguyen',
      dob: new Date('2009-02-18'),
      age: 15,
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
    },
  ];

  // Generate points/ratings/notes for last 7 days per youth
  const points: BehaviorPoints[] = [];
  const ratings: DailyRating[] = [];
  const notes: ProgressNote[] = [];

  youths.forEach((y) => {
    for (let d = 0; d < 7; d++) {
      const date = daysAgo(d);
      const morning = 20 - Math.floor(Math.random() * 5);
      const afternoon = 20 - Math.floor(Math.random() * 5);
      const evening = 20 - Math.floor(Math.random() * 5);
      points.push({
        id: uuidv4(),
        youth_id: y.id,
        date,
        morningPoints: morning,
        afternoonPoints: afternoon,
        eveningPoints: evening,
        totalPoints: morning + afternoon + evening,
        comments: d === 0 ? 'Great participation today.' : undefined,
        createdAt: date,
      });

      ratings.push({
        id: uuidv4(),
        youth_id: y.id,
        date,
        peerInteraction: 3 + (Math.floor(Math.random() * 3) - 1),
        adultInteraction: 3 + (Math.floor(Math.random() * 3) - 1),
        investmentLevel: 3 + (Math.floor(Math.random() * 3) - 1),
        dealAuthority: 3 + (Math.floor(Math.random() * 3) - 1),
        staff: 'Staff A',
        comments: d % 2 === 0 ? 'Showing progress.' : 'Needs reminders to stay on task.',
        createdAt: date,
        updatedAt: date,
      });

      if (d % 2 === 0) {
        notes.push({
          id: uuidv4(),
          youth_id: y.id,
          date,
          category: 'Daily Note',
          note: 'Participated in group activity. Good teamwork and cooperation.',
          rating: 4,
          staff: 'Counselor 1',
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
