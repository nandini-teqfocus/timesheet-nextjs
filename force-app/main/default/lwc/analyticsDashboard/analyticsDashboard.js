import { LightningElement, track, wire } from 'lwc';
import getDashboardData from '@salesforce/apex/DashboardController.getDashboardData';
import generateExportCSV from '@salesforce/apex/AnalyticsController.generateExportCSV';

export default class AnalyticsDashboard extends LightningElement {
    @track isLoading = true;
    @track isExporting = false;
    @track currentWeekStart = '';
    
    @track analytics = { utilizationRate: 0, totalHours: 0, billableHours: 0, avgDailyHours: 0, topProject: 'None', monthOverMonthChange: 0 };
    @track monthlyData = [];
    @track projectDistribution = [];
    @track trendData = [];

    // Toast notification properties
    @track toastTitle = '';
    @track toastMessage = '';
    @track toastVariant = 'success';

    // Columns structure for Monthly Utilization summary
    monthlyColumns = [
        { label: 'Month', fieldName: 'month', type: 'text' },
        { label: 'Billed Hours', fieldName: 'billed', type: 'number' },
        { label: 'Non-Billed Hours', fieldName: 'nonBilled', type: 'number' },
        { label: 'Avg Utilization', fieldName: 'utilization', type: 'badge' }
    ];

    get mondayDateStr() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    get currentMonthYear() {
        const today = new Date();
        return today.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    connectedCallback() {
        this.currentWeekStart = this.mondayDateStr;
        console.log('[AnalyticsDashboard] connectedCallback active. currentWeekStart:', this.currentWeekStart);
    }

    // Consolidated Cacheable Wire Architecture
    @wire(getDashboardData, { weekStart: '$currentWeekStart' })
    wiredDashboard({ error, data }) {
        if (data) {
            console.log('[AnalyticsDashboard] Live real analytics metrics processed from single DTO wire.');
            
            // Map KPI stats
            if (data.kpis) {
                this.analytics = {
                    utilizationRate: data.kpis.utilizationRate || 0,
                    totalHours: data.kpis.totalHours || 0,
                    billableHours: data.kpis.billableHours || 0,
                    avgDailyHours: data.kpis.avgDailyHours || 0,
                    topProject: data.kpis.topProject || 'None',
                    monthOverMonthChange: data.kpis.monthOverMonthChange || 0
                };
            }

            // Map project distribution with cumulative percentages for standard SVG donut slices
            let cumulativePercent = 0;
            this.projectDistribution = (data.projectDistribution || []).map(p => {
                const pct = p.percentage || 0;
                const circumference = 251.32; // 2 * PI * r (r=40)
                const strokeDasharray = `${(circumference * pct / 100).toFixed(2)} ${circumference}`;
                const strokeDashoffset = `-${(circumference * cumulativePercent / 100).toFixed(2)}`;
                cumulativePercent += pct;

                return {
                    name: p.name || 'Other',
                    hours: p.hours || 0,
                    percentage: pct,
                    color: p.color || '#0b5ed7',
                    fillStyle: `width: ${pct}%; background: linear-gradient(90deg, ${p.color || '#0b5ed7'}dd, ${p.color || '#0b5ed7'}); height: 100%; border-radius: 4px;`,
                    dotStyle: `background: ${p.color || '#0b5ed7'}; border-radius: 50%; display: inline-block; height: 10px; width: 10px; margin-right: 8px;`,
                    dasharray: strokeDasharray,
                    dashoffset: strokeDashoffset,
                    segmentStyle: `width: ${pct}%; background: ${p.color || '#0b5ed7'}; height: 100%; transition: all 0.3s ease;`,
                    tooltip: `${p.name}: ${p.hours}h (${pct}%)`
                };
            });

            // Map monthly data with visual indicators for executive table redesign
            this.monthlyData = (data.monthlyUtilization || []).map(m => {
                const utilStr = m.utilization || '0%';
                const utilVal = parseFloat(utilStr.replace('%', ''));
                
                let badgeClass = 'util-badge util-badge_low';
                let progressClass = 'util-progress-fill util-progress-fill_low';
                
                if (utilVal >= 80) {
                    badgeClass = 'util-badge util-badge_high';
                    progressClass = 'util-progress-fill util-progress-fill_high';
                } else if (utilVal >= 60) {
                    badgeClass = 'util-badge util-badge_med';
                    progressClass = 'util-progress-fill util-progress-fill_med';
                }
                
                const billedHrs = parseFloat(m.billed || 0);
                const nonBilledHrs = parseFloat(m.nonBilled || 0);
                const total = billedHrs + nonBilledHrs;
                const billedPctVal = total > 0 ? Math.round((billedHrs / total) * 100) : 0;
                
                return {
                    id: m.id,
                    month: m.month || '',
                    billed: billedHrs,
                    nonBilled: nonBilledHrs,
                    utilization: utilStr,
                    progressStyle: `width: ${utilVal}%`,
                    billedPct: `${billedPctVal}%`,
                    badgeClass: badgeClass,
                    progressClass: progressClass
                };
            });

            // Map trend
            this.trendData = data.trendData || [];

            this.isLoading = false;
        } else if (error) {
            console.error('[AnalyticsDashboard] Error loading analytics report wire DTO:', error);
            this.isLoading = false;
        }
    }

    get utilizationPercentageStr() {
        return this.analytics && this.analytics.utilizationRate !== undefined ? `${this.analytics.utilizationRate.toFixed(0)}%` : '0%';
    }

    get nonBillableHours() {
        if (!this.analytics || this.analytics.totalHours === undefined) return 0.0;
        return parseFloat(this.analytics.totalHours - this.analytics.billableHours).toFixed(1);
    }

    get productivityHealth() {
        const rate = this.analytics.utilizationRate || 0;
        if (rate >= 80) return 'Excellent';
        if (rate >= 60) return 'Optimal';
        if (rate >= 40) return 'Stable';
        return 'Developing';
    }

    get burnoutRisk() {
        const total = this.analytics.totalHours || 0;
        if (total > 180) return 'High';
        if (total > 160) return 'Moderate';
        return 'Low';
    }

    get aiScore() {
        const rate = this.analytics.utilizationRate || 0;
        return Math.min(100, Math.round(80 + (rate * 0.2)));
    }

    get billedHoursPercentage() {
        const total = this.analytics.totalHours || 0;
        const billed = this.analytics.billableHours || 0;
        if (total === 0) return '0%';
        return ((billed / total) * 100).toFixed(0) + '%';
    }

    get nonBilledHoursPercentage() {
        const total = this.analytics.totalHours || 0;
        const nonBilled = this.nonBillableHours || 0;
        if (total === 0) return '0%';
        return ((nonBilled / total) * 100).toFixed(0) + '%';
    }

    get utilizationTrendText() {
        return this.utilizationPercentageStr + ' Active';
    }

    get momChangeText() {
        if (!this.analytics || this.analytics.monthOverMonthChange === undefined) return '0.0%';
        const val = this.analytics.monthOverMonthChange;
        return (val >= 0 ? '+' : '') + val.toFixed(1) + '%';
    }

    get momChangeClass() {
        if (!this.analytics || this.analytics.monthOverMonthChange === undefined) return 'trend-neutral';
        return this.analytics.monthOverMonthChange >= 0 ? 'trend-up' : 'trend-down';
    }

    get aiInsights() {
        const rate = this.analytics.utilizationRate || 0;
        const total = this.analytics.totalHours || 0;
        const topProj = this.analytics.topProject || 'None';
        
        const insight1 = {
            class: rate >= 70 ? 'ai-insight-item ai-insight_positive' : 'ai-insight-item ai-insight_neutral',
            icon: rate >= 70 ? 'utility:trending_up' : 'utility:info',
            iconClass: rate >= 70 ? 'ai-item-icon_positive' : 'ai-item-icon_neutral',
            text: `Dynamic billing ratio is ${rate}% — indicating ${rate >= 70 ? 'excellent resource efficiency' : 'opportunities to optimize billing'}.`
        };

        const insight2 = {
            class: 'ai-insight-item ai-insight_warning',
            icon: 'utility:info',
            iconClass: 'ai-item-icon_warning',
            text: `Top project "${topProj}" accounts for the majority of logged activities this period.`
        };

        const insight3 = {
            class: 'ai-insight-item ai-insight_neutral',
            icon: 'utility:check',
            iconClass: 'ai-item-icon_neutral',
            text: `Total logged effort is ${total}h across all active timesheet records.`
        };

        return [insight1, insight2, insight3];
    }

    // Modern Tableau coordinates calculations
    get trendCoordinates() {
        if (!this.trendData || this.trendData.length === 0) return [];
        const startX = 40;
        const endX = 420;
        const startY = 20;
        const endY = 140;
        
        return this.trendData.map((d, index) => {
            const x = startX + (index / Math.max(1, this.trendData.length - 1)) * (endX - startX);
            const util = d.hours > 0 ? (d.billable / d.hours) * 100 : 0.0;
            const y = endY - (util / 100) * (endY - startY);
            
            // Format labels like "Week of 5/24/2026" to "5/24"
            let label = d.period || '';
            if (label.startsWith('Week of ')) {
                label = label.replace('Week of ', '');
                const parts = label.split('/');
                if (parts.length >= 2) {
                    label = parts[0] + '/' + parts[1];
                }
            }
            
            return {
                key: d.period || index,
                cx: x.toFixed(0),
                cy: y.toFixed(0),
                label: label,
                textX: x.toFixed(0),
                textY: 160,
                textYValue: (y - 12).toFixed(0),
                utilPercent: util.toFixed(0) + '%'
            };
        });
    }

    get trendPath() {
        if (!this.trendData || this.trendData.length === 0) return 'M40,140 L420,140';
        const coords = this.trendCoordinates;
        const points = coords.map(c => `${c.cx},${c.cy}`);
        return 'M' + points.join(' L');
    }

    get trendAreaPath() {
        const linePath = this.trendPath;
        if (linePath.startsWith('M40,140')) return 'M40,140 L420,140 Z';
        return `${linePath} L420,140 L40,140 Z`;
    }

    // Export analytics dashboard data as dynamic CSV downloadable file (LWS compatible)
    async handleExportReport(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (this.isExporting) return;
        console.log('[AnalyticsDashboard] Initiating CSV report generation under LWS compliance...');
        this.isExporting = true;
        
        try {
            const csvData = await generateExportCSV();
            
            // Format content with UTF-8 BOM for Microsoft Excel compatibility
            const csvContent = '\uFEFF' + csvData;
            let url;
            let isBlobUrl = false;
            
            try {
                // Try using LWS permitted MIME type 'application/octet-stream' to create a Blob URL
                const blob = new Blob([csvContent], { type: 'application/octet-stream' });
                url = URL.createObjectURL(blob);
                isBlobUrl = true;
            } catch (blobError) {
                console.warn('[AnalyticsDashboard] Blob creation or Object URL blocked under LWS. Falling back to Data URI:', blobError);
                // Fallback: Base64-encoded Data URI (bypasses URL.createObjectURL completely)
                const base64Content = window.btoa(unescape(encodeURIComponent(csvContent)));
                url = `data:text/csv;charset=utf-8;base64,${base64Content}`;
            }
            
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                link.setAttribute('href', url);
                link.setAttribute('download', `Enterprise_Timesheet_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
                    URL.revokeObjectURL(url);
                }
                
                this.showToast('Export Complete', 'Your analytics CSV report has been downloaded successfully.', 'success');
            } else {
                throw new Error('File download is not supported by this browser environment.');
            }
        } catch (error) {
            console.error('[AnalyticsDashboard] Export failed:', error);
            this.showToast('Export Failed', 'An error occurred during report generation: ' + (error.body ? error.body.message : error.message), 'error');
        } finally {
            this.isExporting = false;
        }
    }

    showToast(title, message, variant) {
        this.toastTitle = title;
        this.toastMessage = message;
        this.toastVariant = variant;
        const toast = this.template.querySelector('c-toast-message');
        if (toast) {
            toast.show();
        }
    }
}