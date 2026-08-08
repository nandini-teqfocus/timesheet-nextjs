import { LightningElement, api } from 'lwc';

export default class ActivityTimeline extends LightningElement {
    @api activities = [];

    get hasActivities() {
        return this.activities && this.activities.length > 0;
    }

    get mappedActivities() {
        if (!this.activities) return [];
        return this.activities.map(act => {
            let iconName = 'utility:activity';
            let iconClass = 'slds-icon-text-default';
            
            if (act.type === 'submit') {
                iconName = 'utility:check';
                iconClass = 'success-icon';
            } else if (act.type === 'approved') {
                iconName = 'utility:approval';
                iconClass = 'success-icon';
            } else if (act.type === 'entry') {
                iconName = 'utility:user_role';
                iconClass = 'neutral-icon';
            } else if (act.type === 'rejected') {
                iconName = 'utility:clear';
                iconClass = 'error-icon';
            }
            
            // Generate display time
            let displayTime = act.timestamp;
            if (act.timestamp && act.timestamp.includes('T')) {
                try {
                    const dateObj = new Date(act.timestamp);
                    displayTime = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                } catch(e) {
                    displayTime = act.timestamp;
                }
            }

            return {
                ...act,
                iconName,
                iconClass,
                displayTime
            };
        });
    }
}