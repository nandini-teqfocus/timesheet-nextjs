import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getActivityTimeline from '@salesforce/apex/ReferralController.getActivityTimeline';

export default class RecentActivityTimeline extends NavigationMixin(LightningElement) {
    @track activities = [];
    @track isLoading = false;
    @track hasError = false;

    // Track wired result for cache refreshes
    wiredActivitiesResult;

    @wire(getActivityTimeline)
    wiredActivities(result) {
        this.wiredActivitiesResult = result;
        this.isLoading = true;
        const { error, data } = result;
        if (data) {
            this.activities = data.map(item => {
                // Calculate precise event timestamp based on activity type & edits
                const timestampVal = item.Comment_Text__c ? item.CreatedDate : (item.LastModifiedDate || item.CreatedDate);
                
                const activity = {
                    id: item.Id,
                    timestamp: timestampVal,
                    relativeTime: this.getRelativeTime(timestampVal)
                };

                if (item.Comment_Text__c) {
                    activity.type = 'comment';
                    activity.title = 'Recruiter Remark Added';
                    activity.candidateName = item.Employee_Referral__r.Candidate__r.Name;
                    activity.jobTitle = 'Comment Type: ' + (item.Comment_Type__c || 'General');
                    activity.description = `"${item.Comment_Text__c}" on referral ${item.Employee_Referral__r.Name}`;
                    activity.user = item.Commented_By__r.Name;
                    activity.status = 'COMMENTED';
                    activity.badgeClass = 'badge-custom badge-neutral';
                    activity.cardClass = 'activity-card activity-card-purple';
                    activity.referralId = item.Employee_Referral__c;
                } else {
                    activity.type = 'referral';
                    activity.candidateName = item.Candidate__r.Name;
                    activity.jobTitle = item.Job_Posting__r.Title__c;
                    activity.user = item.Referred_By__r.Name;
                    activity.status = item.Status__c;
                    activity.referralId = item.Id;

                    // Compute highly descriptive Title and dynamic Classes
                    if (item.Status__c === 'Hired') {
                        activity.title = 'Candidate Hired';
                        activity.cardClass = 'activity-card activity-card-success';
                        activity.badgeClass = 'badge-custom badge-success';
                    } else if (item.Status__c === 'Rejected') {
                        activity.title = 'Referral Rejected';
                        activity.cardClass = 'activity-card activity-card-error';
                        activity.badgeClass = 'badge-custom badge-error';
                    } else if (item.Status__c === 'Interview Scheduled') {
                        activity.title = 'Interview Scheduled';
                        activity.cardClass = 'activity-card activity-card-warning';
                        activity.badgeClass = 'badge-custom badge-warning';
                    } else if (item.Status__c === 'Under Review') {
                        activity.title = 'Recruiter Review In Progress';
                        activity.cardClass = 'activity-card activity-card-info';
                        activity.badgeClass = 'badge-custom badge-info';
                    } else {
                        activity.title = 'New Referral Submitted';
                        activity.cardClass = 'activity-card activity-card-info';
                        activity.badgeClass = 'badge-custom badge-info';
                    }

                    activity.description = `Referral submitted for job posting: ${item.Job_Posting__r.Title__c}`;
                }

                // Calculate User Initials
                if (activity.user) {
                    const names = activity.user.trim().split(/\s+/);
                    if (names.length >= 2) {
                        activity.userInitials = (names[0][0] + names[names.length - 1][0]).toUpperCase();
                    } else if (names.length === 1 && names[0]) {
                        activity.userInitials = names[0].slice(0, 2).toUpperCase();
                    } else {
                        activity.userInitials = '??';
                    }
                } else {
                    activity.userInitials = '??';
                }

                return activity;
            }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            this.isLoading = false;
        } else if (error) {
            console.error('Error loading activity timeline:', error);
            this.hasError = true;
            this.isLoading = false;
        }
    }

    // Auto-refresh when recruiter navigates/connects to the tab page
    connectedCallback() {
        this.refreshFeed();
    }

    async refreshFeed() {
        if (this.wiredActivitiesResult) {
            this.isLoading = true;
            try {
                await refreshApex(this.wiredActivitiesResult);
            } catch (error) {
                console.error('Error refreshing activities in connectedCallback:', error);
            } finally {
                this.isLoading = false;
            }
        }
    }

    async handleRefresh() {
        this.isLoading = true;
        try {
            await refreshApex(this.wiredActivitiesResult);
        } catch (error) {
            console.error('Error refreshing activity timeline manually:', error);
        } finally {
            this.isLoading = false;
        }
    }

    handleViewReferral(event) {
        const referralId = event.currentTarget.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: referralId,
                objectApiName: 'Employee_Referral__c',
                actionName: 'view'
            }
        });
    }

    getRelativeTime(dateString) {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays}d ago`;
    }
}