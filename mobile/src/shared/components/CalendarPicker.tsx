import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from './Text';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CalendarPickerProps {
  /** ISO date string YYYY-MM-DD */
  value: string;
  onChange: (isoDate: string) => void;
}

function toIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export function CalendarPicker({ value, onChange }: CalendarPickerProps) {
  const selected = parseIso(value);
  const today = new Date();

  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Build grid: leading empty slots + days of month
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Slots array: null = empty padding, number = day of month
  const slots: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to fill complete rows of 7
  while (slots.length % 7 !== 0) slots.push(null);

  const isSelected = (day: number) =>
    selected.year === viewYear &&
    selected.month === viewMonth &&
    selected.day === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  return (
    <View className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3">
      {/* Month / Year header */}
      <View className="flex-row items-center justify-between mb-3 px-1">
        <TouchableOpacity
          onPress={goToPrev}
          activeOpacity={0.7}
          className="w-8 h-8 items-center justify-center rounded-full bg-neutral-100"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color="#424242"
          />
        </TouchableOpacity>

        <Text variant="body" weight="semibold" className="text-neutral-900">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <TouchableOpacity
          onPress={goToNext}
          activeOpacity={0.7}
          className="w-8 h-8 items-center justify-center rounded-full bg-neutral-100"
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color="#424242"
          />
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View className="flex-row mb-1">
        {DAY_LABELS.map(label => (
          <View key={label} style={{ flex: 1 }} className="items-center py-1">
            <Text
              variant="caption"
              weight="semibold"
              className="text-neutral-400"
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      {Array.from({ length: slots.length / 7 }, (_, row) => (
        <View key={row} className="flex-row">
          {slots.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (day === null) {
              return (
                <View
                  key={`empty-${row}-${col}`}
                  style={{ flex: 1 }}
                  className="aspect-square"
                />
              );
            }

            const sel = isSelected(day);
            const tod = isToday(day);

            return (
              <TouchableOpacity
                key={day}
                onPress={() => onChange(toIso(viewYear, viewMonth, day))}
                activeOpacity={0.7}
                style={{ flex: 1 }}
                className="items-center justify-center aspect-square"
              >
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center ${
                    sel
                      ? 'bg-primary-700'
                      : tod
                        ? 'bg-primary-100'
                        : 'bg-transparent'
                  }`}
                >
                  <Text
                    variant="body"
                    weight={sel || tod ? 'semibold' : 'regular'}
                    className={
                      sel
                        ? 'text-white'
                        : tod
                          ? 'text-primary-700'
                          : 'text-neutral-800'
                    }
                  >
                    {String(day)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
