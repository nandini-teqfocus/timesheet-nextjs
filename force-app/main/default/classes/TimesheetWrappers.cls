public with sharing class TimesheetWrappers {
    
    public class TimesheetWrapper {
        @AuraEnabled public Id id {get;set;}
        @AuraEnabled public String weekStart {get;set;}
        @AuraEnabled public String weekEnd {get;set;}
        @AuraEnabled public String status {get;set;}
        @AuraEnabled public Decimal totalHours {get;set;}
        @AuraEnabled public Decimal billableHours {get;set;}
        @AuraEnabled public String notes {get;set;}

        public TimesheetWrapper() {}

        public TimesheetWrapper(Timesheet__c ts, Decimal total, Decimal billable) {
            this.id = ts.Id;
            this.weekStart = ts.Week_Start_Date__c != null ? String.valueOf(ts.Week_Start_Date__c) : '';
            this.weekEnd = ts.Week_End_Date__c != null ? String.valueOf(ts.Week_End_Date__c) : '';
            this.status = ts.Status__c;
            this.totalHours = total;
            this.billableHours = billable;
            this.notes = ts.Notes__c != null ? ts.Notes__c : '';
        }
    }

    public class TimesheetEntryWrapper {
        @AuraEnabled public Id id {get;set;}
        @AuraEnabled public Id projectId {get;set;}
        @AuraEnabled public String projectName {get;set;}
        @AuraEnabled public String projectCode {get;set;}
        @AuraEnabled public String category {get;set;}
        @AuraEnabled public Decimal hours {get;set;}
        @AuraEnabled public String dateStr {get;set;} // ISO date yyyy-MM-dd
        @AuraEnabled public String description {get;set;}
        @AuraEnabled public Boolean isBillable {get;set;}

        public TimesheetEntryWrapper() {}

        public TimesheetEntryWrapper(Timesheet_Entry__c entry) {
            this.id = entry.Id;
            this.projectId = entry.Project__c;
            this.projectName = entry.Project__r != null ? entry.Project__r.Name : 'Unknown Project';
            this.projectCode = entry.Project__r != null ? entry.Project__r.Project_Code__c : '';
            this.category = entry.Category__c;
            this.hours = entry.Hours__c != null ? entry.Hours__c : 0.0;
            this.dateStr = entry.Entry_Date__c != null ? String.valueOf(entry.Entry_Date__c) : '';
            this.description = entry.Description__c != null ? entry.Description__c : '';
            this.isBillable = entry.Is_Billable__c;
        }
    }

    public class UserProfileWrapper {
        @AuraEnabled public Id id {get;set;}
        @AuraEnabled public String name {get;set;}
        @AuraEnabled public String title {get;set;}
        @AuraEnabled public String department {get;set;}
        @AuraEnabled public String email {get;set;}
        @AuraEnabled public String joinDate {get;set;}
        @AuraEnabled public Decimal totalHours {get;set;}
        @AuraEnabled public String phone {get;set;}
        @AuraEnabled public String location {get;set;}
        @AuraEnabled public String managerName {get;set;}
        @AuraEnabled public String timezone {get;set;}
        @AuraEnabled public String locale {get;set;}
        @AuraEnabled public String tenure {get;set;}
        @AuraEnabled public Decimal utilizationRate {get;set;}

        public UserProfileWrapper() {}

        public UserProfileWrapper(User u, Decimal hours, Decimal utilRate) {
            this.id = u.Id;
            this.name = u.Name;
            this.title = u.Title != null ? u.Title : 'Senior Developer';
            this.department = u.Department != null ? u.Department : 'Engineering';
            this.email = u.Email;
            this.joinDate = u.CreatedDate != null ? String.valueOf(u.CreatedDate.date()) : '';
            this.totalHours = hours;
            this.phone = u.Phone != null ? u.Phone : 'Not Specified';
            
            String loc = '';
            if (u.City != null) loc += u.City;
            if (u.State != null) {
                if (loc != '') loc += ', ';
                loc += u.State;
            }
            this.location = loc != '' ? loc : 'Not Specified';
            
            this.managerName = u.Manager != null && u.Manager.Name != null ? u.Manager.Name : 'None (Executive)';
            this.timezone = u.TimeZoneSidKey != null ? u.TimeZoneSidKey : 'America/Los_Angeles';
            this.locale = u.LocaleSidKey != null ? u.LocaleSidKey : 'en_US';
            this.utilizationRate = utilRate;
            
            if (u.CreatedDate != null) {
                Integer days = u.CreatedDate.date().daysBetween(Date.today());
                Decimal yrs = Decimal.valueOf(days) / 365.0;
                this.tenure = yrs.setScale(1) + 'y';
            } else {
                this.tenure = '0.0y';
            }
        }
    }

    public class EmployeeSkillWrapper {
        @AuraEnabled public Id id {get;set;}
        @AuraEnabled public Id skillId {get;set;}
        @AuraEnabled public String name {get;set;}
        @AuraEnabled public String category {get;set;}
        @AuraEnabled public String proficiencyLevel {get;set;}
        @AuraEnabled public Decimal yearsExperience {get;set;}
        @AuraEnabled public Boolean certified {get;set;}

        public EmployeeSkillWrapper() {}

        public EmployeeSkillWrapper(Employee_Skill__c es) {
            this.id = es.Id;
            this.skillId = es.Skill__c;
            this.name = es.Skill__r != null ? es.Skill__r.Name : '';
            this.category = es.Skill__r != null ? es.Skill__r.Category__c : 'Technical';
            this.proficiencyLevel = es.Proficiency_Level__c;
            this.yearsExperience = es.Years_Experience__c != null ? es.Years_Experience__c : 0;
            this.certified = es.Certified__c;
        }
    }

    public class AnalyticsSummaryWrapper {
        @AuraEnabled public String period {get;set;}
        @AuraEnabled public Decimal utilizationRate {get;set;}
        @AuraEnabled public Decimal totalHours {get;set;}
        @AuraEnabled public Decimal billableHours {get;set;}
        @AuraEnabled public Decimal avgDailyHours {get;set;}
        @AuraEnabled public String topProject {get;set;}

        public AnalyticsSummaryWrapper() {
            this.period = 'week';
            this.utilizationRate = 0.0;
            this.totalHours = 0.0;
            this.billableHours = 0.0;
            this.avgDailyHours = 0.0;
            this.topProject = 'None';
        }
    }

    public class TrendDataWrapper {
        @AuraEnabled public String period {get;set;}
        @AuraEnabled public Decimal hours {get;set;}
        @AuraEnabled public Decimal billable {get;set;}

        public TrendDataWrapper() {}

        public TrendDataWrapper(String p, Decimal h, Decimal b) {
            this.period = p;
            this.hours = h;
            this.billable = b;
        }
    }

    public class ProjectDistributionWrapper {
        @AuraEnabled public String name {get;set;}
        @AuraEnabled public Decimal hours {get;set;}
        @AuraEnabled public Decimal percentage {get;set;}
        @AuraEnabled public String color {get;set;}

        public ProjectDistributionWrapper() {}

        public ProjectDistributionWrapper(String n, Decimal h, Decimal p, String c) {
            this.name = n;
            this.hours = h;
            this.percentage = p;
            this.color = c;
        }
    }

    public class MonthlyUtilizationWrapper {
        @AuraEnabled public Id id {get;set;}
        @AuraEnabled public String month {get;set;}
        @AuraEnabled public Decimal billed {get;set;}
        @AuraEnabled public Decimal nonBilled {get;set;}
        @AuraEnabled public String utilization {get;set;}

        public MonthlyUtilizationWrapper() {}

        public MonthlyUtilizationWrapper(Id identifier, String m, Decimal b, Decimal nb, String util) {
            this.id = identifier;
            this.month = m;
            this.billed = b;
            this.nonBilled = nb;
            this.utilization = util;
        }
    }
}