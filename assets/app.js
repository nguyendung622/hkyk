/* Hội Khoa Y Khoa Huế - 2027 — logic form đăng ký */
(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const form          = $('#regForm');
  const listEl        = $('#companionList');
  const emptyEl       = $('#noCompanion');
  const addBtn        = $('#addCompanion');
  const submitBtn     = $('#submitBtn');
  const msgEl         = $('#formMsg');
  const totalEl       = $('#totalMembers');
  const totalNoteEl   = $('#totalNote');
  const tpl           = $('#companionTpl');
  const doneScreen    = $('#doneScreen');
  const doneDetail    = $('#doneDetail');
  const doneSummary   = $('#doneSummary');
  const againBtn      = $('#againBtn');

  let companionSeq = 0;

  /* ---------- Khởi tạo giao diện ---------- */

  document.title = CONFIG.FORM_TITLE + ' — Đăng ký tham dự';
  $('#formTitle').textContent = CONFIG.FORM_TITLE;

  // Tỉnh/thành: gợi ý sẵn 20+ mục nhưng vẫn cho gõ tay giá trị khác
  const tinhInput = $('#tinh');
  const tinhList = $('#tinhList');
  PROVINCES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.label;          // ghi tên có dấu vào Excel
    tinhList.appendChild(opt);
  });

  /* ---------- Người đi kèm ---------- */

  function addCompanion() {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const i = ++companionSeq;
    $$('input[type="radio"]', node).forEach(r => { r.name = 'loai-' + i; });
    $('[data-remove]', node).addEventListener('click', () => {
      node.remove();
      renumber();
    });
    listEl.appendChild(node);
    renumber();
    $('.c-hoTen', node).focus();
  }

  function renumber() {
    const rows = $$('[data-companion]', listEl);
    rows.forEach((row, idx) => { $('.c-index', row).textContent = String(idx + 1); });
    emptyEl.hidden = rows.length > 0;
    const total = rows.length + 1;
    totalEl.textContent = String(total);
    totalNoteEl.textContent = rows.length
      ? `1 bác sĩ + ${rows.length} người đi kèm`
      : 'Bác sĩ tham gia';
  }

  addBtn.addEventListener('click', addCompanion);
  renumber();

  /* ---------- Kiểm tra dữ liệu ---------- */

  function setErr(field, key, text, root = document) {
    const p = $(`[data-err-for="${key}"]`, root);
    if (p) p.textContent = text || '';
    if (field) field.classList.toggle('invalid', Boolean(text));
  }

  function clearErrors() {
    $$('.err').forEach(p => { p.textContent = ''; });
    $$('.invalid').forEach(el => el.classList.remove('invalid'));
    msgEl.textContent = '';
    msgEl.className = 'form-msg';
  }

  const digitsOnly = s => (s || '').replace(/\D/g, '');

  function checkPhone(v) {
    const d = digitsOnly(v);
    if (!v.trim()) return 'Vui lòng nhập số điện thoại.';
    if (d.length < 9 || d.length > 12) return 'Số điện thoại không hợp lệ.';
    return '';
  }

  function checkId(v) {
    const s = (v || '').trim();
    if (!s) return '';                                   // không bắt buộc
    if (!/^[A-Za-z0-9]{8,15}$/.test(s))
      return 'CCCD 12 số hoặc số hộ chiếu (8–15 ký tự, không dấu cách).';
    return '';
  }

  function checkYear(v) {
    const s = (v || '').trim();
    if (!s) return '';                                   // không bắt buộc
    const y = Number(s);
    if (!Number.isInteger(y) || y < 1930 || y > new Date().getFullYear())
      return 'Năm sinh không hợp lệ.';
    return '';
  }

  /* ---------- Thu thập dữ liệu ---------- */

  function collect() {
    const errors = [];
    let firstBad = null;
    const bad = (el, key, text, root) => {
      setErr(el, key, text, root);
      errors.push(text);
      if (!firstBad) firstBad = el;
    };

    const hoTen = $('#hoTen').value.trim();
    if (!hoTen) bad($('#hoTen'), 'hoTen', 'Vui lòng nhập họ và tên.');

    const lop = $('#lop').value.trim();
    if (!lop) bad($('#lop'), 'lop', 'Vui lòng nhập lớp.');

    const tinh = tinhInput.value.trim();
    if (!tinh) bad(tinhInput, 'tinh', 'Vui lòng chọn hoặc nhập nơi ở hiện nay.');

    const sdt = $('#sdt').value.trim();
    const ePhone = checkPhone(sdt);
    if (ePhone) bad($('#sdt'), 'sdt', ePhone);

    const gioiTinh = $('#gioiTinh').value;
    if (!gioiTinh) bad($('#gioiTinh'), 'gioiTinh', 'Vui lòng chọn giới tính.');

    const cccd = $('#cccd').value.trim();
    const eId = checkId(cccd);
    if (eId) bad($('#cccd'), 'cccd', eId);

    const namSinh = $('#namSinh').value.trim();
    const eYear = checkYear(namSinh);
    if (eYear) bad($('#namSinh'), 'namSinh', eYear);

    const nguoiDiKem = $$('[data-companion]', listEl).map((row, idx) => {
      const ten = $('.c-hoTen', row).value.trim();
      if (!ten) bad($('.c-hoTen', row), 'c-hoTen', `Nhập họ tên người đi kèm thứ ${idx + 1}.`, row);

      const cGt = $('.c-gioiTinh', row).value;
      if (!cGt) bad($('.c-gioiTinh', row), 'c-gioiTinh',
                    `Chọn giới tính cho người đi kèm thứ ${idx + 1}.`, row);

      const cYear = $('.c-namSinh', row).value.trim();
      const eCYear = checkYear(cYear);
      if (eCYear) bad($('.c-namSinh', row), 'c-namSinh', eCYear, row);

      const cId = $('.c-cccd', row).value.trim();
      const eCId = checkId(cId);
      if (eCId) bad($('.c-cccd', row), 'c-cccd', eCId, row);

      const loaiEl = $('input[type="radio"]:checked', row);
      return {
        hoTen: ten,
        loai: loaiEl ? loaiEl.value : 'Hội khóa',
        namSinh: cYear,
        gioiTinh: cGt,
        cccd: cId
      };
    });

    return {
      ok: errors.length === 0,
      firstBad,
      payload: {
        hoTen, lop, tinh, sdt, cccd, gioiTinh, namSinh,
        ghiChu: $('#ghiChu').value.trim(),
        nguoiDiKem
      }
    };
  }

  /* ---------- Gửi ---------- */

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    clearErrors();

    const { ok, firstBad, payload } = collect();
    if (!ok) {
      msgEl.textContent = 'Vui lòng kiểm tra lại các ô được đánh dấu đỏ.';
      msgEl.className = 'form-msg error';
      (firstBad || $('.invalid') || form).scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (firstBad) firstBad.focus({ preventScroll: true });
      return;
    }

    if (!CONFIG.APPS_SCRIPT_URL) {
      msgEl.textContent = 'Chế độ thử: dữ liệu hợp lệ nhưng chưa cấu hình nơi nhận '
        + '(APPS_SCRIPT_URL trong assets/config.js). Xem dữ liệu ở Console.';
      msgEl.className = 'form-msg info';
      console.log('[HKYK] Dữ liệu sẽ gửi:', payload);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi…';
    msgEl.textContent = '';
    msgEl.className = 'form-msg';

    try {
      // body dạng chuỗi => request "đơn giản", không kích hoạt preflight CORS
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Máy chủ trả về lỗi.');
      showDone(payload, data);
    } catch (err) {
      console.error(err);
      msgEl.textContent = 'Gửi không thành công: ' + err.message
        + ' — vui lòng thử lại, hoặc liên hệ ban tổ chức.';
      msgEl.className = 'form-msg error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Gửi đăng ký';
    }
  });

  /* ---------- Sau khi gửi ---------- */

  function showDone(payload, data) {
    form.hidden = true;
    doneScreen.hidden = false;

    doneDetail.textContent = data && data.stt
      ? `Phiếu đăng ký số ${data.stt} đã được ghi vào danh sách của ban tổ chức.`
      : 'Phiếu đăng ký đã được ghi vào danh sách của ban tổ chức.';

    const rows = [
      ['Họ và tên', payload.hoTen],
      ['Lớp', payload.lop],
      ['Nơi ở hiện nay', payload.tinh],
      ['Số điện thoại', payload.sdt],
      ['Số thành viên', String(1 + payload.nguoiDiKem.length)]
    ];
    if (payload.nguoiDiKem.length) {
      rows.push(['Người đi kèm',
        payload.nguoiDiKem.map(n => `${n.hoTen} (${n.loai})`).join(', ')]);
    }
    if (payload.ghiChu) rows.push(['Ghi chú', payload.ghiChu]);

    doneSummary.innerHTML = '<dl>' + rows
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
      .join('') + '</dl>';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  againBtn.addEventListener('click', () => {
    form.reset();
    listEl.innerHTML = '';
    renumber();
    clearErrors();
    doneScreen.hidden = true;
    form.hidden = false;
    $('#hoTen').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
