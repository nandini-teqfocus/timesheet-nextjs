'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Plus, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { ServiceResponse } from '@/types/common.types';
import { TimesheetData } from '@/types/timesheet.types';

function getMondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TimesheetView() {
  const [weekStart, setWeekStart] = useState<string>(getMondayOfCurrentWeek());
  const [data, setData] = useState<TimesheetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimesheet = useCallback(async (targetWeekStart: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/salesforce/timesheets?weekStart=${targetWeekStart}`);
      const json: ServiceResponse<TimesheetData> = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch timesheet data');
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading timesheet data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimesheet(weekStart);
  }, [weekStart, fetchTimesheet]);

  const handlePrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Submitted':
        return 'default';
      case 'Rejected':
        return 'destructive';
      case 'Draft':
      default:
        return 'warning';
    }
  };

  const totalHours = data?.totalHours ?? 0;
  const billableHours = data?.billableHours ?? 0;
  const utilizationRate = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
  const status = data?.status ?? 'Draft';
  const entries = data?.entries ?? [];

  return (
    <div className="space-y-6">
      {/* Header & Date Controls */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Weekly Timesheet</h2>
          <p className="text-sm text-slate-500">
            Log and review your weekly project hours (Live Salesforce Integration)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrevWeek} title="Previous Week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-semibold text-slate-700">
              Week of {formatDisplayDate(data?.weekStart || data?.weekStartDate || weekStart)}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextWeek} title="Next Week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Entry</span>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-sm">Failed to load Salesforce data</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchTimesheet(weekStart)}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Metric Cards Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total Hours</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-slate-900">
            {loading ? <Skeleton className="h-9 w-24" /> : `${totalHours.toFixed(1)} h`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Billable Hours</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-brand-600">
            {loading ? <Skeleton className="h-9 w-24" /> : `${billableHours.toFixed(1)} h`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Utilization Rate</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-emerald-600">
            {loading ? <Skeleton className="h-9 w-24" /> : `${utilizationRate}%`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-20 rounded-full" />
            ) : (
              <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Entries Grid / Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-brand-600" />
            <span>Logged Time Entries</span>
          </CardTitle>
          {data?.employeeName && (
            <span className="text-xs text-slate-400 font-normal">
              Employee: {data.employeeName}
            </span>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
              <Clock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="font-semibold text-slate-700">No time entries found</p>
              <p className="text-xs text-slate-400">
                There are no logged entries for the week starting {formatDisplayDate(data?.weekStart || data?.weekStartDate || weekStart)}.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                    <th className="px-4 py-3 text-center">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {formatDisplayDate(entry.dateStr || entry.entryDate)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-700">
                        {entry.projectName || 'General'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {entry.category || 'Development'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {entry.description || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900">
                        {entry.hours.toFixed(1)} h
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {entry.isBillable ? (
                          <Badge variant="success">Billable</Badge>
                        ) : (
                          <Badge variant="outline">Non-Billable</Badge>
                        )}
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
