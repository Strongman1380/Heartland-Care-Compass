import { Youth } from '@/types/app-types';
import { fetchAllYouths, updateYouth } from './local-storage-utils';
import { calculateTotalPoints } from './pointCalculations';

/**
 * Service to ensure point totals are synchronized across the application
 */
export class PointSyncService {
  private static instance: PointSyncService;
  private syncInProgress = false;
  private lastSyncTime = 0;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): PointSyncService {
    if (!PointSyncService.instance) {
      PointSyncService.instance = new PointSyncService();
    }
    return PointSyncService.instance;
  }

  /**
   * Sync all youth point totals with their behavior point entries
   */
  async syncAllYouthPoints(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Point sync already in progress, skipping...');
      return;
    }

    const now = Date.now();
    if (now - this.lastSyncTime < this.SYNC_INTERVAL) {
      console.log('Point sync too recent, skipping...');
      return;
    }

    this.syncInProgress = true;
    this.lastSyncTime = now;

    try {
      console.log('Starting point synchronization for all youth...');
      const youths = fetchAllYouths();
      const syncPromises = youths.map(youth => this.syncYouthPoints(youth));
      
      await Promise.all(syncPromises);
      console.log(`Point synchronization completed for ${youths.length} youth`);
    } catch (error) {
      console.error('Error during point synchronization:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync points for a specific youth
   */
  async syncYouthPoints(youth: Youth): Promise<void> {
    try {
      const calculatedTotal = await calculateTotalPoints(youth.id);
      
      if (calculatedTotal !== youth.pointTotal) {
        console.log(`Syncing points for ${youth.firstName} ${youth.lastName}: ${youth.pointTotal} -> ${calculatedTotal}`);
        
        updateYouth(youth.id, { 
          pointTotal: calculatedTotal,
          updatedAt: new Date()
        });
        
        // Update the youth object in memory
        youth.pointTotal = calculatedTotal;
      }
    } catch (error) {
      console.error(`Error syncing points for ${youth.firstName} ${youth.lastName}:`, error);
    }
  }

  /**
   * Force immediate sync for a specific youth (used after adding behavior points)
   */
  async forceSyncYouth(youthId: string): Promise<void> {
    try {
      const youths = fetchAllYouths();
      const youth = youths.find(y => y.id === youthId);
      
      if (youth) {
        await this.syncYouthPoints(youth);
      }
    } catch (error) {
      console.error(`Error force syncing youth ${youthId}:`, error);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { inProgress: boolean; lastSync: Date | null } {
    return {
      inProgress: this.syncInProgress,
      lastSync: this.lastSyncTime > 0 ? new Date(this.lastSyncTime) : null
    };
  }

  /**
   * Initialize automatic syncing (call this on app startup)
   */
  initializeAutoSync(): void {
    // Sync immediately on startup
    setTimeout(() => this.syncAllYouthPoints(), 1000);
    
    // Set up periodic syncing
    setInterval(() => {
      this.syncAllYouthPoints();
    }, this.SYNC_INTERVAL);

    console.log('Point sync service initialized with automatic syncing every 5 minutes');
  }

  /**
   * Validate point totals and report discrepancies
   */
  async validatePointTotals(): Promise<Array<{ youth: Youth; expected: number; actual: number; difference: number }>> {
    const youths = fetchAllYouths();
    const discrepancies = [];

    for (const youth of youths) {
      try {
        const calculatedTotal = await calculateTotalPoints(youth.id);
        const actualTotal = youth.pointTotal || 0;
        const difference = calculatedTotal - actualTotal;

        if (difference !== 0) {
          discrepancies.push({
            youth,
            expected: calculatedTotal,
            actual: actualTotal,
            difference
          });
        }
      } catch (error) {
        console.error(`Error validating points for ${youth.firstName} ${youth.lastName}:`, error);
      }
    }

    return discrepancies;
  }

  /**
   * Fix all point discrepancies
   */
  async fixAllDiscrepancies(): Promise<void> {
    const discrepancies = await this.validatePointTotals();
    
    if (discrepancies.length === 0) {
      console.log('No point discrepancies found');
      return;
    }

    console.log(`Fixing ${discrepancies.length} point discrepancies...`);
    
    for (const discrepancy of discrepancies) {
      await this.syncYouthPoints(discrepancy.youth);
    }

    console.log('All point discrepancies fixed');
  }
}

// Export singleton instance
export const pointSyncService = PointSyncService.getInstance();

// Utility functions for easy access
export const syncAllPoints = () => pointSyncService.syncAllYouthPoints();
export const syncYouthPoints = (youthId: string) => pointSyncService.forceSyncYouth(youthId);
export const validatePoints = () => pointSyncService.validatePointTotals();
export const fixPointDiscrepancies = () => pointSyncService.fixAllDiscrepancies();
export const initializePointSync = () => pointSyncService.initializeAutoSync();