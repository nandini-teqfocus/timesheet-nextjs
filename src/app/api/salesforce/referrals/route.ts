import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callSalesforceRestApi } from '@/lib/salesforce-client';
import { EmployeeReferral } from '@/services/referral.service';
import { SalesforceQueryResult } from '@/types/common.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ReferralSfRecord {
  Id: string;
  Name?: string;
  Job_Posting__c?: string;
  Job_Posting__r?: {
    Title__c?: string;
    Department__r?: {
      Name?: string;
      Department_Name__c?: string;
    };
  };
  Candidate__c?: string;
  Candidate__r?: {
    Name?: string;
    First_Name__c?: string;
    Last_Name__c?: string;
    Email__c?: string;
    Phone__c?: string;
  };
  Referred_By__c?: string;
  Referred_By__r?: {
    Name?: string;
    Username?: string;
  };
  Status__c?: string;
  Rejection_Reason__c?: string;
  Notes__c?: string;
  Submission_Date__c?: string;
  CreatedDate?: string;
  Bonus_Eligible__c?: boolean;
  Bonus_Paid__c?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      /* eslint-disable no-console */
      console.log('[API Debug] getServerSession exception in /api/salesforce/referrals:', sessionErr);
      /* eslint-enable no-console */
    }

    const activeToken = session?.accessToken;
    const activeInstanceUrl = session?.instanceUrl;

    const integrationUser = process.env.SALESFORCE_INTEGRATION_USER || 'nandini.singh.c2d90108260b@agentforce.com';

    const soql = `SELECT Id, Name, Job_Posting__c, Job_Posting__r.Title__c, Job_Posting__r.Department__r.Name, Job_Posting__r.Department__r.Department_Name__c, Candidate__c, Candidate__r.Name, Candidate__r.First_Name__c, Candidate__r.Last_Name__c, Candidate__r.Email__c, Candidate__r.Phone__c, Referred_By__c, Referred_By__r.Name, Referred_By__r.Username, Status__c, Rejection_Reason__c, Notes__c, Submission_Date__c, Bonus_Eligible__c, Bonus_Paid__c FROM Employee_Referral__c WHERE Referred_By__r.Username = '${integrationUser}' OR Referred_By__c = '005NS00000ykBKTYA2' ORDER BY Submission_Date__c DESC NULLS LAST, CreatedDate DESC`;

    /* eslint-disable no-console */
    console.log('[API Debug] GET /api/salesforce/referrals requested');
    /* eslint-enable no-console */

    const sfRes = await callSalesforceRestApi<SalesforceQueryResult<ReferralSfRecord>>(
      `/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
      { accessToken: activeToken, instanceUrl: activeInstanceUrl },
    );

    if (!sfRes.success || !sfRes.data) {
      /* eslint-disable no-console */
      console.error('[API Debug] Salesforce SOQL Query failed:', sfRes.message);
      /* eslint-enable no-console */
      return NextResponse.json(
        {
          success: false,
          message: sfRes.message || 'Failed to fetch referrals from Salesforce',
          data: [],
        },
        { status: 500 },
      );
    }

    const records = sfRes.data.records || [];

    const referrals: EmployeeReferral[] = records.map((rec) => ({
      id: rec.Id,
      name: rec.Name || '',
      jobPostingId: rec.Job_Posting__c || '',
      jobTitle: rec.Job_Posting__r?.Title__c || 'General Role',
      department: rec.Job_Posting__r?.Department__r?.Department_Name__c || rec.Job_Posting__r?.Department__r?.Name || 'General',
      candidateId: rec.Candidate__c || '',
      candidateName: rec.Candidate__r?.Name || `${rec.Candidate__r?.First_Name__c || ''} ${rec.Candidate__r?.Last_Name__c || ''}`.trim() || 'Candidate',
      candidateEmail: rec.Candidate__r?.Email__c || 'N/A',
      candidatePhone: rec.Candidate__r?.Phone__c || undefined,
      status: rec.Status__c || 'Submitted',
      submissionDate: rec.Submission_Date__c || rec.CreatedDate || '',
      bonusEligible: Boolean(rec.Bonus_Eligible__c),
      bonusPaid: Boolean(rec.Bonus_Paid__c),
      rejectionReason: rec.Rejection_Reason__c || undefined,
      notes: rec.Notes__c || undefined,
    }));

    return NextResponse.json({
      success: true,
      message: `${referrals.length} candidate referrals retrieved successfully`,
      data: referrals,
    });
  } catch (error) {
    /* eslint-disable no-console */
    console.error('[API Debug] Unhandled error in GET /api/salesforce/referrals:', error);
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
