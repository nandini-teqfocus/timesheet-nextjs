/**
 * pageContainer - Standard page layout wrapper
 * @api title - Page title
 * @api subtitle - Page subtitle
 * @api showHeader - Show page header
 * @api isLoading - Set true to display loading spinner mask
 */
import { LightningElement, api } from 'lwc';

export default class PageContainer extends LightningElement {
    @api title = '';
    @api subtitle = '';
    @api showHeader = false;
    @api isLoading = false;
}