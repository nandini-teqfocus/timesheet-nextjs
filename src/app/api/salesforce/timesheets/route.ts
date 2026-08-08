import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TimesheetService } from '@/services/timesheet.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      /* eslint-disable no-console */
      console.log('[API Debug] getServerSession exception:', sessionErr);
      /* eslint-enable no-console */
    }

    // Use session access token if available, otherwise pass undefined to activate server-side JWT Bearer Auth
    const activeToken = session?.accessToken;
    const activeInstanceUrl = session?.instanceUrl;

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart') || getMondayOfCurrentWeek();

    /* eslint-disable no-console */
    console.log('[API Debug] GET /api/salesforce/timesheets requested for weekStart:', weekStart);
    console.log('[API Debug] Authentication strategy:', activeToken ? 'NextAuth User Session Token' : 'Server-Side JWT Bearer OAuth');
    /* eslint-enable no-console */

    const response = await TimesheetService.getTimesheetData(
      weekStart,
      activeToken,
      activeInstanceUrl,
    );

    if (!response.success && (response.errorCode?.startsWith('SALESFORCE_HTTP_401') || response.errorCode === 'JWT_AUTH_REQUIRED')) {
      /* eslint-disable no-console */
      console.log('[API Debug] Salesforce response status 401 or JWT missing credentials:', response.message);
      /* eslint-enable no-console */
    }

    const httpStatus = response.success
      ? 200
      : response.errorCode === 'UNAUTHORIZED' || response.errorCode === 'SALESFORCE_HTTP_401' || response.errorCode === 'JWT_AUTH_REQUIRED'
        ? 401
        : 500;

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    /* eslint-disable no-console */
    console.error('[API Debug] Unhandled error in GET /api/salesforce/timesheets:', error);
    /* eslint-enable no-console */
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
        errorCode: 'SERVER_ERROR',
      },
      { status: 500 },
    );
  }
}

function getMondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}
