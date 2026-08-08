public with sharing virtual class BaseService {
    public class ServiceException extends Exception {
    }

    public static void requireReadable(Schema.SObjectType objectType) {
        if (!objectType.getDescribe().isAccessible()) {
            throw new ServiceException('You do not have access to read ' + objectType.getDescribe().getLabel() + '.');
        }
    }

    public static void requireCreateable(Schema.SObjectType objectType) {
        if (!objectType.getDescribe().isCreateable()) {
            throw new ServiceException('You do not have access to create ' + objectType.getDescribe().getLabel() + '.');
        }
    }

    public static void requireUpdateable(Schema.SObjectType objectType) {
        if (!objectType.getDescribe().isUpdateable()) {
            throw new ServiceException('You do not have access to update ' + objectType.getDescribe().getLabel() + '.');
        }
    }

    public static List<SObject> sanitizeForCreate(List<SObject> records) {
        return Security.stripInaccessible(AccessType.CREATABLE, records).getRecords();
    }

    public static List<SObject> sanitizeForUpdate(List<SObject> records) {
        return Security.stripInaccessible(AccessType.UPDATABLE, records).getRecords();
    }

    public static List<SObject> sanitizeForRead(List<SObject> records) {
        return Security.stripInaccessible(AccessType.READABLE, records).getRecords();
    }

    public static void logError(String source, Exception ex, Id relatedRecordId) {
        try {
            if (!Schema.sObjectType.Error_Log__c.isCreateable()) {
                return;
            }
            Error_Log__c logRecord = new Error_Log__c(
                Flow_Name__c = source,
                Error_Message__c = ex.getMessage(),
                Related_Record_Id__c = relatedRecordId == null ? null : String.valueOf(relatedRecordId),
                User__c = UserInfo.getUserId(),
                Stack_Trace__c = ex.getStackTraceString(),
                Logged_On__c = System.now(),
                Detailed_Message__c = source + ': ' + ex.getMessage()
            );
            insert sanitizeForCreate(new List<SObject>{ logRecord });
        } catch (Exception ignored) {
            System.debug(LoggingLevel.ERROR, 'Failed to write Error_Log__c: ' + ignored.getMessage());
        }
    }
}