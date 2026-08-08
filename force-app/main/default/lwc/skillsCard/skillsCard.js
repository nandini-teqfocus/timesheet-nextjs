/**
 * skillsCard - Individual skill card
 * @api skill - { id, name, category, proficiencyLevel, yearsExperience, certified }
 */
import { LightningElement, api } from 'lwc';
export default class SkillsCard extends LightningElement {
    @api skill;
    handleEdit() { this.dispatchEvent(new CustomEvent('skilledit', { detail: { skill: this.skill } })); }
    handleDelete() { this.dispatchEvent(new CustomEvent('skilldelete', { detail: { skillId: this.skill.id } })); }
}