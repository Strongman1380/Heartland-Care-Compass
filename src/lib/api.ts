// API Client for backward compatibility
// This provides the same interface as the old API client but uses Supabase under the hood

import { 
  youthService, 
  behaviorPointsService, 
  caseNotesService, 
  dailyRatingsService 
} from '@/integrations/supabase/services';
import type { Youth, BehaviorPoints, CaseNotes, DailyRatings } from '@/integrations/supabase/services';

export class ApiClient {
  private token: string | null = null;

  constructor() {
    // Initialize with token from localStorage if available
    this.token = localStorage.getItem('auth_token');
  }

  // Get authentication token (mock implementation for compatibility)
  async getAuthToken(apiKey: string): Promise<{ token: string }> {
    // For development/demo purposes, accept any API key
    const token = `mock_token_${Date.now()}`;
    localStorage.setItem('auth_token', token);
    this.token = token;
    return { token };
  }

  // Set the authentication token
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // Clear the authentication token
  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Check if client has a valid token
  hasToken(): boolean {
    return !!this.token;
  }

  // Get current token
  getToken(): string | null {
    return this.token;
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export compatibility functions that use Supabase services
export const getYouth = async (): Promise<Youth[]> => {
  return await youthService.getAll();
};

export const getBehaviorPointsByYouth = async (youthId: string): Promise<BehaviorPoints[]> => {
  return await behaviorPointsService.getByYouthId(youthId);
};

export const getProgressNotesByYouth = async (youthId: string): Promise<CaseNotes[]> => {
  return await caseNotesService.getByYouthId(youthId);
};

export const getDailyRatingsByYouth = async (youthId: string): Promise<DailyRatings[]> => {
  return await dailyRatingsService.getByYouthId(youthId);
};