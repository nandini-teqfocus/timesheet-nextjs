import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { NAV_ITEMS, createNavigateEvent, getCommunityPrefix, resolveRouteUrl } from 'c/utils';
import getNavigationItems from '@salesforce/apex/NavigationController.getNavigationItems';
import getUserContext from '@salesforce/apex/NavigationController.getUserContext';
import isGuest from '@salesforce/user/isGuest';

export default class BottomNavigation extends NavigationMixin(LightningElement) {
    /** Target page active state from shell — also updated from URL detection */
    @api
    get activePage() {
        return this._activePage;
    }
    set activePage(value) {
        this._activePage = value;
    }

    @track _activePage = 'home';
    _isPrimaryNav = false;
    @track userContext;
    _rawMetadataItems = [];

    get showNavigation() {
        if (window.__timesheetBottomNavRendered && !this._isPrimaryNav) {
            return false;
        }
        if (isGuest === true || isGuest === 'true') {
            return false;
        }
        try {
            const href = (window.location.href || '').toLowerCase();
            const path = (window.location.pathname || '').toLowerCase();
            if (
                href.includes('login') || 
                href.includes('forgot') || 
                href.includes('register') || 
                href.includes('checkemail') ||
                path.includes('login') || 
                path.includes('forgot') || 
                path.includes('register') || 
                path.includes('checkemail')
            ) {
                return false;
            }
        } catch (e) {
            // fallback
        }
        return true;
    }

    /** Expose the centralized navigation configuration with local fallback defaults */
    @track navItems = NAV_ITEMS;

    @wire(getUserContext)
    wiredUserContext({ error, data }) {
        if (data) {
            console.log('[BottomNavigation] User context loaded:', JSON.stringify(data));
            this.userContext = data;
            this.updateNavItems();
        } else if (error) {
            console.error('[BottomNavigation] Error loading user context:', error);
        }
    }

    @wire(getNavigationItems)
    wiredNavItems({ error, data }) {
        if (data) {
            console.log('[BottomNavigation] Dynamic navigation menu items loaded from custom metadata:', JSON.stringify(data));
            this._rawMetadataItems = data;
            this.updateNavItems();
        } else if (error) {
            console.error('[BottomNavigation] Error loading dynamic navigation menu items, falling back to static constants:', error);
            this._rawMetadataItems = NAV_ITEMS;
            this.updateNavItems();
        }
    }

    updateNavItems() {
        if (!this._rawMetadataItems || this._rawMetadataItems.length === 0) {
            return;
        }
        let items = [...this._rawMetadataItems];
        if (this.userContext && this.userContext.isManager) {
            const hasTimesheets = items.some(item => item.id === 'timesheets');
            if (!hasTimesheets) {
                const dashboardIndex = items.findIndex(item => item.id === 'manager');
                const myTimesheetItem = {
                    id: 'timesheets',
                    label: 'My Timesheet',
                    icon: 'utility:clock',
                    component: 'timesheetContainer',
                    routeUrl: resolveRouteUrl('timesheets')
                };
                if (dashboardIndex !== -1) {
                    items.splice(dashboardIndex + 1, 0, myTimesheetItem);
                } else {
                    items.push(myTimesheetItem);
                }
            }
        }
        this.navItems = items;
    }

    connectedCallback() {
        if (!window.__timesheetBottomNavRendered) {
            window.__timesheetBottomNavRendered = true;
            this._isPrimaryNav = true;
        }
        // Initialise active page from current browser URL so it is correct
        // on first render in both shell mode and Experience Cloud standalone mode.
        this._activePage = this._detectPageFromUrl() || this._activePage;
    }

    disconnectedCallback() {
        if (this._isPrimaryNav) {
            window.__timesheetBottomNavRendered = false;
        }
    }

    @wire(CurrentPageReference)
    handlePageRef(pageRef) {
        if (!pageRef) return;
        // Prefer URL-based detection; use EC page-ref attributes only as fallback.
        const fromUrl = this._detectPageFromUrl();
        if (fromUrl) {
            this._activePage = fromUrl;
        } else {
            this._syncFromPageRef(pageRef);
        }
    }

    /**
     * Detects active page from window.location.pathname.
     * Returns the page id string or null if not deterministic.
     * @private
     */
    _detectPageFromUrl() {
        try {
            const path = (window.location.pathname || '').toLowerCase();
            if (path.includes('timesheetcontainer')) {
                return 'timesheets';
            }
            if (path.includes('analyticsdashboard')) {
                return 'analytics';
            }
            if (path.includes('profiledashboard')) {
                return 'profile';
            }
            if (path.includes('managerdashboard')) {
                return 'manager';
            }
            // Root or /s/ home — only return 'home' when we are clearly at root
            // to avoid overwriting a shell-set activePage on sub-pages.
            const prefix = (getCommunityPrefix() || '').toLowerCase();
            if (
                path === '/' || 
                path === '' || 
                path === prefix || 
                path === prefix + '/' || 
                /\/s\/?$/.test(path) || 
                path.endsWith('/home')
            ) {
                return 'home';
            }
        } catch (e) {
            // window.location not available (test env) — fall back silently.
        }
        return null;
    }

    _syncFromPageRef(pageRef) {
        if (!pageRef.attributes) return;
        const pageName = pageRef.attributes.name;
        const pageAddress = pageRef.attributes.address;
        const pageUrl = pageRef.attributes.url || '';

        if (pageUrl.includes('/timesheetcontainer') || pageName === 'Timesheets__c' || pageAddress === 'timesheetcontainer' || pageAddress === 'timesheets') {
            this._activePage = 'timesheets';
        } else if (pageUrl.includes('/analyticsdashboard') || pageName === 'Analytics__c' || pageAddress === 'analyticsdashboard' || pageAddress === 'analytics') {
            this._activePage = 'analytics';
        } else if (pageUrl.includes('/profiledashboard') || pageName === 'Profile__c' || pageAddress === 'profiledashboard' || pageAddress === 'profile') {
            this._activePage = 'profile';
        } else if (pageUrl.includes('/managerdashboard') || pageName === 'Manager__c' || pageAddress === 'managerdashboard' || pageAddress === 'manager') {
            this._activePage = 'manager';
        } else if (pageUrl === '/' || pageName === 'Home' || pageAddress === 'home') {
            this._activePage = 'home';
        }
    }

    /**
     * Maps items to generate visual class strings for active button highlighting.
     */
    get bottomNavItems() {
        return (this.navItems || []).map(item => {
            const isActive = item.id === this._activePage;
            return {
                ...item,
                class: `bottom-nav-item slds-grid slds-grid_vertical slds-grid_align-center slds-align-middle${isActive ? ' active' : ''}`,
                iconVariant: isActive ? 'brand' : 'default',
                ariaSelected: isActive ? 'true' : 'false'
            };
        });
    }

    /**
     * Dispatch navigate CustomEvent when user taps a tab item.
     * @param {Event} event - Tap/click event
     */
    handleNavClick(event) {
        event.preventDefault();
        const pageId = event.currentTarget.dataset.page;
        if (!pageId) return;

        // Update local active state immediately for instant feedback
        this._activePage = pageId;

        // 1. Dispatch custom event for shell router compatibility
        this.dispatchEvent(createNavigateEvent(pageId));

        // 2. Route natively in Experience Cloud using standard__webPage dynamically resolved from metadata
        const matchedItem = (this.navItems || []).find(item => item.id === pageId);
        const pageUrl = matchedItem && matchedItem.routeUrl ? matchedItem.routeUrl : resolveRouteUrl(pageId);

        console.log(`[BottomNavigation] Dynamically navigating to resolved routeUrl: ${pageUrl} for pageId: ${pageId}`);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: pageUrl
            }
        });
    }
}