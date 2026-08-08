@isTest
private class ProfileControllerTest {

    @testSetup
    static void setup() {
        // Run as current user to avoid Mixed DML when creating setup and non-setup records
        User thisUser = new User(Id = UserInfo.getUserId());
        System.runAs(thisUser) {
            Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
            
            User testUser = new User(
                FirstName = 'Profile',
                LastName = 'Tester',
                Email = 'profile.tester@testtimesheet.com',
                Username = 'profile.tester.' + DateTime.now().getTime() + '@testtimesheet.com',
                Alias = 'ptester',
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

        Skill__c skillA = new Skill__c(Name = 'Apex Coding', Category__c = 'Technical');
        Skill__c skillB = new Skill__c(Name = 'Scrum Mastery', Category__c = 'Domain');
        insert new List<Skill__c>{skillA, skillB};
    }

    @isTest
    static void testUserProfileAndSkillsActions() {
        User testUser = [SELECT Id FROM User WHERE Email = 'profile.tester@testtimesheet.com' LIMIT 1];
        Skill__c skillA = [SELECT Id FROM Skill__c WHERE Name = 'Apex Coding' LIMIT 1];

        System.runAs(testUser) {
            // 1. Get initial profile details
            TimesheetWrappers.UserProfileWrapper profile = ProfileController.getUserProfile();
            Assert.areEqual(testUser.Id, profile.id, 'Profile user ID is incorrect.');
            Assert.areEqual(0.0, profile.totalHours, 'Initial total hours should be 0.');

            // 2. Validate skill catalog size
            List<Skill__c> catalog = ProfileController.getSkillsCatalog();
            Assert.areEqual(2, catalog.size(), 'Catalog size should be 2.');

            // 3. Add skill to profile
            TimesheetWrappers.EmployeeSkillWrapper mappedSkill = ProfileController.addSkillToProfile(
                skillA.Id, 'Expert', 5.0, true
            );
            Assert.areNotEqual(null, mappedSkill.id, 'Skill should map successfully.');
            Assert.areEqual('Apex Coding', mappedSkill.name, 'Skill name should populate in DTO.');

            // 4. Retrieve employee skills
            List<TimesheetWrappers.EmployeeSkillWrapper> skills = ProfileController.getUserSkills();
            Assert.areEqual(1, skills.size(), 'There should be 1 mapped skill.');

            // 5. Test duplicate addition prevention
            Boolean threwError = false;
            try {
                ProfileController.addSkillToProfile(skillA.Id, 'Beginner', 1.0, false);
            } catch (Exception ex) {
                threwError = true;
            }
            Assert.isTrue(threwError, 'Adding a duplicate skill should raise an exception.');

            // 6. Delete mapped skill
            ProfileController.removeSkillFromProfile(mappedSkill.id);
            skills = ProfileController.getUserSkills();
            Assert.areEqual(0, skills.size(), 'Skills list should be empty after deletion.');

            // 7. Test updating dynamic skills
            TimesheetWrappers.EmployeeSkillWrapper mappedSkill2 = ProfileController.addSkillToProfile(
                skillA.Id, 'Beginner', 1.0, false
            );
            TimesheetWrappers.EmployeeSkillWrapper updatedSkill = ProfileController.updateSkillInProfile(
                mappedSkill2.id, 'Expert', 4.5, true
            );
            Assert.areEqual('Expert', updatedSkill.proficiencyLevel, 'Skill proficiency should be updated.');
            Assert.areEqual(4.5, updatedSkill.yearsExperience, 'Experience should be updated.');
            Assert.isTrue(updatedSkill.certified, 'Certification status should be updated.');

            // 8. Test updating user profile & settings
            try {
                ProfileController.updateUserProfile('tester@test.com', '9876543210', 'San Jose', 'CA');
                ProfileController.updateUserSettings('GMT', 'en_US', 35.0, 'Email Only');
            } catch (Exception ex) {
                Assert.fail('FAILED UPDATE USER OR SETTINGS. Message: ' + ex.getMessage() + '\nStack: ' + ex.getStackTraceString());
            }
        }
    }

    @isTest
    static void testProfileControllerExceptions() {
        try {
            ProfileController.addSkillToProfile(null, null, null, null);
            Assert.fail('Expected AuraHandledException');
        } catch (AuraHandledException expected) {
            Assert.isNotNull(expected.getMessage());
        }

        try {
            ProfileController.removeSkillFromProfile(null);
            Assert.fail('Expected AuraHandledException');
        } catch (AuraHandledException expected) {
            Assert.isNotNull(expected.getMessage());
        }

        try {
            ProfileController.updateSkillInProfile(null, null, null, null);
            Assert.fail('Expected AuraHandledException');
        } catch (AuraHandledException expected) {
            Assert.isNotNull(expected.getMessage());
        }

        try {
            ProfileController.updateUserProfile(null, null, null, null);
            Assert.fail('Expected AuraHandledException');
        } catch (AuraHandledException expected) {
            Assert.isNotNull(expected.getMessage());
        }

        try {
            ProfileController.updateUserSettings(null, null, null, null);
            Assert.fail('Expected AuraHandledException');
        } catch (AuraHandledException expected) {
            Assert.isNotNull(expected.getMessage());
        }
    }
}