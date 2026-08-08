public with sharing class ServiceResponse {
    @AuraEnabled public Boolean success;
    @AuraEnabled public String message;
    @AuraEnabled public String dataJson;

    public ServiceResponse() {
    }

    public ServiceResponse(Boolean success, String message, Object data) {
        this.success = success;
        this.message = message;
        this.dataJson = data == null ? null : JSON.serialize(data);
    }

    public static ServiceResponse ok(Object data) {
        return new ServiceResponse(true, null, data);
    }

    public static ServiceResponse ok(String message, Object data) {
        return new ServiceResponse(true, message, data);
    }

    public static ServiceResponse fail(String message) {
        return new ServiceResponse(false, message, null);
    }
}