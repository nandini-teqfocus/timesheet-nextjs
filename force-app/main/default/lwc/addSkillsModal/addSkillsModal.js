/**
 * addSkillsModal - Add skill modal dialog
 * @api isOpen - Controls visibility
 */
import { LightningElement, api, track } from 'lwc';
export default class AddSkillsModal extends LightningElement {
    @api isOpen = false;
    @track newSkill = { name: '', category: '', proficiencyLevel: 'Beginner', yearsExperience: 0, certified: false };
    handleClose() { this.dispatchEvent(new CustomEvent('close')); }
    handleSave() { this.dispatchEvent(new CustomEvent('save', { detail: { skill: this.newSkill } })); }
}