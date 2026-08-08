public with sharing class DashboardDataWrapper {
    @AuraEnabled public UserProfileSummary profile { get; set; }
    @AuraEnabled public List<TimesheetWrappers.TimesheetEntryWrapper> recentActivities { get; set; }
    @AuraEnabled public List<TimesheetWrappers.ProjectDistributionWrapper> projectDistribution { get; set; }
    @AuraEnabled public List<TimesheetWrappers.MonthlyUtilizationWrapper> monthlyUtilization { get; set; }
    @AuraEnabled public List<TimesheetWrappers.TrendDataWrapper> trendData { get; set; }
    @AuraEnabled public TimesheetWrappers.TimesheetWrapper currentTimesheet { get; set; }
    @AuraEnabled public List<TimesheetWrappers.TimesheetEntryWrapper> currentWeekEntries { get; set; }
    @AuraEnabled public List<ActiveProjectWrapper> activeProjects { get; set; }
    @AuraEnabled public Integer notificationCount { get; set; }
    @AuraEnabled public KPIModel kpis { get; set; }

    public class UserProfileSummary {
        @AuraEnabled public Id id { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String title { get; set; }
        @AuraEnabled public String department { get; set; }
        @AuraEnabled public String email { get; set; }
        @AuraEnabled public String phone { get; set; }
        @AuraEnabled public String location { get; set; }
        @AuraEnabled public String city { get; set; }
        @AuraEnabled public String state { get; set; }
        @AuraEnabled public String managerName { get; set; }
        @AuraEnabled public String timezone { get; set; }
        @AuraEnabled public String locale { get; set; }
        @AuraEnabled public String joinDate { get; set; }
        @AuraEnabled public String tenure { get; set; }
        @AuraEnabled public Decimal weeklyHoursTarget { get; set; }
        @AuraEnabled public String notificationPreferences { get; set; }
        @AuraEnabled public Decimal productivityTarget { get; set; }
    }

    public class ActiveProjectWrapper {
        @AuraEnabled public Id id { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String projectCode { get; set; }
        @AuraEnabled public Decimal loggedHours { get; set; }
        @AuraEnabled public Decimal budgetHours { get; set; }
    }

    public class KPIModel {
        @AuraEnabled public Decimal utilizationRate { get; set; }
        @AuraEnabled public Decimal totalHours { get; set; }
        @AuraEnabled public Decimal billableHours { get; set; }
        @AuraEnabled public Decimal avgDailyHours { get; set; }
        @AuraEnabled public String topProject { get; set; }
        @AuraEnabled public Decimal loggedHoursVsTargetPct { get; set; }
        @AuraEnabled public Decimal monthOverMonthChange { get; set; }
    }
}