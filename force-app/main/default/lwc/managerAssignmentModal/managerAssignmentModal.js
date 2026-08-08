import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import assignHiringManager from '@salesforce/apex/ReferralController.assignHiringManager';

export default class ManagerAssignmentModal extends LightningElement {
  @api referralIds = [];
  @track selectedManagerId = '';
  @track isLoading = false;

  get referralCount() {
    return this.referralIds.length;
  }

  get isAssignDisabled() {
    return !this.selectedManagerId || this.isLoading;
  }

  handleManagerChange(event) {
    this.selectedManagerId = event.detail.value[0];
  }

  handleAssign() {
    if (!this.selectedManagerId) return;

    this.isLoading = true;
    const ids = Array.isArray(this.referralIds) ? [...this.referralIds] : (this.referralIds ? [this.referralIds] : []);
    assignHiringManager({
      referralIds: ids,
      managerId: this.selectedManagerId
    })
      .then(() => {
        this.isLoading = false;
        this.dispatchEvent(new CustomEvent('assign'));
      })
      .catch(error => {
        this.isLoading = false;
        console.error('Error assigning manager:', error);
        this.dispatchEvent(new ShowToastEvent({
          title: 'Error',
          message: error?.body?.message || 'Error assigning hiring manager',
          variant: 'error'
        }));
      });
  }

  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }
}