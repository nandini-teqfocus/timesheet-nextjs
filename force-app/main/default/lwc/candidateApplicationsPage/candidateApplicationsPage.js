import { LightningElement, track, wire } from 'lwc';
import getAllReferrals from '@salesforce/apex/ReferralController.getAllReferrals';

export default class CandidateApplicationsPage extends LightningElement {
    @track allReferrals = [];
    @track filteredReferrals = [];
    @track isLoading = false;
    @track selectedReferralId = null;
    @track showDetailModal = false;

    // Filter states
    @track searchTerm = '';
    @track statusFilter = '';
    @track departmentFilter = '';

    statusOptions = [
        { label: 'All Statuses', value: '' },
        { label: 'Submitted', value: 'Submitted' },
        { label: 'Under Review', value: 'Under Review' },
        { label: 'Interview Scheduled', value: 'Interview Scheduled' },
        { label: 'Offer Extended', value: 'Offer Extended' },
        { label: 'Hired', value: 'Hired' },
        { label: 'Rejected', value: 'Rejected' }
    ];

    columns = [
        { fieldName: 'candidate_name', label: 'Candidate', type: 'text' },
        { fieldName: 'job_title', label: 'Job Posting', type: 'text' },
        { fieldName: 'department', label: 'Department', type: 'text' },
        { fieldName: 'status', label: 'Status', type: 'badge' },
        { fieldName: 'recruiter', label: 'Recruiter', type: 'text' },
        { fieldName: 'referrer', label: 'Referred By', type: 'text' },
        { fieldName: 'submission_date', label: 'Submission Date', type: 'text' },
        { fieldName: 'hiring_manager', label: 'Hiring Manager', type: 'text' }
    ];

    rowActions = [
        { name: 'view', label: 'View Details' }
    ];

    @wire(getAllReferrals, { limitSize: 1000 })
    wiredReferrals({ error, data }) {
        this.isLoading = true;
        if (data) {
            this.allReferrals = data.map(ref => ({
                id: ref.Id,
                candidate_name: ref.Candidate__r ? ref.Candidate__r.Name : 'Unknown',
                job_title: ref.Job_Posting__r ? ref.Job_Posting__r.Title__c : 'N/A',
                department: ref.Job_Posting__r?.Department__r ? (ref.Job_Posting__r.Department__r.Department_Name__c || ref.Job_Posting__r.Department__r.Name) : 'N/A',
                status: ref.Status__c,
                recruiter: ref.Recruiter_Assigned__r ? ref.Recruiter_Assigned__r.Name : 'Unassigned',
                referrer: ref.Referred_By__r ? ref.Referred_By__r.Name : 'System',
                submission_date: this.formatDate(ref.Submission_Date__c || ref.CreatedDate),
                hiring_manager: ref.Hiring_Manager_Assigned__r ? ref.Hiring_Manager_Assigned__r.Name : 'Unassigned',
                ...ref
            }));
            this.applyFilters();
            this.isLoading = false;
        } else if (error) {
            console.error('Error loading referrals:', error);
            this.isLoading = false;
        }
    }

    handleSearch(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.applyFilters();
    }

    handleStatusFilter(event) {
        this.statusFilter = event.detail.value;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredReferrals = this.allReferrals.filter(ref => {
            const matchesSearch = !this.searchTerm || 
                ref.candidate_name.toLowerCase().includes(this.searchTerm) || 
                ref.job_title.toLowerCase().includes(this.searchTerm);
            
            const matchesStatus = !this.statusFilter || ref.status === this.statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }

    handleRowAction(event) {
        const { action, row } = event.detail;
        if (action === 'view') {
            this.selectedReferralId = row.id;
            this.showDetailModal = true;
        }
    }

    handleCardClick(event) {
        this.selectedReferralId = event.detail.referralId;
        this.showDetailModal = true;
    }

    closeModal() {
        this.showDetailModal = false;
        this.selectedReferralId = null;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    }
}