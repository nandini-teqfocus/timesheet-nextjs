public with sharing class ReferralService extends BaseService {
    public class ReferralSubmissionRequest {
        @AuraEnabled public String jobPostingId;
        @AuraEnabled public String candidateId;
        @AuraEnabled public String candidateFirstName;
        @AuraEnabled public String candidateLastName;
        @AuraEnabled public String candidateEmail;
        @AuraEnabled public String candidatePhone;
        @AuraEnabled public String linkedinUrl;
        @AuraEnabled public String currentCompany;
        @AuraEnabled public String currentTitle;
        @AuraEnabled public Decimal yearsOfExperience;
        @AuraEnabled public String skills;
        @AuraEnabled public String notes;
        @AuraEnabled public String resumeLink;
        @AuraEnabled public Id resumeDocumentId;
    }

    public class StatusUpdateRequest {
        @AuraEnabled public Id referralId;
        @AuraEnabled public String newStatus;
        @AuraEnabled public String rejectionReason;
        @AuraEnabled public String changeReason;
    }

    @AuraEnabled
    public static ServiceResponse submitReferral(ReferralSubmissionRequest request) {
        System.debug('ReferralService.submitReferral START');
        System.debug('Request Data: ' + JSON.serializePretty(request));
        try {
            Employee_Referral__c referral = createReferral(request);
            System.debug('Referral created successfully: ' + referral.Id);
            return ServiceResponse.ok('Referral submitted successfully.', referral);
        } catch (Exception ex) {
            logError('ReferralService.submitReferral', ex, request == null ? null : request.jobPostingId);
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static ServiceResponse updateReferralStatus(Id referralId, String newStatus) {
        try {
            if (referralId == null || String.isBlank(newStatus)) {
                throw new ServiceException('Referral Id and new status are required.');
            }
            StatusUpdateRequest request = new StatusUpdateRequest();
            request.referralId = referralId;
            request.newStatus = newStatus;
            
            StatusHandler.updateStatuses(new Map<Id, StatusUpdateRequest>{ referralId => request });
            return ServiceResponse.ok('Referral status updated.', referralId);
        } catch (Exception ex) {
            logError('ReferralService.updateReferralStatus', ex, referralId);
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Employee_Referral__c> getMyReferrals(Integer limitSize) {
        return ReferralSelector.getMyReferrals(limitSize);
    }

    @AuraEnabled(cacheable=true)
    public static List<Employee_Referral__c> getAllReferrals(Integer limitSize) {
        return ReferralSelector.getAllReferrals(limitSize);
    }

    @AuraEnabled
    public static List<Referral_Status_History__c> getStatusHistory(Id referralId) {
        return StatusHistorySelector.getForReferral(referralId);
    }

    @AuraEnabled(cacheable=true)
    public static List<Referral_Comment__c> getReferralComments(Id referralId, Boolean employeeVisibleOnly) {
        return ReferralCommentSelector.getForReferral(referralId, employeeVisibleOnly);
    }

    @AuraEnabled(cacheable=true)
    public static Employee_Referral__c getReferralDetail(Id referralId) {
        if (referralId == null) return null;
        List<Employee_Referral__c> results = ReferralSelector.getByIds(new Set<Id>{ referralId });
        return results.isEmpty() ? null : results[0];
    }

    public static Employee_Referral__c createReferral(ReferralSubmissionRequest request) {
        System.debug('===== createReferral START =====');
        Employee_Referral__c referralToReturn = null;
        try {
            if (request == null) {
                throw new ServiceException('Referral submission details are required.');
            }
            
            System.debug('Request JSON: ' + JSON.serialize(request));
            
            if (String.isBlank(request.jobPostingId)) {
                throw new ServiceException('Job posting is required.');
            }

            Id jobId = (Id)request.jobPostingId;
            Job_Posting__c jobPosting = JobPostingSelector.getById(jobId);
            if (jobPosting == null) {
                throw new ServiceException('Selected job posting was not found.');
            }

            if (jobPosting.Status__c != 'Open') {
                throw new ServiceException('Selected job posting is not open.');
            }

            Candidate__c candidate = String.isBlank(request.candidateId)
                ? CandidateService.findOrCreateCandidate(request)
                : CandidateSelector.findById((Id)request.candidateId);
            
            if (candidate == null) {
                throw new ServiceException('Candidate is required.');
            }

            System.debug('ReferralService.createReferral - Job ID: ' + jobId + ', Candidate: ' + candidate.Id + ' (' + candidate.Email__c + ')');

            List<Employee_Referral__c> duplicateReferrals = ReferralSelector.findDuplicates(jobId, candidate.Email__c, UserInfo.getUserId());
            if (!duplicateReferrals.isEmpty()) {
                System.debug('Duplicate Check FAILED: ' + duplicateReferrals.size() + ' active referrals found.');
                throw new ServiceException('An active referral already exists for this candidate and job posting.');
            }

            requireCreateable(Employee_Referral__c.SObjectType);
            Employee_Referral__c referral = new Employee_Referral__c(
                Job_Posting__c = jobId,
                Candidate__c = candidate.Id,
                Referred_By__c = UserInfo.getUserId(),
                Status__c = 'Submitted',
                Notes__c = request.notes,
                Resume_Link__c = request.resumeLink,
                Resume_Content_Document_Id__c = request.resumeDocumentId,
                Submission_Date__c = System.now(),
                Last_Status_Change__c = System.now()
            );
            
            Employee_Referral__c sanitizedReferral = (Employee_Referral__c) sanitizeForCreate(new List<SObject>{ referral })[0];
            insert sanitizedReferral;
            System.debug('Referral inserted: ' + sanitizedReferral.Id);
            
            // Link resume if uploaded
            if (String.isNotBlank(request.resumeDocumentId)) {
                linkResumeToReferralAndCandidate(sanitizedReferral.Id, candidate.Id, (Id)request.resumeDocumentId);
            }

            // Attempt to get the fully populated record for the UI
            try {
                List<Employee_Referral__c> results = ReferralSelector.getByIds(new Set<Id>{ sanitizedReferral.Id });
                if (!results.isEmpty()) {
                    referralToReturn = results[0];
                } else {
                    System.debug('WARNING: Selector could not find record after insert. Likely sharing restrictions.');
                    referralToReturn = sanitizedReferral;
                }
            } catch (Exception selectorEx) {
                System.debug('WARNING: Error in selector after insert: ' + selectorEx.getMessage());
                referralToReturn = sanitizedReferral;
            }

            System.debug('===== createReferral SUCCESS =====');
            return referralToReturn;
            
        } catch (Exception ex) {
            String errorMsg = ex.getMessage();
            System.debug('!!!!! createReferral ERROR: ' + errorMsg);
            System.debug('STACK: ' + ex.getStackTraceString());
            // Rethrow as ServiceException to be caught by the outer try-catch
            if (ex instanceof ServiceException) {
                throw ex;
            }
            throw new ServiceException('Failed to create referral: ' + errorMsg);
        }
    }

    private static void linkResumeToReferralAndCandidate(Id referralId, Id candidateId, Id documentId) {
        try {
            List<ContentDocumentLink> links = new List<ContentDocumentLink>();
            
            links.add(new ContentDocumentLink(
                ContentDocumentId = documentId,
                LinkedEntityId = referralId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            ));
            
            if (candidateId != null) {
                links.add(new ContentDocumentLink(
                    ContentDocumentId = documentId,
                    LinkedEntityId = candidateId,
                    ShareType = 'V',
                    Visibility = 'AllUsers'
                ));
            }
            
            insert links;
        } catch (Exception ex) {
            System.debug('Error linking resume: ' + ex.getMessage());
            // We don't throw exception here to avoid breaking referral creation if linking fails
        }
    }


    public static void addComment(Id referralId, String commentText, String commentType, Boolean visibleToEmployee) {
        if (referralId == null || String.isBlank(commentText)) {
            throw new ServiceException('Referral Id and comment text are required.');
        }
        requireCreateable(Referral_Comment__c.SObjectType);
        Referral_Comment__c commentRecord = new Referral_Comment__c(
            Employee_Referral__c = referralId,
            Commented_By__c = UserInfo.getUserId(),
            Comment_Text__c = commentText,
            Comment_Type__c = String.isBlank(commentType) ? 'General' : commentType,
            Is_Visible_To_Employee__c = visibleToEmployee == null ? true : visibleToEmployee
        );
        insert sanitizeForCreate(new List<SObject>{ commentRecord });
    }

    public static void assignHiringManager(List<Id> referralIds, Id managerId) {
        if (referralIds == null || referralIds.isEmpty() || managerId == null) {
            throw new ServiceException('Referral IDs and Manager ID are required.');
        }
        requireUpdateable(Employee_Referral__c.SObjectType);
        List<Employee_Referral__c> referrals = new List<Employee_Referral__c>();
        for (Id refId : referralIds) {
            referrals.add(new Employee_Referral__c(
                Id = refId,
                Hiring_Manager_Assigned__c = managerId
            ));
        }
        update sanitizeForUpdate(referrals);
    }
}