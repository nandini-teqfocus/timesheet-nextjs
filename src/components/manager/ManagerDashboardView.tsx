'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ManagerService, ManagerStats, SubordinateEmployee, TeamActivity, ManagerTimesheetStats } from '@/services/manager.service';
import { Users, Clock, CheckCircle2, RefreshCw, AlertCircle, Briefcase, FileText, ChevronRight } from 'lucide-react';

export default function ManagerDashboardView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [subordinates, setSubordinates] = useState<SubordinateEmployee[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  
  // State for subordinate timesheets drilldown
  const [selectedSubordinate, setSelectedSubordinate] = useState<SubordinateEmployee | null>(null);
  const [subTimesheets, setSubTimesheets] = useState<ManagerTimesheetStats[]>([]);
  const [loadingSubTimesheets, setLoadingSubTimesheets] = useState(false);

  const fetchManagerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ManagerService.getDashboardData();
      if (res.success && res.data) {
        setStats(res.data.stats || null);
        setSubordinates(res.data.subordinates || []);
        setActivities(res.data.activities || []);
      } else {
        setError(res.message || 'Failed to load manager dashboard metrics.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while connecting to Salesforce.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagerData();
  }, [fetchManagerData]);

  const handleSelectSubordinate = async (emp: SubordinateEmployee) => {
    setSelectedSubordinate(emp);
    setLoadingSubTimesheets(true);
    try {
      const ts = await ManagerService.getSubordinateTimesheets(emp.id);
      setSubTimesheets(ts);
    } catch (err) {
      console.error('Error fetching employee timesheets:', err);
      setSubTimesheets([]);
    } finally {
      setLoadingSubTimesheets(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>

        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manager Overview</h2>
          <p className="text-sm text-slate-500">Monitor team utilization and review timesheet submissions</p>
        </div>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-red-900">Salesforce Integration Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button onClick={fetchManagerData} variant="outline" size="sm" className="mt-4 border-red-300 text-red-800 hover:bg-red-100">
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
          <h2 className="text-2xl font-bold text-slate-900">
            Manager Overview {stats?.managerName ? `— ${stats.managerName}` : ''}
          </h2>
          <p className="text-sm text-slate-500">
            Monitor team utilization and review timesheet submissions
          </p>
        </div>
        <Button onClick={fetchManagerData} variant="outline" size="sm" className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Team Avg Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brand-600">
              {stats?.avgTeamUtilization !== undefined ? `${stats.avgTeamUtilization}%` : '0%'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Based on logged billable vs total hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Team Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats?.totalTeamHours !== undefined ? `${stats.totalTeamHours.toFixed(1)} h` : '0.0 h'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Billed: {stats?.totalBilledHours ?? 0}h | Non-Billed: {stats?.totalNonBilledHours ?? 0}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Direct Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">
              {subordinates.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Subordinate team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Top Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {stats?.topProjects?.length || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Projects with logged team hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Direct Reports & Top Projects */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Direct Reports Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-base font-semibold">
                <Users className="h-5 w-5 text-brand-600" />
                <span>Direct Reports ({subordinates.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subordinates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No direct reports found assigned to your manager profile in Salesforce.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="border-b border-slate-100 text-xs text-slate-400 uppercase bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Department & Title</th>
                        <th className="px-4 py-3 text-right">Logged Hours</th>
                        <th className="px-4 py-3 text-right">Utilization</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subordinates.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-900">
                            <div>{emp.name}</div>
                            <div className="text-xs text-slate-400">{emp.email}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-slate-800">{emp.title || 'Staff Associate'}</div>
                            <div className="text-xs text-slate-400">{emp.department || 'Engineering'}</div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium">
                            <div>{emp.totalHours} h</div>
                            <div className="text-xs text-emerald-600">{emp.billableHours} h billable</div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Badge variant={emp.utilizationRate >= 75 ? 'success' : emp.utilizationRate > 0 ? 'warning' : 'outline'}>
                              {emp.utilizationRate}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <Button
                              onClick={() => handleSelectSubordinate(emp)}
                              variant="ghost"
                              size="sm"
                              className="h-8 text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                            >
                              <span>Timesheets</span>
                              <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Team Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base font-semibold">
                <Clock className="h-5 w-5 text-brand-600" />
                <span>Recent Team Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No recent team log entries found.
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900 text-sm">{act.employeeName}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-medium text-brand-600">{act.projectName}</span>
                          {act.category && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                              {act.category}
                            </Badge>
                          )}
                        </div>
                        {act.description && <p className="text-xs text-slate-600 line-clamp-1">{act.description}</p>}
                      </div>
                      <div className="text-right whitespace-nowrap pl-4">
                        <span className="font-semibold text-slate-900 text-sm">{act.hours} h</span>
                        <div className="text-[11px] text-slate-400">{act.entryDate}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Top Projects & Drilldown Modal/Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base font-semibold">
                <Briefcase className="h-5 w-5 text-brand-600" />
                <span>Top Projects Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.topProjects || stats.topProjects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  No project hours logged yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.topProjects.map((p, idx) => {
                    const total = stats.totalTeamHours || 1;
                    const pct = Math.min(100, Math.round((p.hours / total) * 100));
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-800 truncate max-w-[180px]">{p.projectName}</span>
                          <span className="text-slate-500 font-semibold">{p.hours} h ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: p.color || '#2196F3',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subordinate Selected Timesheet Drilldown */}
          {selectedSubordinate && (
            <Card className="border-brand-200 bg-brand-50/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-brand-900 flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-brand-600" />
                  <span>Timesheets — {selectedSubordinate.name}</span>
                </CardTitle>
                <Button
                  onClick={() => setSelectedSubordinate(null)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                {loadingSubTimesheets ? (
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : subTimesheets.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No timesheets found for this employee.</p>
                ) : (
                  <div className="space-y-2">
                    {subTimesheets.map((ts) => (
                      <div key={ts.id} className="flex items-center justify-between bg-white p-2.5 rounded-md border border-slate-200 text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{ts.name}</div>
                          <div className="text-[11px] text-slate-400">{ts.weekStartDate} to {ts.weekEndDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{ts.totalHours} h</div>
                          <Badge variant={ts.utilization >= 100 ? 'success' : 'outline'} className="text-[10px] py-0">
                            {ts.utilization}% util
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
