/**
 * projectLookup - Project search/lookup field
 * @api selectedProject - Currently selected project
 * @api projects - Available project list
 */
import { LightningElement, api, track } from 'lwc';

export default class ProjectLookup extends LightningElement {
    @api selectedProject = null;
    @api projects = [];
    @track searchTerm = '';
    @track isOpen = false;

    get filteredProjects() {
        return this.projects.filter(p =>
            p.name.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
    }

    handleSelect(event) {
        const projectId = event.currentTarget.dataset.id;
        const project = this.projects.find(p => p.id === projectId);
        this.dispatchEvent(new CustomEvent('projectselect', { detail: { project } }));
    }
}