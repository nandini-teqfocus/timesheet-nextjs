/**
 * timesheetSummary - Hours summary display
 * @api dailyHours - Hours for selected day
 * @api weeklyHours - Total hours for week
 * @api billableHours - Billable hours count
 */
import { LightningElement, api } from 'lwc';

export default class TimesheetSummary extends LightningElement {
    @api dailyHours = 0;
    @api weeklyHours = 0;
    @api billableHours = 0;

    get utilizationPercent() {
        return this.weeklyHours > 0 ? Math.round((this.billableHours / this.weeklyHours) * 100) : 0;
    }
}