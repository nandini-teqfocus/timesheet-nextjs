/**
 * welcomeBanner - Personalized welcome header
 * @api userName - Display name of current user
 */
import { LightningElement, api } from 'lwc';

export default class WelcomeBanner extends LightningElement {
    @api userName = 'Alexander Vance';
    @api weekStart = '';
    @api weekEnd = '';
    @api loggedHours = 0;
    @api billableHours = 0;
    @api utilization = 0;

    get greeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }

    get currentDate() {
        return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    get userInitials() {
        if (!this.userName) return 'EM';
        const parts = this.userName.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    get currentWeekRange() {
        if (this.weekStart && this.weekEnd) {
            const start = new Date(this.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const end = new Date(this.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${start} – ${end}`;
        }
        // Default current week
        return 'Current Week';
    }

    get formattedLoggedHours() {
        return `${parseFloat(this.loggedHours || 0).toFixed(1)}h`;
    }

    get formattedBillableHours() {
        return `${parseFloat(this.billableHours || 0).toFixed(1)}h`;
    }

    get formattedUtilization() {
        return `${Math.round(this.utilization || 0)}%`;
    }

    handleQuickLog() {
        this.dispatchEvent(new CustomEvent('quicklog'));
    }

    handleSubmitTimesheet() {
        this.dispatchEvent(new CustomEvent('submittimesheet'));
    }

    handleViewAnalytics() {
        this.dispatchEvent(new CustomEvent('viewanalytics'));
    }

    handleRequestLeave() {
        this.dispatchEvent(new CustomEvent('requestleave'));
    }
}