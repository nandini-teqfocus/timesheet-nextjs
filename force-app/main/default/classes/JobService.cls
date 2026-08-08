public with sharing virtual class JobService extends BaseService {
    @AuraEnabled
    public static List<Job_Posting__c> getOpenJobPostings(Integer limitSize) {
        return JobPostingSelector.getOpenJobs(limitSize);
    }

    @AuraEnabled(cacheable=true)
    public static Job_Posting__c getJobDetail(Id jobId) {
        if (jobId == null) {
            throw new AuraHandledException('Job Id is required.');
        }
        Job_Posting__c jobPosting = JobPostingSelector.getById(jobId);
        if (jobPosting == null) {
            throw new AuraHandledException('Job posting was not found or is not accessible.');
        }
        return jobPosting;
    }

    public static void closeExpiredJobs(Date asOfDate) {
        requireUpdateable(Job_Posting__c.SObjectType);
        Date effectiveDate = asOfDate == null ? Date.today() : asOfDate;
        List<Job_Posting__c> jobsToClose = [
            SELECT Id, Status__c, Closing_Date__c
            FROM Job_Posting__c
            WHERE Status__c = 'Open'
              AND Closing_Date__c != null
              AND Closing_Date__c < :effectiveDate
        ];
        for (Job_Posting__c jobPosting : jobsToClose) {
            jobPosting.Status__c = 'Closed';
        }
        if (!jobsToClose.isEmpty()) {
            List<SObject> recordsToUpdate = new List<SObject>();
            for (Job_Posting__c jobPosting : jobsToClose) {
                recordsToUpdate.add(jobPosting);
            }
            update sanitizeForUpdate(recordsToUpdate);
        }
    }
}