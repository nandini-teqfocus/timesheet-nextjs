import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { resolveRouteUrl, createNavigateEvent } from 'c/utils';
import getDashboardData from '@salesforce/apex/DashboardController.getDashboardData';
import getPaginatedActivities from '@salesforce/apex/DashboardController.getPaginatedActivities';

export default class HomeDashboard extends NavigationMixin(LightningElement) {
    @track isLoading = true;
    @track currentWeekStart = '';
    
    // User Profile & Metadata
    @track userName = 'Employee';
    @track currentTimesheet = { weekStart: '', weekEnd: '', totalHours: 0, billableHours: 0, status: 'None' };
    
    // UI Trackers
    @track metrics = [];
    @track activities = [];
    @track chartDays = [];
    @track weekTotalHoursStr = '0.0h';
    
    // Toast notifications
    @track toastTitle = '';
    @track toastMessage = '';
    @track toastVariant = 'success';

    // Lazy load state
    activityOffset = 5;
    activityLimit = 5;
    noMoreActivities = false;

    // Wired Reference for refreshApex
    wiredDashboardResult;

    get utilizationPercentage() {
        if (!this.currentTimesheet || !this.currentTimesheet.totalHours) return 0;
        // Weekly hours target dynamically populated from profile preferences (default is 40)
        const target = this.weeklyHoursTarget || 40.0;
        return Math.min(Math.round((parseFloat(this.currentTimesheet.billableHours || 0) / target) * 100), 100);
    }

    get weeklyHoursTarget() {
        return this.profileData && this.profileData.weeklyHoursTarget ? this.profileData.weeklyHoursTarget : 40.0;
    }

    get weekBillableHoursStr() {
        return `${parseFloat(this.currentTimesheet.billableHours || 0).toFixed(1)}h`;
    }

    get mondayDateStr() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const date = String(monday.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    }

    connectedCallback() {
        this.currentWeekStart = this.mondayDateStr;
        console.log('[HomeDashboard] connectedCallback active. currentWeekStart:', this.currentWeekStart);
    }

    renderedCallback() {
        console.log('[HomeDashboard] (Log 14) renderedCallback executed. SVG element attached:', 
            !!this.template.querySelector('.home-chart-svg'),
            'Total chartDays mapped in state:', this.chartDays ? this.chartDays.length : 0);
    }

    // Consolidated Cacheable Wire Architecture
    @wire(getDashboardData, { weekStart: '$currentWeekStart' })
    wiredDashboard(result) {
        this.wiredDashboardResult = result;
        const { error, data } = result;
        
        if (data) {
            console.log('[HomeDashboard] Consolidated DTO data received successfully from wired adapter.');
            this.profileData = data.profile;
            this.userName = data.profile ? data.profile.name : 'Employee';
            
            // Map Timesheet
            if (data.currentTimesheet) {
                this.currentTimesheet = {
                    id: data.currentTimesheet.id,
                    weekStart: data.currentTimesheet.weekStart,
                    weekEnd: data.currentTimesheet.weekEnd,
                    totalHours: parseFloat(data.currentTimesheet.totalHours || 0),
                    billableHours: parseFloat(data.currentTimesheet.billableHours || 0),
                    status: data.currentTimesheet.status || 'Draft'
                };
            }

            this.weekTotalHoursStr = `${this.currentTimesheet.totalHours.toFixed(1)}h`;

            // Build dynamic chart days from database entries
            this.buildChartData(data.currentWeekEntries || []);

            // Map activities
            this.noMoreActivities = false;
            this.activityOffset = 5; // reset pagination offset
            this.activities = (data.recentActivities || []).map(e => this.mapEntryToActivity(e));

            // Map standard KPI Metrics
            const activeProjectsCount = data.activeProjects ? data.activeProjects.length : 0;
            this.metrics = [
                { id: '1', title: 'Hours This Week', value: `${this.currentTimesheet.totalHours.toFixed(1)}h`, icon: 'standard:timesheet', variant: 'success', trend: 'Current Week', trendUp: true },
                { id: '2', title: 'Billable Hours', value: `${this.currentTimesheet.billableHours.toFixed(1)}h`, icon: 'standard:currency', variant: 'brand', trend: 'Direct Billing', trendUp: true },
                { id: '3', title: 'Active Projects', value: `${activeProjectsCount}`, icon: 'standard:opportunity', variant: 'warning', trend: 'Assigned Catalog', trendUp: true },
                { id: '4', title: 'Timesheet Status', value: this.currentTimesheet.status, icon: 'standard:approval', variant: this.currentTimesheet.status === 'Submitted' ? 'warning' : this.currentTimesheet.status === 'Approved' ? 'success' : 'error', trend: 'Weekly workflow', trendUp: this.currentTimesheet.status === 'Approved' }
            ];

            this.isLoading = false;
        } else if (error) {
            console.error('[HomeDashboard] Error loading wired dashboard DTO data:', error);
            this.showToast('Data Error', 'Failed to retrieve live Salesforce timesheet records: ' + (error.body ? error.body.message : error.message), 'error');
            this.isLoading = false;
        }
    }

    mapEntryToActivity(e) {
        return {
            id: e.id,
            type: e.isBillable ? 'submit' : 'entry',
            description: `Logged ${e.hours.toFixed(1)}h to ${e.projectName} (${e.category}) - ${e.description || 'No description'}`,
            timestamp: e.dateStr || ''
        };
    }

    // Lazy load pagination logic for Objective 5
    async handleLoadMoreActivities() {
        if (this.noMoreActivities || this.isLoading) return;
        
        this.isLoading = true;
        console.log(`[HomeDashboard] Lazy loading activities. Offset: ${this.activityOffset}, Limit: ${this.activityLimit}`);
        
        try {
            const moreEntries = await getPaginatedActivities({ 
                limitVal: this.activityLimit, 
                offsetVal: this.activityOffset 
            });
            
            if (moreEntries && moreEntries.length > 0) {
                const mapped = moreEntries.map(e => this.mapEntryToActivity(e));
                this.activities = [...this.activities, ...mapped];
                this.activityOffset += moreEntries.length;
                console.log(`[HomeDashboard] Appended ${moreEntries.length} items. New offset: ${this.activityOffset}`);
                this.showToast('Timeline Updated', `Loaded ${moreEntries.length} older activities.`, 'success');
            } else {
                this.noMoreActivities = true;
                this.showToast('Timeline Complete', 'No older activities found in your timesheet database history.', 'info');
            }
        } catch (error) {
            console.error('[HomeDashboard] Error paginating historical timeline entries:', error);
            this.showToast('Pagination Error', 'Failed to retrieve historical timesheet log records: ' + (error.body ? error.body.message : error.message), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    buildChartData(entries) {
        console.log('[HomeDashboard] (Log 11) chart initialization timing: buildChartData invoked at timestamp', Date.now());
        console.log('[HomeDashboard] (Log 1) Apex response payload:', JSON.stringify(entries));
        console.log('[HomeDashboard] (Log 7) array lengths (entries):', (entries ? entries.length : 0));
        console.log('[HomeDashboard] (Log 8) null/undefined checks: entries has nulls =', entries ? entries.some(e => e === null || e === undefined) : true);
        console.log('[HomeDashboard] (Log 13) async lifecycle ordering: connectedCallback -> wiredDashboard -> buildChartData processing');
        console.log('[HomeDashboard] (Log 15) current week filtering logic: active currentWeekStart =', this.currentWeekStart);

        const daysMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
        console.log('[HomeDashboard] (Log 10) weekday mapping logic applied: daysMap used =', JSON.stringify(daysMap));

        // Initialize days accumulator
        const totals = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0 };
        const billables = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0 };

        (entries || []).forEach((e, index) => {
            if (!e.dateStr) {
                console.warn('[HomeDashboard] Entry skipped at index', index, 'due to missing dateStr');
                return;
            }
            
            // Manual parsing of YYYY-MM-DD to guarantee 100% timezone-agnostic local midnight interpretation
            const parts = e.dateStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const dateObj = new Date(year, month, day);
                const dayOfWeek = dateObj.getDay(); 
                const dayLabel = daysMap[dayOfWeek];
                
                if (dayLabel) {
                    const parsedHours = parseFloat(e.hours || 0);
                    console.log(`[HomeDashboard] (Log 9) numeric parsing validation: dateStr=${e.dateStr} (dayOfWeek=${dayOfWeek}, label=${dayLabel}) mapped to hours=${parsedHours} (billable=${e.isBillable})`);
                    totals[dayLabel] += parsedHours;
                    if (e.isBillable) {
                        billables[dayLabel] += parsedHours;
                    }
                } else {
                    console.warn(`[HomeDashboard] (Log 10) Day of week ${dayOfWeek} (dateStr=${e.dateStr}) is outside Mon-Fri bounds and was not accumulated.`);
                }
            } else {
                console.error('[HomeDashboard] (Log 9) Date parsing failure: malformed date string structure', e.dateStr);
            }
        });

        console.log('[HomeDashboard] (Log 5) total dataset array:', JSON.stringify(totals));
        console.log('[HomeDashboard] (Log 4) billable dataset array:', JSON.stringify(billables));
        console.log('[HomeDashboard] (Log 6) typeof dataset values: totals.Mon =', typeof totals.Mon, ', billables.Mon =', typeof billables.Mon);

        // Compute SVG positions and heights dynamically
        const daysAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        console.log('[HomeDashboard] (Log 3) labels array:', JSON.stringify(daysAbbr));
        const xOffsets = [60, 130, 200, 270, 340];

        this.chartDays = daysAbbr.map((day, idx) => {
            const totalH = totals[day];
            const billableH = billables[day];

            // Scale calculations (10h max maps perfectly to 144px height at y=160 baseline)
            const totalHeight = Math.min(totalH, 10.0) * 14.4;
            const billableHeight = Math.min(billableH, 10.0) * 14.4;

            const totalY = 160 - totalHeight;
            const billableY = 160 - billableHeight;

            return {
                name: day,
                totalX: xOffsets[idx],
                totalY: totalY,
                totalHeight: totalHeight,
                billableX: xOffsets[idx] + 33, // Offset billable bar to render side-by-side
                billableY: billableY,
                billableHeight: billableHeight
            };
        });

        console.log('[HomeDashboard] (Log 2) transformed chart dataset array (chartDays):', JSON.stringify(this.chartDays));
        console.log('[HomeDashboard] (Log 12) chart update execution: chartDays populated successfully. Total size:', this.chartDays.length);
    }

    handleQuickLog() {
        this.toastTitle = 'Navigate to Timesheet';
        this.toastMessage = 'Please navigate to the Timesheets tab to log or edit your entries.';
        this.toastVariant = 'info';
        
        const toast = this.template.querySelector('c-toast-message');
        if (toast) {
            toast.show();
        }
    }

    handleSubmitTimesheet() {
        console.log('[HomeDashboard] Submit Timesheet action clicked. Navigating to timesheets...');
        this.dispatchEvent(createNavigateEvent('timesheets'));
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: resolveRouteUrl('timesheets')
            }
        });
    }

    handleViewAnalytics() {
        console.log('[HomeDashboard] View Analytics action clicked. Navigating to analytics...');
        this.dispatchEvent(createNavigateEvent('analytics'));
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: resolveRouteUrl('analytics')
            }
        });
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