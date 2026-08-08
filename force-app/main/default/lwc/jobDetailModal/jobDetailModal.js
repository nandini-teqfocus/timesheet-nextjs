import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getJobDetail from '@salesforce/apex/JobController.getJobDetail';

/**
 * Job Detail Modal Component
 * 
 * Displays complete job details including:
 * - Job information (title, department, location, level)
 * - Hiring manager information
 * - Full job description and requirements
 * - Referral statistics
 * - Actions to refer candidates
 * 
 * Usage:
 * <c-job-detail-modal
 *   job-id="a001000000Tc69AAAB"
 *   onclose={handleClose}
 *   onrefer={handleRefer}
 * ></c-job-detail-modal>
 */
export default class JobDetailModal extends LightningElement {
  // ===== PUBLIC API =====
  @api jobId;
  @api isOpen = false;

  // ===== PRIVATE STATE =====
  @track jobData = null;
  @track isLoading = false;
  @track hasError = false;
  @track errorMessage = '';

  // ===== LIFECYCLE =====

  connectedCallback() {
    this.loadJobDetail();
  }

  // ===== COMPUTED PROPERTIES =====

  get showJobContent() {
    return !this.isLoading && !this.hasError && this.jobData;
  }

  // ===== DATA LOADING =====

  /**
   * Load job details from Apex controller
   */
  loadJobDetail() {
    if (!this.jobId) {
      this.handleError('Job ID is required');
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    getJobDetail({ jobId: this.jobId })
      .then((result) => {
        if (result) {
          // Normalize data: Map Salesforce API names to UI-friendly names
          this.jobData = {
            id: result.Id,
            name: result.Title__c || result.Name,
            status__c: result.Status__c,
            location: result.Location__c,
            experience_level: result.Experience_Level__c,
            department_name: result.Department__r ? (result.Department__r.Department_Name__c || result.Department__r.Name) : 'N/A',
            hiring_manager_name: result.Hiring_Manager_Assigned__r ? result.Hiring_Manager_Assigned__r.Name : 'Assigned HM',
            hiring_manager_email: result.Hiring_Manager_Assigned__r ? result.Hiring_Manager_Assigned__r.Email : '',
            created_date: result.CreatedDate || result.Posted_Date__c,
            description: result.Job_Description__c,
            requirements: result.Requirements__c,
            isRemote: !!result.Is_Remote__c,
            employment_type: result.Employment_Type__c || 'Full-time',
            bonus_eligible: result.Bonus_Eligible__c || true, // Assuming true if not specified for this demo
            ...result
          };
        }
        this.isLoading = false;
      })
      .catch((error) => {
        this.handleError(error);
      });
  }

  get statusVariant() {
    switch (this.jobData?.status__c) {
        case 'Open': return 'success';
        case 'On Hold': return 'warning';
        case 'Closed': return 'error';
        default: return 'neutral';
    }
  }

  get remoteLabel() {
    return this.jobData?.isRemote ? 'Remote' : 'On-site';
  }


  // ===== EVENT HANDLERS =====

  /**
   * Handle close button click
   */
  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  /**
   * Handle refer button click
   */
  handleRefer() {
    this.dispatchEvent(new CustomEvent('refer', {
      detail: {
        jobId: this.jobId,
        jobTitle: this.jobData?.name
      }
    }));
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('Error loading job detail:', error);
    this.hasError = true;

    if (typeof error === 'string') {
      this.errorMessage = error;
    } else {
      this.errorMessage =
        error?.body?.message ||
        'Unable to load job details. Please try again.';
    }

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
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
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