import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TimesheetService } from '@/services/timesheet.service';

export const dynamic = 'force-dynamic';

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

    const accessTokenPresent = !!session?.accessToken;
    const instanceUrlPresent = !!session?.instanceUrl;

    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const fallbackToken = bearerToken || process.env.SALESFORCE_ACCESS_TOKEN;

    const activeToken = session?.accessToken || fallbackToken;
    const activeInstanceUrl =
      session?.instanceUrl ||
      process.env.SALESFORCE_INSTANCE_URL ||
      'https://orgfarm-c3e9e3ab96-dev-ed.develop.my.salesforce.com';

    /* eslint-disable no-console */
    console.log('[API Debug] getServerSession() result:', session ? 'SESSION_FOUND' : 'NULL');
    console.log('[API Debug] accessToken present?:', accessTokenPresent || !!fallbackToken);
    console.log('[API Debug] instanceUrl present?:', instanceUrlPresent || !!activeInstanceUrl);
    console.log(
      '[API Debug] Authorization header sent to Salesforce:',
      activeToken ? `Bearer ${activeToken.substring(0, 15)}...` : 'NONE',
    );
    /* eslint-enable no-console */

    if (!activeToken) {
      /* eslint-disable no-console */
      console.log(
        '[API Debug] Returning 401: No active access token available in session or environment fallback.',
      );
      /* eslint-enable no-console */

      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized: Missing or invalid Salesforce session token',
          data: null,
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart') || getMondayOfCurrentWeek();

    const response = await TimesheetService.getTimesheetData(
      weekStart,
      activeToken,
      activeInstanceUrl,
    );

    if (!response.success && response.errorCode?.startsWith('SALESFORCE_HTTP_401')) {
      /* eslint-disable no-console */
      console.log('[API Debug] Salesforce response status: 401');
      console.log('[API Debug] Salesforce response body:', response.message);
      /* eslint-enable no-console */
    }

    const httpStatus = response.success
      ? 200
      : response.errorCode === 'UNAUTHORIZED' || response.errorCode === 'SALESFORCE_HTTP_401'
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
