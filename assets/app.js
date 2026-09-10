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

  const QUAN_HE = ['Vợ', 'Chồng', 'Con', 'ACE', 'Bạn', 'Khác'];

  /** Bỏ dấu để gõ "dak lak" vẫn tìm ra "Đắk Lắk". */
  function khongDau(v) {
    return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  /**
   * Ô vừa chọn trong danh sách vừa gõ tay được.
   * Tự dựng thay cho <datalist> — trên iPhone datalist gần như không
   * bấm được, mũi tên xổ chỉ là hình vẽ.
   */
  function makeCombo(input, options) {
    const wrap = input.closest('[data-combo]');
    const panel = $('.combo-panel', wrap);
    const toggle = $('.combo-toggle', wrap);
    let items = [];
    let pos = -1;

    function render(loc) {
      const q = khongDau((loc || '').trim());
      const list = q ? options.filter(o => khongDau(o).includes(q)) : options;
      panel.innerHTML = '';
      items = [];
      pos = -1;
      if (!list.length) {
        const li = document.createElement('li');
        li.className = 'combo-empty';
        li.textContent = 'Không có trong danh sách — cứ gõ tên bạn muốn.';
        panel.appendChild(li);
        return;
      }
      list.forEach(o => {
        const li = document.createElement('li');
        li.className = 'combo-opt';
        li.setAttribute('role', 'option');
        li.textContent = o;
        li.addEventListener('click', () => chon(o));
        panel.appendChild(li);
        items.push(li);
      });
    }

    function mo(loc) {
      render(loc);
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function dong() {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }

    function chon(v) {
      input.value = v;
      dong();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function danhDau(i) {
      items.forEach(el => el.classList.remove('active'));
      if (i >= 0 && items[i]) {
        items[i].classList.add('active');
        items[i].scrollIntoView({ block: 'nearest' });
      }
    }

    input.addEventListener('focus', () => mo(input.value));
    input.addEventListener('input', () => mo(input.value));

    // Bấm nút xổ thì không cho ô nhập nhận focus — trên điện thoại sẽ
    // không bật bàn phím, người dùng chạm thẳng vào mục cần chọn.
    toggle.addEventListener('pointerdown', ev => ev.preventDefault());
    toggle.addEventListener('click', () => {
      if (panel.hidden) mo(''); else dong();
    });

    input.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') { dong(); return; }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        if (panel.hidden) { mo(input.value); return; }
        ev.preventDefault();
        if (!items.length) return;
        pos = ev.key === 'ArrowDown'
          ? (pos + 1) % items.length
          : (pos - 1 + items.length) % items.length;
        danhDau(pos);
        return;
      }
      if (ev.key === 'Enter' && !panel.hidden && pos >= 0) {
        ev.preventDefault();
        chon(items[pos].textContent);
      }
    });

    document.addEventListener('pointerdown', ev => {
      if (!wrap.contains(ev.target)) dong();
    });
  }

  const tinhInput = $('#tinh');
  makeCombo(tinhInput, PROVINCES.map(p => p.label));

  /* ---------- Người đi kèm ---------- */

  function addCompanion() {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const i = ++companionSeq;
    $$('input[type="radio"]', node).forEach(r => {
      r.name = 'loai-' + i;
      r.addEventListener('change', () => syncLoai(node));
    });
    makeCombo($('.c-quanHe', node), QUAN_HE);
    syncLoai(node);
    $('[data-remove]', node).addEventListener('click', () => {
      node.remove();
      renumber();
    });
    listEl.appendChild(node);
    renumber();
    $('.c-hoTen', node).focus();
  }

  /**
   * Ô Mối quan hệ luôn hiện. Ô Lớp chỉ hiện với BS trong hội khóa, và
   * khi đó nhóm nút chọn giãn ra cả hàng để lưới không hở ô trống.
   * Ô Lớp bị ẩn thì xóa sạch giá trị để không lọt vào bảng tính.
   */
  function syncLoai(row) {
    const checked = $('input[type="radio"]:checked', row);
    const laBacSi = !checked || checked.value === 'Hội khóa';

    $('[data-lop-wrap]', row).hidden = !laBacSi;
    $('[data-loai-wrap]', row).classList.toggle('span-4', laBacSi);

    if (!laBacSi) {
      const lop = $('.c-lop', row);
      lop.value = '';
      setErr(lop, 'c-lop', '', row);
    }
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

      const loaiEl = $('input[type="radio"]:checked', row);
      const loai = loaiEl ? loaiEl.value : 'Hội khóa';
      const laBacSi = loai === 'Hội khóa';

      const cLop = $('.c-lop', row).value.trim();
      if (laBacSi && !cLop)
        bad($('.c-lop', row), 'c-lop', `Nhập lớp cho người đi kèm thứ ${idx + 1}.`, row);

      const cQuanHe = $('.c-quanHe', row).value.trim();
      if (!cQuanHe)
        bad($('.c-quanHe', row), 'c-quanHe',
            `Nhập mối quan hệ cho người đi kèm thứ ${idx + 1}.`, row);

      const cGt = $('.c-gioiTinh', row).value;
      if (!cGt) bad($('.c-gioiTinh', row), 'c-gioiTinh',
                    `Chọn giới tính cho người đi kèm thứ ${idx + 1}.`, row);

      const cYear = $('.c-namSinh', row).value.trim();
      const eCYear = checkYear(cYear);
      if (eCYear) bad($('.c-namSinh', row), 'c-namSinh', eCYear, row);

      const cId = $('.c-cccd', row).value.trim();
      const eCId = checkId(cId);
      if (eCId) bad($('.c-cccd', row), 'c-cccd', eCId, row);

      return {
        hoTen: ten,
        loai: loai,
        lop: laBacSi ? cLop : '',
        quanHe: cQuanHe,
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
        payload.nguoiDiKem.map(n =>
          `${n.hoTen} (${n.lop ? 'BS lớp ' + n.lop + ' — ' : ''}${n.quanHe})`)
          .join(', ')]);
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
