public with sharing class AnalyticsService {

    /**
     * Compute dynamic KPI metrics for the user home dashboard.
     */
    public static TimesheetWrappers.AnalyticsSummaryWrapper getSummary(Id employeeId) {
        TimesheetWrappers.AnalyticsSummaryWrapper summary = new TimesheetWrappers.AnalyticsSummaryWrapper();
        
        List<Timesheet_Entry__c> entries = TimesheetSelector.getAllEntriesByEmployee(employeeId);
        if (entries.isEmpty()) {
            return summary;
        }

        Decimal totalHours = 0.0;
        Decimal billableHours = 0.0;
        Map<String, Decimal> projHoursMap = new Map<String, Decimal>();

        for (Timesheet_Entry__c e : entries) {
            Decimal h = e.Hours__c != null ? e.Hours__c : 0.0;
            totalHours += h;
            if (e.Is_Billable__c) {
                billableHours += h;
            }
            
            String projName = e.Project__r != null ? e.Project__r.Name : 'Other';
            projHoursMap.put(projName, (projHoursMap.containsKey(projName) ? projHoursMap.get(projName) : 0.0) + h);
        }

        summary.totalHours = totalHours.setScale(1);
        summary.billableHours = billableHours.setScale(1);
        summary.utilizationRate = totalHours > 0 ? ((billableHours / totalHours) * 100).setScale(0) : 0.0;
        summary.avgDailyHours = (totalHours / 5.0).setScale(1); // Standard weekly distribution index

        // Resolve top project
        String topProjectName = 'None';
        Decimal maxHours = -1.0;
        for (String proj : projHoursMap.keySet()) {
            Decimal h = projHoursMap.get(proj);
            if (h > maxHours) {
                maxHours = h;
                topProjectName = proj;
            }
        }
        summary.topProject = topProjectName;

        return summary;
    }

    /**
     * Group hours dynamically by active timesheet week starts to build trend charts.
     */
    public static List<TimesheetWrappers.TrendDataWrapper> getTrendData(Id employeeId) {
        Map<Date, TimesheetWrappers.TrendDataWrapper> trendMap = new Map<Date, TimesheetWrappers.TrendDataWrapper>();
        
        List<Timesheet_Entry__c> entries = [
            SELECT Hours__c, Entry_Date__c, Is_Billable__c, Timesheet__r.Week_Start_Date__c
            FROM Timesheet_Entry__c
            WHERE Timesheet__r.Employee__c = :employeeId
            WITH USER_MODE
            ORDER BY Entry_Date__c ASC
            LIMIT 1000
        ];

        for (Timesheet_Entry__c e : entries) {
            Date weekStart = e.Timesheet__r.Week_Start_Date__c;
            if (weekStart == null) continue;
            
            if (!trendMap.containsKey(weekStart)) {
                String label = 'Week of ' + weekStart.format();
                trendMap.put(weekStart, new TimesheetWrappers.TrendDataWrapper(label, 0.0, 0.0));
            }
            
            TimesheetWrappers.TrendDataWrapper trend = trendMap.get(weekStart);
            Decimal h = e.Hours__c != null ? e.Hours__c : 0.0;
            trend.hours += h;
            if (e.Is_Billable__c) {
                trend.billable += h;
            }
        }

        // Clean scale rounding
        List<TimesheetWrappers.TrendDataWrapper> results = trendMap.values();
        for (TimesheetWrappers.TrendDataWrapper t : results) {
            t.hours = t.hours.setScale(1);
            t.billable = t.billable.setScale(1);
        }

        return results;
    }

    /**
     * Aggregate hours by project name to build distributions.
     */
    public static List<TimesheetWrappers.ProjectDistributionWrapper> getProjectDistribution(Id employeeId) {
        Map<String, Decimal> projHoursMap = new Map<String, Decimal>();
        
        List<Timesheet_Entry__c> entries = [
            SELECT Hours__c, Project__r.Name
            FROM Timesheet_Entry__c
            WHERE Timesheet__r.Employee__c = :employeeId
            WITH USER_MODE
            LIMIT 1000
        ];

        Decimal totalHours = 0.0;
        for (Timesheet_Entry__c e : entries) {
            String projName = e.Project__r != null ? e.Project__r.Name : 'Other';
            Decimal h = e.Hours__c != null ? e.Hours__c : 0.0;
            totalHours += h;
            projHoursMap.put(projName, (projHoursMap.containsKey(projName) ? projHoursMap.get(projName) : 0.0) + h);
        }
        
        List<TimesheetWrappers.ProjectDistributionWrapper> dist = new List<TimesheetWrappers.ProjectDistributionWrapper>();
        List<String> colors = new List<String>{'#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#9E9E9E'};
        Integer colorIdx = 0;

        for (String proj : projHoursMap.keySet()) {
            Decimal h = projHoursMap.get(proj);
            Decimal pct = totalHours > 0 ? (h / totalHours) * 100 : 0.0;
            String color = colors[Math.mod(colorIdx, colors.size())];
            colorIdx++;
            dist.add(new TimesheetWrappers.ProjectDistributionWrapper(proj, h.setScale(1), pct.setScale(0), color));
        }

        return dist;
    }

    /**
     * Resolves historical monthly performance log aggregates from snapshot sObjects.
     */
    public static List<TimesheetWrappers.MonthlyUtilizationWrapper> getMonthlyUtilization(Id employeeId) {
        List<Analytics_Snapshot__c> snapshots = AnalyticsSelector.getAnalyticsSnapshots(employeeId, 12);
        List<TimesheetWrappers.MonthlyUtilizationWrapper> wrappers = new List<TimesheetWrappers.MonthlyUtilizationWrapper>();
        
        for (Analytics_Snapshot__c snap : snapshots) {
            String monthName = snap.CreatedDate.format('MMMM yyyy');
            Decimal utilizationVal = snap.Utilization_Rate__c != null ? snap.Utilization_Rate__c : 0.0;
            
            // Derive billed & non-billed allocations over a standard 160-hour monthly cycle
            Decimal billed = (utilizationVal / 100.0 * 160.0).setScale(1);
            Decimal nonBilled = (160.0 - billed).setScale(1);
            String utilBadge = utilizationVal.setScale(1) + '%';
            
            wrappers.add(new TimesheetWrappers.MonthlyUtilizationWrapper(snap.Id, monthName, billed, nonBilled, utilBadge));
        }
        
        return wrappers;
    }
}