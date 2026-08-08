public with sharing class NavigationRouteResolver {

    /**
     * Resolves the Experience Cloud target route URL dynamically based on Custom Metadata configuration.
     * Fallbacks to standard paths for packaging safety.
     * 
     * @param pageName - Unique page key identifier from Navigation_Menu_Item__mdt
     * @param metadataRouteUrl - The Route_URL__c field value configured on the record
     * @return Resolved Target Route URL for standard__webPage
     */
    public static String resolveRouteUrl(String pageName, String metadataRouteUrl) {
        if (String.isNotBlank(metadataRouteUrl)) {
            return metadataRouteUrl.trim();
        }

        if (String.isBlank(pageName)) {
            return '/timesheet/';
        }

        String lowerPage = pageName.toLowerCase().trim();
        if (lowerPage == 'home') {
            return '/timesheet/';
        } else if (lowerPage == 'timesheets') {
            return '/timesheet/timesheetcontainer';
        } else if (lowerPage == 'analytics') {
            return '/timesheet/analyticsdashboard';
        } else if (lowerPage == 'profile') {
            return '/timesheet/profiledashboard';
        } else if (lowerPage == 'manager') {
            return '/timesheet/managerdashboard';
        } else if (lowerPage == 'teammembers') {
            return '/timesheet/teammembers';
        } else if (lowerPage == 'teamtimesheets') {
            return '/timesheet/teamtimesheets';
        } else if (lowerPage == 'managerreports') {
            return '/timesheet/managerreports';
        }

        // Defensive default: lowercase slash-prefixed page name
        return '/timesheet/' + lowerPage;
    }
}