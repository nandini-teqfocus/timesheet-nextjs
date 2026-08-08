/**
 * mockData - Centralized Mock Data Service for Timesheet DX Application
 * Standard ES Module housing all offline mock records.
 */

// --- Home Dashboard Mock Data ---
export const getHomeMetrics = () => ([
    { id: '1', title: 'Hours This Week', value: '32.5h', icon: 'standard:timesheet', variant: 'success', trend: '+2.5h', trendUp: true },
    { id: '2', title: 'Billable Hours', value: '28.0h', icon: 'standard:currency', variant: 'brand', trend: '+1.0h', trendUp: true },
    { id: '3', title: 'Active Projects', value: '4', icon: 'standard:opportunity', variant: 'warning', trend: 'Same', trendUp: true },
    { id: '4', title: 'Pending Approvals', value: '1', icon: 'standard:approval', variant: 'error', trend: '-1 resolved', trendUp: false }
]);

export const getWeeklyHomeData = () => ([
    { day: 'Mon', hours: 7.5, billable: 6.0 },
    { day: 'Tue', hours: 8.0, billable: 8.0 },
    { day: 'Wed', hours: 6.5, billable: 5.0 },
    { day: 'Thu', hours: 7.0, billable: 7.0 },
    { day: 'Fri', hours: 3.5, billable: 2.0 },
    { day: 'Sat', hours: 0, billable: 0 },
    { day: 'Sun', hours: 0, billable: 0 }
]);

export const getRecentActivities = () => ([
    { id: '1', type: 'submit', description: 'Timesheet submitted for Week 20', timestamp: '2026-05-20T09:00:00Z' },
    { id: '2', type: 'approved', description: 'Week 19 timesheet approved', timestamp: '2026-05-19T14:30:00Z' },
    { id: '3', type: 'entry', description: 'Added 8h to Project Phoenix', timestamp: '2026-05-19T17:00:00Z' }
]);

// --- Timesheet Container Mock Data ---
export const getCurrentTimesheet = () => ({
    id: 'ts001',
    weekStart: '2026-05-18',
    weekEnd: '2026-05-24',
    status: 'Draft',
    totalHours: 32.5,
    billableHours: 28.0
});

export const getEntriesForDate = (date) => ([
    { id: 'e001', project: { id: 'p1', name: 'Project Phoenix', code: 'PHX' }, hours: 4.0, category: 'Development', description: 'Sprint planning and API integration', isBillable: true, date },
    { id: 'e002', project: { id: 'p2', name: 'Internal', code: 'INT' }, hours: 1.0, category: 'Meeting', description: 'Daily standup and retrospective', isBillable: false, date }
]);

export const getProjects = () => ([
    { id: 'p1', name: 'Project Phoenix', code: 'PHX', client: 'Acme Corp', status: 'Active' },
    { id: 'p2', name: 'Internal', code: 'INT', client: 'Internal', status: 'Active' },
    { id: 'p3', name: 'Digital Transformation', code: 'DT01', client: 'Beta Ltd', status: 'Active' },
    { id: 'p4', name: 'Cloud Migration', code: 'CM22', client: 'Gamma Inc', status: 'Active' }
]);

// --- Skills Registry Mock Data ---
export const getProfile = () => ({
    id: 'u001',
    name: 'Jane Doe',
    title: 'Senior Salesforce Developer',
    department: 'Technology',
    email: 'jane.doe@company.com',
    joinDate: '2023-03-15',
    totalHours: 1248
});

export const getSkills = () => ([
    { id: 's1', name: 'Salesforce LWC', category: 'Technical', proficiencyLevel: 'Expert', yearsExperience: 4, certified: true },
    { id: 's2', name: 'Apex', category: 'Technical', proficiencyLevel: 'Advanced', yearsExperience: 3, certified: true },
    { id: 's3', name: 'SLDS', category: 'Technical', proficiencyLevel: 'Advanced', yearsExperience: 3, certified: false },
    { id: 's4', name: 'Salesforce Flow', category: 'Technical', proficiencyLevel: 'Intermediate', yearsExperience: 2, certified: false },
    { id: 's5', name: 'Project Management', category: 'Soft', proficiencyLevel: 'Intermediate', yearsExperience: 2, certified: false },
    { id: 's6', name: 'Agile/Scrum', category: 'Domain', proficiencyLevel: 'Advanced', yearsExperience: 4, certified: true }
]);

export const getSkillCategories = () => (['Technical', 'Soft', 'Domain']);
export const getProficiencyLevels = () => (['Beginner', 'Intermediate', 'Advanced', 'Expert']);

// --- Analytics Dashboard Mock Data ---
export const getAnalyticsSummary = (period = 'week') => ({
    period,
    utilizationRate: 86,
    totalHours: 156,
    billableHours: 134,
    avgDailyHours: 7.8,
    topProject: 'Project Phoenix'
});

export const getTrendData = () => ([
    { period: 'Week 17', hours: 38.5, billable: 32.0 },
    { period: 'Week 18', hours: 40.0, billable: 36.5 },
    { period: 'Week 19', hours: 35.0, billable: 29.0 },
    { period: 'Week 20', hours: 42.5, billable: 38.0 },
    { period: 'Week 21', hours: 32.5, billable: 28.0 }
]);

export const getProjectDistribution = () => ([
    { name: 'Project Phoenix', hours: 80, percentage: 51, color: '#2196F3' },
    { name: 'Digital Transformation', hours: 40, percentage: 26, color: '#4CAF50' },
    { name: 'Cloud Migration', hours: 24, percentage: 15, color: '#FF9800' },
    { name: 'Internal', hours: 12, percentage: 8, color: '#9C27B0' }
]);