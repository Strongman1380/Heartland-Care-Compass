import { apiClient } from './api';
import { Youth, BehaviorPoints, ProgressNote, DailyRating } from '../types/app-types';

export class DataMigration {
  // Get all data from localStorage
  private getLocalStorageData() {
    // Check both old and new localStorage key formats
    const youth = this.getFromLocalStorage<Youth[]>('heartland_youths') || 
                  this.getFromLocalStorage<Youth[]>('youth') || [];
    const behaviorPoints = this.getFromLocalStorage<BehaviorPoints[]>('heartland_behaviorPoints') || 
                          this.getFromLocalStorage<BehaviorPoints[]>('behaviorPoints') || [];
    const progressNotes = this.getFromLocalStorage<ProgressNote[]>('heartland_progressNotes') || 
                         this.getFromLocalStorage<ProgressNote[]>('progressNotes') || [];
    const dailyRatings = this.getFromLocalStorage<DailyRating[]>('heartland_dailyRatings') || 
                        this.getFromLocalStorage<DailyRating[]>('dailyRatings') || [];

    return {
      youth,
      behaviorPoints,
      progressNotes,
      dailyRatings
    };
  }

  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return null;
    }
  }

  // Check if there's data in localStorage to migrate
  async hasLocalStorageData(): Promise<boolean> {
    const data = this.getLocalStorageData();
    return data.youth.length > 0 || 
           data.behaviorPoints.length > 0 || 
           data.progressNotes.length > 0 || 
           data.dailyRatings.length > 0;
  }

  // Get summary of localStorage data
  async getLocalStorageDataSummary() {
    const data = this.getLocalStorageData();
    return {
      youth: data.youth.length,
      behaviorPoints: data.behaviorPoints.length,
      progressNotes: data.progressNotes.length,
      dailyRatings: data.dailyRatings.length,
      totalRecords: data.youth.length + data.behaviorPoints.length + data.progressNotes.length + data.dailyRatings.length
    };
  }

  // Migrate all data from localStorage to MongoDB
  async migrateToMongoDB(): Promise<{
    success: boolean;
    message: string;
    results?: any;
    error?: string;
  }> {
    try {
      // Check if database is connected
      const healthCheck = await apiClient.healthCheck();
      if (healthCheck.database !== 'connected') {
        throw new Error('Database is not connected');
      }

      // Get localStorage data
      const localData = this.getLocalStorageData();
      
      if (localData.youth.length === 0 && 
          localData.behaviorPoints.length === 0 && 
          localData.progressNotes.length === 0 && 
          localData.dailyRatings.length === 0) {
        return {
          success: false,
          message: 'No data found in localStorage to migrate'
        };
      }

      // Migrate data
      const result = await apiClient.migrateData(localData);

      return {
        success: true,
        message: result.message,
        results: result.results
      };

    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Backup localStorage data to a downloadable file
  async backupLocalStorageData(): Promise<void> {
    const data = this.getLocalStorageData();
    const backup = {
      timestamp: new Date().toISOString(),
      data
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `heartland-care-compass-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear localStorage after successful migration
  async clearLocalStorage(): Promise<void> {
    const keys = [
      'youth', 'behaviorPoints', 'progressNotes', 'dailyRatings',
      'heartland_youths', 'heartland_behaviorPoints', 'heartland_progressNotes', 'heartland_dailyRatings',
      'heartland_data_version'
    ];
    keys.forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('localStorage cleared successfully');
  }

  // Verify migration by comparing counts
  async verifyMigration(): Promise<{
    success: boolean;
    details: {
      youth: { localStorage: number; database: number; match: boolean };
      behaviorPoints: { localStorage: number; database: number; match: boolean };
      progressNotes: { localStorage: number; database: number; match: boolean };
      dailyRatings: { localStorage: number; database: number; match: boolean };
    };
  }> {
    try {
      const localData = this.getLocalStorageData();
      
      // Get data from database
      const dbYouth = await apiClient.getYouth();
      
      // For now, we'll just verify youth count since we don't have endpoints to get all records
      // In a full implementation, you'd want to add endpoints to get counts or all records
      
      const details = {
        youth: {
          localStorage: localData.youth.length,
          database: dbYouth.length,
          match: localData.youth.length === dbYouth.length
        },
        behaviorPoints: {
          localStorage: localData.behaviorPoints.length,
          database: 0, // Would need endpoint to get count
          match: false
        },
        progressNotes: {
          localStorage: localData.progressNotes.length,
          database: 0, // Would need endpoint to get count
          match: false
        },
        dailyRatings: {
          localStorage: localData.dailyRatings.length,
          database: 0, // Would need endpoint to get count
          match: false
        }
      };

      const success = details.youth.match; // For now, just check youth

      return { success, details };

    } catch (error) {
      console.error('Verification failed:', error);
      return {
        success: false,
        details: {
          youth: { localStorage: 0, database: 0, match: false },
          behaviorPoints: { localStorage: 0, database: 0, match: false },
          progressNotes: { localStorage: 0, database: 0, match: false },
          dailyRatings: { localStorage: 0, database: 0, match: false }
        }
      };
    }
  }
}

// Export singleton instance
export const dataMigration = new DataMigration();