/**
 * Danh sách Tỉnh/Thành (địa chỉ cũ) — nguồn: tinh.txt
 * value : giá trị gốc không dấu, giữ để khớp danh sách DiachiCu trong export.xlsm
 * label : tên tiếng Việt có dấu, hiển thị trên form và ghi vào file Excel
 */
const PROVINCES = [
  { value: 'Binh Dinh',   label: 'Bình Định' },
  { value: 'Binh Phuoc',  label: 'Bình Phước' },
  { value: 'Binh Thuan',  label: 'Bình Thuận' },
  { value: 'BR-Vung Tau', label: 'Bà Rịa - Vũng Tàu' },
  { value: 'Da Nang',     label: 'Đà Nẵng' },
  { value: 'Dac Lac',     label: 'Đắk Lắk' },
  { value: 'Dac Nong',    label: 'Đắk Nông' },
  { value: 'Dong Nai',    label: 'Đồng Nai' },
  { value: 'Gia Lai',     label: 'Gia Lai' },
  { value: 'Ha Noi',      label: 'Hà Nội' },
  { value: 'Ho Chi Minh', label: 'Hồ Chí Minh' },
  { value: 'Hue',         label: 'Huế' },
  { value: 'Khanh Hoa',   label: 'Khánh Hòa' },
  { value: 'Kon Tum',     label: 'Kon Tum' },
  { value: 'Lam Dong',    label: 'Lâm Đồng' },
  { value: 'Ninh Thuan',  label: 'Ninh Thuận' },
  { value: 'Phu Yen',     label: 'Phú Yên' },
  { value: 'Quang Binh',  label: 'Quảng Bình' },
  { value: 'Quang Nam',   label: 'Quảng Nam' },
  { value: 'Quang Ngai',  label: 'Quảng Ngãi' },
  { value: 'Quang Tri',   label: 'Quảng Trị' },
  { value: 'Vinh Long',   label: 'Vĩnh Long' }
];
