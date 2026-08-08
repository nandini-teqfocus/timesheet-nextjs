import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Job Postings</h2>
        <p className="text-sm text-slate-500">Explore open career opportunities to refer candidates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-brand-600" />
            <span>Open Positions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Job catalog component placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
