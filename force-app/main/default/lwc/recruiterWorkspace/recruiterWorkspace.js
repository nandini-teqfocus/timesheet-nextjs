import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllReferrals from '@salesforce/apex/ReferralController.getAllReferrals';
import hasHiringManagerAccess from '@salesforce/customPermission/EmpRef_HiringManager';

/**
 * Recruiter Workspace Component
 * 
 * Manages referral pipeline with:
 * - Multi-status views (Submitted, Review, Interview, Selected, Rejected, Hired)
 * - Detailed referral table with search and filter
 * - Row-level actions (view, update, comment)
 * - Bulk actions (status update, assign manager, comments)
 * - Hiring manager assignment
 * - Comment management
 * - Status tracking with timestamps
 * 
 * Usage:
 * <c-recruiter-workspace></c-recruiter-workspace>
 */
export default class RecruiterWorkspace extends LightningElement {
  // ===== PRIVATE STATE =====
  @track allReferrals = [];
  @track isLoading = false;
  @track hasError = false;
  @track errorMessage = '';
  @track selectedStatus = 'Submitted';
  @track showManageModal = false;
  @track selectedReferralId = null;
  @track bulkEditIds = [];
  @track selectedRowIds = [];
  @track showDrilldownModal = false;
  @track drilldownCardType = '';
  @track drilldownRecords = [];
  @track showStatusUpdateModal = false;
  @track showManagerModal = false;
  @track showCommentModal = false;

  // Status view definitions (base labels and values)
  statusViewDefs = [
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Interview Scheduled', value: 'Interview Scheduled' },
    { label: 'Selected', value: 'Selected' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Hired', value: 'Hired' }
  ];

  get statusViews() {
    return this.statusViewDefs.map((view) => ({
      ...view,
      count: this.allReferrals.filter((r) => r.status__c === view.value).length,
      linkClass: this.selectedStatus === view.value
        ? 'slds-tabs_default__link slds-is-active'
        : 'slds-tabs_default__link'
    }));
  }

  // Datatable configuration
  datatableColumns = [
    { fieldName: 'candidate_name', label: 'Candidate', type: 'avatar-text' },
    { fieldName: 'job_title', label: 'Job', type: 'text' },
    { fieldName: 'referrer_name', label: 'Referred By', type: 'text' },
    { fieldName: 'created_date', label: 'Submitted', type: 'text' },
    { fieldName: 'hiring_manager_name', label: 'Hiring Manager', type: 'text' }
  ];

  get referralRowActions() {
    if (hasHiringManagerAccess) {
      return [{ name: 'view', label: 'View Details' }];
    }
    return [
      { name: 'manage', label: 'Manage Referral' }
    ];
  }

  // ===== LIFECYCLE =====

  connectedCallback() {
    this.loadReferrals();
  }

  // ===== COMPUTED PROPERTIES =====

  get totalReferrals() {
    return this.allReferrals.length;
  }

  get activeCandidates() {
    return this.allReferrals.filter(r => 
      r.status__c === 'Submitted' || 
      r.status__c === 'Under Review' || 
      r.status__c === 'Interview Scheduled' || 
      r.status__c === 'Selected'
    ).length;
  }

  get interviewsScheduled() {
    return this.allReferrals.filter(r => r.status__c === 'Interview Scheduled').length;
  }

  get hiredCount() {
    return this.allReferrals.filter(r => r.status__c === 'Hired').length;
  }

  get pendingReviewsCount() {
    return this.allReferrals.filter(r => r.status__c === 'Submitted').length;
  }

  drilldownColumns = [
    { fieldName: 'candidate_name', label: 'Candidate', type: 'avatar-text' },
    { fieldName: 'job_title', label: 'Job', type: 'text' },
    { fieldName: 'referrer_name', label: 'Referred By', type: 'text' },
    { fieldName: 'status__c', label: 'Status', type: 'badge' },
    { fieldName: 'created_date', label: 'Submitted', type: 'text' },
    { fieldName: 'hiring_manager_name', label: 'Hiring Manager', type: 'text' }
  ];

  get drilldownModalTitle() {
    switch (this.drilldownCardType) {
      case 'total':
        return 'Total Referrals';
      case 'active':
        return 'Active Candidates';
      case 'interview':
        return 'Interviews Scheduled';
      case 'hired':
        return 'Hired Candidates';
      case 'pending':
        return 'Pending Reviews';
      default:
        return 'Referral Details';
    }
  }

  get filteredReferrals() {
    return this.allReferrals.filter((r) => r.status__c === this.selectedStatus);
  }

  get selectedStatusLabel() {
    const view = this.statusViews.find((v) => v.value === this.selectedStatus);
    return view ? view.label : this.selectedStatus;
  }

  get hasSelectedRows() {
    return !hasHiringManagerAccess && this.selectedRowIds && this.selectedRowIds.length > 0;
  }

  get workspaceTitle() {
    return hasHiringManagerAccess ? 'Referral Manager Workspace' : 'Recruiter Workspace';
  }

  get showReferralTable() {
    return !this.isLoading && !this.hasError;
  }

  // ===== DATA LOADING =====

  /**
   * Load all referrals for recruiter workspace
   * In production, this would load referrals assigned to or visible to the recruiter
   */
  loadReferrals() {
    this.isLoading = true;
    this.hasError = false;

    getAllReferrals({ limitSize: 500 })
      .then((result) => {
        // Normalize data: Map Salesforce API names to UI-friendly names
        this.allReferrals = (result || []).map(ref => ({
          id: ref.Id,
          candidate_name: ref.Candidate__r ? ref.Candidate__r.Name : 'Unknown',
          job_title: ref.Job_Posting__r ? ref.Job_Posting__r.Title__c : 'N/A',
          referrer_name: ref.Referred_By__r ? ref.Referred_By__r.Name : 'System',
          created_date: ref.CreatedDate || ref.Submission_Date__c,
          status__c: ref.Status__c,
          hiring_manager_name: ref.Hiring_Manager_Assigned__r ? ref.Hiring_Manager_Assigned__r.Name : 'Unassigned',
          ...ref
        }));
        this.isLoading = false;

        // Dynamic refresh for drill-down modal records if currently active
        if (this.showDrilldownModal && this.drilldownCardType) {
          this.filterDrilldownRecords(this.drilldownCardType);
        }
      })
      .catch((error) => {
        console.error('Error loading referrals:', error);
        this.hasError = true;
        this.errorMessage = error?.body?.message || 'Unable to load referrals';
        this.isLoading = false;
        this.showErrorToast(this.errorMessage);
      });
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle card clicks to open the drilldown modal
   */
  handleCardClick(event) {
    const cardType = event.currentTarget.dataset.cardType;
    this.drilldownCardType = cardType;
    this.filterDrilldownRecords(cardType);
    this.showDrilldownModal = true;
  }

  /**
   * Filter and map records for the active drilldown modal type
   */
  filterDrilldownRecords(type) {
    if (!this.allReferrals) {
      this.drilldownRecords = [];
      return;
    }

    switch (type) {
      case 'total':
        this.drilldownRecords = [...this.allReferrals];
        break;
      case 'active':
        this.drilldownRecords = this.allReferrals.filter(r => 
          r.status__c === 'Submitted' || 
          r.status__c === 'Under Review' || 
          r.status__c === 'Interview Scheduled' || 
          r.status__c === 'Selected'
        );
        break;
      case 'interview':
        this.drilldownRecords = this.allReferrals.filter(r => 
          r.status__c === 'Interview Scheduled' || 
          (r.status__c && r.status__c.toLowerCase().includes('interview'))
        );
        break;
      case 'hired':
        this.drilldownRecords = this.allReferrals.filter(r => r.status__c === 'Hired');
        break;
      case 'pending':
        this.drilldownRecords = this.allReferrals.filter(r => r.status__c === 'Submitted');
        break;
      default:
        this.drilldownRecords = [];
    }
  }

  /**
   * Close the active drilldown modal
   */
  closeDrilldownModal() {
    this.showDrilldownModal = false;
    this.drilldownRecords = [];
    this.drilldownCardType = '';
  }

  /**
   * Handle row actions clicked within the drilldown datatable
   */
  handleDrilldownRowAction(event) {
    const { action, row } = event.detail;
    const referralId = row.id;

    switch (action) {
      case 'view':
      case 'manage':
        this.selectedReferralId = referralId;
        this.showManageModal = true;
        break;
      default:
        break;
    }
  }

  /**
   * Handle status tab change
   */
  handleStatusViewChange(event) {
    const status = event.currentTarget.dataset.status;
    this.selectedStatus = status;
    this.selectedRowIds = []; // Clear selections on tab change
  }

  /**
   * Handle table row action
   */
  handleRowAction(event) {
    const { action, row } = event.detail;
    const referralId = row.id;

    switch (action) {
      case 'view':
      case 'manage':
        this.selectedReferralId = referralId;
        this.showManageModal = true;
        break;
      default:
        break;
    }
  }

  /**
   * Handle row selection change
   */
  handleSelectionChange(event) {
    const { selectedRowIds } = event.detail;
    this.selectedRowIds = selectedRowIds;
  }

  /**
   * Show bulk status update
   */
  showBulkStatusUpdate() {
    this.bulkEditIds = this.selectedRowIds;
    this.showStatusUpdateModal = true;
  }

  /**
   * Show bulk assign manager
   */
  showBulkAssignManager() {
    this.bulkEditIds = this.selectedRowIds;
    this.showManagerModal = true;
  }

  /**
   * Show bulk add comment
   */
  showBulkAddComment() {
    this.bulkEditIds = this.selectedRowIds;
    this.showCommentModal = true;
  }

  /**
   * Close manage modal
   */
  closeManageModal() {
    this.showManageModal = false;
    this.selectedReferralId = null;
  }

  /**
   * Close status update modal
   */
  closeStatusUpdateModal() {
    this.showStatusUpdateModal = false;
    this.bulkEditIds = [];
  }

  /**
   * Close manager assignment modal
   */
  closeManagerModal() {
    this.showManagerModal = false;
    this.bulkEditIds = [];
  }

  /**
   * Close comment modal
   */
  closeCommentModal() {
    this.showCommentModal = false;
    this.bulkEditIds = [];
  }

  /**
   * Handle referral save
   */
  handleManageSave() {
    this.closeManageModal();
    this.loadReferrals();
  }

  /**
   * Handle referral edit
   */
  handleReferralEdit(event) {
    this.closeDetailModal();
    this.loadReferrals();
    this.showSuccessToast('Referral updated successfully');
  }

  /**
   * Handle status update
   */
  handleStatusUpdate(event) {
    this.closeStatusUpdateModal();
    this.loadReferrals();
    this.selectedRowIds = []; // Clear selections
    this.showSuccessToast('Status updated successfully');
  }

  /**
   * Handle manager assignment
   */
  handleManagerAssign() {
    this.closeManagerModal();
    this.loadReferrals();
    this.selectedRowIds = [];
    this.showSuccessToast('Hiring manager assigned successfully');
  }

  /**
   * Handle comment success
   */
  handleCommentSuccess() {
    this.closeCommentModal();
    this.loadReferrals();
    this.selectedRowIds = [];
    this.showSuccessToast('Comment added successfully');
  }

  /**
   * Get count for view
   */
  getViewCount(status) {
    return this.allReferrals.filter((r) => r.status__c === status).length;
  }

  // ===== UTILITY METHODS =====

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