public with sharing class StatusHistorySelector extends BaseService {
    public static List<Referral_Status_History__c> getForReferral(Id referralId) {
        requireReadable(Referral_Status_History__c.SObjectType);
        if (referralId == null) {
            return new List<Referral_Status_History__c>();
        }
        List<Referral_Status_History__c> records = [
            SELECT Id, Name, Employee_Referral__c, Previous_Status__c, New_Status__c,
                   Change_Reason__c, Changed_By__c, Changed_By__r.Name, Changed_Date__c
            FROM Referral_Status_History__c
            WHERE Employee_Referral__c = :referralId
            ORDER BY Changed_Date__c DESC, CreatedDate DESC
        ];
        return records;
    }
}