public with sharing class ReferralController {
    @AuraEnabled
    public static ServiceResponse submitReferral(String jobId, String requestJson) {
        System.debug('ReferralController.submitReferral RECEIVED - jobId: ' + jobId);
        
        ReferralService.ReferralSubmissionRequest request = 
            (ReferralService.ReferralSubmissionRequest)JSON.deserialize(requestJson, ReferralService.ReferralSubmissionRequest.class);
            
        System.debug('Deserialized Request Data: ' + JSON.serialize(request));
        
        // Ensure the ID is populated in the request object if passed separately
        if (request != null && String.isBlank(request.jobPostingId)) {
            request.jobPostingId = jobId;
        }
        
        return ReferralService.submitReferral(request);
    }

    @AuraEnabled
    public static ServiceResponse updateReferralStatus(Id referralId, String newStatus) {
        return ReferralService.updateReferralStatus(referralId, newStatus);
    }

    @AuraEnabled(cacheable=true)
    public static List<Employee_Referral__c> getMyReferrals(Integer limitSize) {
        return ReferralService.getMyReferrals(limitSize);
    }

    @AuraEnabled(cacheable=true)
    public static List<Employee_Referral__c> getAllReferrals(Integer limitSize) {
        return ReferralService.getAllReferrals(limitSize);
    }

    @AuraEnabled
    public static List<Referral_Status_History__c> getStatusHistory(Id referralId) {
        return ReferralService.getStatusHistory(referralId);
    }

    @AuraEnabled(cacheable=true)
    public static Employee_Referral__c getReferralDetail(Id referralId) {
        return ReferralService.getReferralDetail(referralId);
    }

    @AuraEnabled
    public static ServiceResponse assignHiringManager(List<Id> referralIds, Id managerId) {
        try {
            ReferralService.assignHiringManager(referralIds, managerId);
            return ServiceResponse.ok('Hiring manager assigned successfully.', null);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static ServiceResponse addComment(Id referralId, String commentText, String commentType, Boolean visibleToEmployee) {
        try {
            ReferralService.addComment(referralId, commentText, commentType, visibleToEmployee);
            return ServiceResponse.ok('Comment added successfully.', null);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
    @AuraEnabled(cacheable=true)
    public static List<SObject> getActivityTimeline() {
        return ReferralSelector.getActivityTimeline();
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getDepartmentInsights() {
        List<AggregateResult> baseStats = ReferralSelector.getDepartmentInsights();
        List<AggregateResult> hiredStats = ReferralSelector.getHiredCountsByDepartment();
        
        Map<String, Integer> hiredMap = new Map<String, Integer>();
        for (AggregateResult ar : hiredStats) {
            hiredMap.put((String)ar.get('deptName'), Integer.valueOf(ar.get('hiredCount')));
        }
        
        List<Map<String, Object>> results = new List<Map<String, Object>>();
        for (AggregateResult ar : baseStats) {
            String deptName = (String)ar.get('deptName');
            Map<String, Object> deptInfo = new Map<String, Object>{
                'deptName' => deptName,
                'jobCount' => ar.get('jobCount'),
                'referralCount' => ar.get('referralCount'),
                'hiredCount' => hiredMap.containsKey(deptName) ? hiredMap.get(deptName) : 0
            };
            results.add(deptInfo);
        }
        return results;
    }

    @AuraEnabled(cacheable=true)
    public static List<AggregateResult> getPipelineData() {
        return ReferralSelector.getPipelineData();
    }
}