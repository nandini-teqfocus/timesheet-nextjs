import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import addComment from '@salesforce/apex/ReferralController.addComment';

export default class ReferralCommentModal extends LightningElement {
  @api referralIds = []; // Supports single or bulk (though implementation below uses first for simplicity)
  @track commentText = '';
  @track visibleToEmployee = false;
  @track isLoading = false;

  get isSubmitDisabled() {
    return !this.commentText || this.isLoading;
  }

  handleCommentChange(event) {
    this.commentText = event.detail.value;
  }

  handleVisibilityChange(event) {
    this.visibleToEmployee = event.target.checked;
  }

  handleAddComment() {
    if (!this.commentText) return;

    this.isLoading = true;
    // For simplicity in recruiter workspace, we add the same comment to all selected referrals if bulk
    const ids = Array.isArray(this.referralIds) ? [...this.referralIds] : (this.referralIds ? [this.referralIds] : []);
    const promises = ids.map(id => {
      return addComment({
        referralId: id,
        commentText: this.commentText,
        commentType: 'Internal Note',
        visibleToEmployee: this.visibleToEmployee
      });
    });

    Promise.all(promises)
      .then(() => {
        this.isLoading = false;
        this.dispatchEvent(new CustomEvent('success'));
      })
      .catch(error => {
        this.isLoading = false;
        console.error('Error adding comment:', error);
        this.dispatchEvent(new ShowToastEvent({
          title: 'Error',
          message: error?.body?.message || 'Error adding comment',
          variant: 'error'
        }));
      });
  }

  handleClose() {
    this.dispatchEvent(new CustomEvent('close'));
  }
}