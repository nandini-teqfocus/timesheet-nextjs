/**
 * Centralized Application Constants
 * Standard ES Module - No .js-meta.xml
 */

export const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: 'utility:home',
    component: 'homeDashboard'
  },
  {
    id: 'timesheets',
    label: 'Timesheets',
    icon: 'utility:clock',
    component: 'timesheetContainer'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'utility:chart',
    component: 'analyticsDashboard'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'utility:user',
    component: 'profileDashboard'
  },
  {
    id: 'manager',
    label: 'Team',
    icon: 'utility:people',
    component: 'timesheetManagerDashboard'
  }
];

export const MANAGER_NAV_ITEMS = [
  {
    id: 'manager',
    label: 'Dashboard',
    icon: 'utility:desktop',
    component: 'managerDashboard'
  },
  {
    id: 'teammembers',
    label: 'Team Members',
    icon: 'utility:groups',
    component: 'teamEmployeeList'
  },
  {
    id: 'teamtimesheets',
    label: 'Team Timesheets',
    icon: 'utility:clock',
    component: 'teamTimesheetViewer'
  },
  {
    id: 'managerreports',
    label: 'Reports',
    icon: 'utility:graph',
    component: 'managerReports'
  }
];

export const APP_CONFIG = {
  BRAND_NAME: 'Employee Timesheet',
  VERSION: '1.0.0',
  DEVELOPER: 'Enterprise IT Services'
};

export const APPROVAL_STATUS = {
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};