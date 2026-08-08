public without sharing class ProjectSelector {
    
    public static List<Project__c> getActiveProjects() {
        return [
            SELECT Id, Name, Project_Code__c, Status__c, Budget_Hours__c
            FROM Project__c
            WHERE Status__c = 'Active'
            ORDER BY Name ASC
            LIMIT 100
        ];
    }
}