public with sharing class AnalyticsController {

    @AuraEnabled(cacheable=true)
    public static TimesheetWrappers.AnalyticsSummaryWrapper getAnalyticsSummary() {
        try {
            Id currentUserId = UserInfo.getUserId();
            return AnalyticsService.getSummary(currentUserId);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<TimesheetWrappers.TrendDataWrapper> getTrendData() {
        try {
            Id currentUserId = UserInfo.getUserId();
            return AnalyticsService.getTrendData(currentUserId);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<TimesheetWrappers.ProjectDistributionWrapper> getProjectDistribution() {
        try {
            Id currentUserId = UserInfo.getUserId();
            return AnalyticsService.getProjectDistribution(currentUserId);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<TimesheetWrappers.MonthlyUtilizationWrapper> getMonthlyUtilization() {
        try {
            Id currentUserId = UserInfo.getUserId();
            return AnalyticsService.getMonthlyUtilization(currentUserId);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static String generateExportCSV() {
        try {
            Id currentUserId = UserInfo.getUserId();
            User u = [SELECT Name, Email FROM User WHERE Id = :currentUserId LIMIT 1];
            
            // Get database data dynamically
            TimesheetWrappers.AnalyticsSummaryWrapper kpis = AnalyticsService.getSummary(currentUserId);
            List<TimesheetWrappers.TrendDataWrapper> trend = AnalyticsService.getTrendData(currentUserId);
            List<TimesheetWrappers.ProjectDistributionWrapper> projectDist = AnalyticsService.getProjectDistribution(currentUserId);
            List<TimesheetWrappers.MonthlyUtilizationWrapper> monthly = AnalyticsService.getMonthlyUtilization(currentUserId);
            
            String csv = 'ENTERPRISE TIMESHEET ANALYTICS REPORT\n';
            csv += 'Generated On,' + String.valueOf(Date.today()) + '\n';
            csv += 'Employee Name,' + escapeCSV(u.Name) + '\n';
            csv += 'Employee Email,' + escapeCSV(u.Email) + '\n\n';
            
            // Section 1: KPI Summary
            csv += 'OVERALL UTILIZATION SUMMARY METRICS\n';
            csv += 'Metric,Value\n';
            
            Decimal utilRate = (kpis != null && kpis.utilizationRate != null) ? kpis.utilizationRate : 0.0;
            Decimal totalHrs = (kpis != null && kpis.totalHours != null) ? kpis.totalHours : 0.0;
            Decimal billableHrs = (kpis != null && kpis.billableHours != null) ? kpis.billableHours : 0.0;
            String topProj = (kpis != null && kpis.topProject != null) ? kpis.topProject : 'None';
            
            csv += 'Avg Utilization Rate,' + utilRate + '%\n';
            csv += 'Total Logged Hours,' + totalHrs + ' h\n';
            csv += 'Billed Hours,' + billableHrs + ' h\n';
            csv += 'Non-Billed Hours,' + (totalHrs - billableHrs) + ' h\n';
            csv += 'Top Project,' + escapeCSV(topProj) + '\n\n';
            
            // Section 2: Trend Data
            csv += 'UTILIZATION TREND BY WEEK\n';
            csv += 'Period,Total Hours,Billable Hours,Utilization Rate\n';
            if (trend != null) {
                for (TimesheetWrappers.TrendDataWrapper t : trend) {
                    if (t != null) {
                        Decimal tHours = t.hours != null ? t.hours : 0.0;
                        Decimal tBillable = t.billable != null ? t.billable : 0.0;
                        Decimal rate = tHours > 0 ? ((tBillable / tHours) * 100).setScale(1) : 0.0;
                        csv += escapeCSV(t.period) + ',' + tHours + ',' + tBillable + ',' + rate + '%\n';
                    }
                }
            }
            csv += '\n';
            
            // Section 3: Project Distribution
            csv += 'PROJECT HOURS DISTRIBUTION\n';
            csv += 'Project Name,Logged Hours,Percentage Contribution\n';
            if (projectDist != null) {
                for (TimesheetWrappers.ProjectDistributionWrapper p : projectDist) {
                    if (p != null) {
                        Decimal pHours = p.hours != null ? p.hours : 0.0;
                        Decimal pPct = p.percentage != null ? p.percentage : 0.0;
                        csv += escapeCSV(p.name) + ',' + pHours + ',' + pPct + '%\n';
                    }
                }
            }
            csv += '\n';
            
            // Section 4: Monthly Utilization Logs
            csv += 'HISTORICAL MONTHLY PERFORMANCE LOGS\n';
            csv += 'Month,Billed Hours,Non-Billed Hours,Avg Utilization\n';
            if (monthly != null) {
                for (TimesheetWrappers.MonthlyUtilizationWrapper m : monthly) {
                    if (m != null) {
                        Decimal mBilled = m.billed != null ? m.billed : 0.0;
                        Decimal mNonBilled = m.nonBilled != null ? m.nonBilled : 0.0;
                        csv += escapeCSV(m.month) + ',' + mBilled + ',' + mNonBilled + ',' + escapeCSV(m.utilization) + '\n';
                    }
                }
            }
            
            return csv;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    private static String escapeCSV(String val) {
        if (val == null) return '';
        if (val.contains(',') || val.contains('"') || val.contains('\n') || val.contains('\r')) {
            return '"' + val.replaceAll('"', '""') + '"';
        }
        return val;
    }
}