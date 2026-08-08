/**
 * loadingSpinner - standard SLDS loading screen component
 * @api alternativeText - Assistive text for screen readers (defaults to 'Loading...')
 */
import { LightningElement, api } from 'lwc';

export default class LoadingSpinner extends LightningElement {
    @api alternativeText = 'Loading...';
}