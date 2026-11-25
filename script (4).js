/* ==========================================================
   DAYMOOD — script.js (ใช้ร่วมทุกหน้า)
   ตรวจจาก element ที่มีในหน้า แล้วรันเฉพาะฟังก์ชันที่เกี่ยวข้อง
   - product.html : #product-list, #filter-bar
   - order.html   : #orderForm, #items, #total
   - admin.html   : #ordersTable
   ========================================================== */

// key เดียว ใช้ทั้งตอนบันทึก (order.html) และตอนอ่าน (admin.html)
const ORDERS_KEY = "DAYMOODOrders";

const MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "confident", label: "Confident" },
];

/* ---------- Helpers ---------- */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(n) {
  const num = Number(n);
  return Number.isNaN(num) ? String(n ?? "") : num.toLocaleString("th-TH");
}

// เติมค่าลง element ไม่ว่าจะเป็น input/textarea หรือ element ธรรมดา
function setFieldValue(el, value) {
  if (!el) return;
  if ("value" in el) {
    el.value = value;
  } else {
    el.textContent = value;
  }
}

function getFieldValue(el) {
  if (!el) return "";
  return ("value" in el ? el.value : el.textContent || "").trim();
}

/* ==========================================================
   product.html
   ========================================================== */
function initProductPage() {
  const list = document.getElementById("product-list");
  const filterBar = document.getElementById("filter-bar");
  if (!list) return;

  let products = [];
  const params = new URLSearchParams(window.location.search);
  let currentMood = (params.get("mood") || "all").toLowerCase();
  if (!MOODS.some((m) => m.key === currentMood)) currentMood = "all";

  function renderFilterBar() {
    if (!filterBar) return;
    filterBar.innerHTML = MOODS.map(
      (m) =>
        `<button type="button" class="btn ${
          m.key === currentMood ? "btn--solid" : ""
        }" data-mood="${m.key}">${m.label}</button>`
    ).join(" ");
  }

  function renderProducts() {
    const filtered =
      currentMood === "all"
        ? products
        : products.filter((p) => p.mood === currentMood);

    if (filtered.length === 0) {
      list.innerHTML = `<p class="muted text-center">ไม่พบสินค้าในหมวดนี้</p>`;
      return;
    }

    list.innerHTML = filtered
      .map((p) => {
        const orderUrl = `order.html?item=${encodeURIComponent(
          p.name
        )}&price=${encodeURIComponent(p.price)}`;
        return `
        <article class="product-card">
          <div class="product-card__image">
            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">
          </div>
          <div class="product-card__body">
            <span class="mood-tag mood-${escapeHtml(p.mood)}">${escapeHtml(p.mood)}</span>
            <h3 class="product-card__title mt-sm">${escapeHtml(p.name)}</h3>
            <div class="product-card__meta">${escapeHtml(p.type)} · ${escapeHtml(p.size)}</div>
            <p class="product-card__desc">${escapeHtml(p.description)}</p>
            <div class="product-card__price">${formatPrice(p.price)} <small>บาท</small></div>
            <a class="btn btn--gold btn--block" href="${orderUrl}">สั่งซื้อ</a>
          </div>
        </article>`;
      })
      .join("");
  }

  function setMood(mood) {
    currentMood = mood;
    renderFilterBar();
    renderProducts();
    // อัปเดต URL โดยไม่โหลดหน้าใหม่
    const url = new URL(window.location.href);
    if (mood === "all") url.searchParams.delete("mood");
    else url.searchParams.set("mood", mood);
    window.history.replaceState({}, "", url);
  }

  if (filterBar) {
    filterBar.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-mood]");
      if (btn) setMood(btn.dataset.mood);
    });
  }

  renderFilterBar();

  fetch("products.json")
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      products = Array.isArray(data) ? data : [];
      renderProducts();
    })
    .catch((err) => {
      console.error("โหลด products.json ไม่สำเร็จ:", err);
      list.innerHTML = `<p class="muted text-center">โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาเปิดผ่านเว็บเซิร์ฟเวอร์ (เช่น Vercel หรือ Live Server)</p>`;
    });
}

/* ==========================================================
   order.html
   ========================================================== */
function initOrderPage() {
  const form = document.getElementById("orderForm");
  if (!form) return;

  const itemsEl = document.getElementById("items");
  const totalEl = document.getElementById("total");

  // เติมทั้งสองช่องเสมอ (ถ้าไม่มีค่าใน URL ให้เติมเป็นค่าว่าง)
  const params = new URLSearchParams(window.location.search);
  setFieldValue(itemsEl, params.get("item") || "");
  setFieldValue(totalEl, params.get("price") || "");

  function field(name) {
    return form.elements[name] || document.getElementById(name);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = {
      customerName: getFieldValue(field("customerName")),
      contact: getFieldValue(field("contact")),
      items: getFieldValue(itemsEl),
      total: getFieldValue(totalEl),
      note: getFieldValue(field("note")),
      timestamp: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      let orders = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(orders)) orders = [];
      orders.push(payload);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (err) {
      console.error("บันทึกคำสั่งซื้อไม่สำเร็จ:", err);
      alert("ไม่สามารถบันทึกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง");
      return;
    }

    window.location.href = "thankyou.html";
  });
}

/* ==========================================================
   admin.html
   ========================================================== */
function initAdminPage() {
  const table = document.getElementById("ordersTable");
  if (!table) return;

  const tbody = table.querySelector("tbody") || table.appendChild(document.createElement("tbody"));
  const colCount = table.querySelectorAll("thead th").length || 6;

  let orders = [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    orders = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(orders)) orders = [];
  } catch (err) {
    console.error("อ่านคำสั่งซื้อไม่สำเร็จ:", err);
    orders = [];
  }

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center muted">ยังไม่มีคำสั่งซื้อ</td></tr>`;
    return;
  }

  // ล่าสุดขึ้นก่อน
  orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  tbody.innerHTML = orders
    .map((o) => {
      const d = new Date(o.timestamp);
      const dateText = Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("th-TH");
      return `
      <tr>
        <td>${escapeHtml(dateText)}</td>
        <td>${escapeHtml(o.customerName)}</td>
        <td>${escapeHtml(o.contact)}</td>
        <td>${escapeHtml(o.items)}</td>
        <td>${escapeHtml(formatPrice(o.total))}</td>
        <td>${escapeHtml(o.note)}</td>
      </tr>`;
    })
    .join("");
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
