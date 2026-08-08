import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Profile</h2>
        <p className="text-sm text-slate-500">Manage your profile details and skill matrix</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-brand-600" />
            <span>Employee Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Profile & Skills Matrix component placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
