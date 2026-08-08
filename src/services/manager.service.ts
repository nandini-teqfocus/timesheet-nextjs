export interface ProjectHours {
  projectName: string;
  projectCode?: string;
  hours: number;
  color?: string;
}

export interface ManagerStats {
  managerName?: string;
  managerTitle?: string;
  managerDepartment?: string;
  managerInitials?: string;
  avgTeamUtilization: number;
  totalTeamHours: number;
  totalBilledHours: number;
  totalNonBilledHours: number;
  topProjects?: ProjectHours[];
}

export interface SubordinateEmployee {
  id: string; // Employee__c Id
  userId: string; // User Id
  name: string;
  email: string;
  title: string;
  department: string;
  totalHours: number;
  billableHours: number;
  utilizationRate: number;
}

export interface TeamActivity {
  id: string;
  employeeName: string;
  hours: number;
  projectName: string;
  category?: string;
  description?: string;
  entryDate: string;
}

export interface ManagerTimesheetStats {
  id: string;
  name: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  billableHours: number;
  utilization: number;
}

export interface ManagerDashboardResponse {
  success: boolean;
  message?: string;
  data: {
    stats: ManagerStats;
    subordinates: SubordinateEmployee[];
    activities: TeamActivity[];
  };
}

export class ManagerService {
  /**
   * Fetch consolidated Manager Dashboard data (stats, direct reports, activities)
   */
  static async getDashboardData(): Promise<ManagerDashboardResponse> {
    const res = await fetch('/api/salesforce/manager', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch manager dashboard: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Fetch timesheets for a specific subordinate employee
   */
  static async getSubordinateTimesheets(employeeId: string): Promise<ManagerTimesheetStats[]> {
    const res = await fetch(`/api/salesforce/manager?endpoint=timesheets&employeeId=${encodeURIComponent(employeeId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch employee timesheets: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data || [];
  }
}
