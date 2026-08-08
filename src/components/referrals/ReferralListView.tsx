'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ReferralService, EmployeeReferral } from '@/services/referral.service';
import { UserCheck, Search, Plus, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, Award, Briefcase, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

export default function ReferralListView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<EmployeeReferral[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ReferralService.getMyReferrals();
      if (res.success && Array.isArray(res.data)) {
        setReferrals(res.data);
      } else {
        setError(res.message || 'Failed to load candidate referrals.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while connecting to Salesforce.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Derived filter options
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    referrals.forEach((r) => {
      if (r.department) deptSet.add(r.department);
    });
    return Array.from(deptSet).sort();
  }, [referrals]);

  const statuses = useMemo(() => {
    const statusSet = new Set<string>();
    referrals.forEach((r) => {
      if (r.status) statusSet.add(r.status);
    });
    return Array.from(statusSet).sort();
  }, [referrals]);

  // Filtered referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
      const matchesDept = selectedDept === 'ALL' || r.department === selectedDept;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [referrals, searchQuery, selectedStatus, selectedDept]);

  // Summary Metrics
  const activePipelineCount = useMemo(() => {
    return referrals.filter((r) => ['Submitted', 'Under Review', 'Interview Scheduled', 'Selected'].includes(r.status)).length;
  }, [referrals]);

  const hiredCount = useMemo(() => {
    return referrals.filter((r) => r.status === 'Hired').length;
  }, [referrals]);

  const bonusCount = useMemo(() => {
    return referrals.filter((r) => r.bonusEligible || r.bonusPaid).length;
  }, [referrals]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Hired':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            <span>Hired</span>
          </Badge>
        );
      case 'Interview Scheduled':
      case 'Selected':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center space-x-1">
            <Clock className="h-3 w-3 mr-1" />
            <span>{status}</span>
          </Badge>
        );
      case 'Under Review':
      case 'Submitted':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center space-x-1">
            <Clock className="h-3 w-3 mr-1" />
            <span>{status}</span>
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 flex items-center space-x-1">
            <XCircle className="h-3 w-3 mr-1" />
            <span>Rejected</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employee Referrals</h2>
          <p className="text-sm text-slate-500">Track and manage your candidate referrals</p>
        </div>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-red-900">Salesforce Integration Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button onClick={fetchReferrals} variant="outline" size="sm" className="mt-4 border-red-300 text-red-800 hover:bg-red-100">
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
          <h2 className="text-2xl font-bold text-slate-900">Employee Referrals</h2>
          <p className="text-sm text-slate-500">Track candidate referrals and recruitment pipeline status</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={fetchReferrals} variant="outline" size="sm" className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Data</span>
          </Button>
          <Link href="/jobs">
            <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>New Referral</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{referrals.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Referrals</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{activePipelineCount}</div>
            <div className="text-xs text-slate-500 font-medium">Active Pipeline</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{hiredCount}</div>
            <div className="text-xs text-slate-500 font-medium">Candidates Hired</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{bonusCount}</div>
            <div className="text-xs text-slate-500 font-medium">Bonus Eligible</div>
          </div>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by candidate name, email, referral ID or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Statuses</option>
                {statuses.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredReferrals.length === 0 ? (
            <div className="py-12 text-center">
              <UserCheck className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-900">No Referrals Found</h3>
              <p className="text-sm text-slate-500 mt-1">No candidate referrals match your current search criteria.</p>
              {(searchQuery || selectedStatus !== 'ALL' || selectedDept !== 'ALL') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('ALL');
                    setSelectedDept('ALL');
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Referral ID</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Target Position</th>
                    <th className="py-3 px-4">Submission Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Bonus Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReferrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-brand-600">
                        {referral.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{referral.candidateName}</div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1 text-slate-400" />
                            {referral.candidateEmail}
                          </span>
                          {referral.candidatePhone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1 text-slate-400" />
                              {referral.candidatePhone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 flex items-center">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
                          <span>{referral.jobTitle}</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {referral.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {referral.submissionDate
                          ? new Date(referral.submissionDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(referral.status)}
                        {referral.rejectionReason && (
                          <div className="text-[11px] text-rose-600 mt-1 italic">
                            Reason: {referral.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {referral.bonusPaid ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Bonus Paid
                          </Badge>
                        ) : referral.bonusEligible ? (
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            Eligible
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
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
