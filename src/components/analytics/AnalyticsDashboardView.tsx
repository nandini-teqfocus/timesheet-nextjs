'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AnalyticsService,
  AnalyticsSummary,
  TrendDataPoint,
  ProjectDistribution,
  MonthlyUtilization,
} from '@/services/analytics.service';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Briefcase,
  Download,
  RefreshCw,
  AlertCircle,
  Calendar,
  PieChart,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export default function AnalyticsDashboardView() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);
  const [projectDistribution, setProjectDistribution] = useState<ProjectDistribution[]>([]);
  const [monthlyUtilization, setMonthlyUtilization] = useState<MonthlyUtilization[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await AnalyticsService.getAnalyticsData();
      if (res.success && res.data) {
        setSummary(res.data.summary);
        setTrend(res.data.trend || []);
        setProjectDistribution(res.data.projectDistribution || []);
        setMonthlyUtilization(res.data.monthlyUtilization || []);
      } else {
        setError(res.message || 'Failed to retrieve analytics data from Salesforce.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching Salesforce analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const csvText = await AnalyticsService.exportCSV();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `salesforce-analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      /* eslint-disable no-console */
      console.error('CSV Export Error:', err);
      /* eslint-enable no-console */
      alert('Failed to export CSV report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Utilization Analytics</h2>
          <p className="text-sm text-slate-500">View performance trends and export report metrics</p>
        </div>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-red-900">Salesforce Integration Error</h3>
                <p className="text-sm text-red-700 mt-1">{error || 'Could not fetch analytics data.'}</p>
                <Button onClick={fetchAnalytics} variant="outline" size="sm" className="mt-4 border-red-300 text-red-800 hover:bg-red-100">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Utilization Analytics</h2>
          <p className="text-sm text-slate-500">Performance trends, project hour distributions, and report exports</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={fetchAnalytics} variant="outline" size="sm" className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Data</span>
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={exporting}
            size="sm"
            className="bg-brand-600 hover:bg-brand-700 text-white flex items-center space-x-2"
          >
            {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>{exporting ? 'Generating...' : 'Export CSV Report'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{summary.utilizationRate}%</div>
            <div className="text-xs text-slate-500 font-medium">Utilization Rate</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{summary.totalHours.toFixed(1)} hrs</div>
            <div className="text-xs text-slate-500 font-medium">
              {summary.billableHours}h billable / {summary.nonBillableHours}h non-bill
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{summary.avgDailyHours} hrs</div>
            <div className="text-xs text-slate-500 font-medium">Daily Avg Workload</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 truncate max-w-[140px]">{summary.topProject}</div>
            <div className="text-xs text-slate-500 font-medium">Top Contributing Project</div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Utilization Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <BarChart3 className="h-5 w-5 text-brand-600" />
              <span>Weekly Utilization Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trend.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No weekly trend records found.</div>
            ) : (
              trend.map((t, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {t.period}
                    </span>
                    <span className="flex items-center space-x-2">
                      <span>{t.billable} / {t.hours} hrs</span>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        {t.utilizationRate}%
                      </Badge>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-brand-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(t.utilizationRate, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Project Hours Contribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <PieChart className="h-5 w-5 text-brand-600" />
              <span>Project Hours Allocation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectDistribution.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No project allocations recorded.</div>
            ) : (
              projectDistribution.map((p, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span className="flex items-center">
                      <span
                        className="h-2.5 w-2.5 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate max-w-[200px]">{p.name}</span>
                    </span>
                    <span>{p.hours} hrs ({p.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: p.color,
                        width: `${Math.min(p.percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical Performance Snapshots Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-brand-600" />
            <span>Historical Monthly Performance Snapshots</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyUtilization.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No monthly snapshots available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Period / Month</th>
                    <th className="py-3 px-4">Billed Hours (160h Base)</th>
                    <th className="py-3 px-4">Non-Billed Hours</th>
                    <th className="py-3 px-4 text-right">Avg Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {monthlyUtilization.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{m.month}</td>
                      <td className="py-3.5 px-4 text-emerald-700 font-medium">{m.billed} hrs</td>
                      <td className="py-3.5 px-4 text-slate-500">{m.nonBilled} hrs</td>
                      <td className="py-3.5 px-4 text-right">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">
                          {m.utilization}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
