export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  component?: string;
  routeUrl: string;
  displayOrder?: number;
  requiredPermission?: string;
}
