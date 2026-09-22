export class BackendApi {
  constructor(private baseUrl: string = 'http://localhost:5165') {}

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) return false;
      
      const health = await response.json();
      return health.status === 'ok';
    } catch {
      return false;
    }
  }

  async getEvents(token?: string): Promise<any[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseUrl}/sync/events?since=0`, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }
      
      const result = await response.json();
      return result.events || [];
    } catch (error) {
      console.warn('Failed to fetch events from backend:', error);
      return [];
    }
  }

  async clearEvents(token?: string): Promise<void> {
    // This would require implementing a clear/reset endpoint on the backend
    // For now, we'll just log that this functionality is needed
    console.log('Backend event clearing not implemented');
  }

  async isHealthy(): Promise<boolean> {
    return this.checkHealth();
  }
}
