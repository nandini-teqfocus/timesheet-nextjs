import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import submitReferralApex from '@salesforce/apex/ReferralController.submitReferral';
import getOpenJobPostings from '@salesforce/apex/JobController.getOpenJobPostings';
import Id from '@salesforce/user/Id';

/**
 * Referral Submission Wizard Component
 * 
 * Multi-step wizard for submitting referrals:
 * - Step 1: Select job or use pre-selected job
 * - Step 2: Enter candidate information with duplicate detection
 * - Step 3: Upload resume
 * - Step 4: Review and confirm submission
 * 
 * Usage:
 * <c-referral-wizard
 *   job-id="a001000000Tc69AAAB"
 *   onclose={handleClose}
 *   onsuccess={handleSuccess}
 * ></c-referral-wizard>
 */
export default class ReferralWizard extends LightningElement {
  // ===== PUBLIC API =====
  // ===== PRIVATE STATE =====
  @track _jobId; // Internal Job ID state
  @track currentStep = '1';
  @track availableJobs = [];
  @track selectedJobForStep = '';
  @track selectedJobTitle = '';
  @track selectedJobDepartment = '';
  @track selectedJobLocation = '';

  @track candidateData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentCompany: '',
    currentTitle: '',
    linkedinUrl: '',
    comments: ''
  };
  
  currentUserId = Id;
  allowedFileTypes = ['.pdf', '.doc', '.docx'];

  @track selectedJobEmploymentType = '';
  @track selectedJobExperienceLevel = '';
  @track uploadedResumeDocumentId = '';
  @track uploadedResumeFileName = '';
  @track resumeLink = '';
  @track isSubmitting = false;
  @track isLoading = false;

  // ===== PUBLIC API =====
  @api 
  get jobId() {
    return this._jobId;
  }
  set jobId(value) {
    this._jobId = value;
    if (this.availableJobs.length > 0) {
      this.loadSelectedJob();
    }
  }

  // ===== LIFECYCLE =====

  connectedCallback() {
    this.loadAvailableJobs();
  }

  // ===== COMPUTED PROPERTIES =====

  get isFirstStep() {
    return this.currentStep === '1';
  }

  get isLastStep() {
    return this.currentStep === '4';
  }

  get isStep1() {
    return this.currentStep === '1';
  }

  get isStep2() {
    return this.currentStep === '2';
  }

  get isStep3() {
    return this.currentStep === '3';
  }

  get isStep4() {
    return this.currentStep === '4';
  }

  get isNextDisabled() {
    // Validate current step before allowing next
    switch (this.currentStep) {
      case '1':
        return !this.jobId && !this.selectedJobForStep;
      case '2':
        return !this.candidateData.firstName ||
          !this.candidateData.lastName ||
          !this.candidateData.email;
      case '3':
        return false; // Resume link is optional
      default:
        return false;
    }
  }

  get isSubmitDisabled() {
    return this.isSubmitting;
  }

  // ===== DATA LOADING =====

  /**
   * Load available jobs for selection
   */
  loadAvailableJobs() {
    getOpenJobPostings({ limitSize: 500 })
      .then((result) => {
        this.availableJobs = (result || []).map((job) => ({
          label: `${job.Title__c || job.Name} - ${job.Location__c || 'Remote'}`,
          value: job.Id,
          department: job.Department__r ? job.Department__r.Name : '',
          location: job.Location__c || 'Remote',
          title: job.Title__c || job.Name,
          employmentType: job.Employment_Type__c || '',
          experienceLevel: job.Experience_Level__c || ''
        }));

        // Now that jobs are loaded, if we have a jobId, load its details
        if (this.jobId) {
          this.loadSelectedJob();
        }
      })
      .catch((error) => {
        console.error('Error loading jobs:', error);
        this.showErrorToast('Unable to load available jobs');
      });
  }

  /**
   * Load selected job details
   */
  loadSelectedJob() {
    if (!this._jobId) return;
    const job = this.availableJobs.find((j) => j.value === this._jobId);
    if (job) {
      this.selectedJobTitle = job.title;
      this.selectedJobLocation = job.location;
      this.selectedJobDepartment = job.department;
      this.selectedJobEmploymentType = job.employmentType;
      this.selectedJobExperienceLevel = job.experienceLevel;
      this.selectedJobForStep = job.value;
    }
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle job selection in step 1
   */
  handleJobSelection(event) {
    const jobId = event.detail.value;
    this.selectedJobForStep = jobId;
    this._jobId = jobId;
    console.log('Wizard - Job Selected:', jobId);
    
    const selectedJob = this.availableJobs.find((j) => j.value === jobId);
    if (selectedJob) {
      this.selectedJobTitle = selectedJob.title;
      this.selectedJobLocation = selectedJob.location;
      this.selectedJobDepartment = selectedJob.department;
      this.selectedJobEmploymentType = selectedJob.employmentType;
      this.selectedJobExperienceLevel = selectedJob.experienceLevel;
    }
  }

  /**
   * Handle candidate data input changes
   */
  handleCandidateInputChange(event) {
    const fieldName = event.target.name;
    const value = event.target.value;
    this.candidateData = {
      ...this.candidateData,
      [fieldName]: value
    };

    // Check for duplicate referrals on email change
    if (fieldName === 'email') {
      this.checkForDuplicateReferral(value);
    }
  }

  /**
   * Check for duplicate referrals
   */
  checkForDuplicateReferral(email) {
    // TODO: Call backend service to check for existing referrals
    // For now, just set flag to false
    this.duplicateReferralWarning = false;
  }

  // ===== GETTERS FOR REVIEW STEP 4 =====
  get reviewJobTitle() { return this.selectedJobTitle || 'N/A'; }
  get reviewJobDepartment() { return this.selectedJobDepartment || 'N/A'; }
  get reviewJobLocation() { return this.selectedJobLocation || 'N/A'; }
  get reviewJobEmploymentType() { return this.selectedJobEmploymentType || 'N/A'; }
  get reviewJobExperienceLevel() { return this.selectedJobExperienceLevel || 'N/A'; }

  get reviewCandidateFirstName() { return this.candidateData.firstName || 'N/A'; }
  get reviewCandidateLastName() { return this.candidateData.lastName || 'N/A'; }
  get reviewCandidateFullName() {
    if (this.candidateData.firstName || this.candidateData.lastName) {
      return `${this.candidateData.firstName || ''} ${this.candidateData.lastName || ''}`.trim();
    }
    return 'N/A';
  }
  get reviewCandidateEmail() { return this.candidateData.email || 'N/A'; }
  get reviewCandidatePhone() { return this.candidateData.phone || 'N/A'; }
  get reviewCandidateCompany() { return this.candidateData.currentCompany || 'N/A'; }
  get reviewCandidateTitle() { return this.candidateData.currentTitle || 'N/A'; }
  get reviewCandidateLinkedin() { return this.candidateData.linkedinUrl || 'N/A'; }
  get reviewCandidateComments() { return this.candidateData.comments || 'N/A'; }
  get reviewResumeFileName() { return this.uploadedResumeFileName || 'N/A'; }
  
  get reviewReferredBy() { return 'Current User'; }
  
  get reviewSubmissionDate() {
    return new Date().toLocaleDateString() || 'N/A';
  }

  /**
   * Handle successful resume upload
   */
  handleUploadFinished(event) {
    const uploadedFiles = event.detail.files;
    if (uploadedFiles.length > 0) {
      this.uploadedResumeDocumentId = uploadedFiles[0].documentId;
      this.uploadedResumeFileName = uploadedFiles[0].name;
      this.showSuccessToast('Resume uploaded successfully');
    }
  }

  /**
   * Go to specific step
   */
  goToStep(event) {
    const step = event.currentTarget.dataset.step;
    if (step && this.canNavigateToStep(step)) {
      this.currentStep = step;
    }
  }

  /**
   * Go to previous step
   */
  goToPreviousStep() {
    const stepNum = parseInt(this.currentStep, 10);
    if (stepNum > 1) {
      this.currentStep = String(stepNum - 1);
    }
  }

  /**
   * Go to next step with validation
   */
  goToNextStep() {
    if (!this.isNextDisabled) {
      const stepNum = parseInt(this.currentStep, 10);
      if (stepNum < 4) {
        this.currentStep = String(stepNum + 1);
      }
    }
  }

  /**
   * Check if navigation to step is allowed
   */
  canNavigateToStep(targetStep) {
    const currentNum = parseInt(this.currentStep, 10);
    const targetNum = parseInt(targetStep, 10);

    // Can navigate backward freely, but not forward past current step
    return targetNum <= currentNum || targetNum === currentNum + 1;
  }

  /**
   * Submit referral
   */
  submitReferral() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.executeSubmit();
  }

  executeSubmit() {
    // Explicitly resolve and stringify the Job ID from all possible sources
    const resolvedId = this._jobId || this.selectedJobForStep || (this.availableJobs.find(j => j.title === this.selectedJobTitle)?.value);
    const finalJobId = resolvedId ? String(resolvedId) : null;

    const referralRequest = {
      jobPostingId: finalJobId,
      candidateFirstName: this.candidateData.firstName,
      candidateLastName: this.candidateData.lastName,
      candidateEmail: this.candidateData.email,
      candidatePhone: this.candidateData.phone,
      currentCompany: this.candidateData.currentCompany,
      currentTitle: this.candidateData.currentTitle,
      linkedinUrl: this.candidateData.linkedinUrl,
      notes: this.candidateData.comments,
      resumeLink: this.resumeLink,
      resumeDocumentId: this.uploadedResumeDocumentId
    };

    const jsonPayload = JSON.stringify(referralRequest);
    console.log('Wizard - EXECUTE SUBMIT');
    console.log('Resolved Job ID:', finalJobId);
    console.log('Request Payload (JSON):', jsonPayload);

    submitReferralApex({ 
      jobId: finalJobId,
      requestJson: jsonPayload 
    })
      .then((result) => {
        this.isSubmitting = false;
        if (result.success) {
          this.showSuccessToast(
            result.message || 'Referral submitted successfully!'
          );
          this.dispatchEvent(
            new CustomEvent('success', {
              detail: {
                referralId: result.dataJson,
                message: result.message
              }
            })
          );
        } else {
          this.showErrorToast(
            result.message || 'Failed to submit referral'
          );
        }
      })
      .catch((error) => {
        this.isSubmitting = false;
        console.error('Error submitting referral:', error);
        
        // Expose the REAL Apex exception message if available
        const errorMessage = error?.body?.message || 
                             error?.message || 
                             'An error occurred while submitting your referral';
                             
        this.showErrorToast(errorMessage);
      });
  }

  /**
   * Handle close button
   */
  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  /**
   * Handle backdrop click
   */
  handleBackdropClick(event) {
    if (event.target.classList.contains('modal-backdrop')) {
      this.handleClose();
    }
  }

  // ===== VALIDATION & UTILITIES =====

  /**
   * Validate form data before submission
   */
  validateForm() {
    const { firstName, lastName, email } = this.candidateData;
    const currentJobId = this._jobId || this.selectedJobForStep;

    console.log('Wizard - Validating Form. Current Job ID:', currentJobId);
    if (!currentJobId) {
      console.error('Wizard - Job ID is MISSING during validation!');
      this.showErrorToast('Job selection is missing. Please go back to Step 1.');
      return false;
    }

    if (!firstName || !lastName || !email) {
      this.showErrorToast('Please fill in all required fields');
      return false;
    }

    return true;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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