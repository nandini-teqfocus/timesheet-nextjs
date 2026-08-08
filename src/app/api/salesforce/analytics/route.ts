import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callSalesforceRestApi } from '@/lib/salesforce-client';
import {
  AnalyticsSummary,
  TrendDataPoint,
  ProjectDistribution,
  MonthlyUtilization,
} from '@/services/analytics.service';
import { SalesforceQueryResult } from '@/types/common.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UserSfRecord {
  Id: string;
  Name?: string;
  Email?: string;
}

interface TimesheetEntrySfRecord {
  Id: string;
  Hours__c?: number;
  Entry_Date__c?: string;
  Is_Billable__c?: boolean;
  Project__r?: {
    Name?: string;
  };
  Timesheet__r?: {
    Week_Start_Date__c?: string;
  };
}

interface AnalyticsSnapshotSfRecord {
  Id: string;
  Name?: string;
  Employee__c?: string;
  Period__c?: string;
  Utilization_Rate__c?: number;
  CreatedDate?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isCsvExport = searchParams.get('export') === 'csv';

    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      /* eslint-disable no-console */
      console.log('[API Debug] getServerSession exception in /api/salesforce/analytics:', sessionErr);
      /* eslint-enable no-console */
    }

    const activeToken = session?.accessToken;
    const activeInstanceUrl = session?.instanceUrl;

    const defaultUserId = '005NS00000ykBKTYA2';

    /* eslint-disable no-console */
    console.log('[API Debug] GET /api/salesforce/analytics requested (isCsvExport:', isCsvExport, ')');
    /* eslint-enable no-console */

    // 1. Fetch User details for report header
    const userSoql = `SELECT Id, Name, Email FROM User WHERE Id = '${defaultUserId}' LIMIT 1`;
    const userRes = await callSalesforceRestApi<SalesforceQueryResult<UserSfRecord>>(
      `/services/data/v60.0/query?q=${encodeURIComponent(userSoql)}`,
      { accessToken: activeToken, instanceUrl: activeInstanceUrl },
    );
    const userRec = userRes.data?.records?.[0] || { Name: 'Nandini Singh', Email: 'nandini.singh@teqfocus.com' };

    // 2. Fetch Timesheet Entry records for live aggregation
    const entrySoql = `SELECT Id, Hours__c, Entry_Date__c, Is_Billable__c, Project__r.Name, Timesheet__r.Week_Start_Date__c FROM Timesheet_Entry__c WHERE Timesheet__r.Employee__c = '${defaultUserId}' ORDER BY Entry_Date__c ASC LIMIT 1000`;
    const entryRes = await callSalesforceRestApi<SalesforceQueryResult<TimesheetEntrySfRecord>>(
      `/services/data/v60.0/query?q=${encodeURIComponent(entrySoql)}`,
      { accessToken: activeToken, instanceUrl: activeInstanceUrl },
    );
    const entries = entryRes.data?.records || [];

    // Aggregations
    let totalHours = 0;
    let billableHours = 0;
    const projMap: Record<string, number> = {};
    const weekMap: Record<string, { label: string; hours: number; billable: number }> = {};

    entries.forEach((e) => {
      const h = Number(e.Hours__c) || 0;
      const isBill = Boolean(e.Is_Billable__c);
      totalHours += h;
      if (isBill) billableHours += h;

      const projName = e.Project__r?.Name || 'General Project';
      projMap[projName] = (projMap[projName] || 0) + h;

      const weekStartStr = e.Timesheet__r?.Week_Start_Date__c || e.Entry_Date__c;
      if (weekStartStr) {
        if (!weekMap[weekStartStr]) {
          const dateObj = new Date(weekStartStr);
          const formatted = isNaN(dateObj.getTime())
            ? weekStartStr
            : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          weekMap[weekStartStr] = { label: `Week of ${formatted}`, hours: 0, billable: 0 };
        }
        weekMap[weekStartStr].hours += h;
        if (isBill) weekMap[weekStartStr].billable += h;
      }
    });

    const nonBillableHours = totalHours - billableHours;
    const utilizationRate = totalHours > 0 ? Number(((billableHours / totalHours) * 100).toFixed(1)) : 0;
    const avgDailyHours = Number((totalHours / 5.0).toFixed(1));

    // Resolve top project
    let topProject = 'None';
    let maxHours = -1;
    Object.entries(projMap).forEach(([pName, pHours]) => {
      if (pHours > maxHours) {
        maxHours = pHours;
        topProject = pName;
      }
    });

    const summary: AnalyticsSummary = {
      period: 'all_time',
      utilizationRate,
      totalHours,
      billableHours,
      nonBillableHours,
      avgDailyHours,
      topProject,
    };

    // Build Trend Data
    const trend: TrendDataPoint[] = Object.values(weekMap).map((w) => ({
      period: w.label,
      hours: Number(w.hours.toFixed(1)),
      billable: Number(w.billable.toFixed(1)),
      utilizationRate: w.hours > 0 ? Number(((w.billable / w.hours) * 100).toFixed(1)) : 0,
    }));

    // Build Project Distribution
    const colorPalette = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#9E9E9E'];
    const projectDistribution: ProjectDistribution[] = Object.entries(projMap).map(([pName, pHours], idx) => ({
      name: pName,
      hours: Number(pHours.toFixed(1)),
      percentage: totalHours > 0 ? Number(((pHours / totalHours) * 100).toFixed(1)) : 0,
      color: colorPalette[idx % colorPalette.length],
    }));

    // 3. Fetch Monthly Snapshots
    const snapSoql = `SELECT Id, Name, Employee__c, Period__c, Utilization_Rate__c, CreatedDate FROM Analytics_Snapshot__c WHERE Employee__c = '${defaultUserId}' ORDER BY CreatedDate DESC LIMIT 12`;
    const snapRes = await callSalesforceRestApi<SalesforceQueryResult<AnalyticsSnapshotSfRecord>>(
      `/services/data/v60.0/query?q=${encodeURIComponent(snapSoql)}`,
      { accessToken: activeToken, instanceUrl: activeInstanceUrl },
    );
    const snapshots = snapRes.data?.records || [];

    const monthlyUtilization: MonthlyUtilization[] = snapshots.map((s) => {
      const utilVal = Number(s.Utilization_Rate__c) || 85.0;
      const billed = Number(((utilVal / 100.0) * 160.0).toFixed(1));
      const nonBilled = Number((160.0 - billed).toFixed(1));
      const dateObj = s.CreatedDate ? new Date(s.CreatedDate) : new Date();
      const monthStr = isNaN(dateObj.getTime())
        ? 'May 2026'
        : dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

      return {
        id: s.Id,
        month: monthStr,
        billed,
        nonBilled,
        utilization: `${utilVal.toFixed(1)}%`,
      };
    });

    // Handle CSV Export
    if (isCsvExport) {
      let csv = 'ENTERPRISE TIMESHEET ANALYTICS REPORT\n';
      csv += `Generated On,${new Date().toISOString().split('T')[0]}\n`;
      csv += `Employee Name,"${userRec.Name || 'Nandini Singh'}"\n`;
      csv += `Employee Email,"${userRec.Email || 'nandini.singh@teqfocus.com'}"\n\n`;

      csv += 'OVERALL UTILIZATION SUMMARY METRICS\n';
      csv += 'Metric,Value\n';
      csv += `Avg Utilization Rate,${summary.utilizationRate}%\n`;
      csv += `Total Logged Hours,${summary.totalHours} h\n`;
      csv += `Billed Hours,${summary.billableHours} h\n`;
      csv += `Non-Billed Hours,${summary.nonBillableHours} h\n`;
      csv += `Top Project,"${summary.topProject}"\n\n`;

      csv += 'UTILIZATION TREND BY WEEK\n';
      csv += 'Period,Total Hours,Billable Hours,Utilization Rate\n';
      trend.forEach((t) => {
        csv += `"${t.period}",${t.hours},${t.billable},${t.utilizationRate}%\n`;
      });
      csv += '\n';

      csv += 'PROJECT HOURS DISTRIBUTION\n';
      csv += 'Project Name,Logged Hours,Percentage Contribution\n';
      projectDistribution.forEach((p) => {
        csv += `"${p.name}",${p.hours},${p.percentage}%\n`;
      });

      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics metrics retrieved successfully from Salesforce',
      data: {
        summary,
        trend,
        projectDistribution,
        monthlyUtilization,
      },
    });
  } catch (error) {
    /* eslint-disable no-console */
    console.error('[API Debug] Unhandled error in GET /api/salesforce/analytics:', error);
    /* eslint-enable no-console */
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      },
      { status: 500 },
    );
  }
}
