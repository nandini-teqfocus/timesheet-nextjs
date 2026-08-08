import { LightningElement, track } from 'lwc';
import getSubordinateEmployees from '@salesforce/apex/TimesheetManagerController.getSubordinateEmployees';
import getManagerDashboardStats from '@salesforce/apex/TimesheetManagerController.getManagerDashboardStats';
import getTeamActivities from '@salesforce/apex/TimesheetManagerController.getTeamActivities';

export default class ManagerDashboard extends LightningElement {
    @track subordinates = [];
    @track stats = {
        totalTeamHours: 0,
        totalBilledHours: 0,
        totalNonBilledHours: 0,
        avgTeamUtilization: 0,
        topProjects: []
    };
    @track activities = [];
    
    // Dynamically loaded Manager Identity properties (No hardcoded placeholders)
    @track managerName = '';
    @track managerTitle = '';
    @track managerDepartment = '';
    @track managerInitials = '';
    @track isLoading = true;

    // Computed KPIs
    totalEmployees = 0;
    missingTimesheetsCount = 0;
    overtimeCount = 0;

    get projectCount() {
        return this.stats.topProjects ? this.stats.topProjects.length : 0;
    }

    connectedCallback() {
        // Force full-width layout by overriding any theme layout wrapper limits
        try {
            const style = document.createElement('style');
            style.textContent = `
                .slds-container_large, 
                .slds-container_x-large, 
                .webruntime-page-container,
                .themeLayout,
                .dx-viewport,
                .siteforceDynamicLayout {
                    max-width: 100% !important;
                    width: 100% !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                }
                .shell-content {
                    max-width: 100% !important;
                    width: 100% !important;
                }
            `;
            document.head.appendChild(style);
        } catch (e) {
            console.warn('Could not inject full-width style overrides', e);
        }
        this.loadDashboardData();
    }

    async loadDashboardData() {
        this.isLoading = true;
        try {
            // 1. Fetch Manager Identity & Metrics Imperatively (Bypasses Wire Cache)
            const statsData = await getManagerDashboardStats();
            if (statsData) {
                this.managerName = statsData.managerName || '';
                this.managerTitle = statsData.managerTitle || '';
                this.managerDepartment = statsData.managerDepartment || '';
                this.managerInitials = statsData.managerInitials || '';
                
                const totalHours = statsData.totalTeamHours || 1;
                let cumulativePercent = 0;
                const formattedProjects = (statsData.topProjects || []).map(p => {
                    const percent = totalHours > 0 ? Math.round((p.hours / totalHours) * 100) : 0;
                    const color = p.color || '#4f46e5';
                    
                    const strokeDashArray = `${(percent / 100) * 251.327} 251.327`;
                    const transform = `rotate(${cumulativePercent * 3.6}, 60, 60)`;
                    cumulativePercent += percent;
                    
                    return {
                        ...p,
                        colorStyle: `background-color: ${color};`,
                        widthStyle: `width: ${percent}%; background-color: ${color};`,
                        badgeStyle: `color: ${color}; background-color: ${color}15; border: 1px solid ${color}30;`,
                        legendCardStyle: `border-top: 3px solid ${color}; background-color: #ffffff;`,
                        textColorStyle: `color: ${color};`,
                        percentage: percent,
                        strokeDashArray,
                        transform
                    };
                });
                
                this.stats = {
                    totalTeamHours: statsData.totalTeamHours || 0,
                    totalBilledHours: statsData.totalBilledHours || 0,
                    totalNonBilledHours: statsData.totalNonBilledHours || 0,
                    avgTeamUtilization: statsData.avgTeamUtilization || 0,
                    topProjects: formattedProjects
                };
            }

            // 2. Fetch Subordinates
            const subData = await getSubordinateEmployees();
            if (subData) {
                this.subordinates = subData;
                this.totalEmployees = this.subordinates.length;
                this.missingTimesheetsCount = this.subordinates.filter(emp => !emp.totalHours || emp.totalHours === 0).length;
                this.overtimeCount = this.subordinates.filter(emp => emp.totalHours > 40).length;
            }

            // 3. Fetch Team Activities
            const actData = await getTeamActivities();
            if (actData) {
                this.activities = actData.slice(0, 4).map(act => {
                    const initials = act.employeeName ? act.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'EE';
                    const relativeTime = this.formatRelativeTime(act.entryDate);
                    return {
                        ...act,
                        initials,
                        relativeTime
                    };
                });
            }
        } catch (error) {
            console.error('Error loading manager dashboard data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const today = new Date();
            const diffTime = Math.abs(today - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 1) return 'Today';
            if (diffDays === 2) return 'Yesterday';
            return `${diffDays} days ago`;
        } catch (e) {
            return dateStr;
        }
    }

    get hasProjects() {
        return this.stats.topProjects && this.stats.topProjects.length > 0;
    }

    get hasActivities() {
        return this.activities && this.activities.length > 0;
    }

    get teamLabel() {
        return this.managerDepartment ? `${this.managerDepartment} Team` : 'My Team';
    }
}