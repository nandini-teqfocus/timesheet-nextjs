/**
 * reusableCard - Flexible SLDS card wrapper component
 * @api title - Card header title
 * @api iconName - Standard or utility icon identifier (e.g. 'standard:timesheet')
 * @api subtitle - Subtitle label shown below title
 * @api hasFooter - Renders footer slot wrapper if set to true
 */
import { LightningElement, api } from 'lwc';

export default class ReusableCard extends LightningElement {
    @api title = '';
    @api iconName = '';
    @api subtitle = '';
    @api hasFooter = false;
}