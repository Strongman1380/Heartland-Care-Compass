// MongoDB API client utility
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class MongoClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Youth methods
  async getYouths() {
    return this.request('/youths');
  }

  async getYouth(id: string) {
    return this.request(`/youths/${id}`);
  }

  async createYouth(youthData: any) {
    return this.request('/youths', {
      method: 'POST',
      body: JSON.stringify(youthData),
    });
  }

  async updateYouth(id: string, youthData: any) {
    return this.request(`/youths/${id}`, {
      method: 'PUT',
      body: JSON.stringify(youthData),
    });
  }

  async deleteYouth(id: string) {
    return this.request(`/youths/${id}`, {
      method: 'DELETE',
    });
  }

  // Behavior Points methods
  async getBehaviorPoints(youthId: string) {
    return this.request(`/behavior-points/youth/${youthId}`);
  }

  async createBehaviorPoint(pointData: any) {
    return this.request('/behavior-points', {
      method: 'POST',
      body: JSON.stringify(pointData),
    });
  }

  // Progress Notes methods
  async getProgressNotes(youthId: string) {
    return this.request(`/progress-notes/youth/${youthId}`);
  }

  async createProgressNote(noteData: any) {
    return this.request('/progress-notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  // Daily Ratings methods
  async getDailyRatings(youthId: string) {
    return this.request(`/daily-ratings/youth/${youthId}`);
  }

  async createDailyRating(ratingData: any) {
    return this.request('/daily-ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });
  }

  // Utility methods
  async populateMockData() {
    return this.request('/populate-mock-data', {
      method: 'POST',
    });
  }

  async clearAllData() {
    return this.request('/clear-all-data', {
      method: 'DELETE',
    });
  }

  async healthCheck() {
    return this.request('/health');
  }
}

export const mongoClient = new MongoClient();