public with sharing class ProfileController {

    @AuraEnabled(cacheable=true)
    public static TimesheetWrappers.UserProfileWrapper getUserProfile() {
        try {
            Id currentUserId = UserInfo.getUserId();
            User u = [
                SELECT Id, Name, Title, Department, Email, Phone, City, State, 
                       TimeZoneSidKey, LocaleSidKey, Manager.Name, CreatedDate
                FROM User
                WHERE Id = :currentUserId
                LIMIT 1
            ];
            
            // Calculate dynamic total hours
            AggregateResult[] groupedResults = [
                SELECT SUM(Hours__c) totalHours
                FROM Timesheet_Entry__c
                WHERE Timesheet__r.Employee__c = :currentUserId
                WITH USER_MODE
            ];
            Decimal totalHours = 0.0;
            if (!groupedResults.isEmpty() && groupedResults[0].get('totalHours') != null) {
                totalHours = (Decimal) groupedResults[0].get('totalHours');
            }

            Decimal utilRate = AnalyticsService.getSummary(currentUserId).utilizationRate;

            return new TimesheetWrappers.UserProfileWrapper(u, totalHours.setScale(1), utilRate);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<TimesheetWrappers.EmployeeSkillWrapper> getUserSkills() {
        try {
            Id currentUserId = UserInfo.getUserId();
            System.debug('[Teqfocus Debug] getUserSkills invoked for Employee: ' + currentUserId);
            
            List<Employee_Skill__c> skills = SkillSelector.getEmployeeSkills(currentUserId);
            System.debug('[Teqfocus Debug] Retreived skill count for employee: ' + skills.size());
            
            List<TimesheetWrappers.EmployeeSkillWrapper> wrappers = new List<TimesheetWrappers.EmployeeSkillWrapper>();
            for (Employee_Skill__c es : skills) {
                wrappers.add(new TimesheetWrappers.EmployeeSkillWrapper(es));
            }
            return wrappers;
        } catch (Exception ex) {
            System.debug('[Teqfocus Debug] ERROR in getUserSkills: ' + ex.getMessage());
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Skill__c> getSkillsCatalog() {
        try {
            return SkillSelector.getAllCatalogSkills();
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Project__c> getActiveProjects() {
        try {
            Id currentUserId = UserInfo.getUserId();
            System.debug('[Teqfocus Debug] ProfileController getActiveProjects invoked for Employee: ' + currentUserId);
            
            // Query entries to dynamically derive active projects logged by this user
            List<Timesheet_Entry__c> entries = [
                SELECT Project__c, Project__r.Id, Project__r.Name, Project__r.Project_Code__c, Project__r.Status__c, Project__r.Budget_Hours__c
                FROM Timesheet_Entry__c
                WHERE Timesheet__r.Employee__c = :currentUserId AND Project__r.Status__c = 'Active'
                WITH USER_MODE
            ];
            
            Map<Id, Project__c> projectMap = new Map<Id, Project__c>();
            for (Timesheet_Entry__c e : entries) {
                if (e.Project__c != null && !projectMap.containsKey(e.Project__c)) {
                    projectMap.put(e.Project__c, e.Project__r);
                }
            }
            
            System.debug('[Teqfocus Debug] Derived active projects count: ' + projectMap.size());
            return projectMap.values();
        } catch (Exception ex) {
            System.debug('[Teqfocus Debug] ERROR in ProfileController.getActiveProjects: ' + ex.getMessage());
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static TimesheetWrappers.EmployeeSkillWrapper addSkillToProfile(Id skillId, String proficiency, Decimal experience, Boolean certified) {
        try {
            Employee_Skill__c es = ProfileService.addSkill(skillId, proficiency, experience, certified);
            // Query complete skill details to return clean wrapper
            Employee_Skill__c fullEs = SkillSelector.getEmployeeSkillById(es.Id);
            return new TimesheetWrappers.EmployeeSkillWrapper(fullEs);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void removeSkillFromProfile(Id employeeSkillId) {
        try {
            ProfileService.removeSkill(employeeSkillId);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void updateUserProfile(String email, String phone, String city, String state) {
        try {
            Id currentUserId = UserInfo.getUserId();
            ProfileService.updateUserProfile(currentUserId, email, phone, city, state);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void updateUserSettings(String timezone, String locale, Decimal weeklyHoursTarget, String notificationPreferences) {
        try {
            Id currentUserId = UserInfo.getUserId();
            ProfileService.updateUserSettings(currentUserId, timezone, locale, weeklyHoursTarget, notificationPreferences);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static TimesheetWrappers.EmployeeSkillWrapper updateSkillInProfile(Id employeeSkillId, String proficiency, Decimal experience, Boolean certified) {
        try {
            Employee_Skill__c es = ProfileService.updateSkill(employeeSkillId, proficiency, experience, certified);
            Employee_Skill__c fullEs = SkillSelector.getEmployeeSkillById(es.Id);
            return new TimesheetWrappers.EmployeeSkillWrapper(fullEs);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
}