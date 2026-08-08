import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import updateReferralStatus from '@salesforce/apex/ReferralController.updateReferralStatus';

/**
 * Status Update Modal Stub Component
 * Allows bulk or single status updates for referrals.
 */
export default class StatusUpdateModal extends LightningElement {
  @api referralIds = [];
  @api currentStatus = '';
  @api isOpen = false;

  @track selectedStatus = '';
  @track isLoading = false;

  statusOptions = [
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Under Review', value: 'Under Review' },
    { label: 'Interview Scheduled', value: 'Interview Scheduled' },
    { label: 'Selected', value: 'Selected' },
    { label: 'Hired', value: 'Hired' },
    { label: 'Rejected', value: 'Rejected' }
  ];

  connectedCallback() {
    this.selectedStatus = this.currentStatus || '';
  }

  handleStatusChange(event) {
    this.selectedStatus = event.detail.value;
  }

  handleUpdate() {
    if (!this.selectedStatus) return;
    
    this.isLoading = true;
    const ids = Array.isArray(this.referralIds) ? [...this.referralIds] : (this.referralIds ? [this.referralIds] : []);
    const promises = ids.map(id => {
      return updateReferralStatus({
        referralId: id,
        newStatus: this.selectedStatus
      });
    });

    Promise.all(promises)
      .then(() => {
        this.isLoading = false;
        this.dispatchEvent(new CustomEvent('update', {
          detail: {
            status: this.selectedStatus,
            referralIds: this.referralIds
          }
        }));
      })
      .catch(error => {
        this.isLoading = false;
        console.error('Error updating statuses:', error);
        this.dispatchEvent(new ShowToastEvent({
          title: 'Error',
          message: error?.body?.message || 'Error updating referral status',
          variant: 'error'
        }));
      });
  }

  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }
}