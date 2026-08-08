public with sharing class JobController {
    @AuraEnabled
    public static List<Job_Posting__c> getOpenJobPostings(Integer limitSize) {
        return JobService.getOpenJobPostings(limitSize);
    }

    @AuraEnabled(cacheable=true)
    public static Job_Posting__c getJobDetail(Id jobId) {
        return JobService.getJobDetail(jobId);
    }
}