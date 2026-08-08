/**
 * utilizationCard - Utilization rate display
 * @api utilizationRate - Percentage (0-100)
 * @api billableHours - Billable hours count
 * @api totalHours - Total hours count
 */
import { LightningElement, api } from 'lwc';
export default class UtilizationCard extends LightningElement {
    @api utilizationRate = 0;
    @api billableHours = 0;
    @api totalHours = 0;
    get rateLabel() { return `${this.utilizationRate}%`; }
}