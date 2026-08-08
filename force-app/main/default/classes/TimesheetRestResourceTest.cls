@isTest
private class TimesheetRestResourceTest {

    @testSetup
    static void setup() {
        User thisUser = new User(Id = UserInfo.getUserId());
        System.runAs(thisUser) {
            Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
            User testUser = new User(
                FirstName = 'Test',
                LastName = 'RestUser',
                Email = 'rest.user@testtimesheet.com',
                Username = 'rest.user.' + DateTime.now().getTime() + '@testtimesheet.com',
                Alias = 'trest',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US'
            );
            insert testUser;

            PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Teqfocus_Timesheet_External_Permissions' LIMIT 1];
            insert new PermissionSetAssignment(AssigneeId = testUser.Id, PermissionSetId = ps.Id);

            System.runAs(testUser) {
                Project__c p = new Project__c(
                    Name = 'Test REST Project',
                    Project_Code__c = 'PRJ-REST',
                    Budget_Hours__c = 100,
                    Status__c = 'Active'
                );
                insert p;
            }
        }
    }

    @isTest
    static void testGetTimesheetData() {
        User u = [SELECT Id FROM User WHERE Email = 'rest.user@testtimesheet.com' LIMIT 1];
        System.runAs(u) {
            Date weekStart = Date.today().toStartOfWeek();
            Date weekEnd = weekStart.addDays(6);
            Project__c proj = [SELECT Id FROM Project__c LIMIT 1];

            Timesheet_Entry__c entry = new Timesheet_Entry__c(
                Entry_Date__c = weekStart,
                Hours__c = 8,
                Project__c = proj.Id,
                Category__c = 'Development',
                Description__c = 'REST API Test',
                Is_Billable__c = true
            );
            TimesheetService.saveEntry(entry, weekStart, weekEnd);

            RestRequest req = new RestRequest();
            RestResponse res = new RestResponse();
            req.requestURI = '/services/apexrest/v1/timesheets';
            req.httpMethod = 'GET';
            req.addParameter('weekStart', String.valueOf(weekStart));

            RestContext.request = req;
            RestContext.response = res;

            Test.startTest();
            TimesheetRestResource.handleGet();
            Test.stopTest();

            System.assertEquals(200, res.statusCode);
            System.assert(res.responseBody.toString().contains('Timesheet retrieved'));
        }
    }

    @isTest
    static void testGetRecentActivities() {
        User u = [SELECT Id FROM User WHERE Email = 'rest.user@testtimesheet.com' LIMIT 1];
        System.runAs(u) {
            RestRequest req = new RestRequest();
            RestResponse res = new RestResponse();
            req.requestURI = '/services/apexrest/v1/timesheets/recent';
            req.httpMethod = 'GET';

            RestContext.request = req;
            RestContext.response = res;

            Test.startTest();
            TimesheetRestResource.handleGet();
            Test.stopTest();

            System.assertEquals(200, res.statusCode);
        }
    }

    @isTest
    static void testSaveEntryAndSubmit() {
        User u = [SELECT Id FROM User WHERE Email = 'rest.user@testtimesheet.com' LIMIT 1];
        System.runAs(u) {
            Date weekStart = Date.today().toStartOfWeek();
            Date weekEnd = weekStart.addDays(6);
            Project__c proj = [SELECT Id FROM Project__c LIMIT 1];

            Timesheet_Entry__c newEntry = new Timesheet_Entry__c(
                Entry_Date__c = weekStart,
                Hours__c = 7.5,
                Project__c = proj.Id,
                Category__c = 'Development',
                Description__c = 'REST Save Test',
                Is_Billable__c = true
            );

            TimesheetRestResource.SaveEntryRequest saveReq = new TimesheetRestResource.SaveEntryRequest();
            saveReq.entry = newEntry;
            saveReq.weekStart = weekStart;
            saveReq.weekEnd = weekEnd;

            RestRequest req = new RestRequest();
            RestResponse res = new RestResponse();
            req.requestURI = '/services/apexrest/v1/timesheets';
            req.httpMethod = 'POST';
            req.requestBody = Blob.valueOf(JSON.serialize(saveReq));

            RestContext.request = req;
            RestContext.response = res;

            Test.startTest();
            TimesheetRestResource.handlePost();
            Test.stopTest();

            System.assertEquals(201, res.statusCode);

            // Test Submit
            Timesheet__c ts = [SELECT Id FROM Timesheet__c WHERE Employee__c = :u.Id LIMIT 1];
            Map<String, Object> submitPayload = new Map<String, Object>{
                'timesheetId' => ts.Id
            };

            RestRequest submitReq = new RestRequest();
            RestResponse submitRes = new RestResponse();
            submitReq.requestURI = '/services/apexrest/v1/timesheets/submit';
            submitReq.httpMethod = 'POST';
            submitReq.requestBody = Blob.valueOf(JSON.serialize(submitPayload));

            RestContext.request = submitReq;
            RestContext.response = submitRes;

            TimesheetRestResource.handlePost();
            System.assertEquals(200, submitRes.statusCode);
        }
    }

    @isTest
    static void testDeleteEntry() {
        User u = [SELECT Id FROM User WHERE Email = 'rest.user@testtimesheet.com' LIMIT 1];
        System.runAs(u) {
            Date weekStart = Date.today().toStartOfWeek();
            Date weekEnd = weekStart.addDays(6);
            Project__c proj = [SELECT Id FROM Project__c LIMIT 1];

            Timesheet_Entry__c entry = new Timesheet_Entry__c(
                Entry_Date__c = weekStart,
                Hours__c = 8,
                Project__c = proj.Id,
                Category__c = 'Development',
                Description__c = 'To Delete',
                Is_Billable__c = true
            );
            TimesheetService.saveEntry(entry, weekStart, weekEnd);

            RestRequest req = new RestRequest();
            RestResponse res = new RestResponse();
            req.requestURI = '/services/apexrest/v1/timesheets/' + entry.Id;
            req.httpMethod = 'DELETE';

            RestContext.request = req;
            RestContext.response = res;

            Test.startTest();
            TimesheetRestResource.handleDelete();
            Test.stopTest();

            System.assertEquals(200, res.statusCode);
        }
    }
}