/**
 * skillsProgress - Skill proficiency progress indicator
 * @api level - 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
 */
import { LightningElement, api } from 'lwc';
export default class SkillsProgress extends LightningElement {
    @api level = 'Beginner';
    levelMap = { 'Beginner': 25, 'Intermediate': 50, 'Advanced': 75, 'Expert': 100 };
    get percentage() { return this.levelMap[this.level] || 0; }
    get progressStyle() { return `width: ${this.percentage}%`; }
}