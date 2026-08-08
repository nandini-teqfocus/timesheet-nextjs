public with sharing class ReferralSelector extends BaseService {
    public static List<Employee_Referral__c> getByIds(Set<Id> referralIds) {
        requireReadable(Employee_Referral__c.SObjectType);
        if (referralIds == null || referralIds.isEmpty()) {
            return new List<Employee_Referral__c>();
        }
        List<Employee_Referral__c> records = [
            SELECT Id, Name, Job_Posting__c, Job_Posting__r.Title__c, Job_Posting__r.Department__c, 
                   Job_Posting__r.Department__r.Name, Job_Posting__r.Department__r.Department_Name__c, 
                   Job_Posting__r.Location__c, Job_Posting__r.Job_Description__c,
                   Job_Posting__r.Employment_Type__c, Job_Posting__r.Experience_Level__c, Job_Posting__r.Is_Remote__c,
                   Candidate__c, Candidate__r.Name, Candidate__r.First_Name__c, Candidate__r.Last_Name__c, 
                   Candidate__r.Email__c, Candidate__r.Phone__c, Candidate__r.LinkedIn_URL__c, Candidate__r.Resume_Uploaded__c,
                   Referred_By__c, Referred_By__r.Name, Recruiter_Assigned__c, Hiring_Manager_Assigned__c,
                   Hiring_Manager_Assigned__r.Name, Status__c, Rejection_Reason__c, Notes__c, Submission_Date__c,
                   Resume_Content_Document_Id__c, Last_Status_Change__c, Bonus_Eligible__c, Bonus_Paid__c
            FROM Employee_Referral__c
            WHERE Id IN :referralIds
        ];
        return (List<Employee_Referral__c>) sanitizeForRead(records);
    }

    public static List<Employee_Referral__c> getMyReferrals(Integer limitSize) {
        requireReadable(Employee_Referral__c.SObjectType);
        Integer safeLimit = limitSize == null || limitSize <= 0 || limitSize > 200 ? 100 : limitSize;
        List<Employee_Referral__c> records = [
            SELECT Id, Name, Job_Posting__c, Job_Posting__r.Title__c, Job_Posting__r.Department__r.Name,
                   Job_Posting__r.Department__r.Department_Name__c, Job_Posting__r.Location__c,
                   Candidate__c, Candidate__r.Name, Candidate__r.First_Name__c, Candidate__r.Last_Name__c, Candidate__r.Email__c,
                   Referred_By__c, Referred_By__r.Name, Recruiter_Assigned__r.Name,
                   Status__c, Rejection_Reason__c, Notes__c, Submission_Date__c, Last_Status_Change__c,
                   Bonus_Eligible__c, Bonus_Paid__c, Resume_Content_Document_Id__c
            FROM Employee_Referral__c
            WHERE Referred_By__c = :UserInfo.getUserId()
            ORDER BY Submission_Date__c DESC NULLS LAST, CreatedDate DESC
            LIMIT :safeLimit
        ];
        return (List<Employee_Referral__c>) sanitizeForRead(records);
    }

    public static List<Employee_Referral__c> getAllReferrals(Integer limitSize) {
        requireReadable(Employee_Referral__c.SObjectType);
        Integer safeLimit = limitSize == null || limitSize <= 0 || limitSize > 1000 ? 500 : limitSize;
        List<Employee_Referral__c> records = [
            SELECT Id, Name, Job_Posting__c, Job_Posting__r.Title__c, Job_Posting__r.Department__c, 
                   Job_Posting__r.Department__r.Name, Job_Posting__r.Department__r.Department_Name__c, 
                   Candidate__c, Candidate__r.Name, Candidate__r.First_Name__c, Candidate__r.Last_Name__c, Candidate__r.Email__c,
                   Candidate__r.Resume_Uploaded__c, Recruiter_Assigned__r.Name,
                   Referred_By__c, Referred_By__r.Name, Status__c, Rejection_Reason__c, Notes__c,
                   Submission_Date__c, Last_Status_Change__c, Hiring_Manager_Assigned__r.Name
            FROM Employee_Referral__c
            ORDER BY Submission_Date__c DESC NULLS LAST, CreatedDate DESC
            LIMIT :safeLimit
        ];
        return (List<Employee_Referral__c>) sanitizeForRead(records);
    }

    public static List<Employee_Referral__c> findDuplicates(Id jobPostingId, String candidateEmail, Id referredById) {
        requireReadable(Employee_Referral__c.SObjectType);
        if (jobPostingId == null || String.isBlank(candidateEmail)) {
            return new List<Employee_Referral__c>();
        }
        
        String normalizedEmail = candidateEmail.trim().toLowerCase();
        System.debug('ReferralSelector.findDuplicates - Job: ' + jobPostingId + ', Email: ' + normalizedEmail);
        
        List<Employee_Referral__c> records = [
            SELECT Id, Name, Job_Posting__c, Candidate__c, Candidate__r.Email__c, Referred_By__c, Status__c
            FROM Employee_Referral__c
            WHERE Job_Posting__c = :jobPostingId
              AND Candidate__r.Email__c = :normalizedEmail
              AND Status__c IN ('Submitted', 'Under Review', 'Interview Scheduled', 'Selected')
            LIMIT 10
        ];
        
        System.debug('Active Duplicates Found: ' + records.size());
        for (Employee_Referral__c ref : records) {
            System.debug('Duplicate Details - Id: ' + ref.Id + ', Status: ' + ref.Status__c);
        }
        
        return (List<Employee_Referral__c>) sanitizeForRead(records);
    }

    public static List<SObject> getActivityTimeline() {
        requireReadable(Employee_Referral__c.SObjectType);
        requireReadable(Referral_Comment__c.SObjectType);
        
        List<SObject> activities = new List<SObject>();
        
        // New Referrals & Status Updates
        List<Employee_Referral__c> newRefs = [
            SELECT Id, Name, Candidate__r.Name, Job_Posting__r.Title__c, CreatedDate, Status__c, Referred_By__r.Name, LastModifiedDate
            FROM Employee_Referral__c
            ORDER BY LastModifiedDate DESC
            LIMIT 10
        ];
        activities.addAll((List<SObject>)newRefs);
        
        // Recent Comments
        List<Referral_Comment__c> recentComments = [
            SELECT Id, Comment_Text__c, Comment_Type__c, CreatedDate, Commented_By__r.Name, 
                   Employee_Referral__r.Name, Employee_Referral__r.Candidate__r.Name
            FROM Referral_Comment__c
            ORDER BY CreatedDate DESC
            LIMIT 10
        ];
        activities.addAll((List<SObject>)recentComments);
        
        return activities;
    }

    public static List<AggregateResult> getDepartmentInsights() {
        requireReadable(Job_Posting__c.SObjectType);
        requireReadable(Employee_Referral__c.SObjectType);
        
        // Note: Standard SOQL doesn't support CASE WHEN in Aggregate queries.
        // We will return the base aggregates and handle any specific logic in Apex/LWC if needed.
        return [
            SELECT Job_Posting__r.Department__r.Name deptName,
                   COUNT_DISTINCT(Job_Posting__c) jobCount,
                   COUNT(Id) referralCount
            FROM Employee_Referral__c
            WHERE Job_Posting__r.Department__r.Name != null
            GROUP BY Job_Posting__r.Department__r.Name
        ];
    }

    public static List<AggregateResult> getHiredCountsByDepartment() {
        requireReadable(Employee_Referral__c.SObjectType);
        return [
            SELECT Job_Posting__r.Department__r.Name deptName,
                   COUNT(Id) hiredCount
            FROM Employee_Referral__c
            WHERE Status__c = 'Hired' AND Job_Posting__r.Department__r.Name != null
            GROUP BY Job_Posting__r.Department__r.Name
        ];
    }

    public static List<AggregateResult> getPipelineData() {
        requireReadable(Employee_Referral__c.SObjectType);
        return [
            SELECT Status__c statusVal, COUNT(Id) totalCount
            FROM Employee_Referral__c
            GROUP BY Status__c
        ];
    }
}