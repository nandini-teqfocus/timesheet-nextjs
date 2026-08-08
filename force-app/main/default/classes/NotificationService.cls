public with sharing class NotificationService extends BaseService {
    public static void notifyStatusChanges(Map<Id, Employee_Referral__c> oldMap, List<Employee_Referral__c> newRecords) {
        if (oldMap == null || newRecords == null || !isEmailEnabled()) {
            return;
        }
        Set<Id> referralIds = new Set<Id>();
        for (Employee_Referral__c referral : newRecords) {
            Employee_Referral__c oldReferral = oldMap.get(referral.Id);
            if (oldReferral != null && referral.Status__c != oldReferral.Status__c) {
                referralIds.add(referral.Id);
            }
        }
        if (referralIds.isEmpty()) {
            return;
        }

        List<Employee_Referral__c> referrals = [
            SELECT Id, Name, Status__c, Referred_By__r.Email, Referred_By__r.Name,
                   Candidate__r.First_Name__c, Candidate__r.Last_Name__c, Job_Posting__r.Title__c
            FROM Employee_Referral__c
            WHERE Id IN :referralIds
        ];

        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();
        for (Employee_Referral__c referral : referrals) {
            if (referral.Referred_By__r == null || String.isBlank(referral.Referred_By__r.Email)) {
                continue;
            }
            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setToAddresses(new List<String>{ referral.Referred_By__r.Email });
            email.setSubject('Referral status updated: ' + referral.Name);
            email.setPlainTextBody(buildStatusEmailBody(referral));
            emails.add(email);
        }
        if (!emails.isEmpty() && !Test.isRunningTest()) {
            Messaging.sendEmail(emails, false);
        }
    }

    private static Boolean isEmailEnabled() {
        Referral_Config__mdt configRecord = Referral_Config__mdt.getInstance('Default');
        return configRecord == null || configRecord.Enable_Email_Notifications__c == true;
    }

    private static String buildStatusEmailBody(Employee_Referral__c referral) {
        String candidateName = '';
        if (referral.Candidate__r != null) {
            candidateName = ((referral.Candidate__r.First_Name__c == null ? '' : referral.Candidate__r.First_Name__c) + ' ' +
                (referral.Candidate__r.Last_Name__c == null ? '' : referral.Candidate__r.Last_Name__c)).trim();
        }
        return 'Hello ' + referral.Referred_By__r.Name + ',\n\n' +
            'Your referral ' + referral.Name + ' for ' + candidateName +
            ' has been updated to ' + referral.Status__c + '.\n\n' +
            'Job: ' + (referral.Job_Posting__r == null ? '' : referral.Job_Posting__r.Title__c);
    }
}