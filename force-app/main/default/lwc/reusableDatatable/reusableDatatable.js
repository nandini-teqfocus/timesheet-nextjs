import { LightningElement, api } from 'lwc';

export default class ReusableDatatable extends LightningElement {
    @api keyField = 'id';
    @api data = [];
    @api columns = [];
    @api hideCheckboxColumn = false;
    @api sortedBy;
    @api sortedDirection;

    handleSort(event) {
        this.dispatchEvent(new CustomEvent('sort', {
            detail: {
                fieldName: event.detail.fieldName,
                sortDirection: event.detail.sortDirection
            }
        }));
    }

    handleRowAction(event) {
        this.dispatchEvent(new CustomEvent('rowaction', {
            detail: {
                action: event.detail.action,
                row: event.detail.row
            }
        }));
    }

    handleRowSelection(event) {
        this.dispatchEvent(new CustomEvent('rowselection', {
            detail: {
                selectedRows: event.detail.selectedRows
            }
        }));
    }
}