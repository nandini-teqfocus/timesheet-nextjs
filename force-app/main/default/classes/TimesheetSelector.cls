public with sharing class TimesheetSelector {

    public static List<Timesheet__c> getTimesheetsByEmployee(Id employeeId, Integer rowLimit) {
        return [
            SELECT Id, Name, Week_Start_Date__c, Week_End_Date__c, Status__c, Notes__c, Employee__c
            FROM Timesheet__c
            WHERE Employee__c = :employeeId
            ORDER BY Week_Start_Date__c DESC
            LIMIT :rowLimit
        ];
    }

    public static Timesheet__c getTimesheetByStartDate(Id employeeId, Date weekStart) {
        List<Timesheet__c> timesheets = [
            SELECT Id, Name, Week_Start_Date__c, Week_End_Date__c, Status__c, Notes__c, Employee__c
            FROM Timesheet__c
            WHERE Employee__c = :employeeId AND Week_Start_Date__c = :weekStart
            LIMIT 1
        ];
        return timesheets.isEmpty() ? null : timesheets[0];
    }

    public static Timesheet__c getTimesheetByIdForUpdate(Id timesheetId) {
        List<Timesheet__c> timesheets = [
            SELECT Id, Name, Week_Start_Date__c, Week_End_Date__c, Status__c, Notes__c, Employee__c
            FROM Timesheet__c
            WHERE Id = :timesheetId
            FOR UPDATE
        ];
        return timesheets.isEmpty() ? null : timesheets[0];
    }

    public static List<Timesheet_Entry__c> getEntriesByTimesheetId(Id timesheetId) {
        return [
            SELECT Id, Name, Timesheet__c, Project__c, Project__r.Name, Project__r.Project_Code__c, 
                   Project__r.Status__c, Project__r.Budget_Hours__c,
                   Hours__c, Entry_Date__c, Description__c, Category__c, Is_Billable__c
            FROM Timesheet_Entry__c
            WHERE Timesheet__c = :timesheetId
            ORDER BY Entry_Date__c ASC
        ];
    }

    public static List<Timesheet_Entry__c> getAllEntriesByEmployee(Id employeeId) {
        return [
            SELECT Id, Name, Timesheet__c, Project__c, Project__r.Name, Project__r.Project_Code__c, 
                   Project__r.Status__c, Project__r.Budget_Hours__c,
                   Hours__c, Entry_Date__c, Description__c, Category__c, Is_Billable__c
            FROM Timesheet_Entry__c
            WHERE Timesheet__r.Employee__c = :employeeId
            ORDER BY Entry_Date__c DESC
            LIMIT 1000
        ];
    }

    public static Timesheet_Entry__c getEntryById(Id entryId) {
        List<Timesheet_Entry__c> entries = [
            SELECT Id, Name, Timesheet__c, Timesheet__r.Employee__c, Project__c, Project__r.Name, Project__r.Project_Code__c, 
                   Project__r.Status__c, Project__r.Budget_Hours__c, Hours__c, 
                   Entry_Date__c, Description__c, Category__c, Is_Billable__c
            FROM Timesheet_Entry__c
            WHERE Id = :entryId
            LIMIT 1
        ];
        return entries.isEmpty() ? null : entries[0];
    }
}