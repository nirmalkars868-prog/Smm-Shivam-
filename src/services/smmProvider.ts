export interface RawProviderService {
  service: string | number;
  name?: string;
  service_name?: string;
  type?: string;
  category?: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean | number | string;
  cancel?: boolean | number | string;
  dripfeed?: boolean | number | string;
}

export class SMMProviderClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl.trim();
    this.apiKey = apiKey.trim();
  }

  /**
   * Fetch service list from provider
   */
  async getServices(): Promise<RawProviderService[]> {
    if (!this.apiUrl) {
      throw new Error('Provider API URL is required');
    }

    // If key is empty or placeholder, return mock services if in demo mode
    if (!this.apiKey || this.apiKey === 'DEMO_KEY') {
      return this.getMockProviderServices();
    }

    try {
      const params = new URLSearchParams();
      params.append('action', 'services');
      params.append('key', this.apiKey);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SMM-Panel-Server/1.0',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Provider API HTTP Error ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Invalid JSON response from provider API: ${text.substring(0, 100)}...`);
      }

      if (data && data.error) {
        throw new Error(`Provider API Error: ${data.error}`);
      }

      if (!Array.isArray(data)) {
        if (typeof data === 'object' && Object.keys(data).length > 0) {
          // Some custom provider endpoints return objects with service IDs as keys
          data = Object.values(data);
        } else {
          throw new Error('Provider API returned an invalid service list format');
        }
      }

      return data as RawProviderService[];
    } catch (err: any) {
      console.error('Error fetching services from provider:', err.message);
      throw err;
    }
  }

  /**
   * Test connection to provider API
   */
  async testConnection(): Promise<{ success: boolean; message: string; count?: number; balance?: string }> {
    if (!this.apiUrl) {
      return { success: false, message: 'API URL is missing.' };
    }

    if (!this.apiKey || this.apiKey === 'DEMO_KEY') {
      const mockServices = this.getMockProviderServices();
      return {
        success: true,
        message: 'Demo Connection Successful! Found ' + mockServices.length + ' sample services (Using Demo Mode).',
        count: mockServices.length,
        balance: '$250.00 (Demo Balance)',
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('action', 'services');
      params.append('key', this.apiKey);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          message: `HTTP Error ${response.status}: Unable to connect to provider.`,
        };
      }

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return { success: false, message: 'Provider returned non-JSON response.' };
      }

      if (data && data.error) {
        return { success: false, message: `Provider Error: ${data.error}` };
      }

      if (Array.isArray(data)) {
        return {
          success: true,
          message: `Connected successfully! Retrieved ${data.length} services from SMMDIP/Provider.`,
          count: data.length,
        };
      }

      return {
        success: false,
        message: 'Connected, but received unexpected format from API.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection failed: ${err.message || 'Network error'}`,
      };
    }
  }

  /**
   * Place an order on the provider API
   */
  async placeOrder(serviceId: string, link: string, quantity: number, customComments?: string): Promise<{ orderId?: string; error?: string }> {
    if (!this.apiKey || this.apiKey === 'DEMO_KEY') {
      // Demo order ID simulation
      const mockOrderId = 'PRV-' + Math.floor(100000 + Math.random() * 900000);
      return { orderId: mockOrderId };
    }

    try {
      const params = new URLSearchParams();
      params.append('action', 'add');
      params.append('key', this.apiKey);
      params.append('service', serviceId);
      params.append('link', link);
      params.append('quantity', quantity.toString());
      if (customComments) {
        params.append('comments', customComments);
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();
      if (data && data.order) {
        return { orderId: String(data.order) };
      } else if (data && data.error) {
        return { error: data.error };
      }
      return { error: 'Unknown response from provider' };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  /**
   * Sample Realistic Mock Services for SMMDIP/SMM Panels
   */
  private getMockProviderServices(): RawProviderService[] {
    return [
      {
        service: '1001',
        name: 'Instagram Real Followers | 30 Days Auto Refill | High Speed',
        type: 'Default',
        category: 'Instagram Followers',
        rate: '0.45',
        min: '100',
        max: '500000',
        refill: true,
        cancel: true,
      },
      {
        service: '1002',
        name: 'Instagram Guaranteed Followers | Non Drop | 365 Days Refill',
        type: 'Default',
        category: 'Instagram Followers',
        rate: '0.85',
        min: '100',
        max: '1000000',
        refill: true,
        cancel: true,
      },
      {
        service: '1003',
        name: 'Instagram Organic Likes | Instant Start | Real Accounts',
        type: 'Default',
        category: 'Instagram Likes',
        rate: '0.12',
        min: '50',
        max: '100000',
        refill: false,
        cancel: true,
      },
      {
        service: '1004',
        name: 'Instagram Reel Views + Impressions | Instant 100K/day',
        type: 'Default',
        category: 'Instagram Views',
        rate: '0.04',
        min: '500',
        max: '5000000',
        refill: false,
        cancel: true,
      },
      {
        service: '2001',
        name: 'YouTube High Retention Views | Monetizable | 60 Days Refill',
        type: 'Default',
        category: 'YouTube Services',
        rate: '1.20',
        min: '500',
        max: '500000',
        refill: true,
        cancel: false,
      },
      {
        service: '2002',
        name: 'YouTube Real Subscribers | Non-Drop | 100-200/day Speed',
        type: 'Default',
        category: 'YouTube Services',
        rate: '8.50',
        min: '100',
        max: '10000',
        refill: true,
        cancel: false,
      },
      {
        service: '2003',
        name: 'YouTube Likes | Real Accounts | Fast Delivery',
        type: 'Default',
        category: 'YouTube Services',
        rate: '0.90',
        min: '100',
        max: '50000',
        refill: true,
        cancel: true,
      },
      {
        service: '3001',
        name: 'Telegram Channel Members | Global Accounts | Silent Join',
        type: 'Default',
        category: 'Telegram Members',
        rate: '0.35',
        min: '200',
        max: '200000',
        refill: true,
        cancel: true,
      },
      {
        service: '3002',
        name: 'Telegram Post Views | Last 5 Posts | Super Fast',
        type: 'Default',
        category: 'Telegram Members',
        rate: '0.02',
        min: '1000',
        max: '1000000',
        refill: false,
        cancel: true,
      },
      {
        service: '4001',
        name: 'TikTok Followers | Fast Start | High Retention',
        type: 'Default',
        category: 'TikTok Services',
        rate: '0.95',
        min: '100',
        max: '100000',
        refill: true,
        cancel: true,
      },
      {
        service: '4002',
        name: 'TikTok Viral Video Likes | Instant Instant Instant',
        type: 'Default',
        category: 'TikTok Services',
        rate: '0.18',
        min: '100',
        max: '500000',
        refill: false,
        cancel: true,
      },
      {
        service: '4003',
        name: 'TikTok Video Views | Ultra High Speed 1M/Day',
        type: 'Default',
        category: 'TikTok Services',
        rate: '0.01',
        min: '1000',
        max: '10000000',
        refill: false,
        cancel: true,
      },
      {
        service: '5001',
        name: 'X / Twitter Real Followers | Active Accounts',
        type: 'Default',
        category: 'Twitter / X Services',
        rate: '1.80',
        min: '100',
        max: '50000',
        refill: true,
        cancel: true,
      },
      {
        service: '5002',
        name: 'X / Twitter Retweets + Likes Combo',
        type: 'Default',
        category: 'Twitter / X Services',
        rate: '0.75',
        min: '50',
        max: '20000',
        refill: false,
        cancel: true,
      },
      {
        service: '6001',
        name: 'Facebook Page Likes + Followers | 30 Days Guarantee',
        type: 'Default',
        category: 'Facebook Services',
        rate: '1.10',
        min: '100',
        max: '100000',
        refill: true,
        cancel: true,
      },
      {
        service: '7001',
        name: 'Spotify Premium Track Streams | USA/EU Audiences',
        type: 'Default',
        category: 'Spotify Services',
        rate: '0.40',
        min: '1000',
        max: '1000000',
        refill: false,
        cancel: true,
      },
    ];
  }
}
