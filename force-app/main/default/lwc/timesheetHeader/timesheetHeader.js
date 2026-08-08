/**
 * timesheetHeader - Week navigation header
 * @api weekStart - Start date of current week
 * @api weekEnd - End date of current week
 * @api totalHours - Total hours for the week
 */
import { LightningElement, api } from 'lwc';

export default class TimesheetHeader extends LightningElement {
    @api weekStart;
    @api weekEnd;
    @api totalHours = 0;

    handlePrevWeek() { this.dispatchEvent(new CustomEvent('prevweek')); }
    handleNextWeek() { this.dispatchEvent(new CustomEvent('nextweek')); }
}