public with sharing class FileUploadService extends BaseService {
    public class UploadResult {
        @AuraEnabled public Id contentDocumentId;
        @AuraEnabled public Id contentVersionId;
        @AuraEnabled public Id linkedEntityId;
    }

    @AuraEnabled
    public static UploadResult uploadResume(Id candidateId, String fileName, String base64Data) {
        try {
            if (candidateId == null || String.isBlank(fileName) || String.isBlank(base64Data)) {
                throw new ServiceException('Candidate Id, file name, and file data are required.');
            }
            requireUpdateable(Candidate__c.SObjectType);

            ContentVersion version = new ContentVersion(
                Title = normalizeTitle(fileName),
                PathOnClient = fileName,
                VersionData = EncodingUtil.base64Decode(base64Data)
            );
            insert version;

            version = [
                SELECT Id, ContentDocumentId
                FROM ContentVersion
                WHERE Id = :version.Id
                LIMIT 1
            ];

            ContentDocumentLink link = new ContentDocumentLink(
                ContentDocumentId = version.ContentDocumentId,
                LinkedEntityId = candidateId,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );
            insert link;

            Candidate__c candidate = new Candidate__c(Id = candidateId, Resume_Uploaded__c = true);
            update sanitizeForUpdate(new List<SObject>{ candidate });

            UploadResult result = new UploadResult();
            result.contentDocumentId = version.ContentDocumentId;
            result.contentVersionId = version.Id;
            result.linkedEntityId = candidateId;
            return result;
        } catch (Exception ex) {
            logError('FileUploadService.uploadResume', ex, candidateId);
            throw new AuraHandledException(ex.getMessage());
        }
    }

    private static String normalizeTitle(String fileName) {
        Integer dotIndex = fileName == null ? -1 : fileName.lastIndexOf('.');
        return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
    }

    public class ResumeDetail {
        @AuraEnabled public Id documentId;
        @AuraEnabled public String fileName;
    }

    @AuraEnabled
    public static ResumeDetail getResumeDetail(Id referralId) {
        if (referralId == null) return null;
        
        // Get Candidate ID and stored Resume ID from Referral
        List<Employee_Referral__c> referrals = [
            SELECT Candidate__c, Resume_Content_Document_Id__c 
            FROM Employee_Referral__c 
            WHERE Id = :referralId 
            LIMIT 1
        ];
        if (referrals.isEmpty()) return null;
        
        Id candidateId = referrals[0].Candidate__c;
        Id storedDocId = (Id)referrals[0].Resume_Content_Document_Id__c;
        
        // Search for links, prioritizing the stored document ID if we have it
        List<ContentDocumentLink> links;
        if (storedDocId != null) {
            links = [
                SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileExtension
                FROM ContentDocumentLink 
                WHERE LinkedEntityId = :referralId AND ContentDocumentId = :storedDocId
                LIMIT 1
            ];
        }

        // Fallback: Search for any links to Referral or Candidate
        if (links == null || links.isEmpty()) {
            links = [
                SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileExtension
                FROM ContentDocumentLink 
                WHERE LinkedEntityId IN (:referralId, :candidateId)
                ORDER BY ContentDocument.CreatedDate DESC
                LIMIT 1
            ];
        }
        
        if (links.isEmpty()) return null;
        
        ResumeDetail detail = new ResumeDetail();
        detail.documentId = links[0].ContentDocumentId;
        detail.fileName = links[0].ContentDocument.Title + (String.isNotBlank(links[0].ContentDocument.FileExtension) ? '.' + links[0].ContentDocument.FileExtension : '');
        return detail;
    }

    @AuraEnabled
    public static Id getResumeId(Id referralId) {
        ResumeDetail detail = getResumeDetail(referralId);
        return detail != null ? detail.documentId : null;
    }
}