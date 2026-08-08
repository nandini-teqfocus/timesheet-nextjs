public with sharing class NavigationController {

    @AuraEnabled(cacheable=true)
    public static List<NavigationMenuItemWrapper> getNavigationItems() {
        if (UserInfo.getUserType() == 'Guest') {
            return new List<NavigationMenuItemWrapper>();
        }
        try {
            // Use a without-sharing inner class to detect role.
            // Portal users (UserType = PowerCustomerSuccess) silently fail SOQL
            // queries using WITH USER_MODE when FLS or object permissions are not
            // fully granted on Employee__c, causing the catch to swallow the error
            // and default isManager to false. The inner class bypasses this while
            // still filtering by the current userId so no other user's data is exposed.
            Boolean isManager = new RoleDetector().isCurrentUserManager();

            List<Navigation_Menu_Item__mdt> metadataItems = [
                SELECT DeveloperName, MasterLabel, Label__c, Icon__c, Page_Name__c,
                       Display_Order__c, Is_Active__c, Required_Permission__c, Route_URL__c
                FROM Navigation_Menu_Item__mdt
                WHERE Is_Active__c = true
                ORDER BY Display_Order__c ASC
            ];

            Set<String> managerPages = new Set<String>{
                'manager', 'teammembers', 'teamtimesheets', 'managerreports'
            };

            List<NavigationMenuItemWrapper> wrappers = new List<NavigationMenuItemWrapper>();
            for (Navigation_Menu_Item__mdt item : metadataItems) {
                String pageName = item.Page_Name__c != null
                    ? item.Page_Name__c.toLowerCase().trim()
                    : '';

                // Role filtering: managers see only manager pages; employees see only employee pages
                if (isManager) {
                    if (!managerPages.contains(pageName)) { continue; }
                } else {
                    if (managerPages.contains(pageName)) { continue; }
                }

                // Optional permission gate
                if (String.isNotBlank(item.Required_Permission__c)) {
                    if (!FeatureManagement.checkPermission(item.Required_Permission__c)) {
                        continue;
                    }
                }

                wrappers.add(new NavigationMenuItemWrapper(item));
            }
            return wrappers;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Inner class: without sharing so portal users can read their own Employee
    // -------------------------------------------------------------------------
    private without sharing class RoleDetector {
        public Boolean isCurrentUserManager() {
            try {
                List<Employee__c> emps = [
                    SELECT Role_Type__c
                    FROM Employee__c
                    WHERE User__c = :UserInfo.getUserId()
                    LIMIT 1
                ];
                return (!emps.isEmpty() && emps[0].Role_Type__c == 'Manager');
            } catch (Exception ex) {
                System.debug(
                    LoggingLevel.WARN,
                    'NavigationController.RoleDetector: cannot query Employee__c for userId '
                    + UserInfo.getUserId() + ' — ' + ex.getMessage()
                );
                return false;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Wrapper DTO
    // -------------------------------------------------------------------------
    public class NavigationMenuItemWrapper {
        @AuraEnabled public String id        { get; set; }
        @AuraEnabled public String label     { get; set; }
        @AuraEnabled public String icon      { get; set; }
        @AuraEnabled public String component { get; set; }
        @AuraEnabled public String routeUrl  { get; set; }

        public NavigationMenuItemWrapper(Navigation_Menu_Item__mdt item) {
            this.id       = item.Page_Name__c;
            this.label    = item.Label__c;
            this.icon     = item.Icon__c;
            this.routeUrl = NavigationRouteResolver.resolveRouteUrl(
                item.Page_Name__c, item.Route_URL__c
            );

            // Map page name → LWC component name used by the SPA shell router
            Map<String, String> pageToComponent = new Map<String, String>{
                'home'           => 'homeDashboard',
                'timesheets'     => 'timesheetContainer',
                'analytics'      => 'analyticsDashboard',
                'profile'        => 'profileDashboard',
                'manager'        => 'managerDashboard',
                'teammembers'    => 'teamEmployeeList',
                'teamtimesheets' => 'teamTimesheetViewer',
                'managerreports' => 'managerReports'
            };
            this.component = pageToComponent.containsKey(item.Page_Name__c)
                ? pageToComponent.get(item.Page_Name__c)
                : item.Page_Name__c;
        }
    }

    @AuraEnabled(cacheable=true)
    public static UserContextWrapper getUserContext() {
        UserContextWrapper wrapper = new UserContextWrapper();
        wrapper.isGuest = (UserInfo.getUserType() == 'Guest');
        if (wrapper.isGuest) {
            wrapper.isManager = false;
            wrapper.userName = 'Guest';
        } else {
            wrapper.isManager = new RoleDetector().isCurrentUserManager();
            wrapper.userName = UserInfo.getName();
        }
        return wrapper;
    }

    public class UserContextWrapper {
        @AuraEnabled public Boolean isGuest {get;set;}
        @AuraEnabled public Boolean isManager {get;set;}
        @AuraEnabled public String userName {get;set;}
    }
}