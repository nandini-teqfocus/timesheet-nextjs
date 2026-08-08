import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getReferralDetail from '@salesforce/apex/ReferralController.getReferralDetail';
import getResumeDetail from '@salesforce/apex/FileUploadController.getResumeDetail';

/**
 * Referral Employee Modal (Read-Only)
 * Centralized workspace for employees to track their submitted referrals.
 */
export default class ReferralEmployeeModal extends LightningElement {
  @api referralId;

  @track referralData = null;
  @track resumeDetail = null;
  @track isLoading = false;

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
          // Fetch resume detail if document ID is stored or flag is true
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
    } else if (this.referralData && this.referralData.Resume_Link__c) {
      window.open(this.referralData.Resume_Link__c, '_blank');
    }
  }


  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  // ===== GETTERS =====

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

  get employmentType() {
    return this.referralData?.Job_Posting__r?.Employment_Type__c || 'Full-Time';
  }

  get experienceLevel() {
    return this.referralData?.Job_Posting__r?.Experience_Level__c || 'Mid-Level';
  }

  get submittedDate() {
    return this.referralData?.Submission_Date__c;
  }

  get referralStatus() {
    return this.referralData?.Status__c || 'Submitted';
  }

  get bonusStatus() {
    return this.referralData?.Bonus_Eligible__c ? 'Eligible for Bonus' : 'Standard Referral';
  }

  get bonusVariant() {
    return this.referralData?.Bonus_Eligible__c ? 'success' : 'lightest';
  }

  get currentManagerName() {
    return this.referralData?.Hiring_Manager_Assigned__r?.Name || 'Reviewing by HR';
  }

  get hasResume() {
    return this.referralData?.Resume_Content_Document_Id__c || this.resumeDetail || this.referralData?.Resume_Link__c;
  }

  get resumeStatus() {
    if (this.resumeDetail) {
      return this.resumeDetail.fileName;
    }
    return this.referralData?.Resume_Link__c ? 'External Link' : 'Official Resume File';
  }

  // ===== TOAST UTILITIES =====

  showErrorToast(message) {
    this.dispatchEvent(new ShowToastEvent({
      title: 'Error',
      message: message,
      variant: 'error'
    }));
  }
}