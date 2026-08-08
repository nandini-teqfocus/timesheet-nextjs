/**
 * timesheetDaySelector - Day selection pill row
 * @api days - Array of { date, dayName, hours, isSelected }
 */
import { LightningElement, api } from 'lwc';

export default class TimesheetDaySelector extends LightningElement {
    @api days = [];

    handleDayClick(event) {
        const date = event.currentTarget.dataset.date;
        this.dispatchEvent(new CustomEvent('dayselect', { detail: { date } }));
    }
}