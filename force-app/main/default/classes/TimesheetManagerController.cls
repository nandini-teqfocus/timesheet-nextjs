public without sharing class TimesheetManagerController {
    
    public class SubordinateEmployeeWrapper {
        @AuraEnabled public Id id {get;set;} // Employee__c Id
        @AuraEnabled public Id userId {get;set;} // User Id
        @AuraEnabled public String name {get;set;}
        @AuraEnabled public String email {get;set;}
        @AuraEnabled public String title {get;set;}
        @AuraEnabled public String department {get;set;}
        @AuraEnabled public Decimal totalHours {get;set;}
        @AuraEnabled public Decimal billableHours {get;set;}
        @AuraEnabled public Decimal utilizationRate {get;set;}
    }

    public class TimesheetStatsWrapper {
        @AuraEnabled public Id id {get;set;}
        @AuraEnabled public String name {get;set;}
        @AuraEnabled public Date weekStartDate {get;set;}
        @AuraEnabled public Date weekEndDate {get;set;}
        @AuraEnabled public Decimal totalHours {get;set;}
        @AuraEnabled public Decimal billableHours {get;set;}
        @AuraEnabled public Decimal utilization {get;set;}
    }

    public class ManagerStatsWrapper {
        @AuraEnabled public String managerName {get;set;}
        @AuraEnabled public String managerTitle {get;set;}
        @AuraEnabled public String managerDepartment {get;set;}
        @AuraEnabled public String managerInitials {get;set;}
        @AuraEnabled public Decimal avgTeamUtilization {get;set;}
        @AuraEnabled public Decimal totalTeamHours {get;set;}
        @AuraEnabled public Decimal totalBilledHours {get;set;}
        @AuraEnabled public Decimal totalNonBilledHours {get;set;}
        @AuraEnabled public List<ProjectHoursWrapper> topProjects {get;set;}
    }

    public class ProjectHoursWrapper {
        @AuraEnabled public String projectName {get;set;}
        @AuraEnabled public String projectCode {get;set;}
        @AuraEnabled public Decimal hours {get;set;}
        @AuraEnabled public String color {get;set;}
    }

    @AuraEnabled(cacheable=true)
    public static List<SubordinateEmployeeWrapper> getSubordinateEmployees() {
        try {
            Id currentUserId = UserInfo.getUserId();
            
            // 1. Get current manager's Employee record
            List<Employee__c> mgrs = [
                SELECT Id FROM Employee__c 
                WHERE User__c = :currentUserId AND Role_Type__c = 'Manager'
                LIMIT 1
            ];
            if (mgrs.isEmpty()) {
                return new List<SubordinateEmployeeWrapper>();
            }
            Id managerId = mgrs[0].Id;
            
            // 2. Query subordinates
            List<Employee__c> subordinates = [
                SELECT Id, Name, User__c, User__r.Name, User__r.Email, User__r.Title, User__r.Department
                FROM Employee__c
                WHERE Manager__c = :managerId
            ];
            
            if (subordinates.isEmpty()) {
                return new List<SubordinateEmployeeWrapper>();
            }
            
            Set<Id> subUserIds = new Set<Id>();
            for (Employee__c emp : subordinates) {
                if (emp.User__c != null) {
                    subUserIds.add(emp.User__c);
                }
            }
            
            // 3. Query hours aggregation for these users
            List<Timesheet_Entry__c> entries = [
                SELECT Hours__c, Is_Billable__c, Timesheet__r.Employee__c
                FROM Timesheet_Entry__c
                WHERE Timesheet__r.Employee__c IN :subUserIds
            ];
            
            Map<Id, Decimal> userTotalHours = new Map<Id, Decimal>();
            Map<Id, Decimal> userBillableHours = new Map<Id, Decimal>();
            for (Id uid : subUserIds) {
                userTotalHours.put(uid, 0.0);
                userBillableHours.put(uid, 0.0);
            }
            
            for (Timesheet_Entry__c entry : entries) {
                Id uid = entry.Timesheet__r.Employee__c;
                Decimal h = entry.Hours__c != null ? entry.Hours__c : 0.0;
                if (userTotalHours.containsKey(uid)) {
                    userTotalHours.put(uid, userTotalHours.get(uid) + h);
                }
                if (entry.Is_Billable__c && userBillableHours.containsKey(uid)) {
                    userBillableHours.put(uid, userBillableHours.get(uid) + h);
                }
            }
            
            List<SubordinateEmployeeWrapper> wrappers = new List<SubordinateEmployeeWrapper>();
            for (Employee__c emp : subordinates) {
                SubordinateEmployeeWrapper wrap = new SubordinateEmployeeWrapper();
                wrap.id = emp.Id;
                wrap.userId = emp.User__c;
                wrap.name = emp.Name;
                wrap.email = emp.User__r != null ? emp.User__r.Email : '';
                wrap.title = emp.User__r != null && emp.User__r.Title != null ? emp.User__r.Title : 'Staff Associate';
                wrap.department = emp.User__r != null && emp.User__r.Department != null ? emp.User__r.Department : 'Engineering';
                
                Decimal total = userTotalHours.containsKey(emp.User__c) ? userTotalHours.get(emp.User__c) : 0.0;
                Decimal billable = userBillableHours.containsKey(emp.User__c) ? userBillableHours.get(emp.User__c) : 0.0;
                
                wrap.totalHours = total.setScale(1);
                wrap.billableHours = billable.setScale(1);
                wrap.utilizationRate = total > 0 ? ((billable / total) * 100).setScale(0) : 0.0;
                
                wrappers.add(wrap);
            }
            
            return wrappers;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static ManagerStatsWrapper getManagerDashboardStats() {
        try {
            Id currentUserId = UserInfo.getUserId();
            
            // 1. Get current manager's Employee record with User Title & Department
            List<Employee__c> mgrs = [
                SELECT Id, Name, User__r.Title, User__r.Department FROM Employee__c 
                WHERE User__c = :currentUserId AND Role_Type__c = 'Manager'
                LIMIT 1
            ];
            if (mgrs.isEmpty()) {
                return new ManagerStatsWrapper();
            }
            Id managerId = mgrs[0].Id;
            
            // 2. Query subordinates
            List<Employee__c> subordinates = [
                SELECT Id, User__c FROM Employee__c WHERE Manager__c = :managerId
            ];
            
            Set<Id> subUserIds = new Set<Id>();
            for (Employee__c emp : subordinates) {
                if (emp.User__c != null) {
                    subUserIds.add(emp.User__c);
                }
            }
            
            Decimal totalHours = 0.0;
            Decimal billableHours = 0.0;
            Map<String, Decimal> projectHoursMap = new Map<String, Decimal>();
            Map<String, String> projectCodeMap = new Map<String, String>();
            
            if (!subUserIds.isEmpty()) {
                // 3. Query all entries for the team
                List<Timesheet_Entry__c> entries = [
                    SELECT Hours__c, Is_Billable__c, Project__r.Name, Project__r.Project_Code__c
                    FROM Timesheet_Entry__c
                    WHERE Timesheet__r.Employee__c IN :subUserIds
                ];
                
                for (Timesheet_Entry__c e : entries) {
                    Decimal h = e.Hours__c != null ? e.Hours__c : 0.0;
                    totalHours += h;
                    if (e.Is_Billable__c) {
                        billableHours += h;
                    }
                    
                    String pName = e.Project__r != null ? e.Project__r.Name : 'Other';
                    String pCode = e.Project__r != null && e.Project__r.Project_Code__c != null ? e.Project__r.Project_Code__c : '';
                    
                    projectHoursMap.put(pName, (projectHoursMap.containsKey(pName) ? projectHoursMap.get(pName) : 0.0) + h);
                    projectCodeMap.put(pName, pCode);
                }
            }
            
            ManagerStatsWrapper stats = new ManagerStatsWrapper();
            stats.managerName = mgrs[0].Name;
            stats.managerTitle = mgrs[0].User__r != null && mgrs[0].User__r.Title != null ? mgrs[0].User__r.Title : '';
            stats.managerDepartment = mgrs[0].User__r != null && mgrs[0].User__r.Department != null ? mgrs[0].User__r.Department : '';
            
            // Calculate initials
            String initials = 'M';
            if (String.isNotBlank(stats.managerName)) {
                List<String> parts = stats.managerName.split(' ');
                if (parts.size() >= 2) {
                    initials = parts[0].substring(0,1).toUpperCase() + parts[parts.size()-1].substring(0,1).toUpperCase();
                } else if (parts.size() == 1 && parts[0].length() > 0) {
                    initials = parts[0].substring(0,Math.min(2, parts[0].length())).toUpperCase();
                }
            }
            stats.managerInitials = initials;
            
            stats.totalTeamHours = totalHours.setScale(1);
            stats.totalBilledHours = billableHours.setScale(1);
            stats.totalNonBilledHours = (totalHours - billableHours).setScale(1);
            stats.avgTeamUtilization = totalHours > 0 ? ((billableHours / totalHours) * 100).setScale(0) : 0.0;
            
            // Resolve project distribution
            List<ProjectHoursWrapper> topProjects = new List<ProjectHoursWrapper>();
            List<String> colors = new List<String>{'#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#9E9E9E'};
            Integer colorIdx = 0;
            
            for (String pName : projectHoursMap.keySet()) {
                ProjectHoursWrapper pWrap = new ProjectHoursWrapper();
                pWrap.projectName = pName;
                pWrap.projectCode = projectCodeMap.get(pName);
                pWrap.hours = projectHoursMap.get(pName).setScale(1);
                pWrap.color = colors[Math.mod(colorIdx, colors.size())];
                colorIdx++;
                topProjects.add(pWrap);
            }
            
            stats.topProjects = topProjects;
            return stats;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<TimesheetStatsWrapper> getEmployeeTimesheets(Id employeeId) {
        try {
            Id currentUserId = UserInfo.getUserId();
            
            // Verify manager context and relationship
            List<Employee__c> mgrs = [
                SELECT Id FROM Employee__c 
                WHERE User__c = :currentUserId AND Role_Type__c = 'Manager'
                LIMIT 1
            ];
            if (mgrs.isEmpty()) {
                throw new AuraHandledException('Access Denied: Logged in user is not registered as a Manager.');
            }
            
            List<Employee__c> subEmp = [
                SELECT User__c FROM Employee__c 
                WHERE Id = :employeeId AND Manager__c = :mgrs[0].Id
                LIMIT 1
            ];
            if (subEmp.isEmpty()) {
                throw new AuraHandledException('Access Denied: The requested employee is not a subordinate.');
            }
            
            Id subUserId = subEmp[0].User__c;
            
            List<Timesheet__c> timesheets = [
                SELECT Id, Name, Week_Start_Date__c, Week_End_Date__c, Notes__c, Employee__c
                FROM Timesheet__c
                WHERE Employee__c = :subUserId
                ORDER BY Week_Start_Date__c DESC
            ];
            
            Set<Id> tsIds = new Set<Id>();
            for (Timesheet__c ts : timesheets) {
                tsIds.add(ts.Id);
            }
            
            Map<Id, Decimal> tsTotalHours = new Map<Id, Decimal>();
            Map<Id, Decimal> tsBillableHours = new Map<Id, Decimal>();
            
            for (Id tsId : tsIds) {
                tsTotalHours.put(tsId, 0.0);
                tsBillableHours.put(tsId, 0.0);
            }
            
            if (!tsIds.isEmpty()) {
                List<Timesheet_Entry__c> entries = [
                    SELECT Timesheet__c, Hours__c, Is_Billable__c 
                    FROM Timesheet_Entry__c 
                    WHERE Timesheet__c IN :tsIds
                ];
                for (Timesheet_Entry__c entry : entries) {
                    Decimal h = entry.Hours__c != null ? entry.Hours__c : 0.0;
                    if (tsTotalHours.containsKey(entry.Timesheet__c)) {
                        tsTotalHours.put(entry.Timesheet__c, tsTotalHours.get(entry.Timesheet__c) + h);
                    }
                    if (entry.Is_Billable__c && tsBillableHours.containsKey(entry.Timesheet__c)) {
                        tsBillableHours.put(entry.Timesheet__c, tsBillableHours.get(entry.Timesheet__c) + h);
                    }
                }
            }
            
            List<User> subUsers = [SELECT Weekly_Hours_Target__c FROM User WHERE Id = :subUserId LIMIT 1];
            Decimal targetHours = (!subUsers.isEmpty() && subUsers[0].Weekly_Hours_Target__c != null) 
                ? subUsers[0].Weekly_Hours_Target__c 
                : 40.0;
            if (targetHours == 0.0) {
                targetHours = 40.0;
            }
            
            List<TimesheetStatsWrapper> wrappers = new List<TimesheetStatsWrapper>();
            for (Timesheet__c ts : timesheets) {
                TimesheetStatsWrapper wrapper = new TimesheetStatsWrapper();
                wrapper.id = ts.Id;
                wrapper.name = ts.Name;
                wrapper.weekStartDate = ts.Week_Start_Date__c;
                wrapper.weekEndDate = ts.Week_End_Date__c;
                
                Decimal total = tsTotalHours.get(ts.Id);
                Decimal billable = tsBillableHours.get(ts.Id);
                
                wrapper.totalHours = total.setScale(1);
                wrapper.billableHours = billable.setScale(1);
                wrapper.utilization = ((total / targetHours) * 100.0).setScale(0, System.RoundingMode.HALF_UP);
                
                wrappers.add(wrapper);
            }
            return wrappers;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<TimesheetWrappers.TimesheetEntryWrapper> getManagerTimesheetEntries(Id timesheetId) {
        try {
            if (!isSubordinateTimesheet(timesheetId)) {
                throw new AuraHandledException('Access Denied: You do not have permissions to view this timesheet.');
            }
            
            List<Timesheet_Entry__c> entries = [
                SELECT Id, Name, Timesheet__c, Project__c, Project__r.Name, Project__r.Project_Code__c, 
                       Project__r.Status__c, Project__r.Budget_Hours__c,
                       Hours__c, Entry_Date__c, Description__c, Category__c, Is_Billable__c
                FROM Timesheet_Entry__c
                WHERE Timesheet__c = :timesheetId
                ORDER BY Entry_Date__c ASC
            ];
            
            List<TimesheetWrappers.TimesheetEntryWrapper> wrappers = new List<TimesheetWrappers.TimesheetEntryWrapper>();
            for (Timesheet_Entry__c e : entries) {
                wrappers.add(new TimesheetWrappers.TimesheetEntryWrapper(e));
            }
            return wrappers;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    private static Boolean isSubordinateTimesheet(Id timesheetId) {
        Id currentUserId = UserInfo.getUserId();
        
        List<Employee__c> managerEmps = [
            SELECT Id FROM Employee__c 
            WHERE User__c = :currentUserId AND Role_Type__c = 'Manager'
            LIMIT 1
        ];
        if (managerEmps.isEmpty()) {
            return false;
        }
        Id managerId = managerEmps[0].Id;
        
        List<Timesheet__c> tsList = [
            SELECT Employee__c FROM Timesheet__c 
            WHERE Id = :timesheetId
            LIMIT 1
        ];
        if (tsList.isEmpty()) {
            return false;
        }
        Id employeeUserId = tsList[0].Employee__c;
        
        List<Employee__c> subordinateEmps = [
            SELECT Id FROM Employee__c 
            WHERE User__c = :employeeUserId AND Manager__c = :managerId
            LIMIT 1
        ];
        return !subordinateEmps.isEmpty();
    }

    @AuraEnabled(cacheable=true)
    public static List<TeamActivityWrapper> getTeamActivities() {
        try {
            Id currentUserId = UserInfo.getUserId();
            List<Employee__c> mgrs = [
                SELECT Id FROM Employee__c 
                WHERE User__c = :currentUserId AND Role_Type__c = 'Manager'
                LIMIT 1
            ];
            if (mgrs.isEmpty()) {
                return new List<TeamActivityWrapper>();
            }
            Id managerId = mgrs[0].Id;
            
            List<Employee__c> subordinates = [
                SELECT Id, User__c, Name FROM Employee__c WHERE Manager__c = :managerId
            ];
            if (subordinates.isEmpty()) {
                return new List<TeamActivityWrapper>();
            }
            
            Set<Id> subUserIds = new Set<Id>();
            Map<Id, String> userNames = new Map<Id, String>();
            for (Employee__c emp : subordinates) {
                if (emp.User__c != null) {
                    subUserIds.add(emp.User__c);
                    userNames.put(emp.User__c, emp.Name);
                }
            }
            
            List<Timesheet_Entry__c> entries = [
                SELECT Id, Hours__c, Entry_Date__c, Description__c, Category__c, Project__r.Name, Timesheet__r.Employee__c, LastModifiedDate
                FROM Timesheet_Entry__c
                WHERE Timesheet__r.Employee__c IN :subUserIds
                ORDER BY LastModifiedDate DESC
                LIMIT 10
            ];
            
            List<TeamActivityWrapper> activities = new List<TeamActivityWrapper>();
            for (Timesheet_Entry__c e : entries) {
                TeamActivityWrapper act = new TeamActivityWrapper();
                act.id = e.Id;
                act.employeeName = userNames.get(e.Timesheet__r.Employee__c);
                act.hours = e.Hours__c != null ? e.Hours__c : 0.0;
                act.projectName = e.Project__r != null ? e.Project__r.Name : 'Other';
                act.category = e.Category__c;
                act.description = e.Description__c;
                act.entryDate = e.Entry_Date__c;
                activities.add(act);
            }
            return activities;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    public class TeamActivityWrapper {
        @AuraEnabled public String id {get;set;}
        @AuraEnabled public String employeeName {get;set;}
        @AuraEnabled public Decimal hours {get;set;}
        @AuraEnabled public String projectName {get;set;}
        @AuraEnabled public String category {get;set;}
        @AuraEnabled public String description {get;set;}
        @AuraEnabled public Date entryDate {get;set;}
    }
}