'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileService, UserProfile, EmployeeSkill } from '@/services/profile.service';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  TrendingUp,
  ShieldCheck,
  Building,
} from 'lucide-react';

export default function UserProfileView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ProfileService.getUserProfile();
      if (res.success && res.data) {
        setProfile(res.data.profile);
        setSkills(res.data.skills || []);
      } else {
        setError(res.message || 'Failed to load profile details.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while connecting to Salesforce.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const filteredSkills = useMemo(() => {
    if (activeCategory === 'ALL') return skills;
    return skills.filter((s) => s.category.toUpperCase() === activeCategory.toUpperCase());
  }, [skills, activeCategory]);

  const certifiedCount = useMemo(() => {
    return skills.filter((s) => s.certified).length;
  }, [skills]);

  const getProficiencyBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'expert':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Expert</Badge>;
      case 'advanced':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Advanced</Badge>;
      case 'intermediate':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Intermediate</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Profile</h2>
          <p className="text-sm text-slate-500">Manage your profile details and skill matrix</p>
        </div>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-red-900">Salesforce Connection Error</h3>
                <p className="text-sm text-red-700 mt-1">{error || 'Could not retrieve profile information.'}</p>
                <Button onClick={fetchProfile} variant="outline" size="sm" className="mt-4 border-red-300 text-red-800 hover:bg-red-100">
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

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-900 text-white border-0 shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center space-x-5">
              <div className="h-16 w-16 rounded-full bg-brand-500 text-white font-bold text-xl flex items-center justify-center border-2 border-white/20 shadow-md shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold tracking-tight capitalize">{profile.name}</h1>
                  {profile.roleType && (
                    <Badge className="bg-white/10 text-white border-white/20 text-xs">
                      {profile.roleType}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center">
                    <Briefcase className="h-3.5 w-3.5 mr-1 text-brand-400" />
                    {profile.title}
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Building className="h-3.5 w-3.5 mr-1 text-brand-400" />
                    {profile.department}
                  </span>
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 flex-wrap">
                  <span className="flex items-center">
                    <Mail className="h-3 w-3 mr-1 text-slate-400" />
                    {profile.email}
                  </span>
                  <span className="flex items-center">
                    <Phone className="h-3 w-3 mr-1 text-slate-400" />
                    {profile.phone}
                  </span>
                  <span className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-slate-400" />
                    {profile.location}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button onClick={fetchProfile} variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-brand-50 rounded-lg text-brand-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{profile.totalHours.toFixed(1)} hrs</div>
            <div className="text-xs text-slate-500 font-medium">Logged Total Hours</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{profile.utilizationRate}%</div>
            <div className="text-xs text-slate-500 font-medium">Utilization Rate</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{skills.length}</div>
            <div className="text-xs text-slate-500 font-medium">Skills Matrix Count</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{certifiedCount}</div>
            <div className="text-xs text-slate-500 font-medium">Certified Skills</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <User className="h-4 w-4 text-brand-600" />
              <span>Employee System Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Manager:</span>
              <span className="font-medium text-slate-900">{profile.managerName}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Join Date:</span>
              <span className="font-medium text-slate-900">{profile.joinDate}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Company Tenure:</span>
              <span className="font-medium text-slate-900">{profile.tenure}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Timezone:</span>
              <span className="font-medium text-slate-900 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                {profile.timezone}
              </span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-slate-500">Locale:</span>
              <span className="font-medium text-slate-900">{profile.locale}</span>
            </div>
          </CardContent>
        </Card>

        {/* Right Skills Matrix Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Award className="h-4 w-4 text-brand-600" />
                <span>Skills & Competencies Matrix</span>
              </CardTitle>

              <div className="flex items-center space-x-2">
                {['ALL', 'Technical', 'Soft', 'Domain'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeCategory === cat
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {filteredSkills.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No skills listed under category &quot;{activeCategory}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSkills.map((sk) => (
                  <div
                    key={sk.id}
                    className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-shadow space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-slate-900">{sk.name}</div>
                      {getProficiencyBadge(sk.proficiencyLevel)}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-medium text-slate-600">Category: {sk.category}</span>
                      <span>{sk.yearsExperience} yrs exp</span>
                    </div>

                    {sk.certified && (
                      <div className="flex items-center text-xs text-emerald-700 font-medium pt-1">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        <span>Salesforce Certified</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
