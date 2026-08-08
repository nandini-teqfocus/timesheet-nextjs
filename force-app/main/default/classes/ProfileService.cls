public without sharing class ProfileService {
    
    public class ProfileServiceException extends Exception {}

    /**
     * Maps a catalog skill to the employee's profile registry.
     */
    public static Employee_Skill__c addSkill(Id skillId, String proficiency, Decimal experience, Boolean certified) {
        Savepoint sp = Database.setSavepoint();
        try {
            Id employeeId = UserInfo.getUserId();
            
            // Check if mapping already exists to prevent duplicates
            List<Employee_Skill__c> existing = [
                SELECT Id FROM Employee_Skill__c
                WHERE Employee__c = :employeeId AND Skill__c = :skillId
                LIMIT 1
            ];
            if (!existing.isEmpty()) {
                throw new ProfileServiceException('This skill is already registered on your profile.');
            }

            Employee_Skill__c es = new Employee_Skill__c(
                Employee__c = employeeId,
                Skill__c = skillId,
                Proficiency_Level__c = proficiency,
                Years_Experience__c = experience,
                Certified__c = certified
            );

            SecurityUtil.checkCreate(Employee_Skill__c.SObjectType, new List<Schema.SObjectField>{
                Employee_Skill__c.Employee__c,
                Employee_Skill__c.Skill__c,
                Employee_Skill__c.Proficiency_Level__c,
                Employee_Skill__c.Years_Experience__c,
                Employee_Skill__c.Certified__c
            });

            insert es;
            return es;
        } catch (Exception ex) {
            Database.rollback(sp);
            throw new ProfileServiceException(ex.getMessage());
        }
    }

    /**
     * Removes a skill map from the profile registry after checking ownership.
     */
    public static void removeSkill(Id employeeSkillId) {
        Savepoint sp = Database.setSavepoint();
        try {
            Employee_Skill__c es = SkillSelector.getEmployeeSkillById(employeeSkillId);
            if (es == null) {
                throw new ProfileServiceException('Employee skill record not found.');
            }
            // Enforce ownership
            SecurityUtil.checkRecordOwnership(es, 'Employee__c');

            SecurityUtil.checkDelete(Employee_Skill__c.SObjectType);
            delete es;
        } catch (Exception ex) {
            Database.rollback(sp);
            throw new ProfileServiceException(ex.getMessage());
        }
    }

    /**
     * Updates an existing employee skill entry with new attributes.
     */
    public static Employee_Skill__c updateSkill(Id employeeSkillId, String proficiency, Decimal experience, Boolean certified) {
        Savepoint sp = Database.setSavepoint();
        try {
            Employee_Skill__c es = SkillSelector.getEmployeeSkillById(employeeSkillId);
            if (es == null) {
                throw new ProfileServiceException('Employee skill record not found.');
            }
            
            // Enforce ownership
            SecurityUtil.checkRecordOwnership(es, 'Employee__c');
            
            es.Proficiency_Level__c = proficiency;
            es.Years_Experience__c = experience;
            es.Certified__c = certified;
            
            SecurityUtil.checkUpdate(Employee_Skill__c.SObjectType, new List<Schema.SObjectField>{
                Employee_Skill__c.Proficiency_Level__c,
                Employee_Skill__c.Years_Experience__c,
                Employee_Skill__c.Certified__c
            });
            
            update es;
            return es;
        } catch (Exception ex) {
            Database.rollback(sp);
            throw new ProfileServiceException(ex.getMessage());
        }
    }

    /**
     * Updates user profile fields in system mode.
     */
    public static void updateUserProfile(Id userId, String email, String phone, String city, String state) {
        try {
            User u = new User(
                Id = userId,
                Email = email,
                Phone = phone,
                City = city
            );
            update u;
        } catch (Exception ex) {
            throw new ProfileServiceException(ex.getMessage());
        }
    }

    /**
     * Updates user settings fields in system mode.
     */
    public static void updateUserSettings(Id userId, String timezone, String locale, Decimal weeklyHoursTarget, String notificationPreferences) {
        try {
            User u = new User(
                Id = userId,
                TimeZoneSidKey = timezone,
                LocaleSidKey = locale,
                Weekly_Hours_Target__c = weeklyHoursTarget,
                Notification_Preferences__c = notificationPreferences
            );
            update u;
        } catch (Exception ex) {
            throw new ProfileServiceException(ex.getMessage());
        }
    }
}