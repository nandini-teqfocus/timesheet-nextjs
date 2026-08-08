@isTest
private class TimesheetManagerControllerTest {
    
    @testSetup
    static void setup() {
        // Run as current user to avoid Mixed DML
        User thisUser = new User(Id = UserInfo.getUserId());
        System.runAs(thisUser) {
            Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
            
            // Create Manager User
            User managerUser = new User(
                FirstName = 'Neo',
                LastName = 'Singh',
                Email = 'neo.singh@testtimesheet.com',
                Username = 'neo.singh.' + DateTime.now().getTime() + '@testtimesheet.com',
                Alias = 'nsingh',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US',
                Title = 'Engineering Director'
            );
            
            // Create Subordinate User
            User subUser = new User(
                FirstName = 'TestUser',
                LastName = 'One',
                Email = 'testuser.one@testtimesheet.com',
                Username = 'testuser.one.' + DateTime.now().getTime() + '@testtimesheet.com',
                Alias = 't1one',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US',
                Title = 'Software Engineer'
            );
            
            // Create Non-Subordinate User
            User otherUser = new User(
                FirstName = 'Other',
                LastName = 'User',
                Email = 'other.user@testtimesheet.com',
                Username = 'other.user.' + DateTime.now().getTime() + '@testtimesheet.com',
                Alias = 'otheru',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US',
                Title = 'Product Manager'
            );
            
            insert new List<User>{managerUser, subUser, otherUser};

            // Assign Permission Sets
            PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Teqfocus_Timesheet_External_Permissions' LIMIT 1];
            insert new List<PermissionSetAssignment>{
                new PermissionSetAssignment(AssigneeId = managerUser.Id, PermissionSetId = ps.Id),
                new PermissionSetAssignment(AssigneeId = subUser.Id, PermissionSetId = ps.Id),
                new PermissionSetAssignment(AssigneeId = otherUser.Id, PermissionSetId = ps.Id)
            };

            // Create Employee records, owned by the Manager so the Manager can view them in USER_MODE
            Employee__c mgrEmp = new Employee__c(
                Name = 'Neo Singh',
                User__c = managerUser.Id,
                Role_Type__c = 'Manager',
                OwnerId = managerUser.Id
            );
            insert mgrEmp;

            Employee__c subEmp = new Employee__c(
                Name = 'TestUser One',
                User__c = subUser.Id,
                Role_Type__c = 'Employee',
                Manager__c = mgrEmp.Id,
                OwnerId = managerUser.Id
            );
            insert subEmp;
            
            Employee__c otherEmp = new Employee__c(
                Name = 'Other User',
                User__c = otherUser.Id,
                Role_Type__c = 'Employee',
                OwnerId = otherUser.Id
            );
            insert otherEmp;

            // Create Project
            Project__c proj = new Project__c(
                Name = 'Test Project',
                Project_Code__c = 'TST-002',
                Status__c = 'Active',
                Budget_Hours__c = 100
            );
            insert proj;

            // Create Timesheet and Timesheet entries for Subordinate, owned by the Manager for test sharing simplicity
            Timesheet__c ts = new Timesheet__c(
                Employee__c = subUser.Id,
                Week_Start_Date__c = Date.today().toStartOfWeek(),
                Week_End_Date__c = Date.today().toStartOfWeek().addDays(6),
                Status__c = 'Submitted',
                OwnerId = managerUser.Id
            );
            insert ts;

            Timesheet_Entry__c entry1 = new Timesheet_Entry__c(
                Timesheet__c = ts.Id,
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = Date.today().toStartOfWeek(),
                Is_Billable__c = true,
                Description__c = 'Coding LWC'
            );
            Timesheet_Entry__c entry2 = new Timesheet_Entry__c(
                Timesheet__c = ts.Id,
                Project__c = proj.Id,
                Hours__c = 4.0,
                Category__c = 'Meeting',
                Entry_Date__c = Date.today().toStartOfWeek().addDays(1),
                Is_Billable__c = false,
                Description__c = 'Sprint planning'
            );
            insert new List<Timesheet_Entry__c>{entry1, entry2};
        }
    }

    @isTest
    static void testManagerControllerMethods() {
        User managerUser = [SELECT Id FROM User WHERE Email = 'neo.singh@testtimesheet.com' LIMIT 1];
        Employee__c subEmp = [SELECT Id FROM Employee__c WHERE Name = 'TestUser One' LIMIT 1];
        Timesheet__c ts = [SELECT Id FROM Timesheet__c LIMIT 1];

        System.runAs(managerUser) {
            Test.startTest();
            
            // 1. getSubordinateEmployees
            List<TimesheetManagerController.SubordinateEmployeeWrapper> subs = TimesheetManagerController.getSubordinateEmployees();
            Assert.areEqual(1, subs.size(), 'Manager should have exactly 1 subordinate');
            Assert.areEqual('TestUser One', subs[0].name);
            Assert.areEqual(12.0, subs[0].totalHours);
            Assert.areEqual(8.0, subs[0].billableHours);
            Assert.areEqual(67.0, subs[0].utilizationRate); // (8/12)*100 = 66.666 -> rounded to 67

            // 2. getManagerDashboardStats
            TimesheetManagerController.ManagerStatsWrapper stats = TimesheetManagerController.getManagerDashboardStats();
            Assert.areEqual(12.0, stats.totalTeamHours);
            Assert.areEqual(8.0, stats.totalBilledHours);
            Assert.areEqual(4.0, stats.totalNonBilledHours);
            Assert.areEqual(67.0, stats.avgTeamUtilization);
            Assert.areEqual(1, stats.topProjects.size());
            Assert.areEqual('Test Project', stats.topProjects[0].projectName);
            Assert.areEqual(12.0, stats.topProjects[0].hours);

            // 3. getEmployeeTimesheets
            List<TimesheetManagerController.TimesheetStatsWrapper> timesheets = TimesheetManagerController.getEmployeeTimesheets(subEmp.Id);
            Assert.areEqual(1, timesheets.size());
            Assert.areEqual(ts.Id, timesheets[0].id);
            Assert.areEqual(12.0, timesheets[0].totalHours);
            Assert.areEqual(8.0, timesheets[0].billableHours);

            // 4. getManagerTimesheetEntries
            List<TimesheetWrappers.TimesheetEntryWrapper> entries = TimesheetManagerController.getManagerTimesheetEntries(ts.Id);
            Assert.areEqual(2, entries.size());
            
            Test.stopTest();
        }
    }

    @isTest
    static void testManagerControllerUnauthorizedAccess() {
        User subUser = [SELECT Id FROM User WHERE Email = 'testuser.one@testtimesheet.com' LIMIT 1];
        Employee__c subEmp = [SELECT Id FROM Employee__c WHERE Name = 'TestUser One' LIMIT 1];
        Timesheet__c ts = [SELECT Id FROM Timesheet__c LIMIT 1];

        System.runAs(subUser) {
            Test.startTest();
            
            // Employee user should get empty results because they are not a Manager
            List<TimesheetManagerController.SubordinateEmployeeWrapper> subs = TimesheetManagerController.getSubordinateEmployees();
            Assert.areEqual(0, subs.size(), 'Non-manager should get empty subordinate list');

            TimesheetManagerController.ManagerStatsWrapper stats = TimesheetManagerController.getManagerDashboardStats();
            Assert.areEqual(null, stats.totalTeamHours, 'Non-manager dashboard stats should be uninitialized');

            // Trying to get employee timesheets should throw error
            try {
                TimesheetManagerController.getEmployeeTimesheets(subEmp.Id);
                Assert.fail('Should have failed access check');
            } catch (AuraHandledException e) {
                Assert.isNotNull(e.getMessage());
            }

            // Trying to get timesheet entries of a cross-user should fail
            try {
                TimesheetManagerController.getManagerTimesheetEntries(ts.Id);
                Assert.fail('Should have failed access check');
            } catch (AuraHandledException e) {
                Assert.isNotNull(e.getMessage());
            }
            
            Test.stopTest();
        }
    }
}