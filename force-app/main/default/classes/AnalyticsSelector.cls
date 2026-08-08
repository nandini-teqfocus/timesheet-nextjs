public with sharing class AnalyticsSelector {
    
    public static List<Analytics_Snapshot__c> getAnalyticsSnapshots(Id employeeId, Integer rowLimit) {
        return [
            SELECT Id, Name, Employee__c, Period__c, Utilization_Rate__c, CreatedDate
            FROM Analytics_Snapshot__c
            WHERE Employee__c = :employeeId
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT :rowLimit
        ];
    }
}