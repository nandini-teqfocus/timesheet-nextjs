export const APP_CONFIG = {
  name: 'Teqfocus Timesheet Portal',
  description: 'Enterprise Timesheet & Employee Referral Management System',
  defaultRoute: '/timesheets',
  loginRoute: '/login',
} as const;

export const NAV_ITEMS = [
  { label: 'Timesheets', route: '/timesheets', icon: 'Clock' },
  { label: 'Manager Dashboard', route: '/manager', icon: 'Users', managerOnly: true },
  { label: 'Job Listings', route: '/jobs', icon: 'Briefcase' },
  { label: 'My Referrals', route: '/referrals', icon: 'UserCheck' },
  { label: 'Profile', route: '/profile', icon: 'User' },
  { label: 'Analytics', route: '/analytics', icon: 'BarChart3' },
] as const;
