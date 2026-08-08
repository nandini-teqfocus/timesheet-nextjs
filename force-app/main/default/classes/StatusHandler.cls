public with sharing class StatusHandler extends BaseService {
    private static final Set<String> VALID_STATUSES = new Set<String>{
        'Submitted', 'Under Review', 'Interview Scheduled', 'Selected', 'Rejected', 'Hired'
    };

    // Static maps to temporarily share transition reasons and notes from updateStatuses to afterUpdate
    public static Map<Id, String> changeReasons = new Map<Id, String>();
    public static Map<Id, String> rejectionReasons = new Map<Id, String>();

    public static void beforeInsert(List<Employee_Referral__c> newRecords) {
        if (newRecords == null) {
            return;
        }
        Datetime nowValue = System.now();
        for (Employee_Referral__c referral : newRecords) {
            if (String.isBlank(referral.Status__c)) {
                referral.Status__c = 'Submitted';
            }
            if (referral.Submission_Date__c == null) {
                referral.Submission_Date__c = nowValue;
            }
            if (referral.Last_Status_Change__c == null) {
                referral.Last_Status_Change__c = nowValue;
            }
        }
    }

    public static void beforeUpdate(Map<Id, Employee_Referral__c> oldMap, List<Employee_Referral__c> newRecords) {
        if (oldMap == null || newRecords == null) {
            return;
        }
        Datetime nowValue = System.now();
        for (Employee_Referral__c referral : newRecords) {
            Employee_Referral__c oldReferral = oldMap.get(referral.Id);
            if (oldReferral != null && referral.Status__c != oldReferral.Status__c) {
                referral.Last_Status_Change__c = nowValue;
            }
        }
    }

    public static void afterInsert(List<Employee_Referral__c> newRecords) {
        if (newRecords == null) {
            return;
        }
        List<Referral_Status_History__c> histories = new List<Referral_Status_History__c>();
        for (Employee_Referral__c referral : newRecords) {
            histories.add(new Referral_Status_History__c(
                Employee_Referral__c = referral.Id,
                Previous_Status__c = null,
                New_Status__c = String.isBlank(referral.Status__c) ? 'Submitted' : referral.Status__c,
                Changed_By__c = UserInfo.getUserId(),
                Changed_Date__c = System.now(),
                Change_Reason__c = 'Referral successfully submitted to the recruitment pipeline.'
            ));
        }
        if (!histories.isEmpty()) {
            insert histories;
        }
    }

    public static void afterUpdate(Map<Id, Employee_Referral__c> oldMap, List<Employee_Referral__c> newRecords) {
        if (oldMap == null || newRecords == null) {
            return;
        }
        List<Referral_Status_History__c> histories = new List<Referral_Status_History__c>();
        List<Referral_Status_Changed__e> events = new List<Referral_Status_Changed__e>();
        for (Employee_Referral__c referral : newRecords) {
            Employee_Referral__c oldReferral = oldMap.get(referral.Id);
            if (oldReferral == null || referral.Status__c == oldReferral.Status__c) {
                continue;
            }

            // Determine highly detailed, professional transition reason
            String reason = changeReasons.get(referral.Id);
            if (String.isBlank(reason)) {
                if (referral.Status__c == 'Rejected' && !String.isBlank(referral.Rejection_Reason__c)) {
                    reason = 'Rejection Reason: ' + referral.Rejection_Reason__c;
                } else if (!String.isBlank(rejectionReasons.get(referral.Id))) {
                    reason = 'Rejection Reason: ' + rejectionReasons.get(referral.Id);
                } else {
                    reason = 'Candidate moved from ' + oldReferral.Status__c + ' to ' + referral.Status__c + '.';
                }
            }

            histories.add(new Referral_Status_History__c(
                Employee_Referral__c = referral.Id,
                Previous_Status__c = oldReferral.Status__c,
                New_Status__c = referral.Status__c,
                Changed_By__c = UserInfo.getUserId(),
                Changed_Date__c = System.now(),
                Change_Reason__c = reason
            ));

            events.add(new Referral_Status_Changed__e(
                ReferralId__c = String.valueOf(referral.Id),
                OldStatus__c = oldReferral.Status__c,
                NewStatus__c = referral.Status__c,
                ChangedBy__c = UserInfo.getUserId()
            ));
        }
        if (!histories.isEmpty()) {
            insert histories;
        }
        if (!events.isEmpty()) {
            EventBus.publish(events);
        }
        NotificationService.notifyStatusChanges(oldMap, newRecords);
    }

    public static void updateStatuses(Map<Id, ReferralService.StatusUpdateRequest> requestsByReferralId) {
        if (requestsByReferralId == null || requestsByReferralId.isEmpty()) {
            return;
        }
        requireUpdateable(Employee_Referral__c.SObjectType);
        List<Employee_Referral__c> referrals = [
            SELECT Id, Status__c, Rejection_Reason__c
            FROM Employee_Referral__c
            WHERE Id IN :requestsByReferralId.keySet()
            FOR UPDATE
        ];
        for (Employee_Referral__c referral : referrals) {
            ReferralService.StatusUpdateRequest request = requestsByReferralId.get(referral.Id);
            if (!VALID_STATUSES.contains(request.newStatus)) {
                throw new ServiceException('Unsupported referral status: ' + request.newStatus);
            }
            referral.Status__c = request.newStatus;
            referral.Rejection_Reason__c = request.rejectionReason;

            // Populate static map references for trigger use
            changeReasons.put(referral.Id, request.changeReason);
            rejectionReasons.put(referral.Id, request.rejectionReason);
        }
        if (!referrals.isEmpty()) {
            List<SObject> recordsToUpdate = new List<SObject>();
            for (Employee_Referral__c referral : referrals) {
                recordsToUpdate.add(referral);
            }
            update sanitizeForUpdate(recordsToUpdate);
            for (Employee_Referral__c referral : referrals) {
                ReferralService.StatusUpdateRequest request = requestsByReferralId.get(referral.Id);
                if (!String.isBlank(request.changeReason)) {
                    ReferralService.addComment(referral.Id, request.changeReason, 'Status Update', true);
                }
            }
        }
    }
}