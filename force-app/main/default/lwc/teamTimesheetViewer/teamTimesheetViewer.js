import { LightningElement, track, wire } from 'lwc';
import getSubordinateEmployees from '@salesforce/apex/TimesheetManagerController.getSubordinateEmployees';
import getEmployeeTimesheets from '@salesforce/apex/TimesheetManagerController.getEmployeeTimesheets';
import getManagerTimesheetEntries from '@salesforce/apex/TimesheetManagerController.getManagerTimesheetEntries';

export default class TeamTimesheetViewer extends LightningElement {
    @track employees = [];
    @track employeeOptions = [];
    @track selectedEmployeeId = '';
    @track selectedEmployeeName = '';
    
    @track timesheets = [];
    @track isLoadingTimesheets = false;

    // Subordinate Specific Metrics
    @track empTotalHours = '0.0';
    @track empBillableHours = '0.0';
    @track empAvgUtilization = 0;
    @track empTimesheetCount = 0;

    // Modal State
    @track isModalOpen = false;
    @track currentTimesheet = {};
    @track timesheetEntries = [];
    @track isLoadingEntries = false;

    connectedCallback() {
        this.parseUrlParams();
        const style = document.createElement('style');
        style.innerText = `
            .slds-container_large, .slds-container_x-large {
                max-width: 100% !important;
                width: 100% !important;
            }
            .webruntime-page-container {
                max-width: 100% !important;
                width: 100% !important;
                padding: 0 !important;
            }
            .themeLayout, .dx-viewport, .siteforceDynamicLayout {
                max-width: 100% !important;
                width: 100% !important;
            }
        `;
        document.head.appendChild(style);
    }

    parseUrlParams() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const empId = urlParams.get('c__employeeId');
            if (empId) {
                this.selectedEmployeeId = empId;
            }
        } catch (e) {
            console.error('Error parsing URL params', e);
        }
    }

    @wire(getSubordinateEmployees)
    wiredSubordinates(result) {
        if (result.data) {
            this.employees = result.data;
            this.employeeOptions = result.data.map(emp => {
                return { label: emp.name, value: emp.id };
            });
            
            if (this.selectedEmployeeId) {
                const selectedEmp = this.employees.find(emp => emp.id === this.selectedEmployeeId);
                if (selectedEmp) {
                    this.selectedEmployeeName = selectedEmp.name;
                }
            } else if (result.data.length > 0) {
                // Default to first employee if none selected via URL
                this.selectedEmployeeId = result.data[0].id;
                this.selectedEmployeeName = result.data[0].name;
            }
        }
    }

    @wire(getEmployeeTimesheets, { employeeId: '$selectedEmployeeId' })
    wiredTimesheets(result) {
        this.isLoadingTimesheets = true;
        if (result.data) {
            let total = 0;
            let billable = 0;
            let sumUtilization = 0;

            this.timesheets = result.data.map(ts => {
                const tHrs = ts.totalHours || 0;
                const bHrs = ts.billableHours || 0;
                total += tHrs;
                billable += bHrs;
                sumUtilization += ts.utilization || 0;

                let formattedEndDate = '';
                if (ts.weekEndDate) {
                    formattedEndDate = this.formatDateString(ts.weekEndDate);
                } else if (ts.weekStartDate) {
                    formattedEndDate = this.calculateWeekEndDate(ts.weekStartDate);
                }

                return {
                    Id: ts.id,
                    formattedStartDate: this.formatDateString(ts.weekStartDate),
                    formattedEndDate: formattedEndDate,
                    totalHours: tHrs.toFixed(1),
                    billableHours: bHrs.toFixed(1),
                    utilization: ts.utilization || 0
                };
            });

            // Calculate Subordinate Stats
            this.empTotalHours = total.toFixed(1);
            this.empBillableHours = billable.toFixed(1);
            this.empAvgUtilization = this.timesheets.length > 0 ? Math.round(sumUtilization / this.timesheets.length) : 0;
            this.empTimesheetCount = this.timesheets.length;

            this.isLoadingTimesheets = false;
        } else if (result.error) {
            console.error('Error loading timesheets', result.error);
            this.timesheets = [];
            this.empTotalHours = '0.0';
            this.empBillableHours = '0.0';
            this.empAvgUtilization = 0;
            this.empTimesheetCount = 0;
            this.isLoadingTimesheets = false;
        }
    }

    handleEmployeeChange(event) {
        this.selectedEmployeeId = event.detail.value;
        const selectedEmp = this.employees.find(emp => emp.id === this.selectedEmployeeId);
        if (selectedEmp) {
            this.selectedEmployeeName = selectedEmp.name;
        }
    }

    get selectedEmployeeInitials() {
        if (!this.selectedEmployeeName) return 'EE';
        return this.selectedEmployeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    handleViewEntries(event) {
        const tsId = event.currentTarget.dataset.id;
        const selectedTs = this.timesheets.find(ts => ts.Id === tsId);
        if (selectedTs) {
            this.currentTimesheet = selectedTs;
            this.isLoadingEntries = true;
            this.isModalOpen = true;
            this.timesheetEntries = [];
            
            getManagerTimesheetEntries({ timesheetId: tsId })
                .then(result => {
                    this.timesheetEntries = result.map(e => {
                        return {
                            ...e,
                            projectName: e.projectName || 'Other',
                            projectCode: e.projectCode || 'N/A',
                            formattedDate: this.formatDateString(e.dateStr),
                            billableLabel: e.isBillable ? 'Yes' : 'No',
                            billableClass: e.isBillable ? 'billable-badge_yes' : 'billable-badge_no',
                            hours: e.hours || 0,
                            category: e.category || 'N/A',
                            description: e.description || ''
                        };
                    });
                    this.isLoadingEntries = false;
                })
                .catch(err => {
                    console.error('Error fetching entries', err);
                    this.isLoadingEntries = false;
                });
        }
    }

    handleCloseModal() {
        this.isModalOpen = false;
    }

    get hasTimesheets() {
        return this.timesheets && this.timesheets.length > 0;
    }

    get hasEntries() {
        return this.timesheetEntries && this.timesheetEntries.length > 0;
    }

    formatDateString(dateStr) {
        if (!dateStr) return '';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const dateObj = new Date(year, month, day);
                return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
            return dateStr;
        } catch (e) {
            console.error('Error formatting date', e);
            return dateStr;
        }
    }

    calculateWeekEndDate(startDateStr) {
        if (!startDateStr) return '';
        try {
            const parts = startDateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const dateObj = new Date(year, month, day);
                dateObj.setDate(dateObj.getDate() + 6);
                return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
            return startDateStr;
        } catch (e) {
            console.error('Error calculating week end date', e);
            return startDateStr;
        }
    }
}