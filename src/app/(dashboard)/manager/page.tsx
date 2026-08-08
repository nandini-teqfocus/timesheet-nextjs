import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BarChart } from 'lucide-react';

export default function ManagerDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Manager Overview</h2>
        <p className="text-sm text-slate-500">Monitor team utilization and review timesheet submissions</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Team Avg Utilization</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-brand-600">84.5%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Total Team Hours</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-slate-900">320.0 h</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-amber-600">3</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-brand-600" />
            <span>Direct Reports</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Manager team view component placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
