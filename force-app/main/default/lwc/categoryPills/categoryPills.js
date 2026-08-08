/**
 * categoryPills - Category selection pills
 * @api categories - Available categories
 * @api selected - Currently selected category
 */
import { LightningElement, api } from 'lwc';

export default class CategoryPills extends LightningElement {
    @api categories = ['Development', 'Design', 'Meeting', 'Testing', 'Research'];
    @api selected;

    handleSelect(event) {
        const category = event.currentTarget.dataset.category;
        this.dispatchEvent(new CustomEvent('categoryselect', { detail: { category } }));
    }

    isSelected(category) { return this.selected === category; }
}