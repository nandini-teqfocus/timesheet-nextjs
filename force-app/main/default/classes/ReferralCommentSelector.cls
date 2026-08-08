public with sharing class ReferralCommentSelector extends BaseService {
    public static List<Referral_Comment__c> getForReferral(Id referralId, Boolean employeeVisibleOnly) {
        requireReadable(Referral_Comment__c.SObjectType);
        if (referralId == null) {
            return new List<Referral_Comment__c>();
        }
        if (employeeVisibleOnly == true) {
            List<Referral_Comment__c> visibleRecords = [
                SELECT Id, Name, Employee_Referral__c, Commented_By__c, Commented_By__r.Name,
                       Comment_Text__c, Comment_Type__c, Is_Visible_To_Employee__c, CreatedDate
                FROM Referral_Comment__c
                WHERE Employee_Referral__c = :referralId
                  AND Is_Visible_To_Employee__c = true
                ORDER BY CreatedDate DESC
            ];
            return (List<Referral_Comment__c>) sanitizeForRead(visibleRecords);
        }
        List<Referral_Comment__c> records = [
            SELECT Id, Name, Employee_Referral__c, Commented_By__c, Commented_By__r.Name,
                   Comment_Text__c, Comment_Type__c, Is_Visible_To_Employee__c, CreatedDate
            FROM Referral_Comment__c
            WHERE Employee_Referral__c = :referralId
            ORDER BY CreatedDate DESC
        ];
        return (List<Referral_Comment__c>) sanitizeForRead(records);
    }
}