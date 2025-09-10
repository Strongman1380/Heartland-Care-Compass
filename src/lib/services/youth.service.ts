import { Filter, FindOptions } from 'mongodb';
import { BaseService } from './base.service';
import { COLLECTIONS } from '../database';
import { Youth } from '../../types/app-types';

export class YouthService extends BaseService<Youth> {
  constructor() {
    super(COLLECTIONS.YOUTH);
  }

  // Find youth by name
  async findByName(firstName: string, lastName: string): Promise<Youth | null> {
    return await this.collection.findOne({
      firstName: { $regex: new RegExp(firstName, 'i') },
      lastName: { $regex: new RegExp(lastName, 'i') }
    });
  }

  // Find youth by level
  async findByLevel(level: number): Promise<Youth[]> {
    return await this.findAll({ level });
  }

  // Search youth by partial name
  async searchByName(searchTerm: string): Promise<Youth[]> {
    const regex = new RegExp(searchTerm, 'i');
    return await this.findAll({
      $or: [
        { firstName: { $regex: regex } },
        { lastName: { $regex: regex } }
      ]
    });
  }

  // Get youth with high risk levels
  async getHighRiskYouth(): Promise<Youth[]> {
    return await this.findAll({
      hyrnaRiskLevel: 'High'
    });
  }

  // Get youth statistics
  async getStatistics() {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalYouth: { $sum: 1 },
          averageAge: { $avg: '$age' },
          averagePoints: { $avg: '$pointTotal' },
          levelDistribution: {
            $push: '$level'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalYouth: 1,
          averageAge: { $round: ['$averageAge', 1] },
          averagePoints: { $round: ['$averagePoints', 1] },
          levelDistribution: 1
        }
      }
    ];

    const result = await this.collection.aggregate(pipeline).toArray();
    return result[0] || {
      totalYouth: 0,
      averageAge: 0,
      averagePoints: 0,
      levelDistribution: []
    };
  }

  // Update youth point total
  async updatePointTotal(youthId: string, pointTotal: number): Promise<Youth | null> {
    return await this.updateById(youthId, { pointTotal });
  }

  // Get youth sorted by admission date
  async getYouthByAdmissionDate(ascending: boolean = true): Promise<Youth[]> {
    const sortOrder = ascending ? 1 : -1;
    return await this.findAll({}, { 
      sort: { admissionDate: sortOrder } 
    });
  }
}

// Export singleton instance
export const youthService = new YouthService();