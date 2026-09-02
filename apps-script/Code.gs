/**
 * Hội Khoa Y Khoa Huế - 2027 — backend nhận đăng ký.
 *
 * Ghi dữ liệu vào Google Sheet theo đúng bố cục file export.xlsm:
 *   - tiêu đề bảng ở dòng 7, dữ liệu bắt đầu từ dòng 8
 *   - A STT | B Ngày đăng ký | C Họ tên | D Người đi kèm | E Lớp |
 *     F Số thành viên | G Tỉnh Thành (địa chỉ cũ) | H Ngày | I Tháng | J Năm |
 *     K Năm sinh | L Giới tính | M CCCD/Hộ chiếu | N Số điện thoại | O Ghi chú
 *   - mỗi phiếu = 1 dòng bác sĩ + n dòng người đi kèm (cột D = 1)
 *
 * Cách dùng: xem README.md ở thư mục gốc.
 */

var SHEET_NAME     = 'dang ky Hoi khoa Hue';
var TITLE_TEXT     = 'Đăng ký Hội khóa Huế-2027';
var HEADER_ROW     = 7;
var FIRST_DATA_ROW = 8;
var LAST_COL       = 15; // đến cột O

var HEADERS = [
  'STT', 'Ngày đăng ký', 'Họ tên', 'Người đi kèm', 'Lớp', 'Số thành viên',
  'Tỉnh Thành (địa chỉ cũ)', 'Ngày', 'Tháng', 'Năm', 'Năm sinh', 'Giới tính',
  'CCCD/ Hộ chiếu', 'Số điện thoại', 'Ghi chú'
];

var COL_WIDTHS = [40, 105, 175, 55, 55, 55, 120, 45, 50, 60, 90, 60, 110, 105, 200];

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

  if (!hoTen) throw new Error('Thiếu họ tên bác sĩ.');
  if (!lop)   throw new Error('Thiếu lớp.');
  if (!tinh)  throw new Error('Thiếu tỉnh/thành.');
  if (!sdt)   throw new Error('Thiếu số điện thoại.');

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
      ngay: num(n.ngay), thang: num(n.thang), nam: num(n.nam),
      gioiTinh: str(n.gioiTinh),
      cccd: str(n.cccd)
    });
  }

  return {
    hoTen: hoTen, lop: lop, tinh: tinh, sdt: sdt,
    cccd: str(p.cccd),
    gioiTinh: str(p.gioiTinh),
    ngay: num(p.ngay), thang: num(p.thang), nam: num(p.nam),
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

    // Dòng bác sĩ tham gia
    rows.push([
      stt, now, d.hoTen, '', d.lop, soThanhVien, d.tinh,
      d.ngay, d.thang, d.nam, '', d.gioiTinh, d.cccd, d.sdt, d.ghiChu
    ]);

    // Các dòng người đi kèm — cột D = 1 như trong export.xlsm
    d.nguoiDiKem.forEach(function (n) {
      rows.push([
        '', now, n.hoTen, 1, '', '', '',
        n.ngay, n.thang, n.nam, '', n.gioiTinh, n.cccd, '', n.loai
      ]);
    });

    sheet.getRange(startRow, 1, rows.length, LAST_COL).setValues(rows);

    // Cột K "Năm sinh" giữ nguyên công thức như file gốc
    var formulas = rows.map(function (_, i) {
      var r = startRow + i;
      return ['=IF(OR(J' + r + '="",I' + r + '="",H' + r + '=""),"",DATE(J' + r + ',I' + r + ',H' + r + '))'];
    });
    sheet.getRange(startRow, 11, formulas.length, 1).setFormulas(formulas);

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

/** Số phiếu đã có = số dòng có Họ tên nhưng cột "Người đi kèm" để trống. */
function countRegistrations_(sheet) {
  var last = sheet.getLastRow();
  if (last < FIRST_DATA_ROW) return 0;
  var vals = sheet.getRange(FIRST_DATA_ROW, 3, last - FIRST_DATA_ROW + 1, 2).getValues();
  var n = 0;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() !== '' && String(vals[i][1]).trim() === '') n++;
  }
  return n;
}

function formatRows_(sheet, startRow, count) {
  sheet.getRange(startRow, 2, count, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange(startRow, 11, count, 1).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(startRow, 13, count, 2).setNumberFormat('@'); // CCCD & SĐT giữ dạng chữ
  sheet.getRange(startRow, 1, count, LAST_COL)
       .setVerticalAlignment('middle')
       .setBorder(true, true, true, true, true, true, '#d9d9d9', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(startRow, 15, count, 1).setWrap(true);
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
  sheet.hideColumns(16, 13); // ẩn P..AB như file export.xlsm

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
  sheet.getRange(FIRST_DATA_ROW, 12, n, 1).setDataValidation(gioiTinh);

  var tinh = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sheet.getRange(FIRST_DATA_ROW, PROVINCE_COL, PROVINCES.length, 1), true)
    .setAllowInvalid(true).build();
  sheet.getRange(FIRST_DATA_ROW, 7, n, 1).setDataValidation(tinh);
}
