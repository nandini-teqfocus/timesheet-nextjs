/**
 * headerBar - Top application navigation bar
 * Displays app title, user info, and desktop navigation items.
 */
import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { NAV_ITEMS, createNavigateEvent, getCommunityPrefix, resolveRouteUrl } from 'c/utils';
import getNavigationItems from '@salesforce/apex/NavigationController.getNavigationItems';
import getUserContext from '@salesforce/apex/NavigationController.getUserContext';
import isGuest from '@salesforce/user/isGuest';

export default class HeaderBar extends NavigationMixin(LightningElement) {
    /** The active page ID — set by shell or auto-detected from URL */
    @api
    get activePage() {
        return this._activePage;
    }
    set activePage(value) {
        this._activePage = value;
    }

    @track _activePage = 'home';
    @track userContext;
    _rawMetadataItems = [];

    /** Reused navigation configurations with local fallback defaults */
    @track navItems = NAV_ITEMS;

    @wire(getUserContext)
    wiredUserContext({ error, data }) {
        if (data) {
            console.log('[HeaderBar] User context loaded:', JSON.stringify(data));
            this.userContext = data;
            this.updateNavItems();
            if (data.isGuest) {
                this.checkGuestRedirect();
            }
        } else if (error) {
            console.error('[HeaderBar] Error loading user context:', error);
        }
    }

    @wire(getNavigationItems)
    wiredNavItems({ error, data }) {
        if (data) {
            console.log('[HeaderBar] Dynamic navigation menu items loaded from custom metadata:', JSON.stringify(data));
            this._rawMetadataItems = data;
            this.updateNavItems();
        } else if (error) {
            console.error('[HeaderBar] Error loading dynamic navigation menu items, falling back to static constants:', error);
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
        this._activePage = this._detectPageFromUrl() || this._activePage;
        this.checkGuestRedirect();
    }

    @wire(CurrentPageReference)
    handlePageRef(pageRef) {
        if (!pageRef) return;
        const fromUrl = this._detectPageFromUrl();
        if (fromUrl) {
            this._activePage = fromUrl;
        } else {
            this._syncFromPageRef(pageRef);
        }
    }

    _detectPageFromUrl() {
        try {
            const path = (window.location.pathname || '').toLowerCase();
            if (path.includes('timesheetcontainer')) return 'timesheets';
            if (path.includes('analyticsdashboard')) return 'analytics';
            if (path.includes('profiledashboard')) return 'profile';

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
        } catch (e) { /* test env */ }
        return null;
    }

    /**
     * Fallback: sync from Experience Cloud CurrentPageReference attributes.
     * Supports both namedPage (deprecated) and standard__webPage URL patterns.
     * @private
     */
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
        } else if (pageUrl === '/' || pageName === 'Home' || pageAddress === 'home') {
            this._activePage = 'home';
        }
    }

    /** 
     * Compute active classes dynamically for desktop navigation tabs.
     */
    get menuItems() {
        return (this.navItems || []).map(item => {
            const isActive = item.id === this._activePage;
            return {
                ...item,
                navClass: `nav-link${isActive ? ' active' : ''}`,
                ariaSelected: isActive ? 'true' : 'false'
            };
        });
    }

    /**
     * Dispatches navigate custom event on menu tab click.
     * @param {Event} event - HTML Click Event
     */
    handleMenuClick(event) {
        event.preventDefault();
        const pageId = event.currentTarget.dataset.page;
        if (!pageId) return;

        // Update local active state immediately for instant visual feedback
        this._activePage = pageId;

        // 1. Dispatch custom event for shell router compatibility
        this.dispatchEvent(createNavigateEvent(pageId));

        // 2. Route natively in Experience Cloud using standard__webPage dynamically resolved from metadata
        const matchedItem = (this.navItems || []).find(item => item.id === pageId);
        const pageUrl = matchedItem && matchedItem.routeUrl ? matchedItem.routeUrl : resolveRouteUrl(pageId);

        console.log(`[HeaderBar] Dynamically navigating to resolved routeUrl: ${pageUrl} for pageId: ${pageId}`);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: pageUrl
            }
        });
    }

    get isGuestUser() {
        if (this.userContext) {
            return this.userContext.isGuest;
        }
        return isGuest;
    }

    checkGuestRedirect() {
        if (isGuest === true || isGuest === 'true') {
            const prefix = getCommunityPrefix();
            const path = window.location.pathname.toLowerCase();
            if (!path.includes('/login') && !path.includes('/forgot') && !path.includes('/register') && !path.includes('/checkemail')) {
                console.log('[HeaderBar] Guest detected. Redirecting to login page...');
                window.location.href = `${prefix}/s/login`;
            }
        }
    }
}