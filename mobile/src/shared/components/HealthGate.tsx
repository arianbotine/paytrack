import React from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useHealthCheck, ServicesHealth } from '../../lib/use-health-check';

const TIMEOUT_SECONDS = 180;

interface ServiceRowProps {
  label: string;
  status: string | undefined;
}

function ServiceRow({ label, status }: ServiceRowProps) {
  const isOk = status === 'ok';
  return (
    <View className="flex-row items-center mb-2">
      <MaterialCommunityIcons
        name={isOk ? 'check-circle' : 'clock-outline'}
        size={18}
        color={isOk ? '#22c55e' : '#d97706'}
      />
      <Text variant="body" className="ml-2 text-neutral-700 flex-1">
        {label}:{' '}
        <Text
          variant="body"
          weight="semibold"
          className={isOk ? 'text-success-700' : 'text-amber-700'}
        >
          {isOk ? 'online' : 'iniciando'}
        </Text>
      </Text>
    </View>
  );
}

interface ServicesStatusProps {
  services: ServicesHealth | null;
}

function ServicesStatus({ services }: ServicesStatusProps) {
  if (!services) return null;
  return (
    <View className="bg-white border border-neutral-200 rounded-xl px-4 py-3 mb-4 w-full">
      <ServiceRow label="BFF" status={services.bff?.status} />
      <ServiceRow label="Backend" status={services.backend?.status} />
    </View>
  );
}

export function HealthGate({ children }: { children: React.ReactNode }) {
  const { status, elapsedSeconds, services, retry } = useHealthCheck();
  const insets = useSafeAreaInsets();

  if (status === 'healthy') {
    return <>{children}</>;
  }

  const progressPercent = Math.min(
    (elapsedSeconds / TIMEOUT_SECONDS) * 100,
    100
  );
  const remaining = Math.max(TIMEOUT_SECONDS - elapsedSeconds, 0);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const remainingLabel = `${mins}:${String(secs).padStart(2, '0')}`;

  if (status === 'timeout') {
    return (
      <View
        className="flex-1 bg-neutral-100 items-center justify-center px-6"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View className="bg-danger-50 border border-danger-100 rounded-2xl p-6 w-full items-center mb-6">
          <MaterialCommunityIcons
            name="server-off"
            size={48}
            color="#dc2626"
            style={{ marginBottom: 12 }}
          />
          <Text
            variant="subheading"
            weight="bold"
            className="text-danger-700 text-center mb-2"
          >
            Serviço indisponível
          </Text>
          <Text variant="body" className="text-danger-600 text-center">
            Não foi possível conectar ao servidor em 3 minutos. Verifique sua
            conexão e tente novamente.
          </Text>
        </View>

        <ServicesStatus services={services} />

        <TouchableOpacity
          onPress={retry}
          className="bg-primary-700 rounded-xl px-6 py-3 flex-row items-center"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text variant="body" weight="semibold" className="text-white">
            Tentar novamente
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // status === 'checking'
  return (
    <View
      className="flex-1 bg-neutral-100 items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-4">
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
        <Text
          variant="subheading"
          weight="bold"
          className="text-neutral-900 text-center mb-1"
        >
          Iniciando serviços
        </Text>
        <Text variant="body" className="text-neutral-500 text-center">
          O servidor está acordando após inatividade.{'\n'}Por favor, aguarde...
        </Text>
      </View>

      <ServicesStatus services={services} />

      {/* Progress bar */}
      <View className="w-full bg-neutral-200 rounded-full h-2 mb-2">
        <View
          className="bg-primary-500 h-2 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </View>
      <Text variant="caption" className="text-neutral-400 mb-6">
        Tempo restante: {remainingLabel}
      </Text>

      <Text variant="caption" className="text-neutral-400 text-center">
        Este processo pode levar até 1–2 minutos no primeiro acesso do dia.
      </Text>
    </View>
  );
}
