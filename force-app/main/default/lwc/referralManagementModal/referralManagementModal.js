import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getReferralDetail from '@salesforce/apex/ReferralController.getReferralDetail';
import updateReferralStatus from '@salesforce/apex/ReferralController.updateReferralStatus';
import assignHiringManager from '@salesforce/apex/ReferralController.assignHiringManager';
import addComment from '@salesforce/apex/ReferralController.addComment';
import getResumeDetail from '@salesforce/apex/FileUploadController.getResumeDetail';
import hasHiringManagerAccess from '@salesforce/customPermission/EmpRef_HiringManager';

/**
 * Centralized Referral Management Modal
 * Combines View Details, Update Status, Assign Manager, and Add Comment into one workspace.
 */
export default class ReferralManagementModal extends LightningElement {
  @api referralId;

  @track referralData = null;
  @track isLoading = false;
  @track isSaving = false;

  // Form states
  @track newStatus = '';
  @track newManagerId = '';
  @track internalNote = '';
  @track resumeDetail = null;
  @track visibleToEmployee = false;

  statusOptions = [
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Interview Scheduled', value: 'Interview Scheduled' },
    { label: 'Selected', value: 'Selected' },
    { label: 'Hired', value: 'Hired' },
    { label: 'Rejected', value: 'Rejected' }
  ];

  // ===== LIFECYCLE =====

  connectedCallback() {
    this.loadReferralDetails();
  }

  // ===== DATA LOADING =====

  loadReferralDetails() {
    if (!this.referralId) return;

    this.isLoading = true;
    getReferralDetail({ referralId: this.referralId })
      .then((result) => {
        if (result) {
          this.referralData = result;
          // Pre-populate editable fields
          this.newStatus = result.Status__c;
          this.newManagerId = result.Hiring_Manager_Assigned__c;
          
          // Fetch resume detail if document ID is stored
          if (result.Resume_Content_Document_Id__c || result.Candidate__r?.Resume_Uploaded__c) {
            this.loadResumeDetail();
          }
        }
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Error loading referral details:', error);
        this.showErrorToast('Error loading referral information');
        this.isLoading = false;
      });
  }

  loadResumeDetail() {
    getResumeDetail({ referralId: this.referralId })
      .then(result => {
        this.resumeDetail = result;
      })
      .catch(error => {
        console.error('Error loading resume detail:', error);
      });
  }

  // ===== EVENT HANDLERS =====

  handleStatusChange(event) {
    this.newStatus = event.detail.value;
  }

  handleManagerChange(event) {
    this.newManagerId = event.detail.value[0];
  }

  handleNoteChange(event) {
    this.internalNote = event.detail.value;
  }

  handleVisibilityChange(event) {
    this.visibleToEmployee = event.target.checked;
  }

  handleViewResume() {
    if (this.resumeDetail && this.resumeDetail.documentId) {
      window.open(`/lightning/r/ContentDocument/${this.resumeDetail.documentId}/view`, '_blank');
    } else if (this.referralData && this.referralData.Resume_Link__c) {
      window.open(this.referralData.Resume_Link__c, '_blank');
    }
  }

  handleDownloadResume() {
    if (this.resumeDetail && this.resumeDetail.documentId) {
      window.open(`/sfc/servlet.shepherd/document/download/${this.resumeDetail.documentId}`, '_blank');
    }
  }

  handleSave() {
    this.isSaving = true;
    const promises = [];

    // 1. Check if Status changed
    if (this.newStatus !== this.referralData.Status__c) {
      promises.push(updateReferralStatus({
        referralId: this.referralId,
        newStatus: this.newStatus
      }));
    }

    // 2. Check if Manager changed
    if (this.newManagerId !== this.referralData.Hiring_Manager_Assigned__c) {
      promises.push(assignHiringManager({
        referralIds: [this.referralId],
        managerId: this.newManagerId
      }));
    }

    // 3. Check if Note was added
    if (this.internalNote && this.internalNote.trim()) {
      promises.push(addComment({
        referralId: this.referralId,
        commentText: this.internalNote,
        commentType: 'Internal Note',
        visibleToEmployee: this.visibleToEmployee
      }));
    }

    if (promises.length === 0) {
      this.isSaving = false;
      this.handleClose();
      return;
    }

    Promise.all(promises)
      .then(() => {
        this.isSaving = false;
        this.showSuccessToast('All changes saved successfully');
        this.dispatchEvent(new CustomEvent('save'));
      })
      .catch((error) => {
        this.isSaving = false;
        console.error('Error saving changes:', error);
        this.showErrorToast(error?.body?.message || 'Some changes could not be saved');
      });
  }

  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  // ===== GETTERS =====

  get stages() {
    const current = this.referralStatus;
    const allStages = ['Submitted', 'Under Review', 'Interview Scheduled', 'Selected', 'Hired'];
    const isRejected = current === 'Rejected';
    
    return allStages.map((stage) => {
      let isComplete = false;
      let isActive = false;
      let displayLabel = stage;
      
      if (isRejected && stage === 'Hired') {
        displayLabel = 'Rejected';
      }

      const currentIndex = allStages.indexOf(current === 'Rejected' ? 'Hired' : current);
      
      if (current === 'Rejected' && stage === 'Hired') {
        isActive = true;
      } else if (stage === current) {
        isActive = true;
      } else if (allStages.indexOf(stage) < currentIndex) {
        isComplete = true;
      }
      
      let cssClass = 'slds-path__item';
      if (isActive) {
        cssClass += ' slds-is-active';
      } else if (isComplete) {
        cssClass += ' slds-is-complete';
      } else {
        cssClass += ' slds-is-incomplete';
      }

      return {
        label: displayLabel,
        value: stage,
        cssClass: cssClass
      };
    });
  }

  get candidateInitials() {
    if (!this.candidateName) return '??';
    const parts = this.candidateName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return this.candidateName.substring(0, 2).toUpperCase();
  }

  get isSaveDisabled() {
    return this.isLoading || this.isSaving || hasHiringManagerAccess;
  }

  get isHiringManager() {
    return hasHiringManagerAccess;
  }

  get columnSize() {
    return this.isHiringManager ? '12' : '4';
  }

  get modalTitle() {
    return hasHiringManagerAccess ? 'Referral Details' : 'Manage Referral';
  }

  get candidateName() {
    return this.referralData?.Candidate__r?.Name || 'Unknown';
  }

  get candidateEmail() {
    return this.referralData?.Candidate__r?.Email__c || 'N/A';
  }

  get candidatePhone() {
    return this.referralData?.Candidate__r?.Phone__c || 'N/A';
  }

  get linkedinUrl() {
    return this.referralData?.Candidate__r?.LinkedIn_URL__c;
  }

  get jobTitle() {
    return this.referralData?.Job_Posting__r?.Title__c || 'N/A';
  }

  get departmentName() {
    const dept = this.referralData?.Job_Posting__r?.Department__r;
    return dept?.Department_Name__c || dept?.Name || 'N/A';
  }

  get jobLocation() {
    return this.referralData?.Job_Posting__r?.Location__c || 'N/A';
  }

  get jobDescription() {
    return this.referralData?.Job_Posting__r?.Job_Description__c || 'No description available.';
  }

  get referrerName() {
    return this.referralData?.Referred_By__r?.Name || 'N/A';
  }

  get submittedDate() {
    return this.referralData?.Submission_Date__c;
  }

  get referralStatus() {
    return this.referralData?.Status__c || 'Submitted';
  }

  get bonusEligibility() {
    return this.referralData?.Bonus_Eligible__c ? 'Eligible' : 'Not Eligible';
  }

  get currentManagerName() {
    return this.referralData?.Hiring_Manager_Assigned__r?.Name || 'Unassigned';
  }

  get lastStatusChange() {
    return this.referralData?.Last_Status_Change__c;
  }

  get hasResume() {
    return this.referralData?.Resume_Content_Document_Id__c || this.resumeDetail || this.referralData?.Resume_Link__c;
  }

  get resumeStatus() {
    if (this.resumeDetail) {
      return this.resumeDetail.fileName;
    }
    return this.referralData?.Resume_Link__c ? 'Link Provided' : 'File Uploaded';
  }

  // ===== TOAST UTILITIES =====

  showSuccessToast(message) {
    this.dispatchEvent(new ShowToastEvent({
      title: 'Success',
      message: message,
      variant: 'success'
    }));
  }

  showErrorToast(message) {
    this.dispatchEvent(new ShowToastEvent({
      title: 'Error',
      message: message,
      variant: 'error'
    }));
  }
}