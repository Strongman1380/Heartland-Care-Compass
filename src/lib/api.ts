import { Youth, BehaviorPoints, ProgressNote, DailyRating } from '../types/app-types';

const API_BASE_URL = '/api';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; database: string; timestamp: string }> {
    return this.request('/health');
  }

  // Youth API methods
  async getYouth(): Promise<Youth[]> {
    return this.request('/youth');
  }

  async getYouthById(id: string): Promise<Youth> {
    return this.request(`/youth/${id}`);
  }

  async createYouth(youth: Omit<Youth, 'id' | 'createdAt' | 'updatedAt'>): Promise<Youth> {
    return this.request('/youth', {
      method: 'POST',
      body: JSON.stringify(youth),
    });
  }

  async updateYouth(id: string, youth: Partial<Youth>): Promise<Youth> {
    return this.request(`/youth/${id}`, {
      method: 'PUT',
      body: JSON.stringify(youth),
    });
  }

  async deleteYouth(id: string): Promise<{ message: string }> {
    return this.request(`/youth/${id}`, {
      method: 'DELETE',
    });
  }

  // Behavior Points API methods
  async getBehaviorPointsByYouth(youthId: string): Promise<BehaviorPoints[]> {
    return this.request(`/behavior-points/youth/${youthId}`);
  }

  async createBehaviorPoints(points: Omit<BehaviorPoints, 'id' | 'createdAt'>): Promise<BehaviorPoints> {
    return this.request('/behavior-points', {
      method: 'POST',
      body: JSON.stringify(points),
    });
  }

  // Progress Notes API methods
  async getProgressNotesByYouth(youthId: string): Promise<ProgressNote[]> {
    return this.request(`/progress-notes/youth/${youthId}`);
  }

  async createProgressNote(note: Omit<ProgressNote, 'id' | 'createdAt'>): Promise<ProgressNote> {
    return this.request('/progress-notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  }

  // Daily Ratings API methods
  async getDailyRatingsByYouth(youthId: string): Promise<DailyRating[]> {
    return this.request(`/daily-ratings/youth/${youthId}`);
  }

  async createDailyRating(rating: Omit<DailyRating, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyRating> {
    return this.request('/daily-ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
  }

  // Data migration method
  async migrateData(data: {
    youth: Youth[];
    behaviorPoints: BehaviorPoints[];
    progressNotes: ProgressNote[];
    dailyRatings: DailyRating[];
  }): Promise<{ message: string; results: any }> {
    return this.request('/migrate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export individual methods for easier importing
export const {
  healthCheck,
  getYouth,
  getYouthById,
  createYouth,
  updateYouth,
  deleteYouth,
  getBehaviorPointsByYouth,
  createBehaviorPoints,
  getProgressNotesByYouth,
  createProgressNote,
  getDailyRatingsByYouth,
  createDailyRating,
  migrateData
} = apiClient;