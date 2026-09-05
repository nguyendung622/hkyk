/**
 * Hội Khoa Y Khoa Huế - 2027 — backend nhận đăng ký.
 *
 * Ghi dữ liệu vào Google Sheet, dựa trên bố cục file export.xlsm nhưng đã
 * bỏ hai cột Ngày và Tháng sinh:
 *   - tiêu đề bảng ở dòng 7, dữ liệu bắt đầu từ dòng 8
 *   - A STT | B Ngày đăng ký | C Họ tên | D Người đi kèm | E Lớp |
 *     F Số thành viên | G Tỉnh Thành (địa chỉ cũ) | H Năm sinh | I Giới tính |
 *     J CCCD/Hộ chiếu | K Số điện thoại | L Ghi chú
 *   - mỗi phiếu = 1 dòng bác sĩ + n dòng người đi kèm
 *   - cột D chỉ đánh số 1 cho người thân đi kèm; bác sĩ trong hội khóa
 *     đi cùng thì để trống
 *
 * Cách dùng: xem README.md ở thư mục gốc.
 */

var SHEET_NAME     = 'dang ky Hoi khoa Hue';
var TITLE_TEXT     = 'Đăng ký Hội khóa Huế-2027';
var HEADER_ROW     = 7;
var FIRST_DATA_ROW = 8;
var LAST_COL       = 12; // đến cột L

var HEADERS = [
  'STT', 'Ngày đăng ký', 'Họ tên', 'Người đi kèm', 'Lớp', 'Số thành viên',
  'Tỉnh Thành (địa chỉ cũ)', 'Năm sinh', 'Giới tính', 'CCCD/ Hộ chiếu',
  'Số điện thoại', 'Ghi chú'
];

var COL_WIDTHS = [40, 105, 185, 55, 55, 55, 130, 65, 60, 115, 105, 230];

var COL_SO_THANH_VIEN = 6;   // cột F — chỉ dòng bác sĩ đăng ký mới có
var COL_GIOI_TINH     = 9;   // cột I
var COL_CCCD          = 10;  // cột J — cùng cột SĐT giữ dạng chữ
var COL_GHI_CHU       = 12;  // cột L

// Giữ giống hệt danh sách trong assets/provinces.js
var PROVINCES = [
  'Bình Định', 'Bình Phước', 'Bình Thuận', 'Bà Rịa - Vũng Tàu', 'Đà Nẵng',
  'Đắk Lắk', 'Đắk Nông', 'Đồng Nai', 'Gia Lai', 'Hà Nội', 'Hồ Chí Minh',
  'Huế', 'Khánh Hòa', 'Kon Tum', 'Lâm Đồng', 'Ninh Thuận', 'Phú Yên',
  'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Trị', 'Vĩnh Long'
];

var PROVINCE_COL = 28;  // cột AB — nguồn cho dropdown, giống file export.xlsm
var PROVINCE_MAX = 60;  // số dòng dọn dẹp khi danh sách rút ngắn

/* ===================== Điểm vào ===================== */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Không nhận được dữ liệu.' });
    }
    var payload = JSON.parse(e.postData.contents);
    var clean = validate(payload);
    var stt = writeRegistration(clean);
    return json({ ok: true, stt: stt, soThanhVien: 1 + clean.nguoiDiKem.length });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  var sheet = getSheet_();
  return json({
    ok: true,
    service: TITLE_TEXT,
    sheet: SHEET_NAME,
    soPhieu: countRegistrations_(sheet)
  });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ===================== Kiểm tra dữ liệu ===================== */

function validate(p) {
  var hoTen = str(p.hoTen);
  var lop   = str(p.lop);
  var tinh  = str(p.tinh);
  var sdt   = str(p.sdt);

  var gioiTinh = str(p.gioiTinh);

  if (!hoTen)    throw new Error('Thiếu họ tên bác sĩ.');
  if (!gioiTinh) throw new Error('Thiếu giới tính.');
  if (!lop)      throw new Error('Thiếu lớp.');
  if (!tinh)     throw new Error('Thiếu nơi ở hiện nay.');
  if (!sdt)      throw new Error('Thiếu số điện thoại.');

  var kem = [];
  var list = p.nguoiDiKem || [];
  if (list.length > 20) throw new Error('Quá nhiều người đi kèm trong một phiếu.');
  for (var i = 0; i < list.length; i++) {
    var n = list[i];
    var ten = str(n.hoTen);
    if (!ten) continue; // bỏ qua dòng trống
    kem.push({
      hoTen: ten,
      loai: str(n.loai) || 'Hội khóa',
      namSinh: num(n.namSinh),
      gioiTinh: str(n.gioiTinh),
      cccd: str(n.cccd)
    });
  }

  return {
    hoTen: hoTen, lop: lop, tinh: tinh, sdt: sdt, gioiTinh: gioiTinh,
    cccd: str(p.cccd),
    namSinh: num(p.namSinh),
    ghiChu: str(p.ghiChu),
    nguoiDiKem: kem
  };
}

function str(v) {
  return v === null || v === undefined ? '' : String(v).trim().slice(0, 500);
}

function num(v) {
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  return isNaN(n) ? '' : n;
}

/* ===================== Ghi vào Sheet ===================== */

function writeRegistration(d) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // tránh hai người gửi cùng lúc ghi đè nhau
  try {
    var sheet = getSheet_();
    var startRow = nextRow_(sheet);
    var stt = countRegistrations_(sheet) + 1;
    var now = new Date();
    var soThanhVien = 1 + d.nguoiDiKem.length;

    var rows = [];

    // Dòng bác sĩ đăng ký
    rows.push([
      stt, now, d.hoTen, '', d.lop, soThanhVien, d.tinh,
      d.namSinh, d.gioiTinh, d.cccd, d.sdt, d.ghiChu
    ]);

    // Các dòng người đi kèm.
    // Cột D chỉ đánh số 1 cho người thân; bác sĩ trong hội khóa đi cùng
    // để trống. Cột Ghi chú luôn để trống — chỉ dòng bác sĩ đăng ký mới
    // mang nội dung do người dùng tự nhập.
    d.nguoiDiKem.forEach(function (n) {
      rows.push([
        '', now, n.hoTen, n.loai === 'Gia đình' ? 1 : '', '', '', '',
        n.namSinh, n.gioiTinh, n.cccd, '', ''
      ]);
    });

    sheet.getRange(startRow, 1, rows.length, LAST_COL).setValues(rows);
    formatRows_(sheet, startRow, rows.length);
    SpreadsheetApp.flush();
    return stt;
  } finally {
    lock.releaseLock();
  }
}

function nextRow_(sheet) {
  var last = sheet.getLastRow();
  if (last < FIRST_DATA_ROW) return FIRST_DATA_ROW;
  var col = sheet.getRange(FIRST_DATA_ROW, 3, last - FIRST_DATA_ROW + 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0]).trim() !== '') return FIRST_DATA_ROW + i + 1;
  }
  return FIRST_DATA_ROW;
}

/**
 * Số phiếu đã có = số dòng có điền "Số thành viên" (cột F).
 * Không dùng cột D làm mốc được nữa: bác sĩ trong hội khóa đi kèm cũng
 * để trống cột D giống dòng bác sĩ đăng ký.
 */
function countRegistrations_(sheet) {
  var last = sheet.getLastRow();
  if (last < FIRST_DATA_ROW) return 0;
  var vals = sheet.getRange(FIRST_DATA_ROW, COL_SO_THANH_VIEN, last - FIRST_DATA_ROW + 1, 1).getValues();
  var n = 0;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() !== '') n++;
  }
  return n;
}

function formatRows_(sheet, startRow, count) {
  sheet.getRange(startRow, 2, count, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange(startRow, 8, count, 1).setNumberFormat('0');   // năm sinh
  sheet.getRange(startRow, COL_CCCD, count, 2).setNumberFormat('@'); // CCCD & SĐT giữ dạng chữ
  sheet.getRange(startRow, 1, count, LAST_COL)
       .setVerticalAlignment('middle')
       .setBorder(true, true, true, true, true, true, '#d9d9d9', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(startRow, COL_GHI_CHU, count, 1).setWrap(true);
}

/* ===================== Tạo / lấy sheet ===================== */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = buildSheet_(ss);
  return sheet;
}

/**
 * Chạy tay một lần từ trình soạn thảo Apps Script để dựng sẵn bảng
 * (tiêu đề, khung, danh sách tỉnh thành, dropdown giới tính).
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || buildSheet_(ss);
  writeProvinceList_(sheet);
  applyValidation_(sheet);
  Logger.log('Đã chuẩn bị xong sheet "%s".', SHEET_NAME);
  return sheet.getName();
}

function buildSheet_(ss) {
  var sheet = ss.insertSheet(SHEET_NAME, 0);

  sheet.getRange('A1').setValue(TITLE_TEXT)
       .setFontSize(15).setFontWeight('bold').setFontColor('#0f5c52');

  sheet.getRange(HEADER_ROW, 1, 1, LAST_COL)
       .setValues([HEADERS])
       .setFontWeight('bold')
       .setBackground('#e8f2f0')
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle')
       .setWrap(true)
       .setBorder(true, true, true, true, true, true, '#b7c9c6', SpreadsheetApp.BorderStyle.SOLID);

  COL_WIDTHS.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
  sheet.setFrozenRows(HEADER_ROW);

  writeProvinceList_(sheet);
  sheet.hideColumns(LAST_COL + 1, PROVINCE_COL - LAST_COL); // ẩn M..AB

  applyValidation_(sheet);
  return sheet;
}

/** Ghi (hoặc ghi đè) danh sách tỉnh thành ở cột AB — nguồn của dropdown. */
function writeProvinceList_(sheet) {
  sheet.getRange('AB7').setValue('Tỉnh thành').setFontWeight('bold');
  sheet.getRange(FIRST_DATA_ROW, PROVINCE_COL, PROVINCE_MAX, 1).clearContent();
  sheet.getRange(FIRST_DATA_ROW, PROVINCE_COL, PROVINCES.length, 1)
       .setValues(PROVINCES.map(function (p) { return [p]; }));
}

function applyValidation_(sheet) {
  var n = 500; // số dòng áp dụng quy tắc nhập liệu

  var gioiTinh = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Nam', 'Nữ'], true).setAllowInvalid(true).build();
  sheet.getRange(FIRST_DATA_ROW, COL_GIOI_TINH, n, 1).setDataValidation(gioiTinh);

  var tinh = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sheet.getRange(FIRST_DATA_ROW, PROVINCE_COL, PROVINCES.length, 1), true)
    .setAllowInvalid(true).build();
  sheet.getRange(FIRST_DATA_ROW, 7, n, 1).setDataValidation(tinh);
}
