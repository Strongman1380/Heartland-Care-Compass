import { describe, it, expect } from '@jest/globals';
import {
  LEVELS_DATA,
  getCurrentLevel,
  getNextLevel,
  canLevelUp,
  meetsPrivilegeRequirement,
  processLevelUp,
  processLevelDemotion,
} from '../levelSystem';

describe('getCurrentLevel', () => {
  it('returns the correct level for a valid index', () => {
    expect(getCurrentLevel(0).name).toBe('Orientation');
    expect(getCurrentLevel(1).name).toBe('Level 1');
    expect(getCurrentLevel(10).name).toBe('Level 10');
  });

  it('falls back to Orientation for an out-of-bounds index', () => {
    expect(getCurrentLevel(-1).name).toBe('Orientation');
    expect(getCurrentLevel(99).name).toBe('Orientation');
  });
});

describe('getNextLevel', () => {
  it('returns the next level for non-terminal levels', () => {
    expect(getNextLevel(0)?.name).toBe('Level 1');
    expect(getNextLevel(9)?.name).toBe('Level 10');
  });

  it('returns null at the maximum level', () => {
    expect(getNextLevel(10)).toBeNull();
  });
});

describe('canLevelUp', () => {
  it('returns true when points meet the threshold and level is not max', () => {
    const orientationRequired = LEVELS_DATA[0].cumulativePointsRequired; // 120
    expect(canLevelUp(0, orientationRequired)).toBe(true);
    expect(canLevelUp(0, orientationRequired + 50)).toBe(true);
  });

  it('returns false when points are below the threshold', () => {
    expect(canLevelUp(0, 119)).toBe(false);
    expect(canLevelUp(0, 0)).toBe(false);
  });

  it('returns false at the maximum level regardless of points', () => {
    expect(canLevelUp(10, 99999)).toBe(false);
  });
});

describe('meetsPrivilegeRequirement', () => {
  it('returns true when daily points meet the level threshold', () => {
    expect(meetsPrivilegeRequirement(0, 10)).toBe(true); // Orientation: 10
    expect(meetsPrivilegeRequirement(1, 20)).toBe(true); // Level 1: 20
    expect(meetsPrivilegeRequirement(1, 50)).toBe(true); // above threshold
  });

  it('returns false when daily points are below the threshold', () => {
    expect(meetsPrivilegeRequirement(0, 9)).toBe(false);
    expect(meetsPrivilegeRequirement(1, 19)).toBe(false);
  });
});

describe('processLevelUp', () => {
  it('returns a level-up result when eligible', () => {
    const result = processLevelUp(0, 120);
    expect(result).not.toBeNull();
    expect(result!.newLevelIndex).toBe(1);
    expect(result!.pointsInNewLevel).toBe(0); // 120 - 120 = 0
  });

  it('carries over excess points into the new level', () => {
    const result = processLevelUp(0, 150);
    expect(result!.newLevelIndex).toBe(1);
    expect(result!.pointsInNewLevel).toBe(30);
  });

  it('returns null when not enough points', () => {
    expect(processLevelUp(0, 119)).toBeNull();
  });

  it('returns null at the max level', () => {
    expect(processLevelUp(10, 99999)).toBeNull();
  });
});

describe('processLevelDemotion', () => {
  it('demotes by one level and resets points to 0', () => {
    const result = processLevelDemotion(5);
    expect(result).not.toBeNull();
    expect(result!.newLevelIndex).toBe(4);
    expect(result!.pointsInNewLevel).toBe(0);
  });

  it('returns null when already at Orientation (index 0)', () => {
    expect(processLevelDemotion(0)).toBeNull();
  });
});
