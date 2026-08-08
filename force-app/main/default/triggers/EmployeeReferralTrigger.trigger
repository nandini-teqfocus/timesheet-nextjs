trigger EmployeeReferralTrigger on Employee_Referral__c (before insert, before update, after insert, after update) {
    if (Trigger.isBefore && Trigger.isInsert) {
        EmployeeReferralTriggerHandler.beforeInsert(Trigger.new);
    }
    if (Trigger.isBefore && Trigger.isUpdate) {
        EmployeeReferralTriggerHandler.beforeUpdate(Trigger.oldMap, Trigger.new);
    }
    if (Trigger.isAfter && Trigger.isInsert) {
        EmployeeReferralTriggerHandler.afterInsert(Trigger.new);
    }
    if (Trigger.isAfter && Trigger.isUpdate) {
        EmployeeReferralTriggerHandler.afterUpdate(Trigger.oldMap, Trigger.new);
    }
}