/**
 * timesheetEntryCard - Individual time entry card
 * @api entry - Timesheet entry object { id, project, hours, category, description }
 * @api isEditable - Whether entry can be modified
 */
import { LightningElement, api } from 'lwc';

export default class TimesheetEntryCard extends LightningElement {
    @api entry;
    @api isEditable = false;

    handleEdit() { this.dispatchEvent(new CustomEvent('entryedit', { detail: { entry: this.entry } })); }
    handleDelete() { this.dispatchEvent(new CustomEvent('entrydelete', { detail: { entryId: this.entry.id } })); }
}