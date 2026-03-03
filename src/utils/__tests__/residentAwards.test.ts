import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Youth } from '@/integrations/firebase/services';

// ---------------------------------------------------------------------------
// Mock Firebase services and shiftScores before importing residentAwards
// ---------------------------------------------------------------------------

jest.mock('@/integrations/firebase/services', () => ({
  behaviorPointsService: {
    getByYouthId: jest.fn(),
  },
}));

jest.mock('@/utils/shiftScores', () => ({
  calculateCombinedAveragesForRange: jest.fn(),
}));

import { calculateResidentAwardsForYouths } from '../residentAwards';
import { behaviorPointsService } from '@/integrations/firebase/services';
import { calculateCombinedAveragesForRange } from '@/utils/shiftScores';

const mockGetByYouthId = behaviorPointsService.getByYouthId as jest.MockedFunction<typeof behaviorPointsService.getByYouthId>;
const mockCalcAvg = calculateCombinedAveragesForRange as jest.MockedFunction<typeof calculateCombinedAveragesForRange>;

const makeYouth = (id: string, firstName: string, lastName: string): Youth =>
  ({ id, firstName, lastName, level: 1, pointTotal: 0 } as unknown as Youth);

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no behavior points, 0 averages
  mockGetByYouthId.mockResolvedValue([]);
  mockCalcAvg.mockResolvedValue({ peer: 0, adult: 0, investment: 0, authority: 0, overall: 0, totalEntries: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('calculateResidentAwardsForYouths', () => {
  it('returns null winners when there are no youths', async () => {
    const result = await calculateResidentAwardsForYouths([]);
    expect(result.residentOfWeek).toBeNull();
    expect(result.residentOfMonth).toBeNull();
    expect(result.mostImprovedWeek).toBeNull();
  });

  it('selects the youth with more total points as Resident of the Week', async () => {
    const alice = makeYouth('alice', 'Alice', 'Smith');
    const bob = makeYouth('bob', 'Bob', 'Jones');

    mockGetByYouthId.mockImplementation(async (id) => {
      if (id === 'alice') return [{ totalPoints: 300 }] as any;
      return [{ totalPoints: 100 }] as any;
    });
    // Eval averages: both 0 (so tiebreaker is points)
    mockCalcAvg.mockResolvedValue({ peer: 0, adult: 0, investment: 0, authority: 0, overall: 0, totalEntries: 0 });

    const result = await calculateResidentAwardsForYouths([alice, bob]);
    expect(result.residentOfWeek?.youthId).toBe('alice');
  });

  it('selects the youth with higher eval average as Resident of the Week when points are equal', async () => {
    const alice = makeYouth('alice', 'Alice', 'Smith');
    const bob = makeYouth('bob', 'Bob', 'Jones');

    mockGetByYouthId.mockResolvedValue([{ totalPoints: 100 }] as any);
    mockCalcAvg.mockImplementation(async (youthId, _start, _end) => {
      if (youthId === 'alice') {
        return { peer: 3, adult: 3, investment: 3, authority: 3, overall: 3, totalEntries: 1 };
      }
      return { peer: 2, adult: 2, investment: 2, authority: 2, overall: 2, totalEntries: 1 };
    });

    const result = await calculateResidentAwardsForYouths([alice, bob]);
    expect(result.residentOfWeek?.youthId).toBe('alice');
  });

  it('uses a rolling last 7 days window for Resident of the Week', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-02-28T12:00:00Z'));

    const alice = makeYouth('alice', 'Alice', 'Smith');
    const bob = makeYouth('bob', 'Bob', 'Jones');

    mockGetByYouthId.mockImplementation(async (id) => {
      if (id === 'alice') {
        return [
          { date: '2026-02-25', totalPoints: 300 },
          { date: '2026-02-18', totalPoints: 1000 },
        ] as any;
      }

      return [{ date: '2026-02-20', totalPoints: 200 }] as any;
    });

    const result = await calculateResidentAwardsForYouths([alice, bob]);
    expect(result.residentOfWeek?.youthId).toBe('alice');
  });
});
