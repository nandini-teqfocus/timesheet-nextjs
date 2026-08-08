@RestResource(urlMapping='/v1/manager/*')
global with sharing class ManagerRestResource {

    @HttpGet
    global static void handleGet() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String requestURI = req.requestURI;
            String employeeId = req.params.get('employeeId');
            String timesheetId = req.params.get('timesheetId');

            if (requestURI.endsWith('/dashboard')) {
                TimesheetManagerController.ManagerStatsWrapper stats = TimesheetManagerController.getManagerDashboardStats();
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Manager dashboard statistics retrieved', stats)));
                return;
            }

            if (requestURI.endsWith('/subordinates')) {
                List<TimesheetManagerController.SubordinateEmployeeWrapper> subordinates = TimesheetManagerController.getSubordinateEmployees();
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Subordinate employees retrieved', subordinates)));
                return;
            }

            if (requestURI.endsWith('/activities')) {
                List<TimesheetManagerController.TeamActivityWrapper> activities = TimesheetManagerController.getTeamActivities();
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Team activities retrieved', activities)));
                return;
            }

            if (String.isNotBlank(employeeId) || requestURI.endsWith('/timesheets')) {
                if (String.isBlank(employeeId)) {
                    res.statusCode = 400;
                    res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail('employeeId query parameter is required')));
                    return;
                }
                List<TimesheetManagerController.TimesheetStatsWrapper> timesheets = TimesheetManagerController.getEmployeeTimesheets((Id)employeeId);
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Employee timesheets retrieved', timesheets)));
                return;
            }

            if (String.isNotBlank(timesheetId) || requestURI.endsWith('/entries')) {
                if (String.isBlank(timesheetId)) {
                    res.statusCode = 400;
                    res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail('timesheetId query parameter is required')));
                    return;
                }
                List<TimesheetWrappers.TimesheetEntryWrapper> entries = TimesheetManagerController.getManagerTimesheetEntries((Id)timesheetId);
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Timesheet entries retrieved', entries)));
                return;
            }

            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail('Invalid Manager REST API endpoint')));

        } catch (AuraHandledException ex) {
            String msg = ex.getMessage();
            if (msg.contains('Access Denied')) {
                res.statusCode = 403;
            } else {
                res.statusCode = 400;
            }
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail(msg)));
        } catch (Exception ex) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail(ex.getMessage())));
        }
    }
}