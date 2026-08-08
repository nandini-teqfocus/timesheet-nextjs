public with sharing class SecurityUtil {
    public class SecurityException extends Exception {}

    /**
     * Enforces Read CRUD/FLS validation.
     */
    public static void checkRead(SObjectType sObjectType, List<Schema.SObjectField> fields) {
        DescribeSObjectResult describe = sObjectType.getDescribe();
        if (!describe.isAccessible()) {
            throw new SecurityException('Access denied to object: ' + describe.getName());
        }
        for (Schema.SObjectField field : fields) {
            DescribeFieldResult descField = field.getDescribe();
            if (!descField.isAccessible()) {
                if (descField.isCustom() && !descField.isNillable()) {
                    continue;
                }
                throw new SecurityException('Access denied to field: ' + descField.getName() + ' on ' + describe.getName());
            }
        }
    }

    /**
     * Enforces Create CRUD/FLS validation.
     */
    public static void checkCreate(SObjectType sObjectType, List<Schema.SObjectField> fields) {
        DescribeSObjectResult describe = sObjectType.getDescribe();
        if (!describe.isCreateable()) {
            throw new SecurityException('Create permission denied on object: ' + describe.getName());
        }
        for (Schema.SObjectField field : fields) {
            DescribeFieldResult descField = field.getDescribe();
            if (!descField.isCreateable()) {
                if (descField.isCustom() && !descField.isNillable()) {
                    continue;
                }
                throw new SecurityException('Create permission denied on field: ' + descField.getName() + ' on ' + describe.getName());
            }
        }
    }

    /**
     * Enforces Update CRUD/FLS validation.
     */
    public static void checkUpdate(SObjectType sObjectType, List<Schema.SObjectField> fields) {
        DescribeSObjectResult describe = sObjectType.getDescribe();
        if (!describe.isUpdateable()) {
            throw new SecurityException('Update permission denied on object: ' + describe.getName());
        }
        for (Schema.SObjectField field : fields) {
            DescribeFieldResult descField = field.getDescribe();
            if (!descField.isUpdateable()) {
                if (descField.isCustom() && !descField.isNillable()) {
                    continue;
                }
                throw new SecurityException('Update permission denied on field: ' + descField.getName() + ' on ' + describe.getName());
            }
        }
    }

    /**
     * Enforces Delete CRUD validation.
     */
    public static void checkDelete(SObjectType sObjectType) {
        DescribeSObjectResult describe = sObjectType.getDescribe();
        if (!describe.isDeletable()) {
            throw new SecurityException('Delete permission denied on object: ' + describe.getName());
        }
    }

    /**
     * Validates that the active user is the owner/employee of the target record.
     */
    public static void checkRecordOwnership(SObject record, String employeeField) {
        Id activeUserId = UserInfo.getUserId();
        Id recordUserId = (Id) record.get(employeeField);
        if (recordUserId != activeUserId) {
            throw new SecurityException('Access Denied: You do not own this record context.');
        }
    }
}