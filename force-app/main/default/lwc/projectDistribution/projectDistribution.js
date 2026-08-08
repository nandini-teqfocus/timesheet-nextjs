/**
 * projectDistribution - Project hours distribution chart
 * @api projects - Array of { name, hours, percentage, color }
 */
import { LightningElement, api } from 'lwc';
export default class ProjectDistribution extends LightningElement {
    @api projects = [];
    get hasProjects() { return this.projects && this.projects.length > 0; }
}