import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getMyReferrals from '@salesforce/apex/ReferralController.getMyReferrals';
import getResumeId from '@salesforce/apex/FileUploadController.getResumeId';

/**
 * Referral Tracking Dashboard Component
 * 
 * Displays employee referrals with:
 * - Summary statistics (total, under review, interviews, hired)
 * - Detailed referral list with status tracking
 * - Status badges and date information
 * - Bonus eligibility indicators
 * - Quick actions for each referral
 * - Status filtering
 * - Search and sorting via reusableDatatable
 * 
 * Usage:
 * <c-referral-tracking-dashboard></c-referral-tracking-dashboard>
 */
export default class ReferralTrackingDashboard extends LightningElement {
  // ===== PRIVATE STATE =====
  @track referrals = [];
  @track isLoading = false;
  @track hasError = false;
  @track errorMessage = '';
  @track showEmployeeModal = false;
  @track showReferralWizard = false;
  @track selectedReferralId = null;
  @track selectedReferralStatus = '';
  @track selectedStatusFilter = '';
  @track searchQuery = '';

  // Summary statistics
  @track stats = {
    totalReferrals: 0,
    underReview: 0,
    interviews: 0,
    hired: 0
  };

  // Filter options
  statusFilterOptions = [
    { label: 'All Status', value: '' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Interview Scheduled', value: 'Interview Scheduled' },
    { label: 'Selected', value: 'Selected' },
    { label: 'Hired', value: 'Hired' },
    { label: 'Rejected', value: 'Rejected' }
  ];

  // Datatable configuration
  datatableColumns = [
    { fieldName: 'job_title', label: 'Job Title', type: 'text' },
    { fieldName: 'candidate_name', label: 'Candidate', type: 'text' },
    { fieldName: 'status__c', label: 'Status', type: 'badge' },
    { fieldName: 'created_date', label: 'Submitted Date', type: 'text' },
    { fieldName: 'bonus_eligible__c', label: 'Bonus Eligible', type: 'text' }
  ];

  referralRowActions = [
    { name: 'manage', label: 'Manage Referral' }
  ];

  // ===== LIFECYCLE =====

  connectedCallback() {
    this.loadMyReferrals();
  }

  // ===== COMPUTED PROPERTIES =====

  get isEmpty() {
    return !this.isLoading && this.referrals.length === 0 && !this.hasError;
  }

  get showEmptyState() {
    return !this.isLoading && !this.hasError && this.isEmpty;
  }

  get showReferralList() {
    return !this.isLoading && !this.hasError && !this.isEmpty;
  }

  // ===== DATA LOADING =====

  /**
   * Load user's referrals
   */
  loadMyReferrals() {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    getMyReferrals({ limitSize: 500 })
      .then((result) => {
        // Normalize data: Map Salesforce API names to UI-friendly names
        const allReferrals = (result || []).map(ref => {
            const status = ref.Status__c;
            return {
                id: ref.Id,
                job_title: ref.Job_Posting__r ? ref.Job_Posting__r.Title__c : 'N/A',
                department: ref.Job_Posting__r?.Department__r ? (ref.Job_Posting__r.Department__r.Department_Name__c || ref.Job_Posting__r.Department__r.Name) : 'N/A',
                candidate_name: ref.Candidate__r ? ref.Candidate__r.Name : 'Unknown',
                status: status,
                status_variant: this.getStatusVariant(status),
                progress: this.getStatusProgress(status),
                recruiter: ref.Recruiter_Assigned__r ? ref.Recruiter_Assigned__r.Name : 'Unassigned',
                created_date: this.formatDate(ref.Submission_Date__c || ref.CreatedDate),
                updated_date: this.formatDate(ref.Last_Status_Change__c),
                bonus_status: ref.Bonus_Paid__c ? 'Paid' : (ref.Bonus_Eligible__c ? 'Eligible' : 'N/A'),
                bonus_variant: ref.Bonus_Paid__c ? 'success' : (ref.Bonus_Eligible__c ? 'warning' : 'neutral'),
                has_resume: !!ref.Resume_Content_Document_Id__c,
                isExpanded: false,
                expandIcon: 'utility:chevronright',
                ...ref
            };
        });

        // Apply status and search filters
        let filtered = allReferrals;
        if (this.selectedStatusFilter) {
          filtered = filtered.filter((r) => r.status === this.selectedStatusFilter);
        }
        if (this.searchQuery) {
          const query = this.searchQuery.toLowerCase();
          filtered = filtered.filter((r) => 
            (r.candidate_name && r.candidate_name.toLowerCase().includes(query)) ||
            (r.job_title && r.job_title.toLowerCase().includes(query)) ||
            (r.department && r.department.toLowerCase().includes(query))
          );
        }
        this.referrals = filtered;

        // Calculate statistics from all referrals
        this.calculateStats(allReferrals);

        this.isLoading = false;
      })
      .catch((error) => {
        this.handleError(error);
      });
  }

  /**
   * Calculate summary statistics
   */
  calculateStats(referrals) {
    this.stats = {
      totalReferrals: referrals.length,
      underReview: referrals.filter((r) => r.status === 'Under Review' || r.status === 'Submitted').length,
      interviews: referrals.filter((r) => r.status === 'Interview Scheduled').length,
      hired: referrals.filter((r) => r.status === 'Hired').length,
      totalBonusEarned: referrals.filter((r) => r.Bonus_Paid__c).length // Since we don't have amount, showing count of paid bonuses
    };
  }

  getStatusVariant(status) {
    switch (status) {
        case 'Submitted': return 'info';
        case 'Under Review': return 'warning';
        case 'Interview Scheduled': return 'secondary';
        case 'Selected': return 'success';
        case 'Hired': return 'success';
        case 'Rejected': return 'error';
        default: return 'neutral';
    }
  }

  getStatusProgress(status) {
    switch (status) {
        case 'Submitted': return 20;
        case 'Under Review': return 40;
        case 'Interview Scheduled': return 60;
        case 'Selected': return 80;
        case 'Hired': return 100;
        case 'Rejected': return 100;
        default: return 0;
    }
  }

  handleToggleExpand(event) {
    const id = event.currentTarget.dataset.id;
    this.referrals = this.referrals.map(ref => {
        if (ref.id === id) {
            const isExpanded = !ref.isExpanded;
            return { 
                ...ref, 
                isExpanded: isExpanded,
                expandIcon: isExpanded ? 'utility:chevrondown' : 'utility:chevronright'
            };
        }
        return ref;
    });
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle search query change
   */
  handleSearchChange(event) {
    this.searchQuery = event.target.value;
    this.loadMyReferrals();
  }

  /**
   * Handle status filter change
   */
  handleStatusFilterChange(event) {
    this.selectedStatusFilter = event.detail.value;
    this.loadMyReferrals();
  }

  /**
   * Handle referral table row action
   */
  handleReferralTableAction(event) {
    const action = event.target.value || event.detail.action;
    const referralId = event.target.dataset.id || event.detail.row.id;

    switch (action) {
      case 'manage':
        this.selectedReferralId = referralId;
        this.showEmployeeModal = true;
        break;
      default:
        break;
    }
  }

  /**
   * Download resume
   */
  downloadResume(event) {
    const referralId = event.target.dataset.id || event.detail.row.id;
    this.isLoading = true;
    getResumeId({ referralId })
      .then((contentDocumentId) => {
        this.isLoading = false;
        if (contentDocumentId) {
          const downloadUrl = `/sfc/servlet.shepherd/document/download/${contentDocumentId}`;
          window.open(downloadUrl, '_blank');
          this.showSuccessToast('Starting download...');
        } else {
          this.showErrorToast('No resume found for this referral.');
        }
      })
      .catch((error) => {
        this.isLoading = false;
        this.handleError(error);
      });
  }

  /**
   * Close employee modal
   */
  closeEmployeeModal() {
    this.showEmployeeModal = false;
    this.selectedReferralId = null;
  }

  /**
   * Open referral wizard
   */
  openReferralWizard() {
    this.showReferralWizard = true;
  }

  /**
   * Close referral wizard
   */
  closeReferralWizard() {
    this.showReferralWizard = false;
  }

  /**
   * Handle successful referral submission
   */
  handleReferralSuccess(event) {
    const { message } = event.detail;
    this.closeReferralWizard();
    this.showSuccessToast(message || 'Referral submitted successfully!');
    this.loadMyReferrals();
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('Error loading referrals:', error);
    this.hasError = true;
    this.errorMessage =
      error?.body?.message || 'Unable to load your referrals. Please try again.';
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
   * Determine if referral is bonus eligible
   */
  isBonusEligible(referral) {
    // Bonus is typically eligible if status is 'Hired' or 'Selected'
    return referral.status__c === 'Hired' || referral.status__c === 'Selected';
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
}