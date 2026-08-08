import { LightningElement, api } from 'lwc';

export default class ConfirmationDialog extends LightningElement {
    @api isOpen = false;
    @api title = 'Confirm Action';
    @api message = 'Are you sure you want to proceed?';
    @api confirmLabel = 'Confirm';
    @api cancelLabel = 'Cancel';
    @api variant = 'warning'; // warning, error, success, brand, destructive

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleConfirm() {
        this.dispatchEvent(new CustomEvent('confirm'));
    }

    get headerClass() {
        return `slds-modal__header slds-theme_alert-texture slds-theme_${this.variant}`;
    }

    get confirmButtonClass() {
        if (this.variant === 'destructive') {
            return 'slds-button slds-button_destructive';
        }
        return 'slds-button slds-button_brand';
    }
}