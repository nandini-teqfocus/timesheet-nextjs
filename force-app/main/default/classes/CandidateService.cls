public with sharing class CandidateService extends BaseService {
    @AuraEnabled(cacheable=true)
    public static Candidate__c getCandidate(Id candidateId) {
        if (candidateId == null) {
            throw new AuraHandledException('Candidate Id is required.');
        }
        Candidate__c candidate = CandidateSelector.findById(candidateId);
        if (candidate == null) {
            throw new AuraHandledException('Candidate was not found or is not accessible.');
        }
        return candidate;
    }

    public static Candidate__c findOrCreateCandidate(ReferralService.ReferralSubmissionRequest request) {
        if (request == null || String.isBlank(request.candidateEmail)) {
            throw new ServiceException('Candidate email is required.');
        }
        String email = request.candidateEmail.trim().toLowerCase();
        List<Candidate__c> existingCandidates = CandidateSelector.findByEmail(new Set<String>{ email });
        if (!existingCandidates.isEmpty()) {
            return existingCandidates[0];
        }

        requireCreateable(Candidate__c.SObjectType);
        Candidate__c candidate = new Candidate__c(
            Name = buildCandidateName(request.candidateFirstName, request.candidateLastName),
            First_Name__c = request.candidateFirstName,
            Last_Name__c = request.candidateLastName,
            Email__c = email,
            Phone__c = request.candidatePhone,
            LinkedIn_URL__c = request.linkedinUrl,
            Current_Company__c = request.currentCompany,
            Current_Title__c = request.currentTitle,
            Years_of_Experience__c = request.yearsOfExperience,
            Skills__c = request.skills,
            Resume_Uploaded__c = String.isNotBlank(request.resumeDocumentId) || String.isNotBlank(request.resumeLink)
        );
        Candidate__c sanitizedCandidate = (Candidate__c) sanitizeForCreate(new List<SObject>{ candidate })[0];
        insert sanitizedCandidate;
        return sanitizedCandidate;
    }

    private static String buildCandidateName(String firstName, String lastName) {
        String fullName = ((firstName == null ? '' : firstName.trim()) + ' ' + (lastName == null ? '' : lastName.trim())).trim();
        return String.isBlank(fullName) ? 'Candidate' : fullName;
    }
}