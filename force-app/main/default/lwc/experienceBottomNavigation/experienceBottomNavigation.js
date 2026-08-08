import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import getNavigationItems from '@salesforce/apex/NavigationController.getNavigationItems';
import getUserContext from '@salesforce/apex/NavigationController.getUserContext';
import { getCommunityPrefix, resolveRouteUrl } from 'c/utils';
import isGuest from '@salesforce/user/isGuest';

export default class ExperienceBottomNavigation extends NavigationMixin(LightningElement) {
    @api
    get activePage() {
        return this._activePage;
    }
    set activePage(value) {
        this._activePage = value;
    }

    @track _activePage = 'home';
    @track userContext;
    @track isProfileOpen = false;
    _isPrimaryNav = false;
    _rawMetadataItems = [];
    _outsideClickListener = null;

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

    @track navItemsList = [
        { id: 'home', label: 'Home', icon: 'utility:home' },
        { id: 'timesheets', label: 'Timesheets', icon: 'utility:rating' },
        { id: 'analytics', label: 'Analytics', icon: 'utility:metrics' },
        { id: 'profile', label: 'Profile', icon: 'utility:user' }
    ];

    @wire(getUserContext)
    wiredUserContext({ error, data }) {
        if (data) {
            console.log('[ExperienceBottomNavigation] User context loaded:', JSON.stringify(data));
            this.userContext = data;
            this.updateNavItems();
            this.processRoutingAndRedirects();
        } else if (error) {
            console.error('[ExperienceBottomNavigation] Error loading user context:', error);
        }
    }

    @wire(getNavigationItems)
    wiredNavItems({ error, data }) {
        if (data) {
            console.log('[ExperienceBottomNavigation] Dynamic navigation menu items loaded from custom metadata:', JSON.stringify(data));
            this._rawMetadataItems = data;
            this.updateNavItems();
        } else if (error) {
            console.error('[ExperienceBottomNavigation] Error loading dynamic navigation menu items, falling back to static constants:', error);
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
        this.navItemsList = items;
    }

    connectedCallback() {
        if (!window.__timesheetBottomNavRendered) {
            window.__timesheetBottomNavRendered = true;
            this._isPrimaryNav = true;
        }
        this._activePage = this._detectPageFromUrl() || this._activePage;
        
        // Immediate guest kickout
        if (isGuest === true || isGuest === 'true') {
            const prefix = getCommunityPrefix();
            const path = window.location.pathname.toLowerCase();
            if (!path.includes('/login') && !path.includes('/forgot') && !path.includes('/register') && !path.includes('/checkemail')) {
                window.location.href = `${prefix}/s/login`;
            }
        }
    }

    processRoutingAndRedirects() {
        if (!this.userContext) return;
        const { isGuest: contextIsGuest, isManager } = this.userContext;
        const prefix = getCommunityPrefix().toLowerCase();
        const path = window.location.pathname.toLowerCase();
        
        // 1. Guest redirect (double safety)
        if (contextIsGuest || isGuest === true || isGuest === 'true') {
            if (!path.includes('/login') && !path.includes('/forgot') && !path.includes('/register') && !path.includes('/checkemail')) {
                window.location.href = `${getCommunityPrefix()}/s/login`;
            }
            return;
        }
        
        // 2. Is Home Page check
        const isHome = (
            path === '/' || 
            path === '' || 
            path === prefix || 
            path === prefix + '/' || 
            /\/s\/?$/.test(path) || 
            path.endsWith('/home')
        );
        
        // 3. Manager redirection
        if (isManager) {
            // If a manager lands on any employee page (excluding /timesheetcontainer), redirect to managerdashboard
            const isEmployeePage = isHome || path.includes('/analyticsdashboard') || path.includes('/profiledashboard');
            if (isEmployeePage) {
                console.log('[ExperienceBottomNavigation] Redirecting Manager to manager dashboard');
                window.location.href = `${getCommunityPrefix()}/managerdashboard`;
            }
        } else {
            // If an employee lands on any manager page, redirect to employee home
            const isManagerPage = path.includes('/managerdashboard') || path.includes('/teammembers') || path.includes('/teamtimesheets') || path.includes('/managerreports');
            if (isManagerPage) {
                console.log('[ExperienceBottomNavigation] Redirecting Employee to employee home');
                window.location.href = `${getCommunityPrefix()}/`;
            }
        }
    }

    disconnectedCallback() {
        if (this._isPrimaryNav) {
            window.__timesheetBottomNavRendered = false;
        }
        this.removeOutsideClickListener();
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
            if (path.includes('managerdashboard')) return 'manager';
            if (path.includes('teammembers')) return 'teammembers';
            if (path.includes('teamtimesheets')) return 'teamtimesheets';
            if (path.includes('managerreports')) return 'managerreports';

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
        } else if (pageUrl.includes('/teammembers') || pageAddress === 'teammembers') {
            this._activePage = 'teammembers';
        } else if (pageUrl.includes('/teamtimesheets') || pageAddress === 'teamtimesheets') {
            this._activePage = 'teamtimesheets';
        } else if (pageUrl.includes('/managerreports') || pageAddress === 'managerreports') {
            this._activePage = 'managerreports';
        } else if (pageUrl === '/' || pageName === 'Home' || pageAddress === 'home') {
            this._activePage = 'home';
        }
    }

    get bottomNavItems() {
        return (this.navItemsList || []).map(item => {
            const isActive = item.id === this._activePage;
            return {
                ...item,
                class: `bottom-nav-item slds-grid slds-grid_vertical slds-grid_align-center slds-align-middle${isActive ? ' active' : ''}`,
                iconVariant: isActive ? 'brand' : 'default',
                ariaSelected: isActive ? 'true' : 'false'
            };
        });
    }

    get userName() {
        return this.userContext ? this.userContext.userName : 'User';
    }

    get userInitials() {
        if (!this.userName) return 'U';
        return this.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    get userRole() {
        if (!this.userContext) return '';
        return this.userContext.isManager ? 'Manager' : 'Employee';
    }

    get profileBtnClass() {
        return `bottom-nav-item slds-grid slds-grid_vertical slds-grid_align-center slds-align-middle${this.isProfileOpen ? ' active' : ''}`;
    }

    toggleProfilePopover(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isProfileOpen = !this.isProfileOpen;
        if (this.isProfileOpen) {
            this._outsideClickListener = this.handleOutsideClick.bind(this);
            document.addEventListener('click', this._outsideClickListener);
        } else {
            this.removeOutsideClickListener();
        }
    }

    handleOutsideClick(event) {
        const path = event.composedPath();
        const container = this.template.querySelector('.profile-popover-container');
        if (container && !path.includes(container)) {
            this.isProfileOpen = false;
            this.removeOutsideClickListener();
        }
    }

    removeOutsideClickListener() {
        if (this._outsideClickListener) {
            document.removeEventListener('click', this._outsideClickListener);
            this._outsideClickListener = null;
        }
    }

    handleLogoutClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isProfileOpen = false;
        this.removeOutsideClickListener();

        const prefix = getCommunityPrefix();
        const logoutUrl = `${window.location.origin}${prefix}/secur/logout.jsp`;
        console.log('[ExperienceBottomNavigation] Logging out user, redirecting to:', logoutUrl);
        window.location.replace(logoutUrl);
    }

    handleNavClick(event) {
        event.preventDefault();
        const pageId = event.currentTarget.dataset.page;
        if (!pageId) return;

        // Close the popover if navigation changes
        this.isProfileOpen = false;
        this.removeOutsideClickListener();

        // Update local active state immediately for instant visual feedback
        this._activePage = pageId;

        // Route natively in Experience Cloud using standard__webPage dynamically resolved from metadata
        const matchedItem = (this.navItemsList || []).find(item => item.id === pageId);
        const pageUrl = matchedItem && matchedItem.routeUrl ? matchedItem.routeUrl : resolveRouteUrl(pageId);

        console.log(`[ExperienceBottomNavigation] Dynamically navigating to resolved routeUrl: ${pageUrl} for pageId: ${pageId}`);

        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: pageUrl
            }
        });
    }
}