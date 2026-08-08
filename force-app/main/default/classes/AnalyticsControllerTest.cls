@isTest
private class AnalyticsControllerTest {

    @testSetup
    static void setup() {
        User testUser;
        // Run as current user to avoid Mixed DML when creating setup and non-setup records
        User thisUser = new User(Id = UserInfo.getUserId());
        System.runAs(thisUser) {
            Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
            
            testUser = new User(
                FirstName = 'Analytics',
                LastName = 'Tester',
                Email = 'analytics.tester@testtimesheet.com',
                Username = 'analytics.tester.' + DateTime.now().getTime() + '@testtimesheet.com',
                Alias = 'atester',
                TimeZoneSidKey = 'America/Los_Angeles',
                LocaleSidKey = 'en_US',
                EmailEncodingKey = 'UTF-8',
                ProfileId = stdProfile.Id,
                LanguageLocaleKey = 'en_US'
            );
            insert testUser;

            PermissionSet ps = [SELECT Id FROM PermissionSet WHERE Name = 'Teqfocus_Timesheet_External_Permissions' LIMIT 1];
            insert new PermissionSetAssignment(AssigneeId = testUser.Id, PermissionSetId = ps.Id);
        }

        Project__c activeProj = new Project__c(
            Name = 'Active Project A',
            Project_Code__c = 'PROJ-A',
            Status__c = 'Active',
            Budget_Hours__c = 100
        );
        insert activeProj;

        // Create a timesheet and child entry for the user standard context
        System.runAs(testUser) {
            Timesheet__c ts = new Timesheet__c(
                Employee__c = testUser.Id,
                Week_Start_Date__c = Date.newInstance(2026, 5, 18),
                Week_End_Date__c = Date.newInstance(2026, 5, 24),
                Status__c = 'Draft'
            );
            insert ts;

            Timesheet_Entry__c billable = new Timesheet_Entry__c(
                Timesheet__c = ts.Id,
                Project__c = activeProj.Id,
                Hours__c = 8.0,
                Category__c = 'Development',
                Entry_Date__c = Date.newInstance(2026, 5, 18),
                Description__c = 'Coding LWC features',
                Is_Billable__c = true
            );
            Timesheet_Entry__c nonBillable = new Timesheet_Entry__c(
                Timesheet__c = ts.Id,
                Project__c = activeProj.Id,
                Hours__c = 2.0,
                Category__c = 'Meeting',
                Entry_Date__c = Date.newInstance(2026, 5, 19),
                Description__c = 'Sprint retro',
                Is_Billable__c = false
            );
            insert new List<Timesheet_Entry__c>{billable, nonBillable};

            // Provision a dynamic performance snapshot
            Analytics_Snapshot__c snap = new Analytics_Snapshot__c(
                Employee__c = testUser.Id,
                Period__c = 'Weekly',
                Utilization_Rate__c = 80.0
            );
            insert snap;
        }
    }

    @isTest
    static void testDynamicDashboardCalculation() {
        User testUser = [SELECT Id FROM User WHERE Email = 'analytics.tester@testtimesheet.com' LIMIT 1];

        System.runAs(testUser) {
            // 1. Validate aggregates
            TimesheetWrappers.AnalyticsSummaryWrapper summary = AnalyticsController.getAnalyticsSummary();
            Assert.areEqual(10.0, summary.totalHours, 'Total hours sum is incorrect.');
            Assert.areEqual(8.0, summary.billableHours, 'Billable hours sum is incorrect.');
            Assert.areEqual(80.0, summary.utilizationRate, 'Utilization rate calculation is incorrect.');
            Assert.areEqual(2.0, summary.avgDailyHours, 'Avg daily hours division is incorrect.');
            Assert.areEqual('Active Project A', summary.topProject, 'Top project identification is incorrect.');

            // 2. Validate Trend Data grouping
            List<TimesheetWrappers.TrendDataWrapper> trends = AnalyticsController.getTrendData();
            Assert.areEqual(1, trends.size(), 'There should be 1 trend week.');
            Assert.areEqual(10.0, trends[0].hours, 'Trend week total hours are incorrect.');
            Assert.areEqual(8.0, trends[0].billable, 'Trend week billable hours are incorrect.');

            // 3. Validate Project Distribution
            List<TimesheetWrappers.ProjectDistributionWrapper> distribution = AnalyticsController.getProjectDistribution();
            Assert.areEqual(1, distribution.size(), 'There should be 1 project distribution slice.');
            Assert.areEqual('Active Project A', distribution[0].name, 'Project slice name is incorrect.');
            Assert.areEqual(100.0, distribution[0].percentage, 'Project slice percentage is incorrect.');

            // 4. Validate Monthly Snapshot Wrapper conversion
            List<TimesheetWrappers.MonthlyUtilizationWrapper> utilization = AnalyticsController.getMonthlyUtilization();
            Assert.areEqual(1, utilization.size(), 'There should be 1 monthly log.');
            Assert.areEqual('80.0%', utilization[0].utilization, 'Utilization badge mapping is incorrect.');
            Assert.areEqual(128.0, utilization[0].billed, 'Derived billed calculation is incorrect.');
        }
    }

    @isTest
    static void testGenerateExportCSV() {
        User testUser = [SELECT Id FROM User WHERE Email = 'analytics.tester@testtimesheet.com' LIMIT 1];

        System.runAs(testUser) {
            String csv = AnalyticsController.generateExportCSV();
            Assert.isNotNull(csv, 'CSV export should not be null.');
            Assert.isTrue(csv.contains('ENTERPRISE TIMESHEET ANALYTICS REPORT'), 'CSV export should contain report header.');
            Assert.isTrue(csv.contains('Active Project A'), 'CSV export should contain project distribution data.');
        }
    }
}