/**
 * emptyState - Illustrative SLDS fallback state
 * @api title - Main title string
 * @api message - Description helper string
 * @api iconName - Standard or utility icon identifier (defaults to 'utility:open_folder')
 * @api actionLabel - Button label; if provided, renders a brand button below the illustration
 */
import { LightningElement, api } from 'lwc';

export default class EmptyState extends LightningElement {
    @api title = 'No Records Found';
    @api message = 'There are no records to display under this view.';
    @api iconName = 'utility:open_folder';
    @api actionLabel = '';

    /**
     * Dispatch event when illustration action button is clicked.
     */
    handleActionClick() {
        this.dispatchEvent(new CustomEvent('actionclick'));
    }
}