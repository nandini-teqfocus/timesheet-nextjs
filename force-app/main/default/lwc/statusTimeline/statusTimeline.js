import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getStatusHistory from '@salesforce/apex/ReferralController.getStatusHistory';

/**
 * Status Timeline Component
 * 
 * Displays a visual timeline of referral status changes including:
 * - Status changes with timestamps
 * - Recruiter comments and notes
 * - Recruiter information
 * - Status-specific icons and dynamic color schemes
 * - Responsive design
 */
export default class StatusTimeline extends LightningElement {
  // ===== PRIVATE BACKING PROPERTIES =====
  _recordId;
  _referralId;

  // ===== PUBLIC API =====
  @api 
  get recordId() {
    return this._recordId;
  }
  set recordId(value) {
    this._recordId = value;
    this.handleIdChange();
  }

  @api
  get referralId() {
    return this._referralId;
  }
  set referralId(value) {
    this._referralId = value;
    this.handleIdChange();
  }

  // ===== PRIVATE STATE =====
  @track statusHistory = [];
  @track isLoading = false;
  @track hasError = false;
  @track errorMessage = '';
  @track showDetailedView = false;

  // ===== COMPUTED PROPERTIES =====

  get actualReferralId() {
    return this._recordId || this._referralId;
  }

  get isEmpty() {
    return !this.isLoading && this.statusHistory.length === 0 && !this.hasError;
  }

  get showEmptyState() {
    return !this.isLoading && !this.hasError && this.isEmpty;
  }

  get showTimelineContent() {
    return !this.isLoading && !this.hasError && !this.isEmpty;
  }

  // ===== LIFECYCLE =====

  connectedCallback() {
    if (this.actualReferralId) {
      this.loadStatusHistory();
    }
  }

  handleIdChange() {
    if (this.actualReferralId) {
      this.loadStatusHistory();
    }
  }

  // ===== DATA LOADING =====

  /**
   * Load status history from Apex controller
   */
  loadStatusHistory() {
    const targetId = this.actualReferralId;
    console.log('StatusTimeline: Fetching live history for target = ' + targetId);
    if (!targetId) {
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    getStatusHistory({ referralId: targetId })
      .then((result) => {
        // Enforce newest activity first (Date DESC)
        this.statusHistory = (result || []).sort((a, b) => {
          const dateA = new Date(a.Changed_Date__c || a.CreatedDate || 0);
          const dateB = new Date(b.Changed_Date__c || b.CreatedDate || 0);
          return dateB - dateA;
        });
        
        this.formatStatusHistory();
        this.isLoading = false;
      })
      .catch((error) => {
        this.handleError(error);
      });
  }

  /**
   * Format status history data
   */
  formatStatusHistory() {
    this.statusHistory = this.statusHistory.map((item, index) => {
      const statusValue = item.New_Status__c || item.status || 'Submitted';
      const dateValue = item.Changed_Date__c || item.CreatedDate || item.created_date || new Date().toISOString();
      
      let recruiterName = 'System';
      if (item.Changed_By__r && item.Changed_By__r.Name) {
        recruiterName = item.Changed_By__r.Name;
      } else {
        recruiterName = this.getRecruiterName(item) || 'System';
      }

      const notesValue = item.Change_Reason__c || item.comments || item.notes || '';

      return {
        ...item,
        id: item.Id || item.id || `status-${index}`,
        status: statusValue,
        created_date: dateValue,
        created_time: this.formatTime(dateValue),
        formatted_date: this.formatDate(dateValue),
        recruiter_name: recruiterName,
        comments: notesValue,
        statusIcon: this.getStatusIcon(statusValue),
        iconClass: this.getStatusIconClass(statusValue)
      };
    });
  }

  // ===== EVENT HANDLERS =====

  /**
   * Toggle detailed view
   */
  toggleDetailedView() {
    this.showDetailedView = !this.showDetailedView;
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('Error loading status history:', error);
    this.hasError = true;

    if (typeof error === 'string') {
      this.errorMessage = error;
    } else {
      this.errorMessage =
        error?.body?.message ||
        'Unable to load status history. Please try again.';
    }

    this.isLoading = false;
    this.showErrorToast(this.errorMessage);
  }

  // ===== UTILITY METHODS =====

  /**
   * Get status-specific icon
   */
  getStatusIcon(status) {
    const iconMap = {
      'Submitted': 'utility:send',
      'Under Review': 'utility:search',
      'Interview Scheduled': 'utility:calendar',
      'Selected': 'utility:case',
      'Hired': 'utility:check',
      'Rejected': 'utility:close',
      'Withdrawn': 'utility:undo'
    };

    return iconMap[status] || 'utility:info';
  }

  /**
   * Get status-specific icon container CSS class for beautiful colored circle backgrounds
   */
  getStatusIconClass(status) {
    const classMap = {
      'Submitted': 'timeline-icon-container icon-submitted',
      'Under Review': 'timeline-icon-container icon-review',
      'Interview Scheduled': 'timeline-icon-container icon-interview',
      'Selected': 'timeline-icon-container icon-selected',
      'Hired': 'timeline-icon-container icon-hired',
      'Rejected': 'timeline-icon-container icon-rejected',
      'Withdrawn': 'timeline-icon-container icon-withdrawn'
    };

    return classMap[status] || 'timeline-icon-container icon-default';
  }

  /**
   * Get recruiter name from status history item
   */
  getRecruiterName(item) {
    return (
      item.recruiter_name ||
      item.recruiter ||
      item.created_by_name ||
      item.created_by
    );
  }

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
   * Format time for display
   */
  formatTime(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
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