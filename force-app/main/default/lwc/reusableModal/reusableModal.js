/**
 * reusableModal - Responsive SLDS modal overlay component
 * @api isOpen - Flag to display or hide the modal dialog
 * @api title - Heading text inside the modal header
 */
import { LightningElement, api } from 'lwc';

export default class ReusableModal extends LightningElement {
    @api isOpen = false;
    @api title = 'Modal Dialog';

    /**
     * Dispatch close event so parent component can toggle the isOpen state.
     */
    handleCloseClick() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}