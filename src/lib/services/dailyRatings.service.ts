import { BaseService } from './base.service';
import { COLLECTIONS } from '../database';
import { DailyRating } from '../../types/app-types';

export class DailyRatingsService extends BaseService<DailyRating> {
  constructor() {
    super(COLLECTIONS.DAILY_RATINGS);
  }

  // Get daily ratings for a specific youth
  async getByYouthId(youthId: string): Promise<DailyRating[]> {
    return await this.findAll(
      { youth_id: youthId },
      { sort: { date: -1 } }
    );
  }

  // Get daily rating for a specific youth and date
  async getByYouthAndDate(youthId: string, date: Date): Promise<DailyRating | null> {
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

  // Get ratings for a date range
  async getByDateRange(youthId: string, startDate: Date, endDate: Date): Promise<DailyRating[]> {
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

  // Get recent ratings
  async getRecent(youthId: string, days: number = 7): Promise<DailyRating[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.getByDateRange(youthId, startDate, new Date());
  }

  // Calculate average ratings over a period
  async getAverageRatings(youthId: string, days: number = 30): Promise<{
    averagePeerInteraction: number;
    averageAdultInteraction: number;
    averageInvestmentLevel: number;
    averageDealAuthority: number;
    overallAverage: number;
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
          avgPeer: { $avg: '$peerInteraction' },
          avgAdult: { $avg: '$adultInteraction' },
          avgInvestment: { $avg: '$investmentLevel' },
          avgAuthority: { $avg: '$dealAuthority' },
          count: { $sum: 1 }
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    const stats = result[0];

    const avgPeer = stats?.avgPeer || 0;
    const avgAdult = stats?.avgAdult || 0;
    const avgInvestment = stats?.avgInvestment || 0;
    const avgAuthority = stats?.avgAuthority || 0;

    const overallAverage = (avgPeer + avgAdult + avgInvestment + avgAuthority) / 4;

    return {
      averagePeerInteraction: Math.round(avgPeer * 100) / 100,
      averageAdultInteraction: Math.round(avgAdult * 100) / 100,
      averageInvestmentLevel: Math.round(avgInvestment * 100) / 100,
      averageDealAuthority: Math.round(avgAuthority * 100) / 100,
      overallAverage: Math.round(overallAverage * 100) / 100
    };
  }

  // Get rating trends over time
  async getRatingTrends(youthId: string, days: number = 30): Promise<{
    date: Date;
    peerInteraction: number;
    adultInteraction: number;
    investmentLevel: number;
    dealAuthority: number;
    average: number;
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
          peerInteraction: 1,
          adultInteraction: 1,
          investmentLevel: 1,
          dealAuthority: 1,
          average: {
            $divide: [
              {
                $add: [
                  '$peerInteraction',
                  '$adultInteraction',
                  '$investmentLevel',
                  '$dealAuthority'
                ]
              },
              4
            ]
          }
        }
      }
    ];

    return await this.collection.aggregate(pipeline).toArray();
  }

  // Get ratings by staff member
  async getByStaff(staffName: string): Promise<DailyRating[]> {
    return await this.findAll(
      { staff: staffName },
      { sort: { date: -1 } }
    );
  }

  // Create or update daily rating for a specific date
  async createOrUpdate(ratingData: Omit<DailyRating, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyRating> {
    const existing = await this.getByYouthAndDate(ratingData.youth_id, ratingData.date!);
    
    if (existing) {
      // Update existing record
      const updated = await this.updateById(existing.id, {
        peerInteraction: ratingData.peerInteraction,
        adultInteraction: ratingData.adultInteraction,
        investmentLevel: ratingData.investmentLevel,
        dealAuthority: ratingData.dealAuthority,
        staff: ratingData.staff,
        comments: ratingData.comments
      });
      return updated!;
    } else {
      // Create new record
      return await this.create(ratingData);
    }
  }

  // Get improvement/decline analysis
  async getProgressAnalysis(youthId: string, days: number = 30): Promise<{
    peerInteractionTrend: 'improving' | 'declining' | 'stable';
    adultInteractionTrend: 'improving' | 'declining' | 'stable';
    investmentLevelTrend: 'improving' | 'declining' | 'stable';
    dealAuthorityTrend: 'improving' | 'declining' | 'stable';
    overallTrend: 'improving' | 'declining' | 'stable';
  }> {
    const ratings = await this.getRecent(youthId, days);
    
    if (ratings.length < 2) {
      return {
        peerInteractionTrend: 'stable',
        adultInteractionTrend: 'stable',
        investmentLevelTrend: 'stable',
        dealAuthorityTrend: 'stable',
        overallTrend: 'stable'
      };
    }

    // Calculate trends by comparing first half vs second half of the period
    const midPoint = Math.floor(ratings.length / 2);
    const recent = ratings.slice(0, midPoint);
    const older = ratings.slice(midPoint);

    const calculateTrend = (recentAvg: number, olderAvg: number): 'improving' | 'declining' | 'stable' => {
      const diff = recentAvg - olderAvg;
      if (diff > 0.2) return 'improving';
      if (diff < -0.2) return 'declining';
      return 'stable';
    };

    const recentAvgs = {
      peer: recent.reduce((sum, r) => sum + (r.peerInteraction || 0), 0) / recent.length,
      adult: recent.reduce((sum, r) => sum + (r.adultInteraction || 0), 0) / recent.length,
      investment: recent.reduce((sum, r) => sum + (r.investmentLevel || 0), 0) / recent.length,
      authority: recent.reduce((sum, r) => sum + (r.dealAuthority || 0), 0) / recent.length
    };

    const olderAvgs = {
      peer: older.reduce((sum, r) => sum + (r.peerInteraction || 0), 0) / older.length,
      adult: older.reduce((sum, r) => sum + (r.adultInteraction || 0), 0) / older.length,
      investment: older.reduce((sum, r) => sum + (r.investmentLevel || 0), 0) / older.length,
      authority: older.reduce((sum, r) => sum + (r.dealAuthority || 0), 0) / older.length
    };

    const overallRecentAvg = (recentAvgs.peer + recentAvgs.adult + recentAvgs.investment + recentAvgs.authority) / 4;
    const overallOlderAvg = (olderAvgs.peer + olderAvgs.adult + olderAvgs.investment + olderAvgs.authority) / 4;

    return {
      peerInteractionTrend: calculateTrend(recentAvgs.peer, olderAvgs.peer),
      adultInteractionTrend: calculateTrend(recentAvgs.adult, olderAvgs.adult),
      investmentLevelTrend: calculateTrend(recentAvgs.investment, olderAvgs.investment),
      dealAuthorityTrend: calculateTrend(recentAvgs.authority, olderAvgs.authority),
      overallTrend: calculateTrend(overallRecentAvg, overallOlderAvg)
    };
  }
}

// Export singleton instance
export const dailyRatingsService = new DailyRatingsService();