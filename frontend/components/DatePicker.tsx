import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['S','M','T','W','T','F','S'];

interface Props {
  visible: boolean;
  date: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export default function DatePickerModal({ visible, date, onSelect, onClose }: Props) {
  const [viewMonth, setViewMonth] = useState(date.getMonth());
  const [viewYear, setViewYear] = useState(date.getFullYear());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isSelected = (day: number) =>
    new Date(viewYear, viewMonth, day).toDateString() === date.toDateString();
  const isToday = (day: number) =>
    new Date(viewYear, viewMonth, day).toDateString() === today.toDateString();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          <View style={s.header}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
              <Text style={s.navText}>◀</Text>
            </TouchableOpacity>
            <Text style={s.monthYear}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
              <Text style={s.navText}>▶</Text>
            </TouchableOpacity>
          </View>

          <View style={s.dayHeaders}>
            {DAYS.map((d, i) => (
              <View key={i} style={s.dayHeaderCell}>
                <Text style={s.dayHeaderText}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={s.grid}>
            {Array(firstDay).fill(null).map((_, i) => <View key={`e${i}`} style={s.cell} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <TouchableOpacity
                  key={day}
                  testID={`cal-day-${day}`}
                  style={[s.cell, sel && s.selectedCell, tod && !sel && s.todayCell]}
                  onPress={() => { onSelect(new Date(viewYear, viewMonth, day)); onClose(); }}
                >
                  <Text style={[s.dayText, sel && s.selectedText, tod && !sel && s.todayText]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={s.todayBtn} onPress={() => { onSelect(new Date()); onClose(); }}>
            <Text style={s.todayBtnText}>📅 Today</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const C = { primary: '#2E7D32', surface: '#FFFFFF', secondary: '#E8F5E9', text: '#0A1F10', sub: '#4A5D4E', border: '#E0E8E1' };

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 24 },
  container: { backgroundColor: C.surface, borderRadius: 20, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.secondary, justifyContent: 'center', alignItems: 'center' },
  navText: { fontSize: 14, color: C.primary },
  monthYear: { fontSize: 16, fontWeight: '700', color: C.text },
  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeaderCell: { flex: 1, alignItems: 'center' },
  dayHeaderText: { fontSize: 11, fontWeight: '700', color: C.sub },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  selectedCell: { backgroundColor: C.primary, borderRadius: 20 },
  todayCell: { backgroundColor: C.secondary, borderRadius: 20 },
  dayText: { fontSize: 14, color: C.text },
  selectedText: { color: '#fff', fontWeight: '800' },
  todayText: { color: C.primary, fontWeight: '700' },
  todayBtn: { marginTop: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: C.secondary, borderRadius: 10 },
  todayBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },
});
