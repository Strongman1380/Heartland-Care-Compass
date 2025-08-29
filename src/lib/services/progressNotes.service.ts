import { BaseService } from './base.service';
import { COLLECTIONS } from '../database';
import { ProgressNote } from '../../types/app-types';

export class ProgressNotesService extends BaseService<ProgressNote> {
  constructor() {
    super(COLLECTIONS.PROGRESS_NOTES);
  }

  // Get progress notes for a specific youth
  async getByYouthId(youthId: string): Promise<ProgressNote[]> {
    return await this.findAll(
      { youth_id: youthId },
      { sort: { date: -1 } }
    );
  }

  // Get progress notes by category
  async getByCategory(youthId: string, category: string): Promise<ProgressNote[]> {
    return await this.findAll(
      { 
        youth_id: youthId,
        category: category
      },
      { sort: { date: -1 } }
    );
  }

  // Get progress notes by staff member
  async getByStaff(staffName: string): Promise<ProgressNote[]> {
    return await this.findAll(
      { staff: staffName },
      { sort: { date: -1 } }
    );
  }

  // Get progress notes for a date range
  async getByDateRange(youthId: string, startDate: Date, endDate: Date): Promise<ProgressNote[]> {
    return await this.findAll(
      {
        youth_id: youthId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      },
      { sort: { date: -1 } }
    );
  }

  // Get recent progress notes
  async getRecent(youthId: string, limit: number = 10): Promise<ProgressNote[]> {
    return await this.findAll(
      { youth_id: youthId },
      { 
        sort: { date: -1 },
        limit: limit
      }
    );
  }

  // Search progress notes by text content
  async searchNotes(youthId: string, searchTerm: string): Promise<ProgressNote[]> {
    const regex = new RegExp(searchTerm, 'i');
    return await this.findAll(
      {
        youth_id: youthId,
        $or: [
          { note: { $regex: regex } },
          { category: { $regex: regex } }
        ]
      },
      { sort: { date: -1 } }
    );
  }

  // Get notes with ratings above a threshold
  async getHighRatedNotes(youthId: string, minRating: number = 4): Promise<ProgressNote[]> {
    return await this.findAll(
      {
        youth_id: youthId,
        rating: { $gte: minRating }
      },
      { sort: { rating: -1, date: -1 } }
    );
  }

  // Get notes statistics for a youth
  async getNotesStatistics(youthId: string): Promise<{
    totalNotes: number;
    averageRating: number;
    categoryCounts: { [category: string]: number };
    staffCounts: { [staff: string]: number };
  }> {
    const pipeline = [
      { $match: { youth_id: youthId } },
      {
        $group: {
          _id: null,
          totalNotes: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          categories: { $push: '$category' },
          staff: { $push: '$staff' }
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    const stats = result[0];

    if (!stats) {
      return {
        totalNotes: 0,
        averageRating: 0,
        categoryCounts: {},
        staffCounts: {}
      };
    }

    // Count categories
    const categoryCounts: { [key: string]: number } = {};
    stats.categories.forEach((cat: string) => {
      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    });

    // Count staff
    const staffCounts: { [key: string]: number } = {};
    stats.staff.forEach((staff: string) => {
      if (staff) {
        staffCounts[staff] = (staffCounts[staff] || 0) + 1;
      }
    });

    return {
      totalNotes: stats.totalNotes,
      averageRating: Math.round((stats.averageRating || 0) * 100) / 100,
      categoryCounts,
      staffCounts
    };
  }

  // Get all unique categories
  async getCategories(): Promise<string[]> {
    const categories = await this.collection.distinct('category');
    return categories.filter(cat => cat && cat.trim() !== '');
  }

  // Get all unique staff members
  async getStaffMembers(): Promise<string[]> {
    const staff = await this.collection.distinct('staff');
    return staff.filter(s => s && s.trim() !== '');
  }
}

// Export singleton instance
export const progressNotesService = new ProgressNotesService();