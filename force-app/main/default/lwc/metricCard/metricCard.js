import { LightningElement, api } from 'lwc';

export default class MetricCard extends LightningElement {
    @api title;
    @api value;
    @api icon;
    @api variant = 'brand'; // brand, success, warning, error, neutral
    @api trend; // e.g. "+12%" or "Target met"
    @api trendUp = false; // Default false; pass trend-up="true" from parent for positive/up trends

    get cardClass() {
        return `kpi-card kpi-card_${this.variant || 'brand'}`;
    }

    get valueClass() {
        return `kpi-value kpi-value_${this.variant || 'brand'}`;
    }

    get iconBgClass() {
        return `kpi-icon-bg kpi-icon-bg_${this.variant || 'brand'}`;
    }

    get trendBadgeClass() {
        // trendUp is passed as string 'true'/'false' from HTML attribute; coerce to boolean
        const isUp = this.trendUp === true || this.trendUp === 'true';
        return isUp ? 'trend-badge trend-badge_up' : 'trend-badge trend-badge_down';
    }

    get trendIcon() {
        const isUp = this.trendUp === true || this.trendUp === 'true';
        return isUp ? 'utility:trending_up' : 'utility:trending_down';
    }
}