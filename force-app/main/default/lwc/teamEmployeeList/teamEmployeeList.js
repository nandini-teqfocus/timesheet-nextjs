import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getSubordinateEmployees from '@salesforce/apex/TimesheetManagerController.getSubordinateEmployees';

export default class TeamEmployeeList extends NavigationMixin(LightningElement) {
    @track subordinates = [];
    @track filteredSubordinates = [];
    @track searchKey = '';
    @track isLoading = true;

    // Dynamically computed metrics for KPI strip
    @track totalSubordinates = 0;
    @track totalLoggedHours = '0.0';
    @track avgUtilization = 0;
    @track overtimeCount = 0;

    connectedCallback() {
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

    @wire(getSubordinateEmployees)
    wiredSubordinates(result) {
        if (result.data) {
            let runningHours = 0;
            let runningBillable = 0;
            let over40 = 0;

            this.subordinates = result.data.map(emp => {
                // Generate initials
                const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'EE';
                
                // Color rate class
                let rateClass = 'util-low';
                if (emp.utilizationRate >= 80) {
                    rateClass = 'util-high';
                } else if (emp.utilizationRate >= 50) {
                    rateClass = 'util-med';
                }

                // Add up metrics
                runningHours += emp.totalHours || 0;
                runningBillable += emp.billableHours || 0;
                if (emp.totalHours > 40) {
                    over40++;
                }

                // Progress width color and width configuration
                const barColor = emp.utilizationRate >= 80 ? '#10b981' : emp.utilizationRate >= 50 ? '#f59e0b' : '#ef4444';
                const progressWidthStyle = `width: ${emp.utilizationRate}%; background-color: ${barColor};`;
                
                return {
                    ...emp,
                    initials,
                    rateClass,
                    progressWidthStyle,
                    department: emp.department || 'N/A'
                };
            });

            // Update KPI stats
            this.totalSubordinates = this.subordinates.length;
            this.totalLoggedHours = runningHours.toFixed(1);
            this.avgUtilization = this.totalSubordinates > 0 ? Math.round((runningBillable / (runningHours || 1)) * 100) : 0;
            this.overtimeCount = over40;

            this.filterSubordinates();
            this.isLoading = false;
        } else if (result.error) {
            console.error('Error fetching subordinates', result.error);
            this.isLoading = false;
        }
    }

    handleSearchChange(event) {
        this.searchKey = event.target.value;
        this.filterSubordinates();
    }

    filterSubordinates() {
        if (!this.searchKey) {
            this.filteredSubordinates = [...this.subordinates];
            return;
        }
        const key = this.searchKey.toLowerCase();
        this.filteredSubordinates = this.subordinates.filter(emp => 
            (emp.name && emp.name.toLowerCase().includes(key)) || 
            (emp.title && emp.title.toLowerCase().includes(key)) || 
            (emp.department && emp.department.toLowerCase().includes(key))
        );
    }

    handleSelectEmployee(event) {
        const empId = event.currentTarget.dataset.id;
        const prefix = window.location.pathname.startsWith('/timesheet') ? '/timesheet' : '';
        
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `${prefix}/teamtimesheets?c__employeeId=${empId}`
            }
        });
    }

    get hasEmployees() {
        return this.filteredSubordinates && this.filteredSubordinates.length > 0;
    }
}