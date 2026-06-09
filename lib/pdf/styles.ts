import { StyleSheet } from '@react-pdf/renderer';

export const BRAND = {
  indigo:   '#6366f1',
  indigoDark: '#4338ca',
  emerald:  '#10b981',
  red:      '#ef4444',
  amber:    '#f59e0b',
  slate900: '#0f172a',
  slate700: '#334155',
  slate500: '#64748b',
  slate300: '#cbd5e1',
  slate100: '#f1f5f9',
  white:    '#ffffff',
};

export const base = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: BRAND.slate700,
    backgroundColor: BRAND.white,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  // Header bar at top of each page
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.indigo,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BRAND.slate900 },
  headerSub:   { fontSize: 8, color: BRAND.slate500, marginTop: 3 },
  headerBrand: { fontSize: 8, color: BRAND.slate500, textAlign: 'right' },

  // Section
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.slate900,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
  },

  // KPI grid
  kpiGrid:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard:   { flex: 1, backgroundColor: BRAND.slate100, borderRadius: 6, padding: 10 },
  kpiCardAccent: { flex: 1, backgroundColor: BRAND.indigo, borderRadius: 6, padding: 10 },
  kpiLabel:  { fontSize: 7, color: BRAND.slate500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  kpiLabelWhite: { fontSize: 7, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  kpiValue:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BRAND.slate900 },
  kpiValueWhite: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: BRAND.white },
  kpiSub:    { fontSize: 7, color: BRAND.slate500, marginTop: 2 },
  kpiSubWhite: { fontSize: 7, color: '#c7d2fe', marginTop: 2 },

  // Table
  table:       { width: '100%', marginBottom: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: BRAND.slate900, borderRadius: 4, marginBottom: 1 },
  tableRow:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BRAND.slate100 },
  tableRowAlt: { flexDirection: 'row', backgroundColor: BRAND.slate100, borderBottomWidth: 1, borderBottomColor: BRAND.white },
  thCell:      { padding: '6 8', fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRAND.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  tdCell:      { padding: '5 8', fontSize: 8, color: BRAND.slate700 },
  tdCellBold:  { padding: '5 8', fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND.slate900 },
  tdCellGreen: { padding: '5 8', fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND.emerald },
  tdCellRed:   { padding: '5 8', fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND.red },

  // P&L rows
  plRow:       { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BRAND.slate100, paddingVertical: 4, paddingHorizontal: 2 },
  plRowBold:   { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BRAND.slate300, paddingVertical: 5, paddingHorizontal: 2, backgroundColor: BRAND.slate100 },
  plRowTotal:  { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: BRAND.slate900, paddingVertical: 6, paddingHorizontal: 2 },
  plLabel:     { fontSize: 8, color: BRAND.slate700 },
  plLabelBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRAND.slate900 },
  plLabelIndent: { fontSize: 8, color: BRAND.slate500, paddingLeft: 12 },
  plValue:     { fontSize: 8, color: BRAND.slate700, fontFamily: 'Helvetica-Bold' },
  plValueGreen:{ fontSize: 8, color: BRAND.emerald, fontFamily: 'Helvetica-Bold' },
  plValueRed:  { fontSize: 8, color: BRAND.red, fontFamily: 'Helvetica-Bold' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BRAND.slate300,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: BRAND.slate500 },

  // Misc
  row:   { flexDirection: 'row' },
  col:   { flex: 1 },
  bold:  { fontFamily: 'Helvetica-Bold' },
  muted: { color: BRAND.slate500 },
  green: { color: BRAND.emerald },
  red:   { color: BRAND.red },
  badge: { fontSize: 7, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeGreen:  { backgroundColor: '#d1fae5', color: '#065f46' },
  badgeRed:    { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeAmber:  { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeBlue:   { backgroundColor: '#e0e7ff', color: '#3730a3' },
  infoBox: { backgroundColor: BRAND.slate100, borderRadius: 6, padding: 10, marginBottom: 12 },
  infoBoxText: { fontSize: 8, color: BRAND.slate700 },
});
