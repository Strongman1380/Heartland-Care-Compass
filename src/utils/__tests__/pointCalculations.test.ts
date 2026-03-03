import { describe, it, expect } from '@jest/globals';
import { calculatePointsNeededForNextLevel } from '../pointCalculations';

// Minimal stub — cast via unknown to avoid full type compatibility
const makeYouth = (level: number, pointTotal: number) =>
  ({ id: 'test', firstName: 'A', lastName: 'B', level, pointTotal } as any);

describe('calculatePointsNeededForNextLevel', () => {
  it('returns points remaining to reach next level', () => {
    expect(calculatePointsNeededForNextLevel(makeYouth(1, 500))).toBe(1500); // 2000 - 500
    expect(calculatePointsNeededForNextLevel(makeYouth(2, 1000))).toBe(2000); // 3000 - 1000
    expect(calculatePointsNeededForNextLevel(makeYouth(3, 3500))).toBe(500);  // 4000 - 3500
    expect(calculatePointsNeededForNextLevel(makeYouth(4, 4000))).toBe(1000); // 5000 - 4000
  });

  it('never returns a negative number', () => {
    expect(calculatePointsNeededForNextLevel(makeYouth(1, 9999))).toBe(0);
    expect(calculatePointsNeededForNextLevel(makeYouth(2, 9999))).toBe(0);
  });

  it('returns 0 for a level with no defined requirement (max / unknown)', () => {
    expect(calculatePointsNeededForNextLevel(makeYouth(5, 0))).toBe(0);
    expect(calculatePointsNeededForNextLevel(makeYouth(10, 0))).toBe(0);
  });

  it('treats undefined pointTotal as 0', () => {
    const youth = makeYouth(1, undefined as unknown as number);
    expect(calculatePointsNeededForNextLevel(youth)).toBe(2000);
  });
});
