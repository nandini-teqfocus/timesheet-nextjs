/**
 * Centralized Navigation Helper Module
 * Standard ES Module - No .js-meta.xml
 */

/**
 * Creates a navigate CustomEvent that bubbles up to the app router.
 * @param {string} pageId - The ID of the target page
 * @returns {CustomEvent} The navigation event
 */
export function createNavigateEvent(pageId) {
    return new CustomEvent('navigate', {
        bubbles: true,
        composed: true,
        detail: { page: pageId }
    });
}

/**
 * Checks if a given page ID is valid.
 * @param {string} pageId - The page ID to validate
 * @param {Array} navItems - The active NAV_ITEMS list
 * @returns {boolean} True if valid
 */
export function isValidPage(pageId, navItems = []) {
    return navItems.some(item => item.id === pageId);
}

import communityBasePath from '@salesforce/community/basePath';

/**
 * Detects the Experience Cloud site base path prefix dynamically.
 * e.g., '/timesheet' or empty string.
 * @returns {string} The normalized base path prefix
 */
export function getCommunityPrefix() {
    try {
        if (communityBasePath) {
            let prefix = communityBasePath.trim();
            if (prefix.endsWith('/s')) {
                prefix = prefix.slice(0, -2);
            }
            if (prefix === '/') {
                return '';
            }
            return prefix.startsWith('/') ? prefix : '/' + prefix;
        }
    } catch (e) {
        // Fallback
    }

    try {
        const path = window.location.pathname || '';
        const parts = path.split('/');
        if (parts.length > 1 && parts[1]) {
            const firstPart = parts[1].toLowerCase();
            if (firstPart !== 'lightning' && firstPart !== 's' && firstPart !== 'c') {
                return '/' + parts[1];
            }
        }
    } catch (e) {
        // Fallback
    }
    return '';
}

/**
 * Resolves the Experience Cloud target route URL based on page ID.
 * Fits into the dynamic metadata route resolver pattern.
 * @param {string} pageId - The ID/key of the target page
 * @returns {string} The resolved target route URL
 */
export function resolveRouteUrl(pageId) {
    const prefix = getCommunityPrefix();
    if (!pageId) return prefix + '/';
    const lower = pageId.toLowerCase().trim();
    if (lower === 'home') return prefix + '/';
    if (lower === 'timesheets') return prefix + '/timesheetcontainer';
    if (lower === 'analytics') return prefix + '/analyticsdashboard';
    if (lower === 'profile') return prefix + '/profiledashboard';
    if (lower === 'manager') return prefix + '/managerdashboard';
    if (lower === 'teammembers') return prefix + '/teammembers';
    if (lower === 'teamtimesheets') return prefix + '/teamtimesheets';
    if (lower === 'managerreports') return prefix + '/managerreports';
    
    // Fallback: lowercase slash-prefixed page name with dynamic base prefix
    return prefix + '/' + lower;
}