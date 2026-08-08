public with sharing class TimesheetController {

    @AuraEnabled
    public static TimesheetWrappers.TimesheetWrapper getTimesheetData(Date weekStart) {
        try {
            Id currentUserId = UserInfo.getUserId();
            System.debug('[Teqfocus Debug] getTimesheetData invoked. weekStart: ' + weekStart + ', EmployeeId: ' + currentUserId);
            
            Timesheet__c ts = TimesheetSelector.getTimesheetByStartDate(currentUserId, weekStart);
            if (ts == null) {
                System.debug('[Teqfocus Debug] No timesheet record found in DB for weekStart: ' + weekStart);
                return null;
            }
            
            System.debug('[Teqfocus Debug] Found Timesheet__c Id: ' + ts.Id + ', Status: ' + ts.Status__c + ', Start Date: ' + ts.Week_Start_Date__c);

            // Calculate hours dynamically for the wrapper
            List<Timesheet_Entry__c> entries = TimesheetSelector.getEntriesByTimesheetId(ts.Id);
            System.debug('[Teqfocus Debug] Retreived timesheet entries count: ' + entries.size());
            
            Decimal total = 0.0;
            Decimal billable = 0.0;
            for (Timesheet_Entry__c e : entries) {
                Decimal h = e.Hours__c != null ? e.Hours__c : 0.0;
                total += h;
                if (e.Is_Billable__c) {
                    billable += h;
                }
            }

            return new TimesheetWrappers.TimesheetWrapper(ts, total, billable);
        } catch (Exception ex) {
            System.debug('[Teqfocus Debug] ERROR in getTimesheetData: ' + ex.getMessage());
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static List<TimesheetWrappers.TimesheetEntryWrapper> getTimesheetEntries(Id timesheetId) {
        try {
            System.debug('[Teqfocus Debug] getTimesheetEntries invoked. timesheetId: ' + timesheetId);
            if (timesheetId == null) {
                return new List<TimesheetWrappers.TimesheetEntryWrapper>();
            }
            
            // Security verification: verify timesheet owner
            Timesheet__c ts = TimesheetSelector.getTimesheetByIdForUpdate(timesheetId);
            if (ts != null) {
                SecurityUtil.checkRecordOwnership(ts, 'Employee__c');
            }

            List<Timesheet_Entry__c> entries = TimesheetSelector.getEntriesByTimesheetId(timesheetId);
            System.debug('[Teqfocus Debug] Retreived ' + entries.size() + ' details for timesheetId: ' + timesheetId);
            
            for (Timesheet_Entry__c e : entries) {
                System.debug('[Teqfocus Debug] Database Record -> EntryId: ' + e.Id + ', Work Date: ' + e.Entry_Date__c + ', Hours: ' + e.Hours__c);
            }
            
            List<TimesheetWrappers.TimesheetEntryWrapper> wrappers = new List<TimesheetWrappers.TimesheetEntryWrapper>();
            for (Timesheet_Entry__c e : entries) {
                wrappers.add(new TimesheetWrappers.TimesheetEntryWrapper(e));
            }
            return wrappers;
        } catch (Exception ex) {
            System.debug('[Teqfocus Debug] ERROR in getTimesheetEntries: ' + ex.getMessage());
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static TimesheetWrappers.TimesheetEntryWrapper saveTimeEntry(Timesheet_Entry__c entry, Date weekStart, Date weekEnd) {
        try {
            Timesheet_Entry__c saved = TimesheetService.saveEntry(entry, weekStart, weekEnd);
            // Fetch updated details with project lookups populated
            Timesheet_Entry__c fullEntry = TimesheetSelector.getEntryById(saved.Id);
            return new TimesheetWrappers.TimesheetEntryWrapper(fullEntry);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteTimeEntry(Id entryId) {
        try {
            TimesheetService.deleteEntry(entryId);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void submitTimesheetForApproval(Id timesheetId) {
        try {
            TimesheetService.submitTimesheet(timesheetId);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<TimesheetWrappers.TimesheetEntryWrapper> getRecentActivities() {
        try {
            Id currentUserId = UserInfo.getUserId();
            List<Timesheet_Entry__c> entries = [
                SELECT Id, Name, Timesheet__c, Project__c, Project__r.Name, Project__r.Project_Code__c, 
                       Hours__c, Entry_Date__c, Description__c, Category__c, Is_Billable__c
                FROM Timesheet_Entry__c
                WHERE Timesheet__r.Employee__c = :currentUserId
                ORDER BY Entry_Date__c DESC, CreatedDate DESC
                LIMIT 5
            ];
            List<TimesheetWrappers.TimesheetEntryWrapper> wrappers = new List<TimesheetWrappers.TimesheetEntryWrapper>();
            for (Timesheet_Entry__c e : entries) {
                wrappers.add(new TimesheetWrappers.TimesheetEntryWrapper(e));
            }
            return wrappers;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
}