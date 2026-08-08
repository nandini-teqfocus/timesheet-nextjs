/**
 * shell - App root router component
 * Manages navigation state and renders the active view.
 */
import { LightningElement, track, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { NAV_ITEMS, getCommunityPrefix } from 'c/utils';
import communityId from '@salesforce/community/Id';
import isGuest from '@salesforce/user/isGuest';

export default class Shell extends LightningElement {
    /** Currently active page/module, defaults to 'home' */
    @track activePage = 'home';

    /** Centralized navigation configuration list */
    navItemsList = NAV_ITEMS;

    /**
     * Expose property to configure duplicate nav prevention manually in builder.
     * Set to true when the shell is placed on an Experience Cloud page that
     * also has c-experience-bottom-navigation or c-header-bar placed separately.
     */
    @api isExperienceSite = false;

    @wire(CurrentPageReference)
    handlePageRef(pageRef) {
        if (!pageRef) return;
        const fromUrl = this._detectPageFromUrl();
        if (fromUrl) {
            this.activePage = fromUrl;
        } else {
            this._syncFromPageRef(pageRef);
        }
    }

    connectedCallback() {
        // Force full-width layout by overriding any theme layout wrapper limits
        try {
            const style = document.createElement('style');
            style.textContent = `
                .slds-container_large, 
                .slds-container_x-large, 
                .webruntime-page-container,
                .themeLayout,
                .dx-viewport,
                .siteforceDynamicLayout {
                    max-width: 100% !important;
                    width: 100% !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                }
                .shell-content {
                    max-width: 100% !important;
                    width: 100% !important;
                }
            `;
            document.head.appendChild(style);
        } catch (e) {
            console.warn('Could not inject full-width style overrides', e);
        }
        this.activePage = this._detectPageFromUrl() || this.activePage;
        this.checkGuestRedirect();
    }

    /**
     * Detects active page from window.location.pathname.
     * @private
     */
    _detectPageFromUrl() {
        try {
            const path = (window.location.pathname || '').toLowerCase();
            if (path.includes('timesheetcontainer')) return 'timesheets';
            if (path.includes('analyticsdashboard')) return 'analytics';
            if (path.includes('profiledashboard')) return 'profile';
            if (path.includes('managerdashboard')) return 'manager';

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
            this.activePage = 'timesheets';
        } else if (pageUrl.includes('/analyticsdashboard') || pageName === 'Analytics__c' || pageAddress === 'analyticsdashboard' || pageAddress === 'analytics') {
            this.activePage = 'analytics';
        } else if (pageUrl.includes('/profiledashboard') || pageName === 'Profile__c' || pageAddress === 'profiledashboard' || pageAddress === 'profile') {
            this.activePage = 'profile';
        } else if (pageUrl.includes('/managerdashboard') || pageName === 'Manager__c' || pageAddress === 'managerdashboard' || pageAddress === 'manager') {
            this.activePage = 'manager';
        } else if (pageUrl === '/' || pageName === 'Home' || pageAddress === 'home') {
            this.activePage = 'home';
        }
    }

    /**
     * Inspects active context to prevent duplicate header and bottom navigators.
     * Returns false when running inside an Experience Cloud community site or when user is a guest.
     */
    get showNavigation() {
        // 1. Explicit builder override prop
        if (this.isExperienceSite) {
            return false;
        }

        // 2. Hide navigation if we are running in an Experience Cloud site
        if (communityId) {
            return false;
        }

        // 3. Hide navigation for guest users (unauthenticated)
        if (isGuest === true || isGuest === 'true') {
            return false;
        }

        try {
            const href = (window.location.href || '').toLowerCase();
            const pathname = (window.location.pathname || '').toLowerCase();
            const hostname = (window.location.hostname || '').toLowerCase();

            // 4. Hide if in Experience Cloud community prefix/route patterns (non-localhost)
            const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');
            if (!isLocal) {
                if (pathname.includes('timesheetvforcesite') || pathname.includes('/s/') || /\/s\/?$/.test(pathname)) {
                    return false;
                }
            }

            // 5. Hide if on login/forgot-password/register pages
            if (
                href.includes('login') || href.includes('forgot') || href.includes('register') || href.includes('checkemail') ||
                pathname.includes('login') || pathname.includes('forgot') || pathname.includes('register') || pathname.includes('checkemail')
            ) {
                return false;
            }

            // 6. If we are on localhost (development or Jest unit tests), show navigation
            if (isLocal) {
                return true;
            }

            // 7. Standard Salesforce Lightning App pages always contain '/lightning' in the pathname
            if (pathname.includes('/lightning')) {
                return true;
            }

            // 8. If we are in any Salesforce domain, but the URL does NOT contain '/lightning',
            //    it is an Experience Cloud site. We must suppress the shell's built-in header/bottom-nav
            //    because standalone components are placed in the community builder.
            if (
                hostname.includes('.force.com') || 
                hostname.includes('.salesforce.com') || 
                hostname.includes('.site.com')
            ) {
                return false;
            }
        } catch (e) {
            // Fallback for unexpected DOM/window environments
        }

        return true;
    }

    /** 
     * Handles navigate custom events from navigation children.
     * @param {CustomEvent} event - Navigation event with target page ID in detail
     */
    handleNavigate(event) {
        if (event && event.detail && event.detail.page) {
            this.activePage = event.detail.page;
        }
    }

    // Computed getters to control conditional LWC rendering in shell.html
    get isHome() {
        return this.activePage === 'home';
    }

    get isTimesheets() {
        return this.activePage === 'timesheets';
    }

    get isAnalytics() {
        return this.activePage === 'analytics';
    }

    get isProfile() {
        return this.activePage === 'profile';
    }

    get isManager() {
        return this.activePage === 'manager';
    }

    checkGuestRedirect() {
        if (isGuest === true || isGuest === 'true') {
            const prefix = getCommunityPrefix();
            const path = window.location.pathname.toLowerCase();
            if (!path.includes('/login') && !path.includes('/forgot') && !path.includes('/register') && !path.includes('/checkemail')) {
                console.log('[Shell] Guest detected. Redirecting to login page...');
                window.location.href = `${prefix}/s/login`;
            }
        }
    }
}