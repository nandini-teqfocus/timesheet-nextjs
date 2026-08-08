@isTest
private class TimesheetControllerTest {

    @testSetup
    static void setup() {
        // Run as current user to avoid Mixed DML when creating setup and non-setup records
        User thisUser = new User(Id = UserInfo.getUserId());
        System.runAs(thisUser) {
            Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
            
            User userA = new User(
                FirstName = 'User',
                LastName = 'Alpha',
                Email = 'user.alpha@testtimesheet.com',
                Username = 'user.alpha.' + DateTime.now().getTime() + '@testtimesheet.com',
                Alias = 'ualpha',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US'
            );
            
            User userB = new User(
                FirstName = 'User',
                LastName = 'Beta',
                Email = 'user.beta@testtimesheet.com',
                Username = 'user.beta.' + DateTime.now().getTime() + '@testtimesheet.com',
                Alias = 'ubeta',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US'
            );
            insert new List<User>{userA, userB};

            PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Teqfocus_Timesheet_External_Permissions' LIMIT 1];
            insert new List<PermissionSetAssignment>{
                new PermissionSetAssignment(AssigneeId = userA.Id, PermissionSetId = ps.Id),
                new PermissionSetAssignment(AssigneeId = userB.Id, PermissionSetId = ps.Id)
            };
        }

        // Create Project catalog
        Project__c proj = new Project__c(
            Name = 'Test Enterprise Project',
            Project_Code__c = 'TST-001',
            Status__c = 'Active',
            Budget_Hours__c = 100
        );
        insert proj;
    }

    @isTest
    static void testTimesheetLifecycleAndIsolation() {
        User userA = [SELECT Id FROM User WHERE Email = 'user.alpha@testtimesheet.com' LIMIT 1];
        User userB = [SELECT Id FROM User WHERE Email = 'user.beta@testtimesheet.com' LIMIT 1];
        Project__c proj = [SELECT Id FROM Project__c LIMIT 1];

        Date weekStart = Date.newInstance(2026, 5, 18);
        Date weekEnd = Date.newInstance(2026, 5, 24);

        System.runAs(userA) {
            // 1. GetTimesheetData should be null since no timesheet exists yet
            TimesheetWrappers.TimesheetWrapper initialTs = TimesheetController.getTimesheetData(weekStart);
            Assert.areEqual(null, initialTs, 'Timesheet should not exist yet.');

            // 2. Save time entry should dynamically provision Draft timesheet
            Timesheet_Entry__c newEntry = new Timesheet_Entry__c(
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart,
                Description__c = 'Writing unit tests',
                Is_Billable__c = true
            );

            TimesheetWrappers.TimesheetEntryWrapper savedWrapper = TimesheetController.saveTimeEntry(newEntry, weekStart, weekEnd);
            Assert.areNotEqual(null, savedWrapper.id, 'Entry should have saved.');
            Assert.areEqual('TST-001', savedWrapper.projectCode, 'Project code should map correctly.');

            // 3. Verify Timesheet now exists and is in Draft
            TimesheetWrappers.TimesheetWrapper activeTs = TimesheetController.getTimesheetData(weekStart);
            Assert.areNotEqual(null, activeTs, 'Timesheet should have been provisioned.');
            Assert.areEqual('Draft', activeTs.status, 'Timesheet should be in Draft status.');
            Assert.areEqual(8.0, activeTs.totalHours, 'Hours should calculate dynamically.');

            // 4. Retrieve entries
            List<TimesheetWrappers.TimesheetEntryWrapper> entries = TimesheetController.getTimesheetEntries(activeTs.id);
            Assert.areEqual(1, entries.size(), 'There should be 1 logged entry.');

            // 5. Modify time entry
            newEntry.Id = savedWrapper.id;
            newEntry.Hours__c = 6.5;
            TimesheetController.saveTimeEntry(newEntry, weekStart, weekEnd);

            activeTs = TimesheetController.getTimesheetData(weekStart);
            Assert.areEqual(6.5, activeTs.totalHours, 'Hours should reflect updates.');
        }

        // --- SHARING ISOLATION TESTING ---
        Id userATsId;
        System.runAs(userA) {
            Timesheet__c ts = [SELECT Id FROM Timesheet__c WHERE Employee__c = :userA.Id LIMIT 1];
            userATsId = ts.Id;
        }

        System.runAs(userB) {
            // User B should NOT see User A's timesheet or entries
            TimesheetWrappers.TimesheetWrapper initialTs = TimesheetController.getTimesheetData(weekStart);
            Assert.areEqual(null, initialTs, 'User B should see 0 timesheets from User A.');
            
            // Try to query User A's timesheet entries by ID
            List<TimesheetWrappers.TimesheetEntryWrapper> crossEntries = TimesheetController.getTimesheetEntries(userATsId);
            Assert.areEqual(0, crossEntries.size(), 'User B should not have read access to User A\'s entry details.');
        }

        // --- LOCKED TIMESHEET AND SUBMISSION ---
        System.runAs(userA) {
            Timesheet__c userATs = [SELECT Id FROM Timesheet__c WHERE Employee__c = :userA.Id LIMIT 1];
            TimesheetController.submitTimesheetForApproval(userATs.Id);

            TimesheetWrappers.TimesheetWrapper submittedTs = TimesheetController.getTimesheetData(weekStart);
            Assert.areEqual('Submitted', submittedTs.status, 'Timesheet status should be Submitted.');

            List<TimesheetWrappers.TimesheetEntryWrapper> recent = TimesheetController.getRecentActivities();
            Assert.isFalse(recent.isEmpty(), 'Should return some recent entries.');

            // Try to log entry on locked timesheet
            Timesheet_Entry__c lockEntry = new Timesheet_Entry__c(
                Timesheet__c = userATs.Id,
                Project__c = proj.Id,
                Hours__c = 4.0,
                Category__c = 'Meeting',
                Entry_Date__c = weekStart,
                Description__c = 'Sprint planning',
                Is_Billable__c = false
            );

            Boolean threwError = false;
            try {
                TimesheetController.saveTimeEntry(lockEntry, weekStart, weekEnd);
            } catch (Exception ex) {
                threwError = true;
            }
            Assert.isTrue(threwError, 'Logging time against locked timesheets should fail.');
        }
    }

    @isTest
    static void testFutureDateRestriction() {
        User userA = [SELECT Id FROM User WHERE Email = 'user.alpha@testtimesheet.com' LIMIT 1];
        Project__c proj = [SELECT Id FROM Project__c LIMIT 1];

        Date futureDate = Date.today().addDays(2);
        Date weekStart = futureDate.toStartOfWeek();
        Date weekEnd = weekStart.addDays(6);

        System.runAs(userA) {
            Timesheet_Entry__c futureEntry = new Timesheet_Entry__c(
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = futureDate,
                Description__c = 'Logging future task',
                Is_Billable__c = true
            );

            Boolean threwError = false;
            String errorMessage = '';
            try {
                TimesheetService.saveEntry(futureEntry, weekStart, weekEnd);
            } catch (TimesheetService.ServiceException ex) {
                threwError = true;
                errorMessage = ex.getMessage();
            }
            Assert.isTrue(threwError, 'Creating future timesheet entries should be blocked on backend.');
            Assert.isTrue(errorMessage.contains('Future timesheet entries are not allowed'), 'Error message should specify the restriction. Received: ' + errorMessage);
        }
    }

    @isTest
    static void testDuplicateDateRestriction() {
        User userA = [SELECT Id FROM User WHERE Email = 'user.alpha@testtimesheet.com' LIMIT 1];
        Project__c proj = [SELECT Id FROM Project__c LIMIT 1];

        Date weekStart = Date.newInstance(2026, 5, 18);
        Date weekEnd = Date.newInstance(2026, 5, 24);

        System.runAs(userA) {
            // 1. Create first entry on May 18
            Timesheet_Entry__c firstEntry = new Timesheet_Entry__c(
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart,
                Description__c = 'Logging first task',
                Is_Billable__c = true
            );
            TimesheetService.saveEntry(firstEntry, weekStart, weekEnd);
            Assert.areNotEqual(null, firstEntry.Id, 'First entry should be saved successfully.');

            // 2. Try to log a second entry for the exact same date (May 18)
            Timesheet_Entry__c secondEntry = new Timesheet_Entry__c(
                Project__c = proj.Id,
                Hours__c = 4.0,
                Category__c = 'Meeting',
                Entry_Date__c = weekStart,
                Description__c = 'Logging second task on same date',
                Is_Billable__c = false
            );

            Boolean threwError = false;
            String errorMessage = '';
            try {
                TimesheetService.saveEntry(secondEntry, weekStart, weekEnd);
            } catch (TimesheetService.ServiceException ex) {
                threwError = true;
                errorMessage = ex.getMessage();
            }
            Assert.isTrue(threwError, 'Creating duplicate timesheet entries for the same date should be blocked.');
            Assert.isTrue(errorMessage.contains('You have already submitted a timesheet for this date.'), 
                'Error message should be the exact duplicate date message. Received: ' + errorMessage);

            // 3. Verify that updating the first entry (same date, same record) works perfectly
            firstEntry.Hours__c = 7.5;
            firstEntry.Description__c = 'Updating first task description';
            
            Boolean threwUpdateError = false;
            try {
                TimesheetService.saveEntry(firstEntry, weekStart, weekEnd);
            } catch (Exception ex) {
                threwUpdateError = true;
            }
            Assert.isFalse(threwUpdateError, 'Updating an existing entry on the same date should not trigger duplicate validation.');
            
            Timesheet_Entry__c updatedEntry = TimesheetSelector.getEntryById(firstEntry.Id);
            Assert.areEqual(7.5, updatedEntry.Hours__c, 'Hours update should be successfully saved.');
        }
    }

    @isTest
    static void testTimesheetServiceExceptionsAndValidation() {
        User userA = [SELECT Id FROM User WHERE Email = 'user.alpha@testtimesheet.com' LIMIT 1];
        User userB = [SELECT Id FROM User WHERE Email = 'user.beta@testtimesheet.com' LIMIT 1];
        Project__c proj = [SELECT Id FROM Project__c LIMIT 1];

        Date weekStart = Date.newInstance(2026, 5, 18);
        Date weekEnd = Date.newInstance(2026, 5, 24);

        Id tsId;
        Id entryAId;

        System.runAs(userA) {
            // 1. Referenced timesheet does not exist (fake timesheet ID)
            Id fakeTimesheetId = getFakeId(Timesheet__c.SObjectType);
            Timesheet_Entry__c entryFakeTs = new Timesheet_Entry__c(
                Timesheet__c = fakeTimesheetId,
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart,
                Is_Billable__c = true
            );
            try {
                TimesheetService.saveEntry(entryFakeTs, weekStart, weekEnd);
                Assert.fail('Expected ServiceException');
            } catch (TimesheetService.ServiceException e) {
                Assert.isTrue(e.getMessage().contains('Referenced timesheet does not exist'));
            }

            // Provision a valid draft timesheet and entry for User A
            Timesheet_Entry__c entryA = new Timesheet_Entry__c(
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart,
                Is_Billable__c = true
            );
            entryA = TimesheetService.saveEntry(entryA, weekStart, weekEnd);
            Assert.areNotEqual(null, entryA.Id);

            tsId = entryA.Timesheet__c;
            entryAId = entryA.Id;

            // 2. Resolve parent when timesheet exists for the week start (without passing timesheet ID explicitly)
            Timesheet_Entry__c entryA2 = new Timesheet_Entry__c(
                Project__c = proj.Id,
                Hours__c = 4.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart.addDays(1), // different date
                Is_Billable__c = true
            );
            entryA2 = TimesheetService.saveEntry(entryA2, weekStart, weekEnd);
            Assert.areEqual(tsId, entryA2.Timesheet__c);

            // 3. Update path: Entry not found (fake entry ID)
            Id fakeEntryId = getFakeId(Timesheet_Entry__c.SObjectType);
            Timesheet_Entry__c entryFakeId = new Timesheet_Entry__c(
                Id = fakeEntryId,
                Timesheet__c = tsId,
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart.addDays(2),
                Is_Billable__c = true
            );
            try {
                TimesheetService.saveEntry(entryFakeId, weekStart, weekEnd);
                Assert.fail('Expected ServiceException');
            } catch (TimesheetService.ServiceException e) {
                Assert.isTrue(e.getMessage().contains('Entry not found'));
            }

            // 4. submitTimesheet: Timesheet not found
            try {
                TimesheetService.submitTimesheet(fakeTimesheetId);
                Assert.fail('Expected ServiceException');
            } catch (TimesheetService.ServiceException e) {
                Assert.isTrue(e.getMessage().contains('Timesheet not found'));
            }

            // 5. deleteEntry: Entry not found
            try {
                TimesheetService.deleteEntry(fakeEntryId);
                Assert.fail('Expected ServiceException');
            } catch (TimesheetService.ServiceException e) {
                Assert.isTrue(e.getMessage().contains('Entry not found'));
            }
        }

        // --- OWNERSHIP / SHARING VIOLATION CHECKS (RUN AS USER B) ---
        System.runAs(userB) {
            // 6. Save entry on User A's timesheet (ownership check failure)
            Timesheet_Entry__c entryBOnA = new Timesheet_Entry__c(
                Timesheet__c = tsId,
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart
            );
            try {
                TimesheetService.saveEntry(entryBOnA, weekStart, weekEnd);
                Assert.fail('Expected Exception');
            } catch (Exception e) {
                Assert.isTrue(e.getMessage() != null);
            }

            // 7. Update User A's timesheet entry (ownership check failure)
            Timesheet_Entry__c updateEntryA = new Timesheet_Entry__c(
                Id = entryAId,
                Project__c = proj.Id,
                Hours__c = 4.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart
            );
            try {
                TimesheetService.saveEntry(updateEntryA, weekStart, weekEnd);
                Assert.fail('Expected Exception');
            } catch (Exception e) {
                Assert.isTrue(e.getMessage() != null);
            }

            // 8. deleteEntry: deleting User A's entry
            try {
                TimesheetService.deleteEntry(entryAId);
                Assert.fail('Expected Exception');
            } catch (Exception e) {
                Assert.isTrue(e.getMessage() != null);
            }

            // 9. submitTimesheet: submitting User A's timesheet
            try {
                TimesheetService.submitTimesheet(tsId);
                Assert.fail('Expected Exception');
            } catch (Exception e) {
                Assert.isTrue(e.getMessage() != null);
            }
        }

        // --- LOCKED TIMESHEET CHECKS (RUN AS USER A) ---
        System.runAs(userA) {
            // 10. submitTimesheet: submit empty timesheet
            Timesheet__c emptyTs = new Timesheet__c(
                Employee__c = userA.Id,
                Week_Start_Date__c = weekStart.addDays(7),
                Week_End_Date__c = weekEnd.addDays(7),
                Status__c = 'Draft'
            );
            insert emptyTs;
            try {
                TimesheetService.submitTimesheet(emptyTs.Id);
                Assert.fail('Expected ServiceException');
            } catch (TimesheetService.ServiceException e) {
                Assert.isTrue(e.getMessage().contains('Cannot submit a timesheet with no logged hours'));
            }

            // 11. submitTimesheet: successful submit
            TimesheetService.submitTimesheet(tsId);
            
            // 12. submitTimesheet: already submitted check
            try {
                TimesheetService.submitTimesheet(tsId);
                Assert.fail('Expected ServiceException');
            } catch (TimesheetService.ServiceException e) {
                Assert.isTrue(e.getMessage().contains('already submitted or approved'));
            }

            // 13. deleteEntry: delete from a locked timesheet check
            try {
                TimesheetService.deleteEntry(entryAId);
                Assert.fail('Expected ServiceException');
            } catch (TimesheetService.ServiceException e) {
                Assert.isTrue(e.getMessage().contains('Cannot delete entries from a locked timesheet'));
            }
            
            // 14. deleteTimeEntry AuraHandledException check in controller
            try {
                TimesheetController.deleteTimeEntry(entryAId);
                Assert.fail('Expected AuraHandledException');
            } catch (AuraHandledException e) {
                Assert.isTrue(e.getMessage() != null);
            }
            
            // 15. submitTimesheetForApproval AuraHandledException check in controller
            try {
                TimesheetController.submitTimesheetForApproval(tsId);
                Assert.fail('Expected AuraHandledException');
            } catch (AuraHandledException e) {
                Assert.isTrue(e.getMessage() != null);
            }
        }

        // --- SUCCESSFUL DELETE ENTRY PATH (RUN AS USER B ON OWN RECORD) ---
        System.runAs(userB) {
            Timesheet_Entry__c entryB = new Timesheet_Entry__c(
                Project__c = proj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = weekStart,
                Is_Billable__c = true
            );
            entryB = TimesheetService.saveEntry(entryB, weekStart, weekEnd);
            Assert.areNotEqual(null, entryB.Id);

            // Delete entry via controller
            TimesheetController.deleteTimeEntry(entryB.Id);
            Timesheet_Entry__c deletedEntry = TimesheetSelector.getEntryById(entryB.Id);
            Assert.areEqual(null, deletedEntry, 'Entry should have been deleted.');
        }
    }

    private static Id getFakeId(Schema.SObjectType sot) {
        String prefix = sot.getDescribe().getKeyPrefix();
        return (Id) (prefix + '0'.repeat(15 - prefix.length() - 1) + '1');
    }
}