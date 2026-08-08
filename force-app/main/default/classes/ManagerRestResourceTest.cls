@isTest
private class ManagerRestResourceTest {

    @testSetup
    static void setup() {
        User managerUser;
        User subUser;
        Project__c proj;

        User thisUser = new User(Id = UserInfo.getUserId());
        System.runAs(thisUser) {
            Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
            
            managerUser = new User(
                FirstName = 'Neo',
                LastName = 'Manager',
                Email = 'neo.manager@testmanager.com',
                Username = 'neo.manager.' + DateTime.now().getTime() + '@testmanager.com',
                Alias = 'nmanager',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US',
                Title = 'Engineering Director'
            );
            
            subUser = new User(
                FirstName = 'Sub',
                LastName = 'Employee',
                Email = 'sub.employee@testmanager.com',
                Username = 'sub.employee.' + DateTime.now().getTime() + '@testmanager.com',
                Alias = 'sempl',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US',
                Title = 'Software Engineer'
            );
            
            insert new List<User>{managerUser, subUser};

            PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Teqfocus_Timesheet_External_Permissions' LIMIT 1];
            insert new List<PermissionSetAssignment>{
                new PermissionSetAssignment(AssigneeId = managerUser.Id, PermissionSetId = ps.Id),
                new PermissionSetAssignment(AssigneeId = subUser.Id, PermissionSetId = ps.Id)
            };

            Employee__c mgrEmp = new Employee__c(
                Name = 'Neo Manager',
                User__c = managerUser.Id,
                Role_Type__c = 'Manager',
                OwnerId = managerUser.Id
            );
            insert mgrEmp;

            Employee__c subEmp = new Employee__c(
                Name = 'Sub Employee',
                User__c = subUser.Id,
                Role_Type__c = 'Employee',
                Manager__c = mgrEmp.Id,
                OwnerId = managerUser.Id
            );
            insert subEmp;

            proj = new Project__c(
                Name = 'Manager Test Project',
                Project_Code__c = 'MGR-PRJ',
                Status__c = 'Active',
                Budget_Hours__c = 100
            );
            insert proj;
        }

        System.runAs(subUser) {
            Date weekStart = Date.today().toStartOfWeek();
            Date weekEnd = weekStart.addDays(6);
            Timesheet_Entry__c entry = new Timesheet_Entry__c(
                Entry_Date__c = weekStart,
                Hours__c = 8,
                Project__c = proj.Id,
                Category__c = 'Development',
                Description__c = 'Subordinate entry for manager test',
                Is_Billable__c = true
            );
            TimesheetService.saveEntry(entry, weekStart, weekEnd);
        }
    }

    @isTest
    static void testGetManagerDashboard() {
        User mgr = [SELECT Id FROM User WHERE Email = 'neo.manager@testmanager.com' LIMIT 1];
        System.runAs(mgr) {
            RestRequest req = new RestRequest();
            RestResponse res = new RestResponse();
            req.requestURI = '/services/apexrest/v1/manager/dashboard';
            req.httpMethod = 'GET';

            RestContext.request = req;
            RestContext.response = res;

            Test.startTest();
            ManagerRestResource.handleGet();
            Test.stopTest();

            System.assertEquals(200, res.statusCode);
            System.assert(res.responseBody.toString().contains('Manager dashboard statistics retrieved'));
        }
    }

    @isTest
    static void testGetSubordinates() {
        User mgr = [SELECT Id FROM User WHERE Email = 'neo.manager@testmanager.com' LIMIT 1];
        System.runAs(mgr) {
            RestRequest req = new RestRequest();
            RestResponse res = new RestResponse();
            req.requestURI = '/services/apexrest/v1/manager/subordinates';
            req.httpMethod = 'GET';

            RestContext.request = req;
            RestContext.response = res;

            Test.startTest();
            ManagerRestResource.handleGet();
            Test.stopTest();

            System.assertEquals(200, res.statusCode);
            System.assert(res.responseBody.toString().contains('Subordinate employees retrieved'));
        }
    }

    @isTest
    static void testGetTeamActivities() {
        User mgr = [SELECT Id FROM User WHERE Email = 'neo.manager@testmanager.com' LIMIT 1];
        System.runAs(mgr) {
            RestRequest req = new RestRequest();
            RestResponse res = new RestResponse();
            req.requestURI = '/services/apexrest/v1/manager/activities';
            req.httpMethod = 'GET';

            RestContext.request = req;
            RestContext.response = res;

            Test.startTest();
            ManagerRestResource.handleGet();
            Test.stopTest();

            System.assertEquals(200, res.statusCode);
            System.assert(res.responseBody.toString().contains('Team activities retrieved'));
        }
    }

    @isTest
    static void testGetEmployeeTimesheetsAndEntries() {
        User mgr = [SELECT Id FROM User WHERE Email = 'neo.manager@testmanager.com' LIMIT 1];
        Employee__c subEmp = [SELECT Id, User__c FROM Employee__c WHERE Name = 'Sub Employee' LIMIT 1];

        // Fetch Timesheet ID using system context to bypass test user SOQL sharing
        Timesheet__c subTs = [SELECT Id FROM Timesheet__c LIMIT 1];

        System.runAs(mgr) {
            RestRequest req = new RestRequest();
            RestResponse res = new RestResponse();
            req.requestURI = '/services/apexrest/v1/manager/timesheets';
            req.httpMethod = 'GET';
            req.addParameter('employeeId', String.valueOf(subEmp.Id));

            RestContext.request = req;
            RestContext.response = res;

            Test.startTest();
            ManagerRestResource.handleGet();
            Test.stopTest();

            System.assertEquals(200, res.statusCode);

            RestRequest reqEntries = new RestRequest();
            RestResponse resEntries = new RestResponse();
            reqEntries.requestURI = '/services/apexrest/v1/manager/entries';
            reqEntries.httpMethod = 'GET';
            reqEntries.addParameter('timesheetId', String.valueOf(subTs.Id));

            RestContext.request = reqEntries;
            RestContext.response = resEntries;

            ManagerRestResource.handleGet();
            System.assertEquals(200, resEntries.statusCode);
        }
    }
}