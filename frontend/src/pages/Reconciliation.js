import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileSpreadsheet } from 'lucide-react';

export default function Reconciliation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reconciliation</h1>
          <p className="text-slate-500 mt-1">Account reconciliation and matching</p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Reconciliation Module
          </CardTitle>
        </CardHeader>
        <CardContent className="py-16">
          <div className="text-center">
            <FileSpreadsheet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Coming Soon</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              The reconciliation module is currently under development. 
              This feature will help you match and reconcile transactions across different accounts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
