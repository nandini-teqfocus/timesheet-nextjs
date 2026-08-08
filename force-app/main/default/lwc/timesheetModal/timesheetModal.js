/**
 * timesheetModal - Time entry add/edit modal
 * @api isOpen - Controls modal visibility
 * @api entry - Entry to edit (null for new)
 */
import { LightningElement, api, track } from 'lwc';

export default class TimesheetModal extends LightningElement {
    @api isOpen = false;
    @api entry = null;
    @track formData = { project: '', hours: 0, category: '', description: '' };

    handleClose() { this.dispatchEvent(new CustomEvent('close')); }
    handleSave() { this.dispatchEvent(new CustomEvent('save', { detail: { entry: this.formData } })); }
    handleFieldChange(event) {
        const field = event.currentTarget.dataset.field;
        this.formData = { ...this.formData, [field]: event.detail.value };
    }
}