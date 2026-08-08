public with sharing class EmployeeReferralTriggerHandler {
    public static void beforeInsert(List<Employee_Referral__c> newRecords) {
        StatusHandler.beforeInsert(newRecords);
    }

    public static void beforeUpdate(Map<Id, Employee_Referral__c> oldMap, List<Employee_Referral__c> newRecords) {
        StatusHandler.beforeUpdate(oldMap, newRecords);
    }

    public static void afterInsert(List<Employee_Referral__c> newRecords) {
        StatusHandler.afterInsert(newRecords);
    }

    public static void afterUpdate(Map<Id, Employee_Referral__c> oldMap, List<Employee_Referral__c> newRecords) {
        StatusHandler.afterUpdate(oldMap, newRecords);
    }
}