/**
 * toastMessage - standard custom SLDS notification alert
 * @api title - Main title inside notification
 * @api message - Context text inside notification
 * @api variant - 'info', 'success', 'warning', or 'error' (defaults to 'info')
 * @api duration - Automatic hide timeout in ms; set to 0 to disable auto-hide (defaults to 4000)
 */
import { LightningElement, api, track } from 'lwc';

export default class ToastMessage extends LightningElement {
    @api title = '';
    @api message = '';
    @api variant = 'info'; // success, error, warning, info
    @api duration = 4000;

    @track showToast = false;
    timeoutId;

    /**
     * Public method to render the toast notification and start auto-dismiss timers.
     */
    @api
    show() {
        this.showToast = true;
        
        // Clear any prior active timeout first
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        // Apply auto-hide timer if positive integer
        if (this.duration > 0) {
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            this.timeoutId = setTimeout(() => {
                this.hide();
            }, this.duration);
        }
    }

    /**
     * Public method to hide the toast notification.
     */
    @api
    hide() {
        this.showToast = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    /**
     * Internal click handler to hide manually.
     */
    handleCloseClick() {
        this.hide();
    }

    /**
     * Compute dynamic SLDS theme class for notifications.
     */
    get toastClass() {
        return `slds-notify slds-notify_toast slds-theme_${this.variant}`;
    }

    /**
     * Compute corresponding utility icon based on current variant.
     */
    get iconName() {
        switch (this.variant) {
            case 'success':
                return 'utility:success';
            case 'error':
                return 'utility:error';
            case 'warning':
                return 'utility:warning';
            case 'info':
            default:
                return 'utility:info';
        }
    }
}