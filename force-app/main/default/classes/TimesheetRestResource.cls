@RestResource(urlMapping='/v1/timesheets/*')
global with sharing class TimesheetRestResource {

    @HttpGet
    global static void handleGet() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String requestURI = req.requestURI;
            String weekStartParam = req.params.get('weekStart');
            String timesheetIdParam = req.params.get('timesheetId');

            if (requestURI.endsWith('/recent')) {
                List<TimesheetWrappers.TimesheetEntryWrapper> recent = TimesheetController.getRecentActivities();
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Recent activities retrieved', recent)));
                return;
            }

            if (String.isNotBlank(weekStartParam)) {
                Date weekStart = Date.valueOf(weekStartParam);
                TimesheetWrappers.TimesheetWrapper tsData = TimesheetController.getTimesheetData(weekStart);
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Timesheet retrieved', tsData)));
                return;
            }

            if (String.isNotBlank(timesheetIdParam)) {
                List<TimesheetWrappers.TimesheetEntryWrapper> entries = TimesheetController.getTimesheetEntries((Id)timesheetIdParam);
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Timesheet entries retrieved', entries)));
                return;
            }

            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail('Missing query parameter: weekStart or timesheetId')));

        } catch (Exception ex) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail(ex.getMessage())));
        }
    }

    @HttpPost
    global static void handlePost() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String requestURI = req.requestURI;
            String requestBody = req.requestBody != null ? req.requestBody.toString() : '';

            if (String.isBlank(requestBody)) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail('Request body cannot be empty')));
                return;
            }

            if (requestURI.endsWith('/submit')) {
                Map<String, Object> payload = (Map<String, Object>) JSON.deserializeUntyped(requestBody);
                String timesheetId = (String) payload.get('timesheetId');
                if (String.isBlank(timesheetId)) {
                    res.statusCode = 400;
                    res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail('timesheetId is required for submission')));
                    return;
                }
                TimesheetService.submitTimesheet((Id)timesheetId);
                res.statusCode = 200;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Timesheet submitted successfully for approval', null)));
                return;
            }

            // Save Entry workflow
            SaveEntryRequest request = (SaveEntryRequest) JSON.deserialize(requestBody, SaveEntryRequest.class);
            if (request == null || request.entry == null || request.weekStart == null || request.weekEnd == null) {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail('entry, weekStart, and weekEnd are required')));
                return;
            }

            TimesheetWrappers.TimesheetEntryWrapper savedEntry = TimesheetController.saveTimeEntry(request.entry, request.weekStart, request.weekEnd);
            res.statusCode = 201;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Time entry saved successfully', savedEntry)));

        } catch (TimesheetService.ServiceException ex) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail(ex.getMessage())));
        } catch (Exception ex) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail(ex.getMessage())));
        }
    }

    @HttpDelete
    global static void handleDelete() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        res.addHeader('Content-Type', 'application/json');

        try {
            String requestURI = req.requestURI;
            String entryId = requestURI.substring(requestURI.lastIndexOf('/') + 1);

            if (String.isBlank(entryId) || entryId == 'timesheets') {
                res.statusCode = 400;
                res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail('entryId is required in path for deletion')));
                return;
            }

            TimesheetService.deleteEntry((Id)entryId);
            res.statusCode = 200;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.ok('Time entry deleted successfully', null)));

        } catch (TimesheetService.ServiceException ex) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail(ex.getMessage())));
        } catch (Exception ex) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf(JSON.serialize(ServiceResponse.fail(ex.getMessage())));
        }
    }

    public class SaveEntryRequest {
        public Timesheet_Entry__c entry;
        public Date weekStart;
        public Date weekEnd;
    }
}