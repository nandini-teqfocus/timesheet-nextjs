/**
 * Formatting and Helper Utilities
 * Standard ES Module - No .js-meta.xml
 */

/**
 * Formats a JS Date or Date string to a standard readable format.
 * @param {Date|string} dateVal - The date to format
 * @returns {string} Formatted date string (e.g., "Mon, May 18, 2026")
 */
export function formatDate(dateVal) {
    if (!dateVal) return '';
    const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

/**
 * Formats a decimal number into a standard hours text representation.
 * @param {number} hours - Number of decimal hours
 * @returns {string} Formatted hours string (e.g., "8.0 hrs")
 */
export function formatHours(hours) {
    if (hours === undefined || hours === null || isNaN(hours)) return '0.0 hrs';
    return `${parseFloat(hours).toFixed(1)} hrs`;
}

/**
 * Safely parses a query parameters string or URL search params.
 * @param {string} search - search string (window.location.search)
 * @returns {Object} Key-value map of parameters
 */
export function getQueryParams(search) {
    const params = {};
    if (!search) return params;
    const cleanSearch = search.startsWith('?') ? search.substring(1) : search;
    const pairs = cleanSearch.split('&');
    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    }
    return params;
}