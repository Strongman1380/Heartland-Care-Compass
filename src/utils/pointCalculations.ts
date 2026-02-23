import { Youth, BehaviorPoints } from '@/types/app-types';
import { fetchBehaviorPoints } from './local-storage-utils';

/**
 * Calculate total points for a youth based on their behavior point entries
 */
export const calculateTotalPoints = async (youthId: string): Promise<number> => {
  try {
    const behaviorPoints = fetchBehaviorPoints(youthId);
    return behaviorPoints.reduce((total, entry) => total + (entry.totalPoints || 0), 0);
  } catch (error) {
    console.error('Error calculating total points:', error);
    return 0;
  }
};

/**
 * Calculate points for a specific time period
 */
export const calculatePointsForPeriod = async (
  youthId: string, 
  startDate: Date, 
  endDate: Date
): Promise<number> => {
  try {
    const behaviorPoints = fetchBehaviorPoints(youthId);
    return behaviorPoints
      .filter(entry => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      })
      .reduce((total, entry) => total + (entry.totalPoints || 0), 0);
  } catch (error) {
    console.error('Error calculating points for period:', error);
    return 0;
  }
};

/**
 * Calculate average daily points for a youth
 */
export const calculateAverageDailyPoints = async (youthId: string): Promise<number> => {
  try {
    const behaviorPoints = fetchBehaviorPoints(youthId);
    if (behaviorPoints.length === 0) return 0;
    
    const totalPoints = behaviorPoints.reduce((total, entry) => total + (entry.totalPoints || 0), 0);
    return Math.round(totalPoints / behaviorPoints.length);
  } catch (error) {
    console.error('Error calculating average daily points:', error);
    return 0;
  }
};

/**
 * Calculate points needed for next level
 */
export const calculatePointsNeededForNextLevel = (youth: Youth): number => {
  const levelRequirements = {
    1: 2000,  // Level 1 to Level 2
    2: 3000,  // Level 2 to Level 3
    3: 4000,  // Level 3 to Level 4
    4: 5000,  // Level 4 to Level 5
  };
  
  const currentLevel = youth.level || 1;
  const requiredPoints = levelRequirements[currentLevel as keyof typeof levelRequirements];
  
  if (!requiredPoints) return 0; // Already at max level
  
  const currentPoints = youth.pointTotal || 0;
  return Math.max(0, requiredPoints - currentPoints);
};

/**
 * Sync youth's total points with their behavior point entries
 */
export const syncYouthTotalPoints = async (youth: Youth, updateYouth: (id: string, updates: Partial<Youth>) => void): Promise<void> => {
  try {
    const calculatedTotal = await calculateTotalPoints(youth.id);
    
    if (calculatedTotal !== youth.pointTotal) {
      console.log(`Syncing points for ${youth.firstName}: ${youth.pointTotal} -> ${calculatedTotal}`);
      updateYouth(youth.id, { pointTotal: calculatedTotal });
    }
  } catch (error) {
    console.error('Error syncing youth total points:', error);
  }
};

/**
 * Calculate weekly point averages
 */
export const calculateWeeklyAverages = async (youthId: string, weeks: number = 4): Promise<Array<{ week: string; average: number; total: number }>> => {
  try {
    const behaviorPoints = fetchBehaviorPoints(youthId);
    const weeklyData: Array<{ week: string; average: number; total: number }> = [];
    
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekPoints = behaviorPoints.filter(entry => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });
      
      const total = weekPoints.reduce((sum, entry) => sum + (entry.totalPoints || 0), 0);
      const average = weekPoints.length > 0 ? Math.round(total / weekPoints.length) : 0;
      
      weeklyData.push({
        week: `Week ${i + 1}`,
        average,
        total
      });
    }
    
    return weeklyData.reverse(); // Most recent first
  } catch (error) {
    console.error('Error calculating weekly averages:', error);
    return [];
  }
};

/**
 * Get point statistics for reporting
 */
export const getPointStatistics = async (youthId: string, days: number = 30): Promise<{
  totalPoints: number;
  averageDaily: number;
  highestDay: number;
  lowestDay: number;
  daysAboveAverage: number;
  trend: 'improving' | 'declining' | 'stable';
}> => {
  try {
    const behaviorPoints = fetchBehaviorPoints(youthId);
    const recentPoints = behaviorPoints
      .filter(entry => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return entryDate >= cutoffDate;
      })
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    
    if (recentPoints.length === 0) {
      return {
        totalPoints: 0,
        averageDaily: 0,
        highestDay: 0,
        lowestDay: 0,
        daysAboveAverage: 0,
        trend: 'stable'
      };
    }
    
    const totalPoints = recentPoints.reduce((sum, entry) => sum + (entry.totalPoints || 0), 0);
    const averageDaily = Math.round(totalPoints / recentPoints.length);
    const dailyTotals = recentPoints.map(entry => entry.totalPoints || 0);
    const highestDay = Math.max(...dailyTotals);
    const lowestDay = Math.min(...dailyTotals);
    const daysAboveAverage = dailyTotals.filter(total => total > averageDaily).length;
    
    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(recentPoints.length / 2);
    const firstHalfAvg = recentPoints.slice(0, midPoint).reduce((sum, entry) => sum + (entry.totalPoints || 0), 0) / midPoint;
    const secondHalfAvg = recentPoints.slice(midPoint).reduce((sum, entry) => sum + (entry.totalPoints || 0), 0) / (recentPoints.length - midPoint);
    
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    const difference = secondHalfAvg - firstHalfAvg;
    if (difference > 1) trend = 'improving';
    else if (difference < -1) trend = 'declining';
    
    return {
      totalPoints,
      averageDaily,
      highestDay,
      lowestDay,
      daysAboveAverage,
      trend
    };
  } catch (error) {
    console.error('Error getting point statistics:', error);
    return {
      totalPoints: 0,
      averageDaily: 0,
      highestDay: 0,
      lowestDay: 0,
      daysAboveAverage: 0,
      trend: 'stable'
    };
  }
};