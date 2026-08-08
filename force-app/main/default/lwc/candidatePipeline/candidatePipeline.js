import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getAllReferrals from '@salesforce/apex/ReferralController.getAllReferrals';
import updateReferralStatus from '@salesforce/apex/ReferralController.updateReferralStatus';

export default class CandidatePipeline extends LightningElement {
    @track pipelineData = [];
    @track isLoading = false;
    
    // Store wired result for real-time refreshes
    wiredReferralsResult;

    statusColumns = [
        { label: 'Submitted', value: 'Submitted', headerClass: 'col-header col-submitted' },
        { label: 'Under Review', value: 'Under Review', headerClass: 'col-header col-review' },
        { label: 'Interview Scheduled', value: 'Interview Scheduled', headerClass: 'col-header col-interview' },
        { label: 'Hired', value: 'Hired', headerClass: 'col-header col-hired' },
        { label: 'Rejected', value: 'Rejected', headerClass: 'col-header col-rejected' }
    ];

    @wire(getAllReferrals, { limitSize: 500 })
    wiredReferrals(result) {
        this.wiredReferralsResult = result;
        this.isLoading = true;
        const { error, data } = result;
        if (data) {
            this.isLoading = false;
            this.buildPipeline(data);
        } else if (error) {
            console.error('Error loading pipeline data:', error);
            this.isLoading = false;
        }
    }

    buildPipeline(referrals) {
        this.pipelineData = this.statusColumns.map(status => {
            const filtered = referrals.filter(r => r.Status__c === status.value).map(r => {
                const candidateName = r.Candidate__r ? r.Candidate__r.Name : 'Unknown';
                
                // Calculate Candidate Initials
                let candidateInitials = '??';
                if (candidateName) {
                    const parts = candidateName.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        candidateInitials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                    } else if (parts.length === 1 && parts[0]) {
                        candidateInitials = parts[0].slice(0, 2).toUpperCase();
                    }
                }

                // Priority Badge settings
                const priority = this.getPriority(r.Submission_Date__c || r.CreatedDate);
                let priorityClass = 'badge-priority badge-low';
                if (priority === 'URGENT') {
                    priorityClass = 'badge-priority badge-urgent';
                } else if (priority === 'MEDIUM') {
                    priorityClass = 'badge-priority badge-medium';
                }

                return {
                    id: r.Id,
                    candidateName: candidateName,
                    candidateInitials: candidateInitials,
                    jobTitle: r.Job_Posting__r ? r.Job_Posting__r.Title__c : 'N/A',
                    department: r.Job_Posting__r?.Department__r ? (r.Job_Posting__r.Department__r.Department_Name__c || r.Job_Posting__r.Department__r.Name) : 'N/A',
                    manager: r.Hiring_Manager_Assigned__r ? r.Hiring_Manager_Assigned__r.Name : 'Unassigned',
                    recruiter: r.Recruiter_Assigned__r ? r.Recruiter_Assigned__r.Name : 'Unassigned',
                    submissionDate: this.formatDate(r.Submission_Date__c || r.CreatedDate),
                    priority: priority,
                    priorityClass: priorityClass,
                    hasResume: r.Candidate__r ? r.Candidate__r.Resume_Uploaded__c : false,
                    status: r.Status__c
                };
            });
            return {
                ...status,
                count: filtered.length,
                referrals: filtered
            };
        });
    }

    getPriority(dateString) {
        if (!dateString) return 'LOW';
        const diff = new Date() - new Date(dateString);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days > 14) return 'URGENT';
        if (days > 7) return 'MEDIUM';
        return 'LOW';
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    }

    handleCardClick(event) {
        const referralId = event.currentTarget.dataset.id;
        this.dispatchEvent(new CustomEvent('cardclick', {
            detail: { referralId }
        }));
    }

    // ==========================================
    // HTML5 DRAG & DROP IMPLEMENTATION
    // ==========================================
    
    handleDragStart(event) {
        const referralId = event.currentTarget.dataset.id;
        event.dataTransfer.setData('text/plain', referralId);
        event.currentTarget.classList.add('dragging');
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDragEnter(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }

    async handleDrop(event) {
        event.preventDefault();
        const dropZone = event.currentTarget;
        dropZone.classList.remove('drag-over');
        
        const referralId = event.dataTransfer.getData('text/plain');
        const targetStatus = dropZone.dataset.status;
        
        if (!referralId || !targetStatus) return;

        // Visual Optimisation: Remove dragging class from any dragging card
        const draggingCard = this.template.querySelector('.dragging');
        if (draggingCard) {
            draggingCard.classList.remove('dragging');
        }

        this.updateStatus(referralId, targetStatus);
    }

    async updateStatus(referralId, targetStatus) {
        this.isLoading = true;
        try {
            const response = await updateReferralStatus({ referralId, newStatus: targetStatus });
            if (response && response.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: `Hiring stage updated to "${targetStatus}" successfully.`,
                    variant: 'success'
                }));
                // Force dynamic refresh of wired SOQL dataset
                await refreshApex(this.wiredReferralsResult);
            } else {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error Updating Stage',
                    message: response?.message || 'The status change request was rejected.',
                    variant: 'error'
                }));
            }
        } catch (error) {
            console.error('Error executing status update:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'DML Operation Failed',
                message: error.body?.message || 'An unexpected error occurred during database commit.',
                variant: 'error'
            }));
        } finally {
            this.isLoading = false;
        }
    }
}