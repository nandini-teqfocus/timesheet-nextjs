export interface UserProfile {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  managerName: string;
  timezone: string;
  locale: string;
  joinDate: string;
  tenure: string;
  totalHours: number;
  utilizationRate: number;
  roleType?: string;
}

export interface EmployeeSkill {
  id: string;
  skillId: string;
  name: string;
  category: 'Technical' | 'Soft' | 'Domain' | string;
  proficiencyLevel: 'Expert' | 'Advanced' | 'Intermediate' | 'Beginner' | string;
  yearsExperience: number;
  certified: boolean;
}

export interface CatalogSkill {
  id: string;
  name: string;
  category: string;
}

export interface ProfileResponseData {
  profile: UserProfile;
  skills: EmployeeSkill[];
  catalogSkills?: CatalogSkill[];
}

export interface ProfileApiResponse {
  success: boolean;
  message?: string;
  data?: ProfileResponseData;
}

export class ProfileService {
  /**
   * Fetch complete profile and skills matrix for current user from /api/salesforce/profile
   */
  static async getUserProfile(): Promise<ProfileApiResponse> {
    const res = await fetch('/api/salesforce/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Failed to fetch user profile: ${res.statusText}`);
    }

    return await res.json();
  }
}
