import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firebase schoolScoresService before importing schoolScores
vi.mock('@/integrations/firebase/schoolScoresService', () => ({
  schoolScoresService: {
    upsert: vi.fn(),
    get: vi.fn(),
    range: vi.fn(),
    forYouth: vi.fn(),
    all: vi.fn(),
    delete: vi.fn(),
  },
}));

import { schoolScoresService } from '@/integrations/firebase/schoolScoresService';
import { getYouthStats } from '../schoolScores';

const mockForYouth = vi.mocked(schoolScoresService.forYouth);

// Build a mock SchoolScoreRow. Scores stored as tenths (0–40).
const mockRow = (date: string, score: number) => ({
  id: date,
  youth_id: 'y1',
  date,
  weekday: 1,
  score: score * 10,
  created_at: date,
  updated_at: date,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getYouthStats — trend detection', () => {
  it('returns null when there are no scores', async () => {
    mockForYouth.mockResolvedValue([]);
    expect(await getYouthStats('y1')).toBeNull();
  });

  // windowSize for 8 scores = floor(8/3) = 2
  // recent = 2 newest, previous = 2 next-newest
  it('detects improving trend: 2 newest high, 2 before low', async () => {
    const scores = [
      mockRow('2026-01-01', 1.0), mockRow('2026-01-02', 1.0),
      mockRow('2026-01-03', 1.0), mockRow('2026-01-04', 1.0),
      mockRow('2026-01-05', 1.0), mockRow('2026-01-06', 1.0),
      mockRow('2026-01-07', 3.5), mockRow('2026-01-08', 3.5), // newest 2
    ];
    mockForYouth.mockResolvedValue(scores as any);
    const result = await getYouthStats('y1');
    expect(result?.trend).toBe('improving');
  });

  it('detects declining trend: 2 newest low, 2 before high', async () => {
    const scores = [
      mockRow('2026-01-01', 3.5), mockRow('2026-01-02', 3.5),
      mockRow('2026-01-03', 3.5), mockRow('2026-01-04', 3.5),
      mockRow('2026-01-05', 3.5), mockRow('2026-01-06', 3.5),
      mockRow('2026-01-07', 1.0), mockRow('2026-01-08', 1.0), // newest 2
    ];
    mockForYouth.mockResolvedValue(scores as any);
    const result = await getYouthStats('y1');
    expect(result?.trend).toBe('declining');
  });

  it('reports stable when all scores are identical', async () => {
    const scores = Array.from({ length: 8 }, (_, i) =>
      mockRow(`2026-01-${String(i + 1).padStart(2, '0')}`, 3.0)
    );
    mockForYouth.mockResolvedValue(scores as any);
    const result = await getYouthStats('y1');
    expect(result?.trend).toBe('stable');
  });

  it('calculates correct highest and lowest scores', async () => {
    const scores = [
      mockRow('2026-01-01', 1.0),
      mockRow('2026-01-02', 2.5),
      mockRow('2026-01-03', 4.0),
    ];
    mockForYouth.mockResolvedValue(scores as any);
    const result = await getYouthStats('y1');
    expect(result?.highest).toBe(4.0);
    expect(result?.lowest).toBe(1.0);
  });
});
