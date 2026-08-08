/**
 * hoursCounter - Hours input with increment controls
 * @api value - Current hours value
 * @api min - Minimum allowed (default 0)
 * @api max - Maximum allowed (default 24)
 * @api step - Increment step (default 0.5)
 */
import { LightningElement, api } from 'lwc';

export default class HoursCounter extends LightningElement {
    @api value = 0;
    @api min = 0;
    @api max = 24;
    @api step = 0.5;

    handleIncrement() {
        const newVal = Math.min(this.max, Number(this.value) + Number(this.step));
        this.dispatchEvent(new CustomEvent('change', { detail: { value: newVal } }));
    }

    handleDecrement() {
        const newVal = Math.max(this.min, Number(this.value) - Number(this.step));
        this.dispatchEvent(new CustomEvent('change', { detail: { value: newVal } }));
    }
}