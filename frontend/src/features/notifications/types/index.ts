export interface NotificationTag {
  id: string;
  name: string;
  color?: string | null;
}

export interface DueAlertItem {
  notificationId: string;
  accountType: 'PAYABLE' | 'RECEIVABLE';
  installmentId: string;
  accountId: string;
  counterpartyName: string;
  categoryName: string | null;
  tags: NotificationTag[];
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
  pendingAmount: number;
  amount: number;
  paidAmount: number | null;
  receivedAmount: number | null;
  installmentNumber: number;
  totalInstallments: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
}

export interface DueAlertsResponse {
  data: DueAlertItem[];
  total: number;
  settings: {
    notificationLeadDays: number;
    notificationPollingSeconds: number;
    showOverdueNotifications: boolean;
  };
}

export interface OrganizationNotificationSettings {
  id: string;
  name: string;
  notificationLeadDays: number;
  notificationPollingSeconds: number;
  showOverdueNotifications: boolean;
}
