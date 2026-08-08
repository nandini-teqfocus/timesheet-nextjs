trigger TimesheetEntryTrigger on Timesheet_Entry__c (before insert, before update) {
    Set<Id> timesheetIds = new Set<Id>();
    List<Timesheet_Entry__c> entriesToCheck = new List<Timesheet_Entry__c>();
    
    for (Timesheet_Entry__c entry : Trigger.new) {
        if (entry.Entry_Date__c != null) {
            if (Trigger.isInsert || 
                entry.Entry_Date__c != Trigger.oldMap.get(entry.Id).Entry_Date__c || 
                entry.Timesheet__c != Trigger.oldMap.get(entry.Id).Timesheet__c) {
                
                if (entry.Timesheet__c != null) {
                    timesheetIds.add(entry.Timesheet__c);
                }
                entriesToCheck.add(entry);
            }
        }
    }
    
    if (entriesToCheck.isEmpty()) {
        return;
    }
    
    // Query the parent Timesheets to get the Employee__c
    Map<Id, Timesheet__c> parentTimesheets = new Map<Id, Timesheet__c>([
        SELECT Id, Employee__c 
        FROM Timesheet__c 
        WHERE Id IN :timesheetIds
    ]);
    
    // Gather employee IDs
    Set<Id> employeeIds = new Set<Id>();
    for (Timesheet__c ts : parentTimesheets.values()) {
        if (ts.Employee__c != null) {
            employeeIds.add(ts.Employee__c);
        }
    }
    
    // Query existing entries for these employees and dates to find duplicates
    // Map to track (EmployeeId + Date) -> EntryId
    Map<String, Id> existingEntriesMap = new Map<String, Id>();
    if (!employeeIds.isEmpty()) {
        for (Timesheet_Entry__c existing : [
            SELECT Id, Entry_Date__c, Timesheet__r.Employee__c 
            FROM Timesheet_Entry__c 
            WHERE Timesheet__r.Employee__c IN :employeeIds
        ]) {
            if (existing.Entry_Date__c != null && existing.Timesheet__r.Employee__c != null) {
                String key = existing.Timesheet__r.Employee__c + '_' + existing.Entry_Date__c;
                existingEntriesMap.put(key, existing.Id);
            }
        }
    }
    
    // Check within the current trigger context and against the database to prevent duplicates
    Map<String, Timesheet_Entry__c> currentBatchMap = new Map<String, Timesheet_Entry__c>();
    
    for (Timesheet_Entry__c entry : entriesToCheck) {
        Timesheet__c parent = parentTimesheets.get(entry.Timesheet__c);
        if (parent == null || parent.Employee__c == null) {
            continue;
        }
        
        String key = parent.Employee__c + '_' + entry.Entry_Date__c;
        
        // Check database duplicates
        if (existingEntriesMap.containsKey(key)) {
            Id existingId = existingEntriesMap.get(key);
            if (existingId != entry.Id) {
                entry.addError('You have already submitted a timesheet for this date.');
                continue;
            }
        }
        
        // Check batch duplicates
        if (currentBatchMap.containsKey(key)) {
            entry.addError('You have already submitted a timesheet for this date.');
        } else {
            currentBatchMap.put(key, entry);
        }
    }
}