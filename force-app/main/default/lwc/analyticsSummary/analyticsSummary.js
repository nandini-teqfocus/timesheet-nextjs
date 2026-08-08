/**
 * analyticsSummary - Period summary statistics
 * @api summary - { avgDaily, peakDay, mostBillable, leastActive }
 */
import { LightningElement, api } from 'lwc';
export default class AnalyticsSummary extends LightningElement {
    @api summary = {};
}