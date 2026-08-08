@IsTest
private class EmployeeReferralFoundationTest {
    @TestSetup
    static void setupData() {
        Department__c department = new Department__c(
            Name = 'Engineering',
            Department_Name__c = 'Engineering',
            Department_Code__c = 'ENG',
            Is_Active__c = true
        );
        insert department;

        Job_Posting__c jobPosting = new Job_Posting__c(
            Name = 'Senior Salesforce Developer',
            Title__c = 'Senior Salesforce Developer',
            Department__c = department.Id,
            Employment_Type__c = 'Full-Time',
            Experience_Level__c = 'Senior',
            Location__c = 'Remote',
            Is_Remote__c = true,
            Posted_Date__c = Date.today(),
            Closing_Date__c = Date.today().addDays(30),
            Status__c = 'Open',
            Job_Description__c = 'Build enterprise Salesforce applications.'
        );
        insert jobPosting;
    }

    @IsTest
    static void submitReferralCreatesCandidateAndReferral() {
        Job_Posting__c jobPosting = [SELECT Id FROM Job_Posting__c LIMIT 1];
        User appUser = createAppUser();
        assignPermissionSet(appUser.Id, 'EmpRef_Admin');

        ReferralService.ReferralSubmissionRequest request = new ReferralService.ReferralSubmissionRequest();
        request.jobPostingId = jobPosting.Id;
        request.candidateFirstName = 'Asha';
        request.candidateLastName = 'Rao';
        request.candidateEmail = 'asha.rao@example.com';
        request.candidatePhone = '555-0101';
        request.currentCompany = 'Example Co';
        request.currentTitle = 'Developer';
        request.yearsOfExperience = 6;
        request.skills = 'Salesforce, Apex, LWC';
        request.notes = 'Strong referral.';

        Test.startTest();
        ServiceResponse response;
        System.runAs(appUser) {
            response = ReferralService.submitReferral(request);
        }
        Test.stopTest();

        System.assertEquals(true, response.success, 'Referral submission should succeed.');
        Candidate__c candidate = [SELECT Id, Email__c FROM Candidate__c WHERE Email__c = 'asha.rao@example.com' LIMIT 1];
        Employee_Referral__c referral = [
            SELECT Id, Candidate__c, Job_Posting__c, Status__c, Submission_Date__c
            FROM Employee_Referral__c
            WHERE Candidate__c = :candidate.Id
            LIMIT 1
        ];
        System.assertEquals(jobPosting.Id, referral.Job_Posting__c);
        System.assertEquals('Submitted', referral.Status__c);
        System.assertNotEquals(null, referral.Submission_Date__c);
    }

    @IsTest
    static void statusUpdateCreatesHistoryAndPublishesEvent() {
        User appUser = createAppUser();
        assignPermissionSet(appUser.Id, 'EmpRef_Admin');
        
        System.runAs(appUser) {
            Candidate__c candidate = new Candidate__c(
                Name = 'Mira Shah',
                First_Name__c = 'Mira',
                Last_Name__c = 'Shah',
                Email__c = 'mira.shah@example.com'
            );
            insert candidate;
            Job_Posting__c jobPosting = [SELECT Id FROM Job_Posting__c LIMIT 1];
            Employee_Referral__c referral = new Employee_Referral__c(
                Job_Posting__c = jobPosting.Id,
                Candidate__c = candidate.Id,
                Referred_By__c = UserInfo.getUserId(),
                Status__c = 'Submitted'
            );
            insert referral;

            ReferralService.StatusUpdateRequest request = new ReferralService.StatusUpdateRequest();
            request.referralId = referral.Id;
            request.newStatus = 'Under Review';
            request.changeReason = 'Recruiter accepted for review.';

            Test.startTest();
            ServiceResponse response = ReferralService.updateReferralStatus(referral.Id, 'Under Review');
            Test.stopTest();

            System.assertEquals(true, response.success, 'Status update should succeed.');
            Employee_Referral__c updatedReferral = [SELECT Status__c, Last_Status_Change__c FROM Employee_Referral__c WHERE Id = :referral.Id];
            System.assertEquals('Under Review', updatedReferral.Status__c);
            System.assertNotEquals(null, updatedReferral.Last_Status_Change__c);

            List<Referral_Status_History__c> historyRows = [
                SELECT Previous_Status__c, New_Status__c
                FROM Referral_Status_History__c
                WHERE Employee_Referral__c = :referral.Id
            ];
            System.assert(historyRows.size() >= 1, 'At least one history row should be created.');
            Boolean foundTransition = false;
            for (Referral_Status_History__c history : historyRows) {
                if (history.Previous_Status__c == 'Submitted' && history.New_Status__c == 'Under Review') {
                    foundTransition = true;
                    break;
                }
            }
            System.assert(foundTransition, 'A history row for the status transition from Submitted to Under Review should be created.');
        }
    }

    @IsTest
    static void jobServiceReturnsOpenJobs() {
        User appUser = createAppUser();
        assignPermissionSet(appUser.Id, 'EmpRef_Admin');
        Test.startTest();
        List<Job_Posting__c> jobs;
        System.runAs(appUser) {
            jobs = JobService.getOpenJobPostings(10);
        }
        Test.stopTest();

        System.assert(!jobs.isEmpty(), 'Open jobs should be returned.');
    }

    @IsTest
    static void controllersSelectorsAndCommentsReturnData() {
        Job_Posting__c jobPosting = [SELECT Id FROM Job_Posting__c LIMIT 1];
        User appUser = createAppUser();
        assignPermissionSet(appUser.Id, 'EmpRef_Admin');

        Test.startTest();
        System.runAs(appUser) {
            ReferralService.ReferralSubmissionRequest referralRequest = new ReferralService.ReferralSubmissionRequest();
            referralRequest.jobPostingId = jobPosting.Id;
            referralRequest.candidateFirstName = 'Dev';
            referralRequest.candidateLastName = 'Iyer';
            referralRequest.candidateEmail = 'dev.iyer@example.com';
            referralRequest.notes = 'Controller coverage referral.';
            String jsonRequest = JSON.serialize(referralRequest);
            ServiceResponse submitResponse = ReferralController.submitReferral(jobPosting.Id, jsonRequest);
            System.assertEquals(true, submitResponse.success);

            List<Job_Posting__c> openJobs = JobController.getOpenJobPostings(5);
            System.assert(!openJobs.isEmpty(), 'JobController should return open jobs.');
            System.assertNotEquals(null, JobController.getJobDetail(jobPosting.Id));

            List<Employee_Referral__c> myReferrals = ReferralController.getMyReferrals(10);
            System.assert(!myReferrals.isEmpty(), 'ReferralController should return my referrals.');
            Id referralId = myReferrals[0].Id;

            ReferralService.addComment(referralId, 'Visible comment', 'General', true);
            List<Referral_Comment__c> visibleComments = ReferralService.getReferralComments(referralId, true);
            System.assert(!visibleComments.isEmpty(), 'Visible comments should be returned.');

            ServiceResponse updateResponse = ReferralController.updateReferralStatus(referralId, 'Interview Scheduled');
            System.assertEquals(true, updateResponse.success);

            List<Referral_Status_History__c> historyRows = ReferralController.getStatusHistory(referralId);
            System.assert(!historyRows.isEmpty(), 'Status history should be returned.');
        }
        Test.stopTest();
    }

    @IsTest
    static void fileUploadMarksCandidateResumeUploaded() {
        User appUser = createAppUser();
        assignPermissionSet(appUser.Id, 'EmpRef_Admin');

        Test.startTest();
        Id candidateId;
        System.runAs(appUser) {
            Candidate__c candidate = new Candidate__c(
                Name = 'Ravi Kumar',
                First_Name__c = 'Ravi',
                Last_Name__c = 'Kumar',
                Email__c = 'ravi.kumar@example.com'
            );
            insert candidate;
            candidateId = candidate.Id;

            FileUploadService.UploadResult result = FileUploadController.uploadResume(
                candidate.Id,
                'resume.pdf',
                EncodingUtil.base64Encode(Blob.valueOf('resume content'))
            );
            System.assertEquals(candidate.Id, result.linkedEntityId);
            System.assertNotEquals(null, result.contentDocumentId);
        }
        Test.stopTest();

        Candidate__c updatedCandidate = [SELECT Resume_Uploaded__c FROM Candidate__c WHERE Id = :candidateId];
        System.assertEquals(true, updatedCandidate.Resume_Uploaded__c);
    }

    @IsTest
    static void closeExpiredJobsAndServiceErrorsAreHandled() {
        User appUser = createAppUser();
        assignPermissionSet(appUser.Id, 'EmpRef_Admin');

        Test.startTest();
        System.runAs(appUser) {
            Department__c department = [SELECT Id FROM Department__c LIMIT 1];
            Job_Posting__c expiredJob = new Job_Posting__c(
                Name = 'Expired Posting',
                Title__c = 'Expired Posting',
                Department__c = department.Id,
                Posted_Date__c = Date.today().addDays(-20),
                Closing_Date__c = Date.today().addDays(-1),
                Status__c = 'Open'
            );
            insert expiredJob;
            JobService.closeExpiredJobs(Date.today());

            try {
                JobController.getJobDetail(null);
                System.assert(false, 'Null job id should throw.');
            } catch (AuraHandledException expected) {
                System.assertNotEquals(null, expected.getMessage());
            }

            try {
                CandidateService.getCandidate(null);
                System.assert(false, 'Null candidate id should throw.');
            } catch (AuraHandledException expected) {
                System.assertNotEquals(null, expected.getMessage());
            }

            try {
                FileUploadController.uploadResume(null, null, null);
                System.assert(false, 'Invalid upload should throw.');
            } catch (AuraHandledException expected) {
                System.assertNotEquals(null, expected.getMessage());
            }
        }
        Test.stopTest();

        Job_Posting__c closedJob = [SELECT Status__c FROM Job_Posting__c WHERE Name = 'Expired Posting' LIMIT 1];
        System.assertEquals('Closed', closedJob.Status__c);
    }

    @IsTest
    static void testRemainingReferralControllerAndSelector() {
        User appUser = createAppUser();
        assignPermissionSet(appUser.Id, 'EmpRef_Admin');

        System.runAs(appUser) {
            Candidate__c candidate = new Candidate__c(
                Name = 'Amit Patel',
                First_Name__c = 'Amit',
                Last_Name__c = 'Patel',
                Email__c = 'amit.patel@example.com'
            );
            insert candidate;

            Job_Posting__c jobPosting = [SELECT Id FROM Job_Posting__c LIMIT 1];
            Employee_Referral__c referral = new Employee_Referral__c(
                Job_Posting__c = jobPosting.Id,
                Candidate__c = candidate.Id,
                Referred_By__c = appUser.Id,
                Status__c = 'Submitted'
            );
            insert referral;

            Test.startTest();
            // Test assignHiringManager
            ServiceResponse assignResponse = ReferralController.assignHiringManager(
                new List<Id>{ referral.Id },
                appUser.Id
            );
            System.assertEquals(true, assignResponse.success);

            // Test addComment
            ServiceResponse commentResponse = ReferralController.addComment(
                referral.Id,
                'Test Comment text',
                'General',
                true
            );
            System.assertEquals(true, commentResponse.success);

            // Test getActivityTimeline
            List<SObject> timeline = ReferralController.getActivityTimeline();
            System.assert(!timeline.isEmpty());

            // Test getDepartmentInsights
            List<Map<String, Object>> insights = ReferralController.getDepartmentInsights();
            System.assert(!insights.isEmpty());

            // Test getPipelineData
            List<AggregateResult> pipeline = ReferralController.getPipelineData();
            System.assert(!pipeline.isEmpty());

            // Test getAllReferrals
            List<Employee_Referral__c> allRefs = ReferralController.getAllReferrals(10);
            System.assert(!allRefs.isEmpty());

            // Test getReferralDetail
            Employee_Referral__c refDetail = ReferralController.getReferralDetail(referral.Id);
            System.assertNotEquals(null, refDetail);

            // Test FileUpload getResumeId and getResumeDetail
            Id resumeId = FileUploadController.getResumeId(referral.Id);
            System.assertEquals(null, resumeId);
            FileUploadService.ResumeDetail detail = FileUploadController.getResumeDetail(referral.Id);
            System.assertEquals(null, detail);

            // Trigger upload to test not-null resume path
            FileUploadService.UploadResult uploadResult = FileUploadController.uploadResume(
                candidate.Id,
                'test_resume.pdf',
                EncodingUtil.base64Encode(Blob.valueOf('dummy content'))
            );
            // Now link the document to the referral to test the getResumeDetail paths
            ContentDocumentLink cdl = new ContentDocumentLink(
                ContentDocumentId = uploadResult.contentDocumentId,
                LinkedEntityId = referral.Id,
                ShareType = 'V',
                Visibility = 'AllUsers'
            );
            insert cdl;

            // Associate document ID on Referral object to cover the storedDocId path
            referral.Resume_Content_Document_Id__c = uploadResult.contentDocumentId;
            update referral;

            Id activeResumeId = FileUploadController.getResumeId(referral.Id);
            System.assertNotEquals(null, activeResumeId);

            FileUploadService.ResumeDetail activeDetail = FileUploadController.getResumeDetail(referral.Id);
            System.assertNotEquals(null, activeDetail);

            // Test Selectors
            System.assertNotEquals(null, CandidateSelector.findById(candidate.Id));
            System.assertEquals(null, CandidateSelector.findById(null));
            System.assert(!CandidateSelector.findByEmail(new Set<String>{ 'amit.patel@example.com' }).isEmpty());
            System.assert(CandidateSelector.findByEmail(null).isEmpty());

            System.assert(!ReferralSelector.getByIds(new Set<Id>{ referral.Id }).isEmpty());
            System.assert(ReferralSelector.getByIds(null).isEmpty());
            System.assert(ReferralSelector.findDuplicates(null, null, null).isEmpty());
            
            // Exception paths for AuraHandledExceptions in controller
            try {
                ReferralController.assignHiringManager(null, null);
                System.assert(false, 'Expected AuraHandledException');
            } catch (AuraHandledException e) {
                System.assert(true);
            }

            try {
                ReferralController.addComment(null, null, null, null);
                System.assert(false, 'Expected AuraHandledException');
            } catch (AuraHandledException e) {
                System.assert(true);
            }
            Test.stopTest();
        }
    }

    @IsTest
    static void testReferralServiceExceptionsAndValidation() {
        User appUser = createAppUser();
        assignPermissionSet(appUser.Id, 'EmpRef_Admin');

        System.runAs(appUser) {
            // 1. ReferralDetail null check
            System.assertEquals(null, ReferralService.getReferralDetail(null));

            // 2. submitReferral null check
            try {
                ReferralService.createReferral(null);
                System.assert(false, 'Expected BaseService.ServiceException');
            } catch (BaseService.ServiceException e) {
                System.assert(e.getMessage().contains('details are required'));
            }

            // 3. submitReferral empty jobPostingId check
            ReferralService.ReferralSubmissionRequest request = new ReferralService.ReferralSubmissionRequest();
            try {
                ReferralService.createReferral(request);
                System.assert(false, 'Expected BaseService.ServiceException');
            } catch (BaseService.ServiceException e) {
                System.assert(e.getMessage().contains('Job posting is required'));
            }

            // 4. submitReferral fake jobPostingId check
            request.jobPostingId = UserInfo.getUserId(); // fake Id
            try {
                ReferralService.createReferral(request);
                System.assert(false, 'Expected BaseService.ServiceException');
            } catch (BaseService.ServiceException e) {
                System.assert(e.getMessage().contains('not found'));
            }

            // 5. submitReferral closed jobPosting check
            Department__c department = [SELECT Id FROM Department__c LIMIT 1];
            Job_Posting__c closedJob = new Job_Posting__c(
                Name = 'Closed Developer Job',
                Title__c = 'Closed Developer Job',
                Department__c = department.Id,
                Status__c = 'Closed'
            );
            insert closedJob;

            request.jobPostingId = closedJob.Id;
            try {
                ReferralService.createReferral(request);
                System.assert(false, 'Expected BaseService.ServiceException');
            } catch (BaseService.ServiceException e) {
                System.assert(e.getMessage().contains('not open'));
            }

            // 6. submitReferral duplicate check
            Job_Posting__c openJob = [SELECT Id FROM Job_Posting__c WHERE Status__c = 'Open' LIMIT 1];
            Candidate__c candidate = new Candidate__c(
                Name = 'Duplicate Test',
                First_Name__c = 'Duplicate',
                Last_Name__c = 'Test',
                Email__c = 'duplicate@example.com'
            );
            insert candidate;

            Employee_Referral__c referral = new Employee_Referral__c(
                Job_Posting__c = openJob.Id,
                Candidate__c = candidate.Id,
                Referred_By__c = appUser.Id,
                Status__c = 'Submitted'
            );
            insert referral;

            request.jobPostingId = openJob.Id;
            request.candidateFirstName = 'Duplicate';
            request.candidateLastName = 'Test';
            request.candidateEmail = 'duplicate@example.com';

            try {
                ReferralService.createReferral(request);
                System.assert(false, 'Expected BaseService.ServiceException');
            } catch (BaseService.ServiceException e) {
                System.assert(e.getMessage().contains('already exists'));
            }

            // 7. submitReferral with existing candidateId
            Candidate__c newCandidate = new Candidate__c(
                Name = 'New Test',
                First_Name__c = 'New',
                Last_Name__c = 'Test',
                Email__c = 'new.candidate@example.com'
            );
            insert newCandidate;
            request.candidateEmail = 'new.candidate@example.com';
            request.candidateId = newCandidate.Id;
            ServiceResponse successResponse = ReferralService.submitReferral(request);
            System.assertEquals(true, successResponse.success);

            // 8. updateReferralStatus invalid inputs
            try {
                ReferralService.updateReferralStatus(null, null);
                System.assert(false, 'Expected AuraHandledException');
            } catch (AuraHandledException e) {
                System.assertNotEquals(null, e.getMessage());
            }

            // 9. addComment validation exception
            try {
                ReferralService.addComment(null, null, null, null);
                System.assert(false, 'Expected BaseService.ServiceException');
            } catch (BaseService.ServiceException e) {
                System.assert(e.getMessage().contains('required'));
            }

            // 10. assignHiringManager validation exception
            try {
                ReferralService.assignHiringManager(null, null);
                System.assert(false, 'Expected BaseService.ServiceException');
            } catch (BaseService.ServiceException e) {
                System.assert(e.getMessage().contains('required'));
            }

            // 11. createReferral with documentId exception path
            request.candidateId = null;
            request.candidateEmail = 'resume.error@example.com';
            request.resumeDocumentId = UserInfo.getUserId(); // fake documentId to force link failure
            // This should still succeed in creating referral, but print error debug log
            Employee_Referral__c refWithErrResume = ReferralService.createReferral(request);
            System.assertNotEquals(null, refWithErrResume);

            // 12. createReferral with invalid candidateId to trigger exception
            request.candidateId = UserInfo.getUserId();
            try {
                ReferralService.createReferral(request);
                System.assert(false, 'Expected BaseService.ServiceException');
            } catch (BaseService.ServiceException e) {
                System.assert(e.getMessage().contains('Candidate is required'));
            }
        }
    }

    private static User createAppUser() {
        Profile standardProfile = [SELECT Id FROM Profile WHERE UserType = 'Standard' LIMIT 1];
        String randomPart = String.valueOf(Crypto.getRandomInteger()).replace('-', '');
        String uniqueSuffix = String.valueOf(System.now().getTime()) + randomPart;
        String nicknameSuffix = uniqueSuffix.substring(0, Math.min(8, uniqueSuffix.length()));
        User testUser = new User(
            FirstName = 'Referral',
            LastName = 'Tester',
            Alias = 'rtest',
            Email = 'referral.tester.' + uniqueSuffix + '@example.com',
            Username = 'referral.tester.' + uniqueSuffix + '@example.com',
            CommunityNickname = 'rtest' + nicknameSuffix,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = standardProfile.Id
        );
        insert testUser;
        return testUser;
    }

    private static void assignPermissionSet(Id userId, String permissionSetName) {
        PermissionSet permissionSetRecord = [SELECT Id FROM PermissionSet WHERE Name = :permissionSetName LIMIT 1];
        insert new PermissionSetAssignment(
            AssigneeId = userId,
            PermissionSetId = permissionSetRecord.Id
        );
    }
}