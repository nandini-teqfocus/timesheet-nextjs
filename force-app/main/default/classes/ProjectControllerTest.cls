@isTest
private class ProjectControllerTest {

    @isTest
    static void testGetActiveProjects() {
        Project__c activeProj = new Project__c(
            Name = 'Project Alpha',
            Project_Code__c = 'ALPHA',
            Status__c = 'Active',
            Budget_Hours__c = 500
        );
        Project__c completedProj = new Project__c(
            Name = 'Project Beta',
            Project_Code__c = 'BETA',
            Status__c = 'Completed',
            Budget_Hours__c = 200
        );
        insert new List<Project__c>{activeProj, completedProj};

        List<Project__c> activeProjects = ProjectController.getActiveProjects();
        Assert.areEqual(1, activeProjects.size(), 'Only 1 active project should be queried.');
        Assert.areEqual('Project Alpha', activeProjects[0].Name, 'Active project name is incorrect.');
    }
}