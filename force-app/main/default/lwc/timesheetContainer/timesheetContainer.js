import { LightningElement, track, wire } from 'lwc';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import TIMESHEET_ENTRY_OBJECT from '@salesforce/schema/Timesheet_Entry__c';
import CATEGORY_FIELD from '@salesforce/schema/Timesheet_Entry__c.Category__c';

import getTimesheetData from '@salesforce/apex/TimesheetController.getTimesheetData';
import getTimesheetEntries from '@salesforce/apex/TimesheetController.getTimesheetEntries';
import saveTimeEntry from '@salesforce/apex/TimesheetController.saveTimeEntry';
import deleteTimeEntry from '@salesforce/apex/TimesheetController.deleteTimeEntry';
import submitTimesheetForApproval from '@salesforce/apex/TimesheetController.submitTimesheetForApproval';
import getActiveProjects from '@salesforce/apex/ProjectController.getActiveProjects';

export default class TimesheetContainer extends LightningElement {
    @track isLoading = false;
    @track activeDay = 'Mon';
    @track currentWeekStart = '';
    
    // Unsaved Changes indicators (kept for layout signature)
    @track hasUnsavedChanges = false;
    
    // Modal states
    @track isEntryModalOpen = false;
    @track isConfirmDialogOpen = false;
    
    // Entry Form states
    @track entryModalTitle = 'Log Time Entry';
    @track entryForm = {
        id: '',
        projectId: '',
        category: '',
        hours: 8.0,
        date: '',
        description: '',
        isBillable: true
    };
    
    // Confirmation dialog states
    @track confirmDialogConfig = {
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed?',
        variant: 'warning',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        action: '' // 'delete', 'submit'
    };
    
    @track activeEntryId = '';

    // Toast status bindings
    @track toastTitle = '';
    @track toastMessage = '';
    @track toastVariant = 'success';

    // State tracks connected to live data
    @track timesheet = { id: null, weekStart: '', weekEnd: '', status: 'Draft', totalHours: '0.0h', billableHours: '0.0h' };
    @track timesheetData = [];
    @track weeklyLog = [];
    @track allEntries = [];
    @track activeProjects = [];
    @track dynamicCategoryOptions = [];

    // Fallback static categories
    fallbackCategories = [
        { label: 'Development', value: 'Development' },
        { label: 'Meeting', value: 'Meeting' },
        { label: 'Testing', value: 'Testing' },
        { label: 'Design', value: 'Design' },
        { label: 'Documentation', value: 'Documentation' },
        { label: 'Admin', value: 'Admin' }
    ];

    @wire(getObjectInfo, { objectApiName: TIMESHEET_ENTRY_OBJECT })
    timesheetEntryObjectInfo;

    @wire(getPicklistValues, { 
        recordTypeId: '$timesheetEntryObjectInfo.data.defaultRecordTypeId', 
        fieldApiName: CATEGORY_FIELD 
    })
    wiredCategoryPicklist({ error, data }) {
        if (data) {
            console.log('[TimesheetContainer] Dynamic picklist categories loaded successfully:', JSON.stringify(data.values));
            this.dynamicCategoryOptions = data.values.map(val => ({
                label: val.label,
                value: val.value
            }));
        } else if (error) {
            console.error('[TimesheetContainer] Error loading picklist categories from schema, falling back to static options:', error);
        }
    }

    // Columns structure with actions
    get columns() {
        const baseColumns = [
            { label: 'Date', fieldName: 'date', type: 'text' },
            { label: 'Project', fieldName: 'projectName', type: 'text' },
            { label: 'Task Category', fieldName: 'category', type: 'text' },
            { label: 'Billable', fieldName: 'billableLabel', type: 'text' },
            { label: 'Hours', fieldName: 'hours', type: 'number', cellAttributes: { alignment: 'left' } },
            { label: 'Status', fieldName: 'status', type: 'text' }
        ];

        if (this.timesheet.status !== 'Submitted' && this.timesheet.status !== 'Approved') {
            baseColumns.push({
                type: 'action',
                typeAttributes: {
                    rowActions: [
                        { label: 'Edit', name: 'edit' },
                        { label: 'Delete', name: 'delete' }
                    ]
                }
            });
        }
        return baseColumns;
    }

    get isTimesheetLocked() {
        return this.timesheet.status === 'Submitted' || this.timesheet.status === 'Approved';
    }

    get hasEntries() {
        return this.allEntries && this.allEntries.length > 0;
    }

    get todayStr() {
        return this.formatDateToISO(new Date());
    }

    get isSaveDisabled() {
        return this.entryForm.date && this.entryForm.date > this.todayStr;
    }

    get projectOptions() {
        return (this.activeProjects || []).map(p => {
            return { label: `${p.Name} (${p.Project_Code__c || 'N/A'})`, value: p.Id };
        });
    }

    get categoryOptions() {
        return this.dynamicCategoryOptions.length > 0 ? this.dynamicCategoryOptions : this.fallbackCategories;
    }

    get weeklyEntries() {
        return [...(this.allEntries || [])]
            .map(e => {
                const entryDate = e.dateStr ? new Date(e.dateStr + 'T00:00:00') : null;
                const weekday = entryDate ? entryDate.toLocaleDateString('en-US', { weekday: 'short' }) : '';
                const dayOfMonth = entryDate ? entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                
                return {
                    id: e.id,
                    date: e.dateStr,
                    weekday: weekday,
                    dayOfMonth: dayOfMonth,
                    projectName: e.projectName || 'Unknown Project',
                    projectCode: e.projectCode ? `(${e.projectCode})` : '',
                    category: e.category,
                    billableLabel: e.isBillable ? 'Billable' : 'Non-Billable',
                    billableClass: e.isBillable ? 'pill-billable' : 'pill-nonbillable',
                    hours: parseFloat(e.hours || 0).toFixed(1),
                    status: this.timesheet.status,
                    projectId: e.projectId,
                    description: e.description,
                    isBillable: e.isBillable
                };
            })
            .sort((a, b) => {
                if (a.date < b.date) return -1;
                if (a.date > b.date) return 1;
                return 0;
            });
    }

    get statusIconName() {
        if (this.timesheet.status === 'Submitted') return 'utility:lock';
        if (this.timesheet.status === 'Approved') return 'utility:check';
        return 'utility:edit';
    }

    get statusBadgeClass() {
        if (this.timesheet.status === 'Submitted') return 'slds-theme_warning total-badge font-weight-bold slds-m-right_small';
        if (this.timesheet.status === 'Approved') return 'slds-theme_success slds-text-color_inverse total-badge font-weight-bold slds-m-right_small';
        return 'slds-theme_info slds-badge_lightest total-badge font-weight-bold slds-m-right_small';
    }

    get statusPillClass() {
        if (this.timesheet.status === 'Submitted') return 'status-pill status-pill_submitted';
        if (this.timesheet.status === 'Approved') return 'status-pill status-pill_approved';
        return 'status-pill status-pill_draft';
    }

    // Timezone-safe helper functions
    getStartOfWeek(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    formatDateToISO(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateVal = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${dateVal}`;
    }

    getDayAbbr(dateStr) {
        if (!dateStr) return 'Mon';
        const d = new Date(dateStr + 'T00:00:00');
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[d.getDay()];
    }

    connectedCallback() {
        console.log('[TimesheetContainer] Initializing connectedCallback...');
        const today = new Date();
        const monday = this.getStartOfWeek(today);
        this.currentWeekStart = this.formatDateToISO(monday);
        
        console.log('[TimesheetContainer] Calculated initial currentWeekStart:', this.currentWeekStart);
        this.loadTimesheetData();
    }

    async loadTimesheetData() {
        this.isLoading = true;
        console.log('[TimesheetContainer] loadTimesheetData invoked for week:', this.currentWeekStart);
        try {
            // Load active projects
            const projects = await getActiveProjects();
            this.activeProjects = projects || [];
            console.log('[TimesheetContainer] Apex getActiveProjects payload received:', JSON.stringify(this.activeProjects));

            // Load timesheet header
            const ts = await getTimesheetData({ weekStart: this.currentWeekStart });
            console.log('[TimesheetContainer] Apex getTimesheetData payload received:', JSON.stringify(ts));

            if (ts) {
                this.timesheet = {
                    id: ts.id,
                    weekStart: ts.weekStart,
                    weekEnd: ts.weekEnd,
                    status: ts.status || 'Draft',
                    totalHours: parseFloat(ts.totalHours || 0).toFixed(1) + 'h',
                    billableHours: parseFloat(ts.billableHours || 0).toFixed(1) + 'h'
                };
                this.currentWeekStart = ts.weekStart; // Synchronize week start
                
                // Fetch timesheet entries
                const entries = await getTimesheetEntries({ timesheetId: ts.id });
                console.log('[TimesheetContainer] Apex getTimesheetEntries payload received:', JSON.stringify(entries));
                this.allEntries = entries || [];
            } else {
                console.log('[TimesheetContainer] No timesheet registered for week. Setting clean placeholder.');
                const monStr = this.currentWeekStart;
                const sunStr = this.calculateSundayStr(monStr);
                this.timesheet = {
                    id: null,
                    weekStart: monStr,
                    weekEnd: sunStr,
                    status: 'Draft',
                    totalHours: '0.0h',
                    billableHours: '0.0h'
                };
                this.allEntries = [];
            }

            this.recalculateTotals();
            this.loadEntriesForSelectedDay();

        } catch (error) {
            console.error('[TimesheetContainer] Error in loadTimesheetData sequence:', error);
            this.showToast('Data Error', 'Failed to retrieve timesheet records: ' + (error.body ? error.body.message : error.message), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    loadEntriesForSelectedDay() {
        const activeDateStr = this.getDayDateStr(this.activeDay);
        console.log('[TimesheetContainer Debug] selectedDate from UI:', activeDateStr, 'activeDay:', this.activeDay);
        console.log('[TimesheetContainer Debug] total entries in week:', this.allEntries.length);
        
        // Log all queried Work_Date__c entries for clear diagnostic comparison
        (this.allEntries || []).forEach(e => {
            console.log('[TimesheetContainer Debug] Record in memory -> id:', e.id, 'Work_Date__c:', e.dateStr, 'projectName:', e.projectName);
        });

        const filtered = (this.allEntries || []).filter(e => e.dateStr === activeDateStr);
        console.log('[TimesheetContainer Debug] entry counts returned for selected date:', filtered.length);

        this.timesheetData = filtered.map(e => {
            return {
                id: e.id,
                date: e.dateStr,
                projectName: e.projectName || 'Unknown Project',
                category: e.category,
                billableLabel: e.isBillable ? 'Yes' : 'No',
                hours: e.hours,
                status: this.timesheet.status,
                projectId: e.projectId,
                description: e.description,
                isBillable: e.isBillable
            };
        });
    }

    getDayDateStr(abbr) {
        const daysMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
        const offset = daysMap[abbr];
        if (offset === undefined) return '';
        const d = new Date(this.currentWeekStart + 'T00:00:00');
        d.setDate(d.getDate() + offset);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateVal = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${dateVal}`;
    }

    get currentDays() {
        return this.weeklyLog.map(day => {
            const isActive = day.day === this.activeDay;
            return {
                id: day.day,
                label: day.day,
                hours: day.hours.toFixed(1),
                class: `slds-button day-btn ${isActive ? 'slds-is-active active-day' : ''}`
            };
        });
    }

    get formattedWeekRange() {
        if (!this.timesheet.weekStart) return 'Loading...';
        const start = new Date(this.timesheet.weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const end = new Date(this.timesheet.weekEnd + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return `Week of ${start} - ${end}`;
    }

    handleDayClick(event) {
        this.activeDay = event.currentTarget.dataset.day;
        this.loadEntriesForSelectedDay();
    }

    handlePrevWeek() {
        const d = new Date(this.currentWeekStart + 'T00:00:00');
        d.setDate(d.getDate() - 7);
        this.currentWeekStart = this.formatDateToISO(d);
        console.log('[TimesheetContainer] Navigating to previous week start:', this.currentWeekStart);
        this.loadTimesheetData();
    }

    handleNextWeek() {
        const d = new Date(this.currentWeekStart + 'T00:00:00');
        d.setDate(d.getDate() + 7);
        this.currentWeekStart = this.formatDateToISO(d);
        console.log('[TimesheetContainer] Navigating to next week start:', this.currentWeekStart);
        this.loadTimesheetData();
    }

    // Modal Control: Add Form
    handleOpenAddModal() {
        if (this.isTimesheetLocked) return;

        this.entryModalTitle = 'Log Time Entry';
        this.activeEntryId = '';
        this.entryForm = {
            id: '',
            projectId: '',
            category: '',
            hours: 8.0,
            date: '',
            description: '',
            isBillable: true
        };
        this.isEntryModalOpen = true;
    }

    handleCloseEntryModal() {
        this.isEntryModalOpen = false;
    }

    handleFormChange(event) {
        const fieldName = event.target.name;
        let fieldValue = event.target.value;
        if (event.target.type === 'checkbox') {
            fieldValue = event.target.checked;
        }
        this.entryForm = {
            ...this.entryForm,
            [fieldName]: fieldValue
        };

        if (fieldName === 'date') {
            // Wait for LWC render cycle to complete and then perform custom validation check
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.validateDateInput();
            }, 0);
        }
    }

    validateDateInput() {
        const dateCmp = this.template.querySelector('lightning-input[name="date"]');
        if (dateCmp) {
            const selectedDateStr = this.entryForm.date;
            const todayStr = this.todayStr;
            if (selectedDateStr && selectedDateStr > todayStr) {
                dateCmp.setCustomValidity("You cannot create timesheet entries for future dates.");
            } else {
                dateCmp.setCustomValidity(""); // clear validation
            }
            dateCmp.reportValidity();
        }
    }

    async handleSaveEntry() {
        // Trigger standard SLDS field validation alerts
        const fields = [
            ...this.template.querySelectorAll('lightning-input'),
            ...this.template.querySelectorAll('lightning-combobox'),
            ...this.template.querySelectorAll('lightning-textarea')
        ];
        fields.forEach(cmp => cmp.reportValidity());

        if (!this.entryForm.projectId) {
            this.showToast('Validation Error', 'Project is required.', 'error');
            return;
        }
        if (!this.entryForm.category) {
            this.showToast('Validation Error', 'Task Category is required.', 'error');
            return;
        }
        if (!this.entryForm.date) {
            this.showToast('Validation Error', 'Date is required.', 'error');
            return;
        }
        if (this.entryForm.date > this.todayStr) {
            this.showToast('Validation Error', 'You cannot create timesheet entries for future dates.', 'error');
            this.validateDateInput();
            return;
        }
        const hrs = parseFloat(this.entryForm.hours);
        if (isNaN(hrs) || hrs <= 0 || hrs > 24) {
            this.showToast('Validation Error', 'Hours must be a number between 0.5 and 24.', 'error');
            return;
        }
        if (!this.entryForm.description) {
            this.showToast('Validation Error', 'Description / Work Notes is required.', 'error');
            return;
        }

        this.isLoading = true;
        try {
            const entryRecord = {
                sobjectType: 'Timesheet_Entry__c',
                Project__c: this.entryForm.projectId,
                Category__c: this.entryForm.category,
                Hours__c: hrs,
                Is_Billable__c: this.entryForm.isBillable,
                Description__c: this.entryForm.description,
                Entry_Date__c: this.entryForm.date
            };

            // If editing, append Salesforce ID
            if (this.activeEntryId && !this.activeEntryId.startsWith('e_')) {
                entryRecord.Id = this.activeEntryId;
            }
            if (this.timesheet.id) {
                entryRecord.Timesheet__c = this.timesheet.id;
            }

            console.log('[TimesheetContainer] Saving entry record:', JSON.stringify(entryRecord));

            const savedWrapper = await saveTimeEntry({ 
                entry: entryRecord, 
                weekStart: this.timesheet.weekStart, 
                weekEnd: this.timesheet.weekEnd 
            });

            console.log('[TimesheetContainer] Apex saveTimeEntry response payload:', JSON.stringify(savedWrapper));
            
            this.showToast('Success', 'Time entry saved successfully.', 'success');
            
            // Switch current active day tab to the date's day abbreviation, then reload
            this.activeDay = this.getDayAbbr(this.entryForm.date);
            await this.loadTimesheetData();
            this.isEntryModalOpen = false;

        } catch (error) {
            console.error('[TimesheetContainer] Error saving entry:', error);
            const errMsg = error.body ? error.body.message : error.message;
            if (errMsg && errMsg.includes('You have already submitted a timesheet for this date.')) {
                this.showToast('Save Failed', 'You have already submitted a timesheet for this date.', 'error');
            } else {
                this.showToast('Save Failed', 'Failed to save time entry: ' + errMsg, 'error');
            }
        } finally {
            this.isLoading = false;
        }
    }

    // Modal Control: Submit Confirm
    handleOpenSubmitConfirmModal() {
        if (this.isTimesheetLocked) return;

        const total = this.allEntries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
        if (total === 0) {
            this.showToast('Validation Error', 'Cannot submit a timesheet with 0.0 logged hours.', 'error');
            return;
        }

        this.confirmDialogConfig = {
            title: 'Submit Timesheet for Approval',
            message: `Are you sure you want to submit this timesheet with ${total.toFixed(1)} total hours? Once submitted, entries are locked and cannot be edited.`,
            variant: 'brand',
            confirmLabel: 'Confirm & Submit',
            cancelLabel: 'Cancel',
            action: 'submit'
        };
        this.isConfirmDialogOpen = true;
    }

    // Datatable Action Dispatcher
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        if (this.isTimesheetLocked) {
            this.showToast('Warning', 'Timesheet is locked and cannot be modified.', 'warning');
            return;
        }

        if (actionName === 'edit') {
            this.activeEntryId = row.id;
            this.entryForm = {
                id: row.id,
                projectId: row.projectId,
                category: row.category,
                hours: row.hours,
                date: row.date,
                description: row.description,
                isBillable: row.isBillable
            };
            this.entryModalTitle = 'Edit Time Entry';
            this.isEntryModalOpen = true;
        } else if (actionName === 'delete') {
            this.activeEntryId = row.id;
            this.confirmDialogConfig = {
                title: 'Delete Time Entry',
                message: `Are you sure you want to delete this time entry for ${row.projectName}? This will permanently remove the logged ${row.hours}h.`,
                variant: 'destructive',
                confirmLabel: 'Delete Entry',
                cancelLabel: 'Cancel',
                action: 'delete'
            };
            this.isConfirmDialogOpen = true;
        }
    }

    handleEditRow(event) {
        const entryId = event.currentTarget.dataset.id;
        const row = this.allEntries.find(e => e.id === entryId);
        if (!row) return;

        if (this.isTimesheetLocked) {
            this.showToast('Warning', 'Timesheet is locked and cannot be modified.', 'warning');
            return;
        }

        this.activeEntryId = row.id;
        this.entryForm = {
            id: row.id,
            projectId: row.projectId,
            category: row.category,
            hours: row.hours,
            date: row.dateStr,
            description: row.description,
            isBillable: row.isBillable
        };
        this.entryModalTitle = 'Edit Time Entry';
        this.isEntryModalOpen = true;
    }

    handleDeleteRow(event) {
        const entryId = event.currentTarget.dataset.id;
        const row = this.allEntries.find(e => e.id === entryId);
        if (!row) return;

        if (this.isTimesheetLocked) {
            this.showToast('Warning', 'Timesheet is locked and cannot be modified.', 'warning');
            return;
        }

        this.activeEntryId = row.id;
        this.confirmDialogConfig = {
            title: 'Delete Time Entry',
            message: `Are you sure you want to delete this time entry for ${row.projectName || 'this project'}? This will permanently remove the logged ${row.hours}h.`,
            variant: 'destructive',
            confirmLabel: 'Delete Entry',
            cancelLabel: 'Cancel',
            action: 'delete'
        };
        this.isConfirmDialogOpen = true;
    }

    // Confirm dialog responses
    async handleConfirmAction() {
        this.isConfirmDialogOpen = false;
        
        if (this.confirmDialogConfig.action === 'delete') {
            this.isLoading = true;
            try {
                console.log('[TimesheetContainer] Deleting entry ID:', this.activeEntryId);
                await deleteTimeEntry({ entryId: this.activeEntryId });
                this.showToast('Success', 'Time entry deleted successfully.', 'success');
                await this.loadTimesheetData();
            } catch (error) {
                console.error('[TimesheetContainer] Error deleting entry:', error);
                this.showToast('Delete Failed', 'Failed to delete time entry: ' + (error.body ? error.body.message : error.message), 'error');
            } finally {
                this.isLoading = false;
            }
        } else if (this.confirmDialogConfig.action === 'submit') {
            this.isLoading = true;
            try {
                console.log('[TimesheetContainer] Submitting timesheet ID:', this.timesheet.id);
                await submitTimesheetForApproval({ timesheetId: this.timesheet.id });
                this.showToast('Success', 'Timesheet successfully submitted for approval.', 'success');
                await this.loadTimesheetData();
            } catch (error) {
                console.error('[TimesheetContainer] Error submitting timesheet:', error);
                this.showToast('Submission Failed', 'Failed to submit timesheet: ' + (error.body ? error.body.message : error.message), 'error');
            } finally {
                this.isLoading = false;
            }
        }
    }

    handleCancelConfirmAction() {
        this.isConfirmDialogOpen = false;
    }

    recalculateTotals() {
        const total = this.allEntries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
        const billable = this.allEntries.reduce((sum, entry) => sum + (entry.isBillable ? parseFloat(entry.hours || 0) : 0), 0);
        
        this.timesheet.totalHours = `${total.toFixed(1)}h`;
        this.timesheet.billableHours = `${billable.toFixed(1)}h`;

        const daysAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        this.weeklyLog = daysAbbr.map(abbr => {
            const dateStr = this.getDayDateStr(abbr);
            const dayTotal = this.allEntries
                .filter(e => e.dateStr === dateStr)
                .reduce((sum, e) => sum + parseFloat(e.hours || 0), 0);
            return {
                day: abbr,
                hours: dayTotal
            };
        });
    }

    calculateSundayStr(mondayISO) {
        const d = new Date(mondayISO + 'T00:00:00');
        d.setDate(d.getDate() + 6);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateVal = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${dateVal}`;
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