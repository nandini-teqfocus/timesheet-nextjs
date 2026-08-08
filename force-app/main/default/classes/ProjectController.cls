public with sharing class ProjectController {
    
    @AuraEnabled(cacheable=true)
    public static List<Project__c> getActiveProjects() {
        try {
            return ProjectSelector.getActiveProjects();
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
}