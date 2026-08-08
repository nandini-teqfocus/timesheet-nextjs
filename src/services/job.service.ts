export interface JobPosting {
  id: string;
  name: string;
  title: string;
  department: string;
  employmentType: string;
  experienceLevel: string;
  location: string;
  isRemote: boolean;
  postedDate: string;
  status: string;
  jobDescription: string;
}

export interface JobResponse {
  success: boolean;
  message?: string;
  data: JobPosting[];
}

export class JobService {
  /**
   * Fetch open job postings from Next.js API /api/salesforce/jobs
   */
  static async getOpenJobs(): Promise<JobResponse> {
    const res = await fetch('/api/salesforce/jobs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch job postings: ${res.statusText}`);
    }

    return await res.json();
  }
}
