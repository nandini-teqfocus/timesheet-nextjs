public with sharing class CandidateSelector extends BaseService {
    public static List<Candidate__c> findByEmail(Set<String> emails) {
        requireReadable(Candidate__c.SObjectType);
        if (emails == null || emails.isEmpty()) {
            return new List<Candidate__c>();
        }
        List<Candidate__c> records = [
            SELECT Id, Name, First_Name__c, Last_Name__c, Email__c, Phone__c, LinkedIn_URL__c,
                   Current_Company__c, Current_Title__c, Years_of_Experience__c, Skills__c,
                   Resume_Uploaded__c
            FROM Candidate__c
            WHERE Email__c IN :emails
        ];
        return (List<Candidate__c>) sanitizeForRead(records);
    }

    public static Candidate__c findById(Id candidateId) {
        requireReadable(Candidate__c.SObjectType);
        if (candidateId == null) {
            return null;
        }
        List<Candidate__c> records = [
            SELECT Id, Name, First_Name__c, Last_Name__c, Email__c, Phone__c, LinkedIn_URL__c,
                   Current_Company__c, Current_Title__c, Years_of_Experience__c, Skills__c,
                   Resume_Uploaded__c
            FROM Candidate__c
            WHERE Id = :candidateId
            LIMIT 1
        ];
        List<Candidate__c> readableRecords = (List<Candidate__c>) sanitizeForRead(records);
        return readableRecords.isEmpty() ? null : readableRecords[0];
    }
}