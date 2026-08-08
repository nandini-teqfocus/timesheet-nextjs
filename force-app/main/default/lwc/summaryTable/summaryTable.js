/**
 * summaryTable - Weekly timesheet summary table
 * @api rows - Array of timesheet summary records
 */
import { LightningElement, api } from 'lwc';

export default class SummaryTable extends LightningElement {
    @api rows = [];

    columns = [
        { label: 'Week', fieldName: 'weekLabel', type: 'text', sortable: true },
        { label: 'Total Hours', fieldName: 'totalHours', type: 'number' },
        { label: 'Billable', fieldName: 'billableHours', type: 'number' },
        { label: 'Status', fieldName: 'status', type: 'text' }
    ];
}