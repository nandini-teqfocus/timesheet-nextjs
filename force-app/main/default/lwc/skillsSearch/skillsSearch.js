/**
 * skillsSearch - Skills search field
 * Fires searchchange event on input.
 */
import { LightningElement, track } from 'lwc';
export default class SkillsSearch extends LightningElement {
    @track searchTerm = '';
    handleInput(event) {
        this.searchTerm = event.target.value;
        this.dispatchEvent(new CustomEvent('searchchange', { detail: { searchTerm: this.searchTerm } }));
    }
    handleClear() {
        this.searchTerm = '';
        this.dispatchEvent(new CustomEvent('searchchange', { detail: { searchTerm: '' } }));
    }
}