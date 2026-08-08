public without sharing class SkillSelector {
    
    public static List<Employee_Skill__c> getEmployeeSkills(Id employeeId) {
        return [
            SELECT Id, Skill__c, Skill__r.Name, Skill__r.Category__c, 
                   Proficiency_Level__c, Years_Experience__c, Certified__c, Employee__c
            FROM Employee_Skill__c
            WHERE Employee__c = :employeeId
            ORDER BY Skill__r.Name ASC
            LIMIT 100
        ];
    }

    public static List<Skill__c> getAllCatalogSkills() {
        return [
            SELECT Id, Name, Category__c
            FROM Skill__c
            ORDER BY Name ASC
            LIMIT 200
        ];
    }

    public static Employee_Skill__c getEmployeeSkillById(Id employeeSkillId) {
        List<Employee_Skill__c> records = [
            SELECT Id, Skill__c, Skill__r.Name, Skill__r.Category__c, Employee__c, Proficiency_Level__c, Years_Experience__c, Certified__c
            FROM Employee_Skill__c
            WHERE Id = :employeeSkillId
            LIMIT 1
        ];
        return records.isEmpty() ? null : records[0];
    }
}