import { BaseService } from './base.service';
import { COLLECTIONS } from '../database';
import { BehaviorPoints } from '../../types/app-types';

export class BehaviorPointsService extends BaseService<BehaviorPoints> {
  constructor() {
    super(COLLECTIONS.BEHAVIOR_POINTS);
  }

  // Get behavior points for a specific youth
  async getByYouthId(youthId: string): Promise<BehaviorPoints[]> {
    return await this.findAll(
      { youth_id: youthId },
      { sort: { date: -1 } }
    );
  }

  // Get behavior points for a specific youth and date
  async getByYouthAndDate(youthId: string, date: Date): Promise<BehaviorPoints | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.collection.findOne({
      youth_id: youthId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
  }

  // Get behavior points for a date range
  async getByDateRange(youthId: string, startDate: Date, endDate: Date): Promise<BehaviorPoints[]> {
    return await this.findAll(
      {
        youth_id: youthId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      },
      { sort: { date: 1 } }
    );
  }

  // Get recent behavior points (last N days)
  async getRecent(youthId: string, days: number = 7): Promise<BehaviorPoints[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.getByDateRange(youthId, startDate, new Date());
  }

  // Calculate average points for a youth over a period
  async getAveragePoints(youthId: string, days: number = 30): Promise<{
    averageTotal: number;
    averageMorning: number;
    averageAfternoon: number;
    averageEvening: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          youth_id: youthId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          averageTotal: { $avg: '$totalPoints' },
          averageMorning: { $avg: '$morningPoints' },
          averageAfternoon: { $avg: '$afternoonPoints' },
          averageEvening: { $avg: '$eveningPoints' },
          count: { $sum: 1 }
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    const stats = result[0];

    return {
      averageTotal: Math.round((stats?.averageTotal || 0) * 100) / 100,
      averageMorning: Math.round((stats?.averageMorning || 0) * 100) / 100,
      averageAfternoon: Math.round((stats?.averageAfternoon || 0) * 100) / 100,
      averageEvening: Math.round((stats?.averageEvening || 0) * 100) / 100
    };
  }

  // Get behavior trends (daily totals over time)
  async getBehaviorTrends(youthId: string, days: number = 30): Promise<{
    date: Date;
    totalPoints: number;
  }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          youth_id: youthId,
          date: { $gte: startDate }
        }
      },
      {
        $sort: { date: 1 }
      },
      {
        $project: {
          date: 1,
          totalPoints: 1
        }
      }
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  // Create or update behavior points for a specific date
  async createOrUpdate(behaviorData: Omit<BehaviorPoints, 'id' | 'createdAt'>): Promise<BehaviorPoints> {
    const existing = await this.getByYouthAndDate(behaviorData.youth_id, behaviorData.date!);
    
    if (existing) {
      // Update existing record
      const updated = await this.updateById(existing.id, {
        morningPoints: behaviorData.morningPoints,
        afternoonPoints: behaviorData.afternoonPoints,
        eveningPoints: behaviorData.eveningPoints,
        totalPoints: behaviorData.totalPoints,
        comments: behaviorData.comments
      });
      return updated!;
    } else {
      // Create new record
      return await this.create(behaviorData);
    }
  }
}

// Export singleton instance
export const behaviorPointsService = new BehaviorPointsService();