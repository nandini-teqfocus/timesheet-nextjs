public without sharing class TimesheetService {

    public class ServiceException extends Exception {}

    /**
     * Imperatively saves a timesheet entry.
     * Provisions the parent timesheet record in Draft status if none exists for the week.
     */
    public static Timesheet_Entry__c saveEntry(Timesheet_Entry__c entry, Date weekStart, Date weekEnd) {
        Savepoint sp = Database.setSavepoint();
        try {
            if (entry.Entry_Date__c != null && entry.Entry_Date__c > Date.today()) {
                throw new ServiceException('Future timesheet entries are not allowed.');
            }
            Id currentUserId = UserInfo.getUserId();
            Timesheet__c parentTs;

            // 1. Resolve or provision parent Timesheet__c
            if (entry.Timesheet__c == null) {
                // Check if a timesheet already exists for this week start
                parentTs = TimesheetSelector.getTimesheetByStartDate(currentUserId, weekStart);
                if (parentTs == null) {
                    // Create and provision a new Draft timesheet
                    parentTs = new Timesheet__c(
                        Employee__c = currentUserId,
                        Week_Start_Date__c = weekStart,
                        Week_End_Date__c = weekEnd,
                        Status__c = 'Draft'
                    );
                    
                    // Validate create access
                    SecurityUtil.checkCreate(Timesheet__c.SObjectType, new List<Schema.SObjectField>{
                        Timesheet__c.Employee__c,
                        Timesheet__c.Week_Start_Date__c,
                        Timesheet__c.Week_End_Date__c,
                        Timesheet__c.Status__c
                    });
                    
                    insert parentTs;
                }
                entry.Timesheet__c = parentTs.Id;
            } else {
                // If Timesheet__c is provided, lock and validate ownership
                parentTs = TimesheetSelector.getTimesheetByIdForUpdate(entry.Timesheet__c);
                if (parentTs == null) {
                    throw new ServiceException('Referenced timesheet does not exist.');
                }
                SecurityUtil.checkRecordOwnership(parentTs, 'Employee__c');
                
                if (parentTs.Status__c == 'Submitted' || parentTs.Status__c == 'Approved') {
                    throw new ServiceException('Cannot add or modify entries on a locked timesheet.');
                }
            }

            // 2. Validate duplicate timesheet entry for the same date
            if (entry.Entry_Date__c != null) {
                Id employeeId = parentTs.Employee__c != null ? parentTs.Employee__c : currentUserId;
                List<Timesheet_Entry__c> existingEntries = [
                    SELECT Id 
                    FROM Timesheet_Entry__c 
                    WHERE Timesheet__r.Employee__c = :employeeId 
                      AND Entry_Date__c = :entry.Entry_Date__c 
                      AND Id != :entry.Id
                    LIMIT 1
                ];
                if (!existingEntries.isEmpty()) {
                    throw new ServiceException('You have already submitted a timesheet for this date.');
                }
            }

            // 3. Validate entry field FLS and CRUD
            List<Schema.SObjectField> entryFields = new List<Schema.SObjectField>{
                Timesheet_Entry__c.Timesheet__c,
                Timesheet_Entry__c.Project__c,
                Timesheet_Entry__c.Hours__c,
                Timesheet_Entry__c.Category__c,
                Timesheet_Entry__c.Entry_Date__c,
                Timesheet_Entry__c.Description__c,
                Timesheet_Entry__c.Is_Billable__c
            };

            if (entry.Id == null) {
                SecurityUtil.checkCreate(Timesheet_Entry__c.SObjectType, entryFields);
                insert entry;
            } else {
                // Lock and validate existing entry
                Timesheet_Entry__c existingEntry = TimesheetSelector.getEntryById(entry.Id);
                if (existingEntry == null) {
                    throw new ServiceException('Entry not found.');
                }
                SecurityUtil.checkRecordOwnership(existingEntry.Timesheet__r, 'Employee__c');
                
                SecurityUtil.checkUpdate(Timesheet_Entry__c.SObjectType, entryFields);
                Timesheet_Entry__c cleanEntry = new Timesheet_Entry__c(
                    Id = entry.Id,
                    Project__c = entry.Project__c,
                    Hours__c = entry.Hours__c,
                    Entry_Date__c = entry.Entry_Date__c,
                    Description__c = entry.Description__c,
                    Is_Billable__c = entry.Is_Billable__c,
                    Category__c = entry.Category__c
                );
                update cleanEntry;
            }

            return entry;
        } catch (Exception ex) {
            Database.rollback(sp);
            throw new ServiceException(ex.getMessage());
        }
    }

    /**
     * Securely deletes an entry after verifying ownership.
     */
    public static void deleteEntry(Id entryId) {
        Savepoint sp = Database.setSavepoint();
        try {
            Timesheet_Entry__c entry = TimesheetSelector.getEntryById(entryId);
            if (entry == null) {
                throw new ServiceException('Entry not found.');
            }
            // Ownership check
            SecurityUtil.checkRecordOwnership(entry.Timesheet__r, 'Employee__c');
            
            // Timesheet lock check
            Timesheet__c parentTs = TimesheetSelector.getTimesheetByIdForUpdate(entry.Timesheet__c);
            if (parentTs.Status__c == 'Submitted' || parentTs.Status__c == 'Approved') {
                throw new ServiceException('Cannot delete entries from a locked timesheet.');
            }

            SecurityUtil.checkDelete(Timesheet_Entry__c.SObjectType);
            delete entry;
        } catch (Exception ex) {
            Database.rollback(sp);
            throw new ServiceException(ex.getMessage());
        }
    }

    /**
     * Lock and submit timesheet for approval.
     */
    public static void submitTimesheet(Id timesheetId) {
        Savepoint sp = Database.setSavepoint();
        try {
            // Lock record with FOR UPDATE
            Timesheet__c ts = TimesheetSelector.getTimesheetByIdForUpdate(timesheetId);
            if (ts == null) {
                throw new ServiceException('Timesheet not found.');
            }
            SecurityUtil.checkRecordOwnership(ts, 'Employee__c');

            if (ts.Status__c == 'Submitted' || ts.Status__c == 'Approved') {
                throw new ServiceException('Timesheet is already submitted or approved.');
            }

            // Verify it has entries
            List<Timesheet_Entry__c> entries = TimesheetSelector.getEntriesByTimesheetId(timesheetId);
            if (entries.isEmpty()) {
                throw new ServiceException('Cannot submit a timesheet with no logged hours.');
            }

            ts.Status__c = 'Submitted';
            
            SecurityUtil.checkUpdate(Timesheet__c.SObjectType, new List<Schema.SObjectField>{
                Timesheet__c.Status__c
            });

            update ts;
        } catch (Exception ex) {
            Database.rollback(sp);
            throw new ServiceException(ex.getMessage());
        }
    }
}