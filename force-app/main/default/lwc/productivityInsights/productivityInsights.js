/**
 * productivityInsights - Productivity insights panel
 * @api insights - Array of { label, value, trend, icon }
 */
import { LightningElement, api } from 'lwc';
export default class ProductivityInsights extends LightningElement {
    @api insights = [];
    get hasInsights() { return this.insights && this.insights.length > 0; }
}