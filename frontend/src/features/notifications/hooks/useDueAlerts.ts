import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/authStore';
import type {
  DueAlertItem,
  DueAlertsResponse,
  OrganizationNotificationSettings,
} from '../types';

const DEFAULT_POLLING_SECONDS = 60;

export const dueAlertsKeys = {
  all: ['notifications'] as const,
  dueAlerts: (organizationId?: string) =>
    ['notifications', 'due-alerts', organizationId] as const,
  organizationSettings: (organizationId?: string) =>
    ['organization', 'settings', organizationId] as const,
};

export function useOrganizationNotificationSettings() {
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );

  return useQuery({
    queryKey: dueAlertsKeys.organizationSettings(organizationId),
    queryFn: async (): Promise<OrganizationNotificationSettings> => {
      const response = await api.get('/organization');
      return response.data;
    },
    enabled: Boolean(organizationId),
  });
}

export function useDueAlerts(limit = 50) {
  const organizationId = useAuthStore(
    state => state.user?.currentOrganization?.id
  );
  const { data: organizationSettings } = useOrganizationNotificationSettings();

  const query = useQuery({
    queryKey: dueAlertsKeys.dueAlerts(organizationId),
    queryFn: async (): Promise<DueAlertsResponse> => {
      const response = await api.get('/notifications/due-alerts', {
        params: { limit },
      });
      return response.data;
    },
    enabled: Boolean(organizationId),
    refetchOnWindowFocus: true,
    refetchInterval: () => {
      const polling =
        organizationSettings?.notificationPollingSeconds ||
        DEFAULT_POLLING_SECONDS;
      return polling * 1000;
    },
  });

  const deduplicated = useMemo(() => {
    const map = new Map<string, DueAlertItem>();
    (query.data?.data || []).forEach(item => {
      if (!map.has(item.notificationId)) {
        map.set(item.notificationId, item);
      }
    });

    return Array.from(map.values());
  }, [query.data?.data]);

  return {
    ...query,
    data: deduplicated,
    total: deduplicated.length,
    settings: query.data?.settings,
  };
}
