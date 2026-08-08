public with sharing class DashboardController {

    @AuraEnabled(cacheable=true)
    public static DashboardDataWrapper getDashboardData(Date weekStart) {
        try {
            Id currentUserId = UserInfo.getUserId();
            DashboardDataWrapper data = new DashboardDataWrapper();

            // 1. User Profile Summary
            User u = [
                SELECT Id, Name, Title, Department, Email, Phone, City, State, 
                       TimeZoneSidKey, LocaleSidKey, Manager.Name, CreatedDate,
                       Weekly_Hours_Target__c, Notification_Preferences__c, Productivity_Target__c
                FROM User
                WHERE Id = :currentUserId
                LIMIT 1
            ];

            DashboardDataWrapper.UserProfileSummary prof = new DashboardDataWrapper.UserProfileSummary();
            prof.id = u.Id;
            prof.name = u.Name;
            prof.title = u.Title != null ? u.Title : 'Senior Developer';
            prof.department = u.Department != null ? u.Department : 'Engineering';
            prof.email = u.Email;
            prof.phone = u.Phone != null ? u.Phone : 'Not Specified';
            prof.city = u.City != null ? u.City : '';
            prof.state = u.State != null ? u.State : '';
            
            String loc = '';
            if (u.City != null) loc += u.City;
            if (u.State != null) {
                if (loc != '') loc += ', ';
                loc += u.State;
            }
            prof.location = loc != '' ? loc : 'Not Specified';
            prof.managerName = u.Manager != null && u.Manager.Name != null ? u.Manager.Name : 'None (Executive)';
            prof.timezone = u.TimeZoneSidKey != null ? u.TimeZoneSidKey : 'America/Los_Angeles';
            prof.locale = u.LocaleSidKey != null ? u.LocaleSidKey : 'en_US';
            prof.joinDate = u.CreatedDate != null ? String.valueOf(u.CreatedDate.date()) : '';
            
            if (u.CreatedDate != null) {
                Integer days = u.CreatedDate.date().daysBetween(Date.today());
                Decimal yrs = Decimal.valueOf(days) / 365.0;
                prof.tenure = yrs.setScale(1) + 'y';
            } else {
                prof.tenure = '0.0y';
            }
            
            prof.weeklyHoursTarget = u.Weekly_Hours_Target__c != null ? u.Weekly_Hours_Target__c : 40.0;
            prof.notificationPreferences = u.Notification_Preferences__c != null ? u.Notification_Preferences__c : 'All';
            prof.productivityTarget = u.Productivity_Target__c != null ? u.Productivity_Target__c * 100.0 : 80.0; // standard percent conversion
            data.profile = prof;

            // 2. Load Current Timesheet
            Timesheet__c ts = TimesheetSelector.getTimesheetByStartDate(currentUserId, weekStart);
            List<Timesheet_Entry__c> weekEntries = new List<Timesheet_Entry__c>();
            Decimal totalHours = 0.0;
            Decimal billableHours = 0.0;

            if (ts != null) {
                weekEntries = TimesheetSelector.getEntriesByTimesheetId(ts.Id);
                for (Timesheet_Entry__c e : weekEntries) {
                    Decimal h = e.Hours__c != null ? e.Hours__c : 0.0;
                    totalHours += h;
                    if (e.Is_Billable__c) {
                        billableHours += h;
                    }
                }
                data.currentTimesheet = new TimesheetWrappers.TimesheetWrapper(ts, totalHours, billableHours);
            } else {
                // Return default clean wrapper
                data.currentTimesheet = new TimesheetWrappers.TimesheetWrapper();
                data.currentTimesheet.weekStart = String.valueOf(weekStart);
                data.currentTimesheet.weekEnd = String.valueOf(weekStart.addDays(6));
                data.currentTimesheet.status = 'None';
                data.currentTimesheet.totalHours = 0.0;
                data.currentTimesheet.billableHours = 0.0;
            }

            data.currentWeekEntries = new List<TimesheetWrappers.TimesheetEntryWrapper>();
            for (Timesheet_Entry__c e : weekEntries) {
                data.currentWeekEntries.add(new TimesheetWrappers.TimesheetEntryWrapper(e));
            }

            // 3. Load Recent Activities (Limit 5)
            data.recentActivities = new List<TimesheetWrappers.TimesheetEntryWrapper>();
            List<Timesheet_Entry__c> recent = [
                SELECT Id, Name, Timesheet__c, Project__c, Project__r.Name, Project__r.Project_Code__c, 
                       Project__r.Status__c, Project__r.Budget_Hours__c,
                       Hours__c, Entry_Date__c, Description__c, Category__c, Is_Billable__c
                FROM Timesheet_Entry__c
                WHERE Timesheet__r.Employee__c = :currentUserId
                WITH USER_MODE
                ORDER BY Entry_Date__c DESC, CreatedDate DESC
                LIMIT 5
            ];
            for (Timesheet_Entry__c e : recent) {
                data.recentActivities.add(new TimesheetWrappers.TimesheetEntryWrapper(e));
            }

            // 4. Notification Counts (Draft and Rejected Timesheets count)
            List<Timesheet__c> pendingTimesheets = [
                SELECT Id FROM Timesheet__c
                WHERE Employee__c = :currentUserId AND (Status__c = 'Draft' OR Status__c = 'Rejected')
                WITH USER_MODE
            ];
            data.notificationCount = pendingTimesheets.size();

            // 5. Load Project Distribution & Aggregate Real Analytics
            List<Timesheet_Entry__c> allEntries = TimesheetSelector.getAllEntriesByEmployee(currentUserId);
            Decimal allTotalHours = 0.0;
            Decimal allBillableHours = 0.0;
            Map<String, Decimal> projHoursMap = new Map<String, Decimal>();
            Map<Id, DashboardDataWrapper.ActiveProjectWrapper> activeProjMap = new Map<Id, DashboardDataWrapper.ActiveProjectWrapper>();

            for (Timesheet_Entry__c e : allEntries) {
                Decimal h = e.Hours__c != null ? e.Hours__c : 0.0;
                allTotalHours += h;
                if (e.Is_Billable__c) {
                    allBillableHours += h;
                }
                String projName = e.Project__r != null ? e.Project__r.Name : 'Other';
                projHoursMap.put(projName, (projHoursMap.containsKey(projName) ? projHoursMap.get(projName) : 0.0) + h);

                if (e.Project__c != null && !activeProjMap.containsKey(e.Project__c) && e.Project__r.Status__c == 'Active') {
                    DashboardDataWrapper.ActiveProjectWrapper apw = new DashboardDataWrapper.ActiveProjectWrapper();
                    apw.id = e.Project__c;
                    apw.name = e.Project__r.Name;
                    apw.projectCode = e.Project__r.Project_Code__c;
                    apw.loggedHours = 0.0;
                    apw.budgetHours = e.Project__r.Budget_Hours__c != null ? e.Project__r.Budget_Hours__c : 100.0;
                    activeProjMap.put(e.Project__c, apw);
                }

                if (e.Project__c != null && activeProjMap.containsKey(e.Project__c)) {
                    activeProjMap.get(e.Project__c).loggedHours += h;
                }
            }

            data.activeProjects = activeProjMap.values();

            // 6. Build project distribution percentage
            data.projectDistribution = new List<TimesheetWrappers.ProjectDistributionWrapper>();
            List<String> colors = new List<String>{'#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#9E9E9E'};
            Integer colorIdx = 0;
            for (String proj : projHoursMap.keySet()) {
                Decimal h = projHoursMap.get(proj);
                Decimal pct = allTotalHours > 0 ? (h / allTotalHours) * 100 : 0.0;
                String color = colors[Math.mod(colorIdx, colors.size())];
                colorIdx++;
                data.projectDistribution.add(new TimesheetWrappers.ProjectDistributionWrapper(proj, h.setScale(1), pct.setScale(0), color));
            }

            // 7. Load Monthly Utilization (Real from database snapshots or aggregate calculations!)
            data.monthlyUtilization = AnalyticsService.getMonthlyUtilization(currentUserId);

            // Calculate MoM Change: Compare latest month vs previous month!
            Decimal momChange = 0.0;
            if (data.monthlyUtilization.size() >= 2) {
                String latestStr = data.monthlyUtilization[0].utilization.replace('%', '');
                String prevStr = data.monthlyUtilization[1].utilization.replace('%', '');
                try {
                    Decimal latestVal = Decimal.valueOf(latestStr);
                    Decimal prevVal = Decimal.valueOf(prevStr);
                    momChange = latestVal - prevVal;
                } catch(Exception e) { /* Format parse fallback */ }
            }

            // 8. Load Trend Chart Data
            data.trendData = AnalyticsService.getTrendData(currentUserId);

            // 9. Load overall Dynamic KPI metrics
            DashboardDataWrapper.KPIModel kpi = new DashboardDataWrapper.KPIModel();
            kpi.totalHours = allTotalHours.setScale(1);
            kpi.billableHours = allBillableHours.setScale(1);
            kpi.utilizationRate = allTotalHours > 0 ? ((allBillableHours / allTotalHours) * 100).setScale(0) : 0.0;
            
            // Calculate avgDailyHours based on weeks represented in Trend Data or a standard weekly division index
            kpi.avgDailyHours = (allTotalHours > 0) ? (allTotalHours / Math.max(1, data.trendData.size() * 5.0)).setScale(1) : 0.0;

            String topProjectName = 'None';
            Decimal maxHours = -1.0;
            for (String proj : projHoursMap.keySet()) {
                Decimal h = projHoursMap.get(proj);
                if (h > maxHours) {
                    maxHours = h;
                    topProjectName = proj;
                }
            }
            kpi.topProject = topProjectName;
            kpi.loggedHoursVsTargetPct = prof.weeklyHoursTarget > 0 ? ((totalHours / prof.weeklyHoursTarget) * 100).setScale(0) : 0.0;
            kpi.monthOverMonthChange = momChange;
            data.kpis = kpi;

            return data;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<TimesheetWrappers.TimesheetEntryWrapper> getPaginatedActivities(Integer limitVal, Integer offsetVal) {
        try {
            Id currentUserId = UserInfo.getUserId();
            List<Timesheet_Entry__c> entries = [
                SELECT Id, Name, Timesheet__c, Project__c, Project__r.Name, Project__r.Project_Code__c, 
                       Project__r.Status__c, Project__r.Budget_Hours__c,
                       Hours__c, Entry_Date__c, Description__c, Category__c, Is_Billable__c
                FROM Timesheet_Entry__c
                WHERE Timesheet__r.Employee__c = :currentUserId
                WITH USER_MODE
                ORDER BY Entry_Date__c DESC, CreatedDate DESC
                LIMIT :limitVal OFFSET :offsetVal
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