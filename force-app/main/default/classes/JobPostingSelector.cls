public with sharing class JobPostingSelector extends BaseService {
    public static List<Job_Posting__c> getOpenJobs(Integer limitSize) {
        requireReadable(Job_Posting__c.SObjectType);
        Integer safeLimit = limitSize == null || limitSize <= 0 || limitSize > 500 ? 500 : limitSize;
        List<Job_Posting__c> records = [
            SELECT Id, Name, Title__c, Department__c, Department__r.Name, Department__r.Department_Name__c,
                   Employment_Type__c, Experience_Level__c, Location__c, Is_Remote__c, Hiring_Manager__c,
                   Posted_By__c, Posted_Date__c, Closing_Date__c, Status__c,
                   Job_Description__c, Total_Referrals__c
            FROM Job_Posting__c
            WHERE Status__c = 'Open'
            ORDER BY Posted_Date__c DESC NULLS LAST, CreatedDate DESC
            LIMIT :safeLimit
        ];
        return (List<Job_Posting__c>) sanitizeForRead(records);
    }

    public static Job_Posting__c getById(Id jobId) {
        requireReadable(Job_Posting__c.SObjectType);
        if (jobId == null) {
            return null;
        }
        List<Job_Posting__c> records = [
            SELECT Id, Name, Title__c, Department__c, Department__r.Name, Employment_Type__c,
                   Experience_Level__c, Location__c, Is_Remote__c, Hiring_Manager__c,
                   Posted_By__c, Posted_Date__c, Closing_Date__c, Status__c,
                   Job_Description__c, Total_Referrals__c
            FROM Job_Posting__c
            WHERE Id = :jobId
            LIMIT 1
        ];
        List<Job_Posting__c> readableRecords = (List<Job_Posting__c>) sanitizeForRead(records);
        return readableRecords.isEmpty() ? null : readableRecords[0];
    }
}