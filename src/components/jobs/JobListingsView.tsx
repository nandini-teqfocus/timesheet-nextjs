'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { JobService, JobPosting } from '@/services/job.service';
import { Briefcase, Search, MapPin, Clock, Award, UserPlus, RefreshCw, AlertCircle, Building2, Filter } from 'lucide-react';
import Link from 'next/link';

export default function JobListingsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await JobService.getOpenJobs();
      if (res.success && Array.isArray(res.data)) {
        setJobs(res.data);
      } else {
        setError(res.message || 'Failed to load job postings.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while connecting to Salesforce.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Department options for filter dropdown
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    jobs.forEach((j) => {
      if (j.department) deptSet.add(j.department);
    });
    return Array.from(deptSet).sort();
  }, [jobs]);

  // Filtered jobs logic
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchesSearch =
        searchQuery === '' ||
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.jobDescription.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === 'ALL' || j.department === selectedDept;
      const matchesRemote = !remoteOnly || j.isRemote;

      return matchesSearch && matchesDept && matchesRemote;
    });
  }, [jobs, searchQuery, selectedDept, remoteOnly]);

  const remoteCount = useMemo(() => jobs.filter((j) => j.isRemote).length, [jobs]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Job Postings</h2>
          <p className="text-sm text-slate-500">Explore open career opportunities to refer candidates</p>
        </div>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-red-900">Salesforce Integration Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button onClick={fetchJobs} variant="outline" size="sm" className="mt-4 border-red-300 text-red-800 hover:bg-red-100">
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
          <h2 className="text-2xl font-bold text-slate-900">Job Postings</h2>
          <p className="text-sm text-slate-500">Explore open career opportunities and submit referrals</p>
        </div>
        <Button onClick={fetchJobs} variant="outline" size="sm" className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh Listings</span>
        </Button>
      </div>

      {/* KPI / Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{jobs.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Open Positions</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{departments.length}</div>
            <div className="text-xs text-slate-500 font-medium">Hiring Departments</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{remoteCount}</div>
            <div className="text-xs text-slate-500 font-medium">Remote Positions</div>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title, job code, location or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => setRemoteOnly(!remoteOnly)}
            variant={remoteOnly ? 'default' : 'outline'}
            size="sm"
            className="h-10 whitespace-nowrap"
          >
            <Filter className="mr-1.5 h-4 w-4" />
            <span>{remoteOnly ? 'Remote Only' : 'All Locations'}</span>
          </Button>
        </div>
      </div>

      {/* Job Cards Grid */}
      {filteredJobs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No Job Postings Found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search keywords or active filters.</p>
          {(searchQuery || selectedDept !== 'ALL' || remoteOnly) && (
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('ALL');
                setRemoteOnly(false);
              }}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-200">
                    {job.department}
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {job.name}
                  </span>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 mt-2 line-clamp-1">
                  {job.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{job.location}</span>
                    {job.isRemote && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 text-emerald-700 bg-emerald-50 border-emerald-200">
                        Remote
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{job.employmentType}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Award className="h-3.5 w-3.5 text-slate-400" />
                      <span>{job.experienceLevel}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-3 pt-2 border-t border-slate-100">
                    {job.jobDescription}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Posted {job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'recently'}
                  </span>

                  <Link href={`/referrals?jobId=${job.id}`}>
                    <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white">
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Refer Candidate
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
