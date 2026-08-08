export interface TimesheetEntry {
  id: string;
  entryDate?: string;
  dateStr?: string;
  hours: number;
  projectId?: string;
  projectName?: string;
  projectCode?: string;
  category?: string;
  description?: string;
  isBillable: boolean;
}

export interface TimesheetData {
  id?: string;
  timesheetId?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | string;
  weekStart?: string;
  weekStartDate?: string;
  weekEnd?: string;
  weekEndDate?: string;
  totalHours: number;
  billableHours: number;
  employeeName?: string;
  notes?: string;
  entries: TimesheetEntry[];
}
