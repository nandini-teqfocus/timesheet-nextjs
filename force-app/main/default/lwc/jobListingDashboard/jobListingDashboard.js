import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getOpenJobPostings from '@salesforce/apex/JobController.getOpenJobPostings';

/**
 * Job Listing Dashboard Component
 * 
 * Displays a list/grid of open job postings with:
 * - Filtering by department, location, status
 * - Grid/List view toggle
 * - Search functionality (via reusableDatatable)
 * - Modal for job details
 * - Referral wizard integration
 * - Responsive design
 * 
 * Usage:
 * <c-job-listing-dashboard></c-job-listing-dashboard>
 */
export default class JobListingDashboard extends LightningElement {
  // ===== PUBLIC API =====
  @track isGridView = true;
  @track isLoading = false;
  @track hasError = false;
  @track errorMessage = '';
  @track showJobModal = false;
  @track showReferralWizard = false;
  @track selectedJobId = null;

  // ===== PRIVATE STATE =====
  @track jobs = [];
  @track allJobs = [];
  @track selectedDepartment = '';
  @track selectedLocation = '';
  @track selectedStatus = 'Open';
  @track searchQuery = '';

  // Summary statistics
  @track stats = {
    totalJobs: 0,
    remoteJobs: 0,
    hotDepartments: 'N/A',
    newJobs: 0
  };

  // Filter options
  departmentOptions = [];
  locationOptions = [];
  statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Open', value: 'Open' },
    { label: 'On Hold', value: 'On Hold' },
    { label: 'Closed', value: 'Closed' }
  ];

  experienceOptions = [
    { label: 'All Levels', value: '' },
    { label: 'Entry Level', value: 'Entry Level' },
    { label: 'Mid Level', value: 'Mid Level' },
    { label: 'Senior Level', value: 'Senior Level' },
    { label: 'Lead/Manager', value: 'Lead/Manager' }
  ];

  // ===== LIFECYCLE =====

  connectedCallback() {
    this.loadJobs();
  }

  // ===== COMPUTED PROPERTIES =====

  get isEmpty() {
    return !this.isLoading && this.jobs.length === 0 && !this.hasError;
  }

  get isListView() {
    return !this.isGridView;
  }

  get gridViewBtnClass() {
    return this.isGridView
      ? 'slds-button slds-button_icon slds-button_icon-border slds-is-selected'
      : 'slds-button slds-button_icon slds-button_icon-border';
  }

  get listViewBtnClass() {
    return !this.isGridView
      ? 'slds-button slds-button_icon slds-button_icon-border slds-is-selected'
      : 'slds-button slds-button_icon slds-button_icon-border';
  }

  get showEmptyState() {
    return !this.isLoading && !this.hasError && this.isEmpty;
  }

  get showGridContent() {
    return !this.isLoading && !this.hasError && !this.isEmpty && this.isGridView;
  }

  get showListContent() {
    return !this.isLoading && !this.hasError && !this.isEmpty && this.isListView;
  }

  get processedJobs() {
    return this.jobs.map((job) => ({
      ...job,
      formattedDate: this.formatDate(job.created_date),
      truncatedDescription: this.truncateText(job.description, 180),
      statusVariant: this.getStatusVariant(job.status__c),
      isRemote: !!job.Is_Remote__c,
      remoteLabel: job.Is_Remote__c ? 'Remote' : 'On-site',
      remoteClass: job.Is_Remote__c ? 'job-card remote' : 'job-card',
      bonusEligible: true
    }));
  }

  // ===== DATA LOADING =====

  /**
   * Load all job postings from Apex controller
   */
  loadJobs() {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    getOpenJobPostings({ limitSize: 500 })
      .then((result) => {
        // Normalize data: Map Salesforce API names to UI-friendly names
        this.allJobs = (result || []).map(job => {
            const deptName = job.Department__r ? (job.Department__r.Department_Name__c || job.Department__r.Name) : 'N/A';
            return {
                id: job.Id,
                name: job.Title__c || job.Name,
                status__c: job.Status__c,
                location: job.Location__c,
                experience_level: job.Experience_Level__c,
                department_name: deptName,
                created_date: job.CreatedDate || job.Posted_Date__c,
                description: job.Job_Description__c,
                is_remote: job.Is_Remote__c,
                hiring_manager: job.Hiring_Manager__c ? job.Hiring_Manager__r?.Name : 'Assigned HM',
                employment_type: job.Employment_Type__c || 'Full-time',
                ...job
            };
        });
        
        this.calculateStats(this.allJobs);
        this.applyFilters();
        this.buildFilterOptions();
        this.isLoading = false;
      })
      .catch((error) => {
        this.handleError(error);
      });
  }

  /**
   * Calculate summary statistics
   */
  calculateStats(jobs) {
    if (!jobs || !Array.isArray(jobs)) {
      this.stats = {
        totalJobs: 0,
        remoteJobs: 0,
        hotDepartments: 'N/A',
        newJobs: 0
      };
      return;
    }

    const remoteCount = jobs.filter(j => j && j.is_remote).length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newCount = jobs.filter(j => {
        if (!j || !j.created_date) return false;
        try {
            return new Date(j.created_date) >= sevenDaysAgo;
        } catch (e) {
            return false;
        }
    }).length;

    // Find top department
    const deptCounts = {};
    jobs.forEach(j => {
        if (j && j.department_name && j.department_name !== 'N/A') {
            deptCounts[j.department_name] = (deptCounts[j.department_name] || 0) + 1;
        }
    });
    let topDept = 'N/A';
    let max = 0;
    for (const dept in deptCounts) {
        if (deptCounts[dept] > max) {
            max = deptCounts[dept];
            topDept = dept;
        }
    }

    this.stats = {
      totalJobs: jobs.length,
      remoteJobs: remoteCount,
      hotDepartments: topDept,
      newJobs: newCount
    };
  }

  getStatusVariant(status) {
    switch (status) {
        case 'Open': return 'success';
        case 'On Hold': return 'warning';
        case 'Closed': return 'error';
        default: return 'neutral';
    }
  }

  handleSearchChange(event) {
    this.searchQuery = event.target.value;
    this.applyFilters();
  }

  openJobDetails(event) {
    this.selectedJobId = event.currentTarget.dataset.jobId;
    this.showJobModal = true;
  }

  closeJobModal() {
    this.showJobModal = false;
    this.selectedJobId = null;
  }

  handleReferralInitiated(event) {
    this.closeJobModal();
    this.selectedJobId = event.detail.jobId;
    this.showReferralWizard = true;
  }

  /**
   * Apply active filters to job list
   */
  applyFilters() {
    let filtered = [...this.allJobs];

    // Search query filter
    if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(j => 
            (j.name && j.name.toLowerCase().includes(query)) || 
            (j.department_name && j.department_name.toLowerCase().includes(query))
        );
    }

    // Filter by department
    if (this.selectedDepartment) {
      filtered = filtered.filter(
        (job) => job.department_name === this.selectedDepartment
      );
    }

    // Filter by location
    if (this.selectedLocation) {
      filtered = filtered.filter(
        (job) => job.location === this.selectedLocation
      );
    }

    // Filter by status
    if (this.selectedStatus) {
      filtered = filtered.filter(
        (job) => job.status__c === this.selectedStatus
      );
    }

    this.jobs = filtered;
    this.calculateStats(this.jobs);
  }

  /**
   * Build filter options from job data
   */
  buildFilterOptions() {
    // Extract unique departments
    const departments = new Set(
      this.allJobs.map((job) => job.department_name).filter(Boolean)
    );
    this.departmentOptions = [
      { label: 'All Departments', value: '' },
      ...Array.from(departments)
        .sort()
        .map((dept) => ({ label: dept, value: dept }))
    ];

    // Extract unique locations
    const locations = new Set(
      this.allJobs.map((job) => job.location).filter(Boolean)
    );
    this.locationOptions = [
      { label: 'All Locations', value: '' },
      ...Array.from(locations)
        .sort()
        .map((loc) => ({ label: loc, value: loc }))
    ];
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle department filter change
   */
  handleDepartmentChange(event) {
    this.selectedDepartment = event.detail.value;
    this.applyFilters();
  }

  /**
   * Handle location filter change
   */
  handleLocationChange(event) {
    this.selectedLocation = event.detail.value;
    this.applyFilters();
  }

  /**
   * Handle status filter change
   */
  handleStatusChange(event) {
    this.selectedStatus = event.detail.value;
    this.applyFilters();
  }

  /**
   * Clear all filters
   */
  handleClearFilters() {
    this.selectedDepartment = '';
    this.selectedLocation = '';
    this.selectedStatus = 'Open';
    this.searchQuery = '';

    // Clear filters in reusableDatatable component if visible
    try {
      const datatable = this.template.querySelector('c-reusable-datatable');
      if (datatable) {
        datatable.clearFilters();
      }
    } catch (e) {
      console.error('Error clearing datatable filters:', e);
    }

    // Reload jobs from Salesforce
    this.loadJobs();
  }

  /**
   * Toggle to grid view
   */
  toggleGridView() {
    this.isGridView = true;
  }

  /**
   * Toggle to list view
   */
  toggleListView() {
    this.isGridView = false;
  }

  /**
   * Open job detail modal
   */
  openJobModal(event) {
    const jobId = event.currentTarget.dataset.jobId;
    this.selectedJobId = jobId;
    this.showJobModal = true;
  }

  /**
   * Close job detail modal
   */
  closeJobModal() {
    this.showJobModal = false;
    this.selectedJobId = null;
  }

  /**
   * Open referral wizard modal
   */
  openReferralWizard(event) {
    const jobId = event.currentTarget.dataset.jobId;
    this.selectedJobId = jobId;
    this.showReferralWizard = true;
  }

  /**
   * Close referral wizard modal
   */
  closeReferralWizard() {
    this.showReferralWizard = false;
    this.selectedJobId = null;
  }

  /**
   * Handle job table row action
   */
  handleJobTableAction(event) {
    const { action, row } = event.detail;
    const jobId = row.id;

    if (action === 'view') {
      this.selectedJobId = jobId;
      this.showJobModal = true;
    } else if (action === 'refer') {
      this.selectedJobId = jobId;
      this.showReferralWizard = true;
    }
  }

  /**
   * Handle referral wizard initiation from detail modal
   */
  handleReferralInitiated(event) {
    const jobId = event.detail.jobId;
    if (jobId) {
      this.selectedJobId = jobId;
    }
    this.showJobModal = false;
    this.showReferralWizard = true;
  }

  /**
   * Handle successful referral submission
   */
  handleReferralSuccess(event) {
    const { message } = event.detail;
    this.closeReferralWizard();
    this.showSuccessToast(message || 'Referral submitted successfully!');
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('Error loading jobs:', error);
    this.hasError = true;
    this.errorMessage =
      error?.body?.message || 'Unable to load job postings. Please try again.';
    this.isLoading = false;
    this.showErrorToast(this.errorMessage);
  }

  // ===== UTILITY METHODS =====

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Truncate text to specified length
   */
  truncateText(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  /**
   * Show success toast
   */
  showSuccessToast(message) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Success',
        message: message,
        variant: 'success'
      })
    );
  }

  /**
   * Show error toast
   */
  showErrorToast(message) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Error',
        message: message,
        variant: 'error'
      })
    );
  }
}