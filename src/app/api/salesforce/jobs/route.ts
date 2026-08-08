import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callSalesforceRestApi } from '@/lib/salesforce-client';
import { JobPosting } from '@/services/job.service';
import { SalesforceQueryResult } from '@/types/common.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface JobPostingSfRecord {
  Id: string;
  Name?: string;
  Title__c?: string;
  Department__r?: {
    Name?: string;
    Department_Name__c?: string;
  };
  Employment_Type__c?: string;
  Experience_Level__c?: string;
  Location__c?: string;
  Is_Remote__c?: boolean;
  Posted_Date__c?: string;
  Status__c?: string;
  Job_Description__c?: string;
}

export async function GET(request: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      /* eslint-disable no-console */
      console.log('[API Debug] getServerSession exception in /api/salesforce/jobs:', sessionErr);
      /* eslint-enable no-console */
    }

    const activeToken = session?.accessToken;
    const activeInstanceUrl = session?.instanceUrl;

    const soql = `SELECT Id, Name, Title__c, Department__c, Department__r.Name, Department__r.Department_Name__c, Employment_Type__c, Experience_Level__c, Location__c, Is_Remote__c, Posted_Date__c, Status__c, Job_Description__c FROM Job_Posting__c WHERE Status__c = 'Open' ORDER BY Posted_Date__c DESC NULLS LAST`;

    /* eslint-disable no-console */
    console.log('[API Debug] GET /api/salesforce/jobs requested');
    /* eslint-enable no-console */

    const sfRes = await callSalesforceRestApi<SalesforceQueryResult<JobPostingSfRecord>>(
      `/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
      { accessToken: activeToken, instanceUrl: activeInstanceUrl },
    );

    if (!sfRes.success || !sfRes.data) {
      return NextResponse.json(
        {
          success: false,
          message: sfRes.message || 'Failed to fetch job postings from Salesforce',
          data: [],
        },
        { status: 500 },
      );
    }

    const records = sfRes.data.records || [];

    const jobs: JobPosting[] = records.map((rec) => ({
      id: rec.Id,
      name: rec.Name || '',
      title: rec.Title__c || rec.Name || 'Untitled Position',
      department: rec.Department__r?.Department_Name__c || rec.Department__r?.Name || 'Engineering',
      employmentType: rec.Employment_Type__c || 'Full-Time',
      experienceLevel: rec.Experience_Level__c || 'Mid-Level',
      location: rec.Location__c || (rec.Is_Remote__c ? 'Remote' : 'On-site'),
      isRemote: Boolean(rec.Is_Remote__c || (rec.Location__c && rec.Location__c.toLowerCase().includes('remote'))),
      postedDate: rec.Posted_Date__c || '',
      status: rec.Status__c || 'Open',
      jobDescription: rec.Job_Description__c || 'We are looking for a talented professional to join our team and contribute to exciting projects.',
    }));

    return NextResponse.json({
      success: true,
      message: `${jobs.length} job postings retrieved successfully`,
      data: jobs,
    });
  } catch (error) {
    /* eslint-disable no-console */
    console.error('[API Debug] Unhandled error in GET /api/salesforce/jobs:', error);
    /* eslint-enable no-console */
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
        data: [],
      },
      { status: 500 },
    );
  }
}
