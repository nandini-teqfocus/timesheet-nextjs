/**
 * trendsChart - Hours trend chart over time
 * @api trendData - Array of { period, hours, billable }
 * @api chartType - 'bar' | 'line'
 */
import { LightningElement, api } from 'lwc';
export default class TrendsChart extends LightningElement {
    @api trendData = [];
    @api chartType = 'bar';
    // TODO: Implement chart via Chart.js static resource
}