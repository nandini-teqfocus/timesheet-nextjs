import { LightningElement, track, wire } from 'lwc';
import getSubordinateEmployees from '@salesforce/apex/TimesheetManagerController.getSubordinateEmployees';
import getManagerDashboardStats from '@salesforce/apex/TimesheetManagerController.getManagerDashboardStats';

export default class ManagerReports extends LightningElement {
    @track subordinates = [];
    @track stats = {
        totalTeamHours: '0.0',
        totalBilledHours: '0.0',
        totalNonBilledHours: '0.0',
        avgTeamUtilization: 0
    };
    @track isLoading = true;

    connectedCallback() {
        // Force full width layout in Experience Cloud LWR template
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
            this.subordinates = result.data.map(emp => {
                const name = emp.name || emp.Name || 'Employee';
                let rateClass = 'util-low';
                let badgeClass = 'util-badge badge-low';
                if (emp.utilizationRate >= 80) {
                    rateClass = 'util-high';
                    badgeClass = 'util-badge badge-high';
                } else if (emp.utilizationRate >= 50) {
                    rateClass = 'util-med';
                    badgeClass = 'util-badge badge-med';
                }
                
                // Get initials
                let initials = 'EE';
                if (name) {
                    const parts = name.split(' ');
                    if (parts.length >= 2) {
                        initials = parts[0][0] + parts[parts.length - 1][0];
                    } else {
                        initials = name.substring(0, 2);
                    }
                }
                initials = initials.toUpperCase();

                const totalHours = emp.totalHours || 0;
                const billableHours = emp.billableHours || 0;
                const utilizationRate = emp.utilizationRate || 0;

                // Color rate bar
                const barColor = utilizationRate >= 80 ? '#10b981' : utilizationRate >= 50 ? '#f59e0b' : '#ef4444';
                const progressWidthStyle = `width: ${utilizationRate}%; background-color: ${barColor};`;

                return {
                    ...emp,
                    Name: name,
                    name: name,
                    rateClass,
                    badgeClass,
                    initials,
                    progressWidthStyle,
                    totalHours: totalHours.toFixed(1),
                    billableHours: billableHours.toFixed(1),
                    utilizationRate: utilizationRate,
                    title: emp.title || 'Staff Associate',
                    department: emp.department || 'N/A'
                };
            });
            this.checkLoadingState();
        } else if (result.error) {
            console.error('Error fetching subordinates', result.error);
            this.checkLoadingState();
        }
    }

    @wire(getManagerDashboardStats)
    wiredStats(result) {
        if (result.data) {
            this.stats = {
                totalTeamHours: (result.data.totalTeamHours || 0).toFixed(1),
                totalBilledHours: (result.data.totalBilledHours || 0).toFixed(1),
                totalNonBilledHours: (result.data.totalNonBilledHours || 0).toFixed(1),
                avgTeamUtilization: result.data.avgTeamUtilization || 0
            };
            this.checkLoadingState();
        } else if (result.error) {
            console.error('Error fetching stats', result.error);
            this.checkLoadingState();
        }
    }

    checkLoadingState() {
        this.isLoading = false;
    }

    // Dynamic Donut SVG stroke-dashoffset
    get utilizationStrokeDashOffset() {
        const util = this.stats.avgTeamUtilization || 0;
        const circ = 440; // 2 * pi * r (r=70)
        return circ - (circ * util) / 100;
    }

    // Dynamic Billed Hours Ratio Donut SVG stroke-dashoffset
    get billedStrokeDashOffset() {
        const total = parseFloat(this.stats.totalTeamHours) || 0;
        const billed = parseFloat(this.stats.totalBilledHours) || 0;
        const ratio = total > 0 ? (billed / total) : 0;
        const circ = 440; // 2 * pi * r (r=70)
        return circ - (circ * ratio);
    }

    handleExportCSV(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!this.subordinates || this.subordinates.length === 0) return;
        
        const csvHeaders = ['Employee Name', 'Title', 'Department', 'Total Hours', 'Billable Hours', 'Utilization Rate (%)'];
        const csvRows = this.subordinates.map(emp => [
            `"${emp.name || emp.Name}"`,
            `"${emp.title || ''}"`,
            `"${emp.department || ''}"`,
            emp.totalHours || 0,
            emp.billableHours || 0,
            `${emp.utilizationRate || 0}%`
        ]);
        
        const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        
        let url;
        let isBlobUrl = false;
        
        try {
            // Use LWS permitted MIME type 'application/octet-stream' to create a Blob URL
            const blob = new Blob([csvContent], { type: 'application/octet-stream' });
            url = URL.createObjectURL(blob);
            isBlobUrl = true;
        } catch (blobError) {
            console.warn('[ManagerReports] Blob creation or Object URL blocked under LWS. Falling back to Data URI:', blobError);
            // Fallback: Base64-encoded Data URI (bypasses URL.createObjectURL completely)
            const base64Content = window.btoa(unescape(encodeURIComponent(csvContent)));
            url = `data:text/csv;charset=utf-8;base64,${base64Content}`;
        }
        
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Team_Utilization_Report_${new Date().toISOString().substring(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        
        // Prevent Experience Cloud routing from intercepting the link click
        link.addEventListener('click', (e) => {
            e.stopPropagation();
        }, { once: true });
        
        // Create an un-attached Document Fragment as a temporary container.
        // This isolates the click event propagation, ensuring it never bubbles/captures
        // to the document or window where the Experience Cloud LWR Router is listening.
        const fragment = document.createDocumentFragment();
        fragment.appendChild(link);
        link.click();
        fragment.removeChild(link);
        
        if (isBlobUrl && url) {
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
        }
    }

    get hasData() {
        return this.subordinates && this.subordinates.length > 0;
    }
}