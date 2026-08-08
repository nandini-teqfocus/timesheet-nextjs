import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, Plus } from 'lucide-react';

export default function ReferralsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employee Referrals</h2>
          <p className="text-sm text-slate-500">Track and manage your candidate referrals</p>
        </div>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Referral</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-brand-600" />
            <span>My Referrals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Referrals tracking table component placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
