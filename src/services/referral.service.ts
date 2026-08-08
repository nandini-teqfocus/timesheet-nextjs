export interface EmployeeReferral {
  id: string;
  name: string;
  jobPostingId: string;
  jobTitle: string;
  department: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  status: 'Submitted' | 'Under Review' | 'Interview Scheduled' | 'Selected' | 'Hired' | 'Rejected' | string;
  submissionDate: string;
  bonusEligible: boolean;
  bonusPaid: boolean;
  rejectionReason?: string;
  notes?: string;
}

export interface ReferralResponse {
  success: boolean;
  message?: string;
  data: EmployeeReferral[];
}

export class ReferralService {
  /**
   * Fetch my candidate referrals from Next.js API /api/salesforce/referrals
   */
  static async getMyReferrals(): Promise<ReferralResponse> {
    const res = await fetch('/api/salesforce/referrals', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch referrals: ${res.statusText}`);
    }

    return await res.json();
  }
}
