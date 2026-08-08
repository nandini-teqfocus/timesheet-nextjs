public with sharing class FileUploadController {
    @AuraEnabled
    public static FileUploadService.UploadResult uploadResume(Id candidateId, String fileName, String base64Data) {
        return FileUploadService.uploadResume(candidateId, fileName, base64Data);
    }
    @AuraEnabled
    public static Id getResumeId(Id referralId) {
        return FileUploadService.getResumeId(referralId);
    }
    @AuraEnabled
    public static FileUploadService.ResumeDetail getResumeDetail(Id referralId) {
        return FileUploadService.getResumeDetail(referralId);
    }
}