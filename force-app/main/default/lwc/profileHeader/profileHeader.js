/**
 * profileHeader - Employee profile header
 * @api profile - { name, title, department, email, joinDate, totalHours }
 */
import { LightningElement, api } from 'lwc';
export default class ProfileHeader extends LightningElement {
    @api profile = {};
    get initials() {
        if (!this.profile.name) return 'NA';
        return this.profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
}