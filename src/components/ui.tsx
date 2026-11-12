import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NivelRisco } from '@/lib/api';
import { RISK } from '@/lib/risk';

interface ScreenProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Telas dentro de Stack já têm header nativo e não precisam do inset superior. */
  withHeader?: boolean;
}

/** Container padrão das telas: rolagem, "puxar para atualizar" e área segura. */
export function Screen({ children, title, subtitle, refreshing, onRefresh, withHeader }: ScreenProps) {
  return (
    <SafeAreaView edges={withHeader ? [] : ['top']} className="flex-1 bg-surface-secondary dark:bg-surface-dark-primary">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} colors={['#0284c7']} tintColor="#0284c7" />
          ) : undefined
        }>
        {title ? (
          <View className="pb-1 pt-3">
            <Text className="text-3xl font-bold text-slate-900 dark:text-white">{title}</Text>
            {subtitle ? <Text className="mt-1 text-base text-slate-500 dark:text-slate-400">{subtitle}</Text> : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl border border-line bg-surface-primary p-4 dark:border-line-dark dark:bg-surface-dark-secondary ${className}`}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </Text>
  );
}

export function RiskBadge({ nivel, size = 'md' }: { nivel: NivelRisco; size?: 'sm' | 'md' | 'lg' }) {
  const info = RISK[nivel];
  const sizes = { sm: 'px-2.5 py-0.5 text-[11px]', md: 'px-3 py-1 text-xs', lg: 'px-4 py-1.5 text-sm' };
  return (
    <View className={`self-start rounded-full ${info.badgeClass}`} accessibilityLabel={`Risco: ${info.label}`}>
      <Text className={`font-bold ${sizes[size]} ${info.textClass}`}>{info.display}</Text>
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'whatsapp';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
}

/** Botão com alvo de toque ≥ 48dp e feedback háptico. */
export function Button({ label, onPress, variant = 'primary', loading, disabled, icon }: ButtonProps) {
  const variants = {
    primary: 'bg-brand active:bg-brand-dark',
    secondary: 'border border-line bg-surface-primary active:bg-slate-100 dark:border-line-dark dark:bg-surface-dark-secondary',
    danger: 'bg-risk-emergencia active:bg-risk-emergencia-dark',
    whatsapp: 'bg-[#25D366] active:bg-[#1da851]',
  };
  const textColor = variant === 'secondary' ? 'text-slate-800 dark:text-slate-100' : 'text-white';
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-5 py-3 ${variants[variant]} ${inactive ? 'opacity-50' : ''}`}>
      {loading ? <ActivityIndicator color={variant === 'secondary' ? '#0284c7' : '#fff'} /> : null}
      <Text className={`text-base font-semibold ${textColor}`}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string | number>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View className="flex-row rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option.value);
            }}
            className={`min-h-10 flex-1 items-center justify-center rounded-lg ${active ? 'bg-white shadow-sm dark:bg-slate-600' : ''}`}>
            <Text className={`text-sm font-semibold ${active ? 'text-brand-dark dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <View className="items-center gap-3 py-16">
      <ActivityIndicator size="large" color="#0284c7" />
      <Text className="text-slate-500 dark:text-slate-400">{message}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Não foi possível carregar os dados.';
  return (
    <Card className="items-center gap-3 py-8">
      <Text className="text-4xl">📡</Text>
      <Text className="text-center text-base text-slate-700 dark:text-slate-200">{message}</Text>
      {onRetry ? <Button label="Tentar novamente" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function StatRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-2.5 ${last ? '' : 'border-b border-line/70 dark:border-line-dark/70'}`}>
      <Text className="text-sm text-slate-500 dark:text-slate-400">{label}</Text>
      <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</Text>
    </View>
  );
}
