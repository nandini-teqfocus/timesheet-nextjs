/**
 * timesheetFooter - Action footer (Save/Submit buttons)
 * @api canSubmit - Whether timesheet can be submitted
 * @api status - Current timesheet status
 */
import { LightningElement, api } from 'lwc';

export default class TimesheetFooter extends LightningElement {
    @api canSubmit = false;
    @api status = 'Draft';

    handleSave() { this.dispatchEvent(new CustomEvent('save')); }
    handleSubmit() { this.dispatchEvent(new CustomEvent('submit')); }
}