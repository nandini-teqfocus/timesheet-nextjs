import { LightningElement, api, track } from 'lwc';

export default class SkillsManager extends LightningElement {
    @api skills = [];
    @track searchTerm = '';

    get filteredSkills() {
        if (!this.skills) return [];
        if (!this.searchTerm) return this.skills;
        return this.skills.filter(s => s.name.toLowerCase().includes(this.searchTerm.toLowerCase()));
    }

    get mappedSkills() {
        return this.filteredSkills.map(skill => {
            let progress = 25;
            let badgeClass = 'slds-badge slds-badge_lightest';
            
            if (skill.proficiencyLevel === 'Expert') {
                progress = 95;
                badgeClass = 'slds-badge slds-theme_success slds-text-color_inverse';
            } else if (skill.proficiencyLevel === 'Advanced') {
                progress = 75;
                badgeClass = 'slds-badge slds-theme_info slds-text-color_inverse';
            } else if (skill.proficiencyLevel === 'Intermediate') {
                progress = 50;
                badgeClass = 'slds-badge slds-badge_lightest font-weight-bold';
            } else if (skill.proficiencyLevel === 'Beginner') {
                progress = 25;
                badgeClass = 'slds-badge slds-badge_lightest';
            }

            return {
                ...skill,
                progress,
                badgeClass,
                progressStyle: `width: ${progress}%;`
            };
        });
    }

    handleSearchChange(event) {
        this.searchTerm = event.target.value;
    }

    handleDelete(event) {
        const skillId = event.target.dataset.id;
        this.dispatchEvent(new CustomEvent('skilldelete', { detail: { id: skillId } }));
    }

    handleEdit(event) {
        const skillId = event.target.dataset.id;
        const skill = this.skills.find(s => s.id === skillId);
        if (skill) {
            this.dispatchEvent(new CustomEvent('skilledit', { detail: { skill } }));
        }
    }

    handleAddSkillClick() {
        this.dispatchEvent(new CustomEvent('skilladd'));
    }
}