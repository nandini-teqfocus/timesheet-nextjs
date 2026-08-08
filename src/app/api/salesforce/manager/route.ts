import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callSalesforceRestApi } from '@/lib/salesforce-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseSfResponseData(sfRes: any): any {
  if (!sfRes) return null;
  if (sfRes.dataJson) {
    try {
      return typeof sfRes.dataJson === 'string' ? JSON.parse(sfRes.dataJson) : sfRes.dataJson;
    } catch {
      return sfRes.dataJson;
    }
  }
  return sfRes.data ?? null;
}

export async function GET(request: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      /* eslint-disable no-console */
      console.log('[API Debug] getServerSession exception in /api/salesforce/manager:', sessionErr);
      /* eslint-enable no-console */
    }

    const activeToken = session?.accessToken;
    const activeInstanceUrl = session?.instanceUrl;

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const employeeId = searchParams.get('employeeId');
    const timesheetId = searchParams.get('timesheetId');

    /* eslint-disable no-console */
    console.log('[API Debug] GET /api/salesforce/manager requested. Endpoint:', endpoint || 'consolidated');
    console.log('[API Debug] Authentication strategy:', activeToken ? 'NextAuth Session' : 'Server-Side JWT Bearer OAuth');
    /* eslint-enable no-console */

    // Single specific endpoint calls
    if (endpoint === 'timesheets') {
      if (!employeeId) {
        return NextResponse.json({ success: false, message: 'employeeId parameter is required' }, { status: 400 });
      }
      const sfRes = await callSalesforceRestApi(
        `/services/apexrest/v1/manager/timesheets?employeeId=${encodeURIComponent(employeeId)}`,
        { accessToken: activeToken, instanceUrl: activeInstanceUrl },
      );
      const parsedData = parseSfResponseData(sfRes);
      return NextResponse.json({ success: sfRes.success, message: sfRes.message, data: parsedData });
    }

    if (endpoint === 'entries') {
      if (!timesheetId) {
        return NextResponse.json({ success: false, message: 'timesheetId parameter is required' }, { status: 400 });
      }
      const sfRes = await callSalesforceRestApi(
        `/services/apexrest/v1/manager/entries?timesheetId=${encodeURIComponent(timesheetId)}`,
        { accessToken: activeToken, instanceUrl: activeInstanceUrl },
      );
      const parsedData = parseSfResponseData(sfRes);
      return NextResponse.json({ success: sfRes.success, message: sfRes.message, data: parsedData });
    }

    if (endpoint === 'subordinates') {
      const sfRes = await callSalesforceRestApi(
        '/services/apexrest/v1/manager/subordinates',
        { accessToken: activeToken, instanceUrl: activeInstanceUrl },
      );
      const parsedData = parseSfResponseData(sfRes);
      return NextResponse.json({ success: sfRes.success, message: sfRes.message, data: parsedData });
    }

    if (endpoint === 'activities') {
      const sfRes = await callSalesforceRestApi(
        '/services/apexrest/v1/manager/activities',
        { accessToken: activeToken, instanceUrl: activeInstanceUrl },
      );
      const parsedData = parseSfResponseData(sfRes);
      return NextResponse.json({ success: sfRes.success, message: sfRes.message, data: parsedData });
    }

    if (endpoint === 'dashboard') {
      const sfRes = await callSalesforceRestApi(
        '/services/apexrest/v1/manager/dashboard',
        { accessToken: activeToken, instanceUrl: activeInstanceUrl },
      );
      const parsedData = parseSfResponseData(sfRes);
      return NextResponse.json({ success: sfRes.success, message: sfRes.message, data: parsedData });
    }

    // Default: Consolidated Dashboard Request (Stats + Subordinates + Activities)
    const [dashRes, subsRes, actsRes] = await Promise.all([
      callSalesforceRestApi('/services/apexrest/v1/manager/dashboard', { accessToken: activeToken, instanceUrl: activeInstanceUrl }).catch((err) => ({ success: false, error: err })),
      callSalesforceRestApi('/services/apexrest/v1/manager/subordinates', { accessToken: activeToken, instanceUrl: activeInstanceUrl }).catch((err) => ({ success: false, error: err })),
      callSalesforceRestApi('/services/apexrest/v1/manager/activities', { accessToken: activeToken, instanceUrl: activeInstanceUrl }).catch((err) => ({ success: false, error: err })),
    ]);

    const statsData = parseSfResponseData(dashRes) || {
      avgTeamUtilization: 0,
      totalTeamHours: 0,
      totalBilledHours: 0,
      totalNonBilledHours: 0,
      topProjects: [],
    };

    const subordinatesData = parseSfResponseData(subsRes) || [];
    const activitiesData = parseSfResponseData(actsRes) || [];

    return NextResponse.json({
      success: true,
      message: 'Manager dashboard retrieved successfully',
      data: {
        stats: statsData,
        subordinates: Array.isArray(subordinatesData) ? subordinatesData : [],
        activities: Array.isArray(activitiesData) ? activitiesData : [],
      },
    });
  } catch (error) {
    /* eslint-disable no-console */
    console.error('[API Debug] Unhandled error in GET /api/salesforce/manager:', error);
    /* eslint-enable no-console */
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: null,
      },
      { status: 500 },
    );
  }
}
