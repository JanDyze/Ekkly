import XLSX from 'xlsx-js-style';
import { getChurchIdentity } from '../composables/useAppSettings';
import { accentCell } from '../composables/useBrandTheme';
import { fitColumns } from './sheetColumns';
import { compareMembers } from '../composables/useMemberSorting';
import { ageOf } from './ageBands';
import { formatBirthday, isYearless } from './memberUtils';

// Every column a sheet can carry, in the order they are laid out. Exported so
// the dialog offers exactly these and the two cannot drift apart.
export const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "nickname", label: "Nickname" },
  { key: "sex", label: "Sex" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "age", label: "Age" },
  { key: "civilStatus", label: "Civil Status" },
  { key: "contactNumber", label: "Contact Number" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "occupation", label: "Occupation" },
  { key: "isMember", label: "Standing" },
  { key: "ministries", label: "Ministries" },
  { key: "tags", label: "Tags" },
];
const availableFields = EXPORT_FIELDS;

// Cell styles
const styles = {
  // Header style - dark blue background with white text
  header: {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { get fgColor() { return accentCell() } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", get color() { return accentCell() } },
      bottom: { style: "thin", get color() { return accentCell() } },
      left: { style: "thin", get color() { return accentCell() } },
      right: { style: "thin", get color() { return accentCell() } },
    },
  },
  // Title style
  title: {
    font: { bold: true, get color() { return accentCell() }, sz: 16 },
    alignment: { horizontal: "center", vertical: "center" },
  },
  // Subtitle style
  subtitle: {
    font: { color: { rgb: "666666" }, sz: 10, italic: true },
    alignment: { horizontal: "center", vertical: "center" },
  },
  // Data cell - even row
  dataEven: {
    font: { sz: 10 },
    fill: { fgColor: { rgb: "F8FAFC" } },
    alignment: { vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
  // Data cell - odd row
  dataOdd: {
    font: { sz: 10 },
    fill: { fgColor: { rgb: "FFFFFF" } },
    alignment: { vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
  // Member status - Yes
  memberYes: {
    font: { sz: 10, bold: true, color: { rgb: "166534" } },
    fill: { fgColor: { rgb: "DCFCE7" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
  // Member status - No
  memberNo: {
    font: { sz: 10, color: { rgb: "6B7280" } },
    fill: { fgColor: { rgb: "F3F4F6" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
  // Gender Male
  genderMale: {
    font: { sz: 10, color: { rgb: "1D4ED8" } },
    fill: { fgColor: { rgb: "DBEAFE" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
  // Gender Female
  genderFemale: {
    font: { sz: 10, color: { rgb: "DB2777" } },
    fill: { fgColor: { rgb: "FCE7F3" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
  // Age cell
  ageCell: {
    font: { sz: 10 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
  },
};

// In one of the roll's own orders (useMemberSorting), so the sheet comes
// out the way the list on screen was sorted. It used to sort only by name,
// age and birth date, and by anything else (last name, birthday, recently
// added) left the rows in whatever order they were stored in.
const sortMembers = (members, sortBy, sortOrder) => {
  const sorted = [...members].sort(compareMembers(sortBy));
  return sortOrder === "desc" ? sorted.reverse() : sorted;
};

// Get cell style based on value and field
const getCellStyle = (fieldKey, value, rowIndex) => {
  const isEven = rowIndex % 2 === 0;
  const baseStyle = isEven ? styles.dataEven : styles.dataOdd;

  if (fieldKey === "isMember") {
    return value === "Member" ? styles.memberYes : styles.memberNo;
  }
  
  if (fieldKey === "sex") {
    if (value === "Male") return styles.genderMale;
    if (value === "Female") return styles.genderFemale;
  }
  
  if (fieldKey === "age") {
    return { ...baseStyle, ...styles.ageCell, fill: baseStyle.fill };
  }

  return baseStyle;
};

// Export members to Excel (.xlsx) with styling
export const exportToExcel = (members, config) => {
  // The caller decides which members to hand over (all, or just what the
  // search is showing) - this only sorts them.
  const dataToExport = sortMembers(members, config.sortBy, config.sortOrder);

  // Get selected headers
  const headers = availableFields
    .filter((field) => config.fields[field.key])
    .map((field) => field.label);

  const headerKeys = availableFields
    .filter((field) => config.fields[field.key])
    .map((field) => field.key);

  // Create worksheet data with title rows
  const wsData = [];
  
  // Title row
  wsData.push([`${getChurchIdentity().shortName} - People`]);
  
  // Subtitle row
  const exportDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  wsData.push([`Exported on ${exportDate} • ${dataToExport.length} ${dataToExport.length === 1 ? 'person' : 'people'}`]);
  
  // Empty row
  wsData.push([]);
  
  // Header row
  wsData.push(headers);
  
  // Data rows
  dataToExport.forEach((member) => {
    const row = headerKeys.map((key) => {
      let value = member[key];

      // The age as it is today, worked out from the birth date: the one
      // stored on the record is from the day it was last saved.
      if (key === "age") value = ageOf(member) ?? "";
      // A birthday with no year is the day alone, not "0000-10-09".
      if (key === "dateOfBirth" && isYearless(value)) value = formatBirthday(value, { withYear: false });
      
      if ((key === "tags" || key === "ministries") && Array.isArray(value)) {
        value = value.join(", ");
      }
      // The church's own words for it, not a yes/no about a word nobody uses.
      if (key === "isMember") {
        value = value ? "Member" : "Attendee";
      }
      if (value === null || value === undefined) {
        value = "";
      }
      
      return value;
    });
    wsData.push(row);
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merge title cells
  const colCount = headers.length;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }, // Subtitle
  ];

  // Apply styles
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      
      if (!ws[cellRef]) {
        ws[cellRef] = { v: '', t: 's' };
      }
      
      // Title row
      if (R === 0) {
        ws[cellRef].s = styles.title;
      }
      // Subtitle row
      else if (R === 1) {
        ws[cellRef].s = styles.subtitle;
      }
      // Empty row
      else if (R === 2) {
        // Skip
      }
      // Header row
      else if (R === 3) {
        ws[cellRef].s = styles.header;
      }
      // Data rows
      else if (R > 3) {
        const fieldKey = headerKeys[C];
        const cellValue = ws[cellRef].v;
        ws[cellRef].s = getCellStyle(fieldKey, cellValue, R - 4);
      }
    }
  }

  // Each column as wide as what is in it (sheetColumns.js), from the header
  // row down. The fields that run long get more room before they wrap: an
  // address, an email, a list of ministries or tags.
  const ROOMY = { address: 50, email: 36, ministries: 44, tags: 44 };
  fitColumns(ws, {
    from: 3,
    min: 8,
    max: 30,
    maxFor: Object.fromEntries(
      headerKeys.map((key, idx) => [idx, ROOMY[key]]).filter(([, max]) => max)
    ),
  });

  // Set row heights
  ws['!rows'] = [
    { hpt: 30 }, // Title row
    { hpt: 20 }, // Subtitle row
    { hpt: 10 }, // Empty row
    { hpt: 25 }, // Header row
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'People');

  // Generate filename
  const prefix = (getChurchIdentity().shortName || "Church").replace(/[^\w-]+/g, "_");
  const filename = `${prefix}_People_${new Date().toISOString().split("T")[0]}.xlsx`;

  // Download
  XLSX.writeFile(wb, filename);
};

// Legacy export (kept for compatibility)
export const exportToCSV = (members, config) => {
  exportToExcel(members, config);
};
