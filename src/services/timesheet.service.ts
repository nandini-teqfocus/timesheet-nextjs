import { callSalesforceRestApi } from '@/lib/salesforce-client';
import { ServiceResponse } from '@/types/common.types';
import { TimesheetData, TimesheetEntry } from '@/types/timesheet.types';

/**
 * Payload contract for saving or updating a single daily time entry.
 */
export interface SaveTimeEntryInput {
  id?: string;
  timesheetId?: string;
  projectId: string;
  entryDate: string; // YYYY-MM-DD
  hours: number;
  category?: string;
  description?: string;
  isBillable: boolean;
}

/**
 * Interface representing an active project for dropdown selection.
 */
export interface ActiveProject {
  id: string;
  name: string;
  projectCode?: string;
  status?: string;
  budgetHours?: number;
}

/**
 * Interface for SOQL Query Record Response from Salesforce REST API.
 */
interface SalesforceQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

interface SalesforceProjectRecord {
  Id: string;
  Name: string;
  Project_Code__c?: string;
  Status__c?: string;
  Budget_Hours__c?: number;
}

/**
 * Safely parses the data payload from a Salesforce ServiceResponse envelope.
 * Handles both direct `data` objects and serialized `dataJson` strings.
 */
function parseServiceData<T>(res: ServiceResponse<T>): T | null {
  if (res.data !== undefined && res.data !== null) {
    return res.data;
  }
  if (res.dataJson && typeof res.dataJson === 'string') {
    try {
      return JSON.parse(res.dataJson) as T;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Normalizes a raw TimesheetEntryWrapper object returned from Apex into a clean TimesheetEntry type.
 */
function normalizeEntry(raw: Record<string, unknown>): TimesheetEntry {
  return {
    id: String(raw.id || raw.Id || ''),
    entryDate: String(raw.entryDate || raw.dateStr || raw.Entry_Date__c || ''),
    dateStr: String(raw.dateStr || raw.entryDate || raw.Entry_Date__c || ''),
    hours: typeof raw.hours === 'number' ? raw.hours : Number(raw.Hours__c || 0),
    projectId: raw.projectId ? String(raw.projectId) : raw.Project__c ? String(raw.Project__c) : undefined,
    projectName: raw.projectName ? String(raw.projectName) : undefined,
    projectCode: raw.projectCode ? String(raw.projectCode) : undefined,
    category: raw.category ? String(raw.category) : raw.Category__c ? String(raw.Category__c) : 'Development',
    description: raw.description ? String(raw.description) : raw.Description__c ? String(raw.Description__c) : '',
    isBillable: typeof raw.isBillable === 'boolean' ? raw.isBillable : Boolean(raw.Is_Billable__c),
  };
}

export class TimesheetService {
  /**
   * 1. GET WEEKLY TIMESHEET DATA
   * Fetches weekly timesheet summary and granular entries from Salesforce Apex REST API,
   * parsing serialized `dataJson` payloads and normalizing them into a unified TimesheetData object.
   */
  public static async getTimesheetData(
    weekStart: string,
    accessToken?: string,
    instanceUrl?: string,
  ): Promise<ServiceResponse<TimesheetData>> {
    const summaryEndpoint = `/services/apexrest/v1/timesheets?weekStart=${encodeURIComponent(weekStart)}`;
    const summaryRes = await callSalesforceRestApi<TimesheetData>(summaryEndpoint, {
      method: 'GET',
      accessToken,
      instanceUrl,
      next: { revalidate: 0 },
    });

    if (!summaryRes.success) {
      return summaryRes;
    }

    const timesheet = parseServiceData<TimesheetData>(summaryRes);

    if (!timesheet) {
      return {
        success: true,
        message: 'No timesheet found for the selected week',
        data: null,
      };
    }

    const timesheetId = timesheet.id || timesheet.timesheetId;
    let entries: TimesheetEntry[] = [];

    if (timesheetId) {
      const entriesEndpoint = `/services/apexrest/v1/timesheets/entries?timesheetId=${encodeURIComponent(timesheetId)}`;
      const entriesRes = await callSalesforceRestApi<Record<string, unknown>[]>(entriesEndpoint, {
        method: 'GET',
        accessToken,
        instanceUrl,
        next: { revalidate: 0 },
      });

      if (entriesRes.success) {
        const rawEntries = parseServiceData<Record<string, unknown>[]>(entriesRes);
        if (Array.isArray(rawEntries)) {
          entries = rawEntries.map((e) => normalizeEntry(e));
        }
      }
    }

    const normalizedData: TimesheetData = {
      id: timesheetId,
      timesheetId: timesheetId,
      status: timesheet.status || 'Draft',
      weekStart: timesheet.weekStart || weekStart,
      weekStartDate: timesheet.weekStart || weekStart,
      weekEnd: timesheet.weekEnd,
      weekEndDate: timesheet.weekEnd,
      totalHours: timesheet.totalHours ?? 0,
      billableHours: timesheet.billableHours ?? 0,
      notes: timesheet.notes || '',
      employeeName: timesheet.employeeName,
      entries: entries,
    };

    return {
      success: true,
      message: 'Timesheet data retrieved successfully',
      data: normalizedData,
    };
  }

  /**
   * 2. SAVE OR UPDATE TIME ENTRY
   * Sends time entry details to `POST /services/apexrest/v1/timesheets`.
   * Maps input fields into SObject field names expected by Apex `SaveEntryRequest`.
   */
  public static async saveTimeEntry(
    input: SaveTimeEntryInput,
    weekStart: string,
    weekEnd: string,
    accessToken?: string,
    instanceUrl?: string,
  ): Promise<ServiceResponse<TimesheetEntry>> {
    const endpoint = '/services/apexrest/v1/timesheets';

    const payload = {
      entry: {
        ...(input.id ? { Id: input.id } : {}),
        ...(input.timesheetId ? { Timesheet__c: input.timesheetId } : {}),
        Project__c: input.projectId,
        Entry_Date__c: input.entryDate,
        Hours__c: input.hours,
        Category__c: input.category || 'Development',
        Description__c: input.description || '',
        Is_Billable__c: input.isBillable,
      },
      weekStart: weekStart,
      weekEnd: weekEnd,
    };

    const res = await callSalesforceRestApi<Record<string, unknown>>(endpoint, {
      method: 'POST',
      accessToken,
      instanceUrl,
      body: JSON.stringify(payload),
    });

    if (!res.success) {
      return {
        success: false,
        message: res.message || 'Failed to save time entry',
        data: null,
        errorCode: res.errorCode || 'SAVE_ENTRY_FAILED',
      };
    }

    const rawSaved = parseServiceData<Record<string, unknown>>(res);

    if (!rawSaved) {
      return {
        success: false,
        message: 'Saved entry response was empty',
        data: null,
        errorCode: 'EMPTY_RESPONSE',
      };
    }

    return {
      success: true,
      message: res.message || 'Time entry saved successfully',
      data: normalizeEntry(rawSaved),
    };
  }

  /**
   * 3. SUBMIT TIMESHEET FOR MANAGER APPROVAL
   * Submits a weekly timesheet via `POST /services/apexrest/v1/timesheets/submit`.
   */
  public static async submitTimesheet(
    timesheetId: string,
    accessToken?: string,
    instanceUrl?: string,
  ): Promise<ServiceResponse<null>> {
    if (!timesheetId) {
      return {
        success: false,
        message: 'Timesheet ID is required for submission',
        data: null,
        errorCode: 'MISSING_TIMESHEET_ID',
      };
    }

    const endpoint = '/services/apexrest/v1/timesheets/submit';
    const payload = { timesheetId };

    const res = await callSalesforceRestApi<null>(endpoint, {
      method: 'POST',
      accessToken,
      instanceUrl,
      body: JSON.stringify(payload),
    });

    return {
      success: res.success,
      message: res.message || (res.success ? 'Timesheet submitted successfully for approval' : 'Failed to submit timesheet'),
      data: null,
      errorCode: res.errorCode,
    };
  }

  /**
   * 4. DELETE TIME ENTRY
   * Deletes a specific time entry via `DELETE /services/apexrest/v1/timesheets/{entryId}`.
   */
  public static async deleteTimeEntry(
    entryId: string,
    accessToken?: string,
    instanceUrl?: string,
  ): Promise<ServiceResponse<null>> {
    if (!entryId) {
      return {
        success: false,
        message: 'Entry ID is required for deletion',
        data: null,
        errorCode: 'MISSING_ENTRY_ID',
      };
    }

    const endpoint = `/services/apexrest/v1/timesheets/${encodeURIComponent(entryId)}`;

    const res = await callSalesforceRestApi<null>(endpoint, {
      method: 'DELETE',
      accessToken,
      instanceUrl,
    });

    return {
      success: res.success,
      message: res.message || (res.success ? 'Time entry deleted successfully' : 'Failed to delete time entry'),
      data: null,
      errorCode: res.errorCode,
    };
  }

  /**
   * 5. FETCH ACTIVE PROJECTS FOR SELECTION DROPDOWN
   * Queries active projects from Salesforce via standard REST Query API.
   */
  public static async getActiveProjects(
    accessToken?: string,
    instanceUrl?: string,
  ): Promise<ServiceResponse<ActiveProject[]>> {
    const soql = "SELECT Id, Name, Project_Code__c, Status__c, Budget_Hours__c FROM Project__c WHERE Status__c = 'Active' ORDER BY Name ASC";
    const endpoint = `/services/data/v67.0/query?q=${encodeURIComponent(soql)}`;

    const res = await callSalesforceRestApi<SalesforceQueryResult<SalesforceProjectRecord>>(endpoint, {
      method: 'GET',
      accessToken,
      instanceUrl,
      next: { revalidate: 300 }, // Cache active projects for 5 minutes
    });

    if (!res.success) {
      return {
        success: false,
        message: res.message || 'Failed to fetch active projects',
        data: null,
        errorCode: res.errorCode || 'FETCH_PROJECTS_FAILED',
      };
    }

    const queryResult = parseServiceData<SalesforceQueryResult<SalesforceProjectRecord>>(res);
    const records = queryResult?.records || [];

    const projects: ActiveProject[] = records.map((p) => ({
      id: p.Id,
      name: p.Name,
      projectCode: p.Project_Code__c || '',
      status: p.Status__c || 'Active',
      budgetHours: p.Budget_Hours__c || 0,
    }));

    return {
      success: true,
      message: 'Active projects retrieved successfully',
      data: projects,
    };
  }
}

