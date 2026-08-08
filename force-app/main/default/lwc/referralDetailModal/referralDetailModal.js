import { LightningElement, api, track } from 'lwc';
import getReferralDetail from '@salesforce/apex/ReferralController.getReferralDetail';

/**
 * Referral Detail Modal Component
 * Displays complete referral, candidate, and job information.
 */
export default class ReferralDetailModal extends LightningElement {
  @api referralId;

  @track referralData = null;
  @track isLoading = false;
  @track hasError = false;

  connectedCallback() {
    this.loadReferralDetails();
  }

  loadReferralDetails() {
    if (!this.referralId) return;

    this.isLoading = true;
    getReferralDetail({ referralId: this.referralId })
      .then((result) => {
        if (result) {
          this.referralData = result;
        }
        this.isLoading = false;
      })
      .catch((error) => {
        console.error('Error loading referral details:', error);
        this.hasError = true;
        this.isLoading = false;
      });
  }

  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  // ===== NULL-SAFE GETTERS =====

  get referralName() {
    return this.referralData?.Name || '';
  }

  get candidateName() {
    return this.referralData?.Candidate__r?.Name || 'Unknown';
  }

  get candidateEmail() {
    return this.referralData?.Candidate__r?.Email__c || 'N/A';
  }

  get jobTitle() {
    return this.referralData?.Job_Posting__r?.Title__c || 'N/A';
  }

  get departmentName() {
    const dept = this.referralData?.Job_Posting__r?.Department__r;
    return dept?.Department_Name__c || dept?.Name || 'N/A';
  }

  get status() {
    return this.referralData?.Status__c || 'Unknown';
  }

  get submissionDate() {
    return this.referralData?.Submission_Date__c || null;
  }
}