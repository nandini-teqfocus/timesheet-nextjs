export interface AnalyticsSummary {
  period: string;
  utilizationRate: number;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  avgDailyHours: number;
  topProject: string;
}

export interface TrendDataPoint {
  period: string;
  hours: number;
  billable: number;
  utilizationRate: number;
}

export interface ProjectDistribution {
  name: string;
  hours: number;
  percentage: number;
  color: string;
}

export interface MonthlyUtilization {
  id: string;
  month: string;
  billed: number;
  nonBilled: number;
  utilization: string;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  trend: TrendDataPoint[];
  projectDistribution: ProjectDistribution[];
  monthlyUtilization: MonthlyUtilization[];
}

export interface AnalyticsApiResponse {
  success: boolean;
  message?: string;
  data?: AnalyticsData;
}

export class AnalyticsService {
  /**
   * Fetch complete analytics metrics and trend data from /api/salesforce/analytics
   */
  static async getAnalyticsData(): Promise<AnalyticsApiResponse> {
    const res = await fetch('/api/salesforce/analytics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch analytics data: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Request CSV Export generation from /api/salesforce/analytics?export=csv
   */
  static async exportCSV(): Promise<string> {
    const res = await fetch('/api/salesforce/analytics?export=csv', {
      method: 'GET',
      headers: {
        'Accept': 'text/csv, application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Failed to generate CSV export: ${res.statusText}`);
    }

    return await res.text();
  }
}
