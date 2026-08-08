export interface ServiceResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  dataJson?: string | null;
  errorCode?: string;
}
