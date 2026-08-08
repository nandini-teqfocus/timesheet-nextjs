import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Utilization Analytics</h2>
        <p className="text-sm text-slate-500">View performance trends and export report metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-brand-600" />
            <span>Utilization Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Analytics charts & CSV export component placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
