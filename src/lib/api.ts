import { Youth, BehaviorPoints, ProgressNote, DailyRating } from '../types/app-types';

// Get API base URL from environment variable or default to '/api'
// This allows for different API endpoints in different environments
// For Vercel deployment, set VITE_API_BASE_URL in the Vercel dashboard
const API_BASE_URL = (() => {
  // First check import.meta.env (Vite's way of exposing env vars)
  if ((import.meta as any).env?.VITE_API_BASE_URL) {
    return (import.meta as any).env.VITE_API_BASE_URL;
  }
  
  // Then check process.env (set in vite.config.ts)
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  
  // Default to '/api' for local development
  return '/api';
})();

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from storage if present
    try {
      const stored = localStorage.getItem('auth_token');
      if (stored) this.token = stored;
    } catch {}
  }

  public setToken(token: string) {
    this.token = token;
    try { localStorage.setItem('auth_token', token); } catch {}
  }

  public clearToken() {
    this.token = null;
    try { localStorage.removeItem('auth_token'); } catch {}
  }
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      headers: {
        ...headers,
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

  // Auth
  async getAuthToken(apiKey: string): Promise<{ token: string }> {
    const url = `${API_BASE_URL}/auth/token`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Auth failed (${res.status})`);
    }
    return res.json();
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


}

// Export singleton instance
export const apiClient = new ApiClient();

// Export wrapper functions to preserve `this` context
export const healthCheck = () => apiClient.healthCheck();

export const getYouth = () => apiClient.getYouth();
export const getYouthById = (id: string) => apiClient.getYouthById(id);
export const createYouth = (youth: Omit<Youth, 'id' | 'createdAt' | 'updatedAt'>) => apiClient.createYouth(youth);
export const updateYouth = (id: string, youth: Partial<Youth>) => apiClient.updateYouth(id, youth);
export const deleteYouth = (id: string) => apiClient.deleteYouth(id);

export const getBehaviorPointsByYouth = (youthId: string) => apiClient.getBehaviorPointsByYouth(youthId);
export const createBehaviorPoints = (points: Omit<BehaviorPoints, 'id' | 'createdAt'>) => apiClient.createBehaviorPoints(points);

export const getProgressNotesByYouth = (youthId: string) => apiClient.getProgressNotesByYouth(youthId);
export const createProgressNote = (note: Omit<ProgressNote, 'id' | 'createdAt'>) => apiClient.createProgressNote(note);

export const getDailyRatingsByYouth = (youthId: string) => apiClient.getDailyRatingsByYouth(youthId);
export const createDailyRating = (rating: Omit<DailyRating, 'id' | 'createdAt' | 'updatedAt'>) => apiClient.createDailyRating(rating);

export type { ApiClient };
