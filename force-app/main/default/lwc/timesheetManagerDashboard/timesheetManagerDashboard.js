import { LightningElement, track, wire } from 'lwc';
import getSubordinateEmployees from '@salesforce/apex/TimesheetManagerController.getSubordinateEmployees';
import getManagerDashboardStats from '@salesforce/apex/TimesheetManagerController.getManagerDashboardStats';
import getEmployeeTimesheets from '@salesforce/apex/TimesheetManagerController.getEmployeeTimesheets';
import getManagerTimesheetEntries from '@salesforce/apex/TimesheetManagerController.getManagerTimesheetEntries';

export default class TimesheetManagerDashboard extends LightningElement {
    // Search and filters
    @track searchKey = '';

    // Data lists from Apex
    @track subordinates = [];
    @track dashboardStats = {};
    @track employeeTimesheets = [];
    @track timesheetEntries = [];

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
    }

    // Selected state tracking
    @track selectedEmployeeId = null;
    @track selectedEmployee = null;
    @track selectedTimesheetId = null;
    @track selectedTimesheetName = '';

    // Loading states
    @track loadingSubordinates = true;
    @track loadingTimesheets = false;
    @track loadingEntries = false;
    @track isModalOpen = false;

    // Toast notifications
    @track toastTitle = '';
    @track toastMessage = '';
    @track toastVariant = 'info';

    // Track dynamic individual project breakdown
    @track employeeProjectBreakdown = [];

    // Colors mapping for SVG bars
    projectColors = ['#0b5ed7', '#00c9a7', '#f59e0b', '#7c3aed', '#ec4899', '#06b6d4', '#64748b'];

    // Wire subordinate employees list
    @wire(getSubordinateEmployees)
    wiredSubordinates({ error, data }) {
        this.loadingSubordinates = true;
        if (data) {
            this.subordinates = data.map(emp => {
                const initials = this.getInitials(emp.name);
                const avatarStyle = this.getAvatarColorStyle(emp.id);
                return {
                    ...emp,
                    initials,
                    avatarStyle,
                    cardClass: 'subordinate-card slds-grid slds-grid_vertical-align-center slds-p-around_small slds-m-bottom_small'
                };
            });
            this.loadingSubordinates = false;
        } else if (error) {
            this.showToast('Error loading subordinates', error.body?.message || 'Unknown error', 'error');
            this.loadingSubordinates = false;
        }
    }

    // Wire manager metrics stats
    @wire(getManagerDashboardStats)
    wiredStats({ error, data }) {
        if (data) {
            this.dashboardStats = data;
        } else if (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    // Getters for Dashboard KPIs
    get teamAvgUtilizationStr() {
        return this.dashboardStats.avgTeamUtilization !== undefined 
            ? `${this.dashboardStats.avgTeamUtilization}%` 
            : '0%';
    }

    get teamTotalHoursStr() {
        return this.dashboardStats.totalTeamHours !== undefined 
            ? `${this.dashboardStats.totalTeamHours}h` 
            : '0h';
    }

    get teamSizeStr() {
        return this.subordinates ? `${this.subordinates.length}` : '0';
    }

    get teamBilledHoursStr() {
        return this.dashboardStats.totalBilledHours !== undefined 
            ? `${this.dashboardStats.totalBilledHours}h` 
            : '0h';
    }

    // Filtered subordinates list
    get filteredSubordinates() {
        const key = this.searchKey.toLowerCase().trim();
        return this.subordinates.map(emp => {
            // Update active styling dynamically
            const isActive = emp.id === this.selectedEmployeeId;
            return {
                ...emp,
                cardClass: `subordinate-card slds-grid slds-grid_vertical-align-center slds-p-around_small slds-m-bottom_small${isActive ? ' active-card' : ''}`
            };
        }).filter(emp => {
            if (!key) return true;
            return (
                emp.name.toLowerCase().includes(key) ||
                (emp.title && emp.title.toLowerCase().includes(key)) ||
                (emp.email && emp.email.toLowerCase().includes(key))
            );
        });
    }

    get hasFilteredSubordinates() {
        return this.filteredSubordinates.length > 0;
    }

    get hasTimesheets() {
        return this.employeeTimesheets.length > 0;
    }

    get hasEntries() {
        return this.timesheetEntries.length > 0;
    }

    get hasProjectBreakdown() {
        return this.employeeProjectBreakdown && this.employeeProjectBreakdown.length > 0;
    }

    get modalTitle() {
        return this.selectedTimesheetName ? `Entries for ${this.selectedTimesheetName}` : 'Timesheet Entries';
    }

    // Search Box Change handler
    handleSearchChange(event) {
        this.searchKey = event.target.value;
    }

    // Select employee from list handler
    handleSelectEmployee(event) {
        const empId = event.currentTarget.dataset.id;
        if (!empId) return;

        this.selectedEmployeeId = empId;
        this.selectedEmployee = this.subordinates.find(emp => emp.id === empId);
        
        // Reset child state
        this.employeeTimesheets = [];
        this.employeeProjectBreakdown = [];
        
        this.loadTimesheetsForEmployee(empId);
    }

    // Load weekly timesheets for selected subordinate
    loadTimesheetsForEmployee(empId) {
        this.loadingTimesheets = true;
        getEmployeeTimesheets({ employeeId: empId })
            .then(data => {
                this.employeeTimesheets = data.map(ts => {
                    const startStr = this.formatDate(ts.Week_Start_Date__c);
                    const endStr = this.formatDate(ts.Week_End_Date__c);
                    
                    let statusClass = 'status-badge status-badge_neutral';
                    if (ts.Status__c === 'Approved') statusClass = 'status-badge status-badge_success';
                    else if (ts.Status__c === 'Pending Approval') statusClass = 'status-badge status-badge_warning';
                    else if (ts.Status__c === 'Rejected') statusClass = 'status-badge status-badge_error';

                    return {
                        ...ts,
                        formattedPeriod: `${startStr} – ${endStr}`,
                        statusClass
                    };
                });
                
                // If there are timesheets, load the latest one to construct the focus project breakdown chart
                if (this.employeeTimesheets.length > 0) {
                    this.loadLatestTimesheetEntries(this.employeeTimesheets[0].Id);
                } else {
                    this.loadingTimesheets = false;
                }
            })
            .catch(error => {
                this.showToast('Error', error.body?.message || 'Could not load employee timesheets', 'error');
                this.loadingTimesheets = false;
            });
    }

    // Load entries for the latest timesheet to build individual breakdown
    loadLatestTimesheetEntries(timesheetId) {
        getManagerTimesheetEntries({ timesheetId })
            .then(data => {
                this.calculateProjectBreakdown(data);
                this.loadingTimesheets = false;
            })
            .catch(error => {
                console.error('Error loading latest timesheet entries for breakdown:', error);
                this.loadingTimesheets = false;
            });
    }

    // Calculate dynamic project breakdown based on entries
    calculateProjectBreakdown(entries) {
        if (!entries || entries.length === 0) {
            this.employeeProjectBreakdown = [];
            return;
        }

        const projectMap = {};
        let totalHours = 0;

        entries.forEach(e => {
            const name = e.projectName || 'Other';
            const code = e.projectCode || '';
            const hours = parseFloat(e.hours || 0);

            if (!projectMap[name]) {
                projectMap[name] = { name, code, hours: 0 };
            }
            projectMap[name].hours += hours;
            totalHours += hours;
        });

        const breakdown = [];
        let colorIdx = 0;

        for (const key in projectMap) {
            if (Object.prototype.hasOwnProperty.call(projectMap, key)) {
                const hoursVal = projectMap[key].hours;
                const pct = totalHours > 0 ? Math.round((hoursVal / totalHours) * 100) : 0;
                const color = this.projectColors[colorIdx % this.projectColors.length];
                
                breakdown.push({
                    name: key,
                    code: projectMap[key].code,
                    hours: hoursVal.toFixed(1),
                    percentage: pct,
                    dotStyle: `background-color: ${color};`,
                    fillStyle: `background: ${color}; width: ${pct}%;`,
                    color
                });
                colorIdx++;
            }
        }

        // Sort by hours descending
        breakdown.sort((a, b) => parseFloat(b.hours) - parseFloat(a.hours));
        this.employeeProjectBreakdown = breakdown;
    }

    get topFocusProject() {
        if (this.employeeProjectBreakdown && this.employeeProjectBreakdown.length > 0) {
            return this.employeeProjectBreakdown[0].name;
        }
        return 'No logged hours';
    }

    // View timesheet entries inside modal handler
    handleViewTimesheetEntries(event) {
        const timesheetId = event.currentTarget.dataset.id;
        const name = event.currentTarget.dataset.name;
        if (!timesheetId) return;

        this.selectedTimesheetId = timesheetId;
        this.selectedTimesheetName = name;
        this.loadingEntries = true;
        this.isModalOpen = true;

        getManagerTimesheetEntries({ timesheetId })
            .then(data => {
                this.timesheetEntries = data.map(entry => {
                    let billableClass = 'billable-badge billable-badge_no';
                    if (entry.isBillable) billableClass = 'billable-badge billable-badge_yes';

                    // Format dates
                    let formattedDate = entry.entryDate;
                    try {
                        const d = new Date(entry.entryDate);
                        if (!isNaN(d.getTime())) {
                            formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        }
                    } catch (e) { /* fallback */ }

                    return {
                        ...entry,
                        entryDate: formattedDate,
                        billableClass,
                        billableLabel: entry.isBillable ? 'Billable' : 'Internal'
                    };
                });
                this.loadingEntries = false;
            })
            .catch(error => {
                this.showToast('Error', error.body?.message || 'Could not load entries', 'error');
                this.loadingEntries = false;
                this.isModalOpen = false;
            });
    }

    handleCloseModal() {
        this.isModalOpen = false;
        this.timesheetEntries = [];
    }

    // Helper functions
    getInitials(name) {
        if (!name) return '';
        const parts = name.split(' ');
        if (parts.length > 1 && parts[1]) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    }

    getAvatarColorStyle(id) {
        const gradients = [
            'background: linear-gradient(135deg, #3b82f6, #0b5ed7); color: white;',
            'background: linear-gradient(135deg, #10b981, #059669); color: white;',
            'background: linear-gradient(135deg, #f59e0b, #d97706); color: white;',
            'background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white;',
            'background: linear-gradient(135deg, #ec4899, #db2777); color: white;',
            'background: linear-gradient(135deg, #06b6d4, #0891b2); color: white;'
        ];
        let hash = 0;
        if (id) {
            for (let i = 0; i < id.length; i++) {
                hash = id.charCodeAt(i) + ((hash << 5) - hash);
            }
        }
        const idx = Math.abs(hash) % gradients.length;
        return gradients[idx];
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    showToast(title, message, variant) {
        this.toastTitle = title;
        this.toastMessage = message;
        this.toastVariant = variant;
        const toast = this.template.querySelector('c-toast-message');
        if (toast) {
            toast.showToast();
        }
    }
}