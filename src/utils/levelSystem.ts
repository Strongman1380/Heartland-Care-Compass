
// Level progression system based on your requirements
export interface LevelData {
  name: string;
  index: number;
  cumulativePointsRequired: number; // Points needed to complete this level
  dailyPointsForPrivileges: number; // Daily points needed for privileges
}

export const LEVELS_DATA: LevelData[] = [
  { name: "Orientation", index: 0, cumulativePointsRequired: 120, dailyPointsForPrivileges: 10 },
  { name: "Level 1", index: 1, cumulativePointsRequired: 840, dailyPointsForPrivileges: 20 },
  { name: "Level 2", index: 2, cumulativePointsRequired: 2000, dailyPointsForPrivileges: 20 },
  { name: "Level 3", index: 3, cumulativePointsRequired: 3060, dailyPointsForPrivileges: 30 },
  { name: "Level 4", index: 4, cumulativePointsRequired: 4740, dailyPointsForPrivileges: 40 },
  { name: "Level 5", index: 5, cumulativePointsRequired: 6840, dailyPointsForPrivileges: 50 },
  { name: "Level 6", index: 6, cumulativePointsRequired: 9360, dailyPointsForPrivileges: 60 },
  { name: "Level 7", index: 7, cumulativePointsRequired: 12300, dailyPointsForPrivileges: 70 },
  { name: "Level 8", index: 8, cumulativePointsRequired: 15660, dailyPointsForPrivileges: 80 },
  { name: "Level 9", index: 9, cumulativePointsRequired: 19440, dailyPointsForPrivileges: 90 },
  { name: "Level 10", index: 10, cumulativePointsRequired: Infinity, dailyPointsForPrivileges: 100 },
];

export const getCurrentLevel = (levelIndex: number): LevelData => {
  return LEVELS_DATA[levelIndex] || LEVELS_DATA[0];
};

export const getNextLevel = (levelIndex: number): LevelData | null => {
  return levelIndex < LEVELS_DATA.length - 1 ? LEVELS_DATA[levelIndex + 1] : null;
};

export const canLevelUp = (currentLevelIndex: number, pointsInCurrentLevel: number): boolean => {
  const currentLevel = getCurrentLevel(currentLevelIndex);
  return pointsInCurrentLevel >= currentLevel.cumulativePointsRequired && currentLevelIndex < LEVELS_DATA.length - 1;
};

export const meetsPrivilegeRequirement = (levelIndex: number, dailyPoints: number): boolean => {
  const level = getCurrentLevel(levelIndex);
  return dailyPoints >= level.dailyPointsForPrivileges;
};

export const processLevelUp = (currentLevelIndex: number, pointsInCurrentLevel: number) => {
  if (canLevelUp(currentLevelIndex, pointsInCurrentLevel)) {
    const currentLevel = getCurrentLevel(currentLevelIndex);
    return {
      newLevelIndex: currentLevelIndex + 1,
      pointsInNewLevel: pointsInCurrentLevel - currentLevel.cumulativePointsRequired,
      pointsEarnedOnCompletedLevel: currentLevel.cumulativePointsRequired
    };
  }
  return null;
};

export const processLevelDemotion = (currentLevelIndex: number) => {
  if (currentLevelIndex > 0) {
    return {
      newLevelIndex: currentLevelIndex - 1,
      pointsInNewLevel: 0
    };
  }
  return null;
};
