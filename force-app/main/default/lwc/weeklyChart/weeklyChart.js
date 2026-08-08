/**
 * weeklyChart - Weekly hours bar chart component
 * @api chartData - Array of { day, hours, category } objects
 */
import { LightningElement, api } from 'lwc';

export default class WeeklyChart extends LightningElement {
    @api chartData = [];
    // TODO: Load Chart.js from static resource
    // TODO: Initialize chart in renderedCallback
}