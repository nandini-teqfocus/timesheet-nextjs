@IsTest
public class SecurityUtilTest {
    @IsTest
    static void testCheckAccess() {
        Test.startTest();
        SecurityUtil.checkRead(Account.SObjectType, new List<Schema.SObjectField>{ Account.Name });
        SecurityUtil.checkCreate(Account.SObjectType, new List<Schema.SObjectField>{ Account.Name });
        SecurityUtil.checkUpdate(Account.SObjectType, new List<Schema.SObjectField>{ Account.Name });
        SecurityUtil.checkDelete(Account.SObjectType);
        
        Account acc = new Account(OwnerId = UserInfo.getUserId());
        SecurityUtil.checkRecordOwnership(acc, 'OwnerId');
        
        try {
            Account acc2 = new Account(OwnerId = '005000000000000AAA');
            SecurityUtil.checkRecordOwnership(acc2, 'OwnerId');
            System.assert(false, 'Should throw SecurityException');
        } catch (SecurityUtil.SecurityException e) {
            System.assert(true, 'Expected exception caught');
        }
        Test.stopTest();
    }
}