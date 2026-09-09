# Hội Khoa Y Khoa Huế - 2027 — Form đăng ký

Trang đăng ký tĩnh (chạy trên GitHub Pages) gửi dữ liệu về một Google Sheet
đặt trên Google Drive, bố cục giống hệt file `export.xlsm`.

```
Trình duyệt (GitHub Pages)  ──POST JSON──>  Apps Script Web App  ──>  Google Sheet
                                                                       (Drive, publish)
```

## Nội dung repo

| Đường dẫn | Vai trò |
|---|---|
| `index.html` | Trang form |
| `assets/styles.css` | Giao diện |
| `assets/app.js` | Kiểm tra dữ liệu, thêm/xóa người đi kèm, gửi form |
| `assets/provinces.js` | 20 tỉnh/thành từ `tinh.txt`, đã chuyển sang tiếng Việt có dấu |
| `assets/config.js` | **Nơi duy nhất cần sửa** — dán URL Apps Script vào đây |
| `apps-script/Code.gs` | Backend: nhận đăng ký, ghi vào Google Sheet |
| `export.xlsm`, `tinh.txt` | File gốc dùng làm chuẩn định dạng |

## Bố cục dữ liệu ghi ra Excel

Sheet `dang ky Hoi khoa Hue`, tiêu đề ở dòng 7, dữ liệu từ dòng 8. Bố cục dựa
trên `export.xlsm` nhưng **đã bỏ hai cột Ngày/Tháng sinh** và **thêm cột Nhóm lớp**.

| Cột | Nội dung | Dòng bác sĩ đăng ký | Dòng người đi kèm |
|---|---|---|---|
| A | STT | số thứ tự dòng | số thứ tự dòng (mọi dòng đều có số, tăng dần liên tục) |
| B | Ngày đăng ký | thời điểm gửi | thời điểm gửi |
| C | Họ tên | họ tên bác sĩ | họ tên người đi kèm |
| D | Người đi kèm | để trống | **mối quan hệ** với người đăng ký (Vợ, Con, Bạn cùng khóa…) — cả hai loại người đi kèm đều có |
| E | Lớp | ✓ | lớp riêng nếu là **BS khoá 86-92**; để trống nếu là người thân |
| F | Nhóm lớp | lớp của người đăng ký | **lớp của người đăng ký** (lặp lại trên mọi dòng của phiếu) |
| G | Số thành viên | 1 + số người đi kèm | để trống |
| H | Nơi ở hiện nay (Tỉnh thành trước sáp nhập) | ✓ | để trống |
| I | Năm sinh | ✓ | ✓ |
| J | Giới tính | ✓ (bắt buộc) | ✓ (bắt buộc) |
| K | CCCD / Hộ chiếu | ✓ | ✓ |
| L | Số điện thoại | ✓ | để trống |
| M | Ghi chú | đúng nội dung người dùng gõ | **luôn để trống** |

Một phiếu = 1 dòng bác sĩ + n dòng người đi kèm ngay bên dưới.

Cột **F "Nhóm lớp"** dùng để gom cả đoàn của một người đăng ký về cùng một
nhóm, kể cả người thân và bác sĩ khoá khác đi cùng.

Mốc nhận biết đầu mỗi phiếu là **cột G "Số thành viên"** — chỉ dòng bác sĩ
đăng ký mới có giá trị (cột D không dùng làm mốc được vì BS trong hội khóa
đi kèm cũng để trống cột đó).

## Triển khai — 4 bước

### 1. Tạo Google Sheet và dán code

1. Vào [sheets.new](https://sheets.new), đặt tên bảng tính, ví dụ
   **Đăng ký Hội Khoa Y Khoa Huế 2027**.
2. Menu **Tiện ích mở rộng → Apps Script**.
3. Xóa hết nội dung `Code.gs` mặc định, dán toàn bộ nội dung file
   `apps-script/Code.gs` của repo này vào. Lưu (Ctrl/Cmd + S).
4. Chọn hàm `setup` ở thanh trên rồi bấm **Chạy**. Lần đầu Google sẽ hỏi
   quyền — chọn tài khoản, **Nâng cao → Đi tới … (không an toàn)** → **Cho phép**.
   Sau bước này sheet `dang ky Hoi khoa Hue` đã có sẵn tiêu đề và dropdown.

### 2. Deploy Web App

1. Trong Apps Script bấm **Triển khai → Tùy chọn triển khai mới**.
2. Loại: **Ứng dụng web**.
3. *Thực thi với*: **Tôi**. *Ai có quyền truy cập*: **Bất kỳ ai**
   (bắt buộc, để người đăng ký không phải đăng nhập Google).
4. Bấm **Triển khai**, sao chép **URL ứng dụng web** dạng
   `https://script.google.com/macros/s/AKfycb…/exec`.

Mở URL đó trên trình duyệt để kiểm tra — phải thấy JSON `{"ok":true,…}`.

### 3. Nối form với backend

Sửa `assets/config.js`:

```js
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycb…/exec',
  ...
};
```

Để trống chuỗi này thì form chạy ở **chế độ thử**: vẫn kiểm tra dữ liệu
nhưng không gửi đi đâu, dữ liệu in ra Console của trình duyệt.

### 4. Bật GitHub Pages

```bash
git add .
git commit -m "Form đăng ký Hội Khoa Y Khoa Huế 2027"
git push -u origin main
```

Trên GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
Vài phút sau form có tại `https://nguyendung622.github.io/hkyk/`.

## Publish file Excel trên Drive

Trong Google Sheet: **Tệp → Chia sẻ → Xuất bản lên web** → chọn sheet
`dang ky Hoi khoa Hue` → định dạng **Microsoft Excel (.xlsx)** → **Xuất bản**.
Link nhận được luôn trả về file Excel mới nhất.

Muốn tải thủ công: **Tệp → Tải xuống → Microsoft Excel (.xlsx)**.

> Google Sheet không giữ được macro VBA của `.xlsm`. Nếu ban tổ chức cần
> các cột khách sạn/xe (P–Z) cùng macro, hãy giữ `export.xlsm` làm file làm
> việc và dán dữ liệu tải về vào đó.

## Chạy thử tại máy

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

## Chỉnh sửa thường gặp

- **Đổi tên form**: `FORM_TITLE` trong `assets/config.js`.
- **Thêm/bớt tỉnh thành**: `assets/provinces.js` (form) và mảng `PROVINCES`
  trong `apps-script/Code.gs` (dropdown trong Sheet) — giữ hai nơi giống nhau.
- **Sau khi sửa `Code.gs`**: phải **Triển khai → Quản lý triển khai → Chỉnh sửa
  → Phiên bản: Mới → Triển khai**, nếu không URL cũ vẫn chạy code cũ.
