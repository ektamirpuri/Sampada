// SAMPADA.XYZ — Supabase Config & Auth
const SUPABASE_URL = 'https://nsnarymjxiqquhflyyyu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbmFyeW1qeGlxcXVoZmx5eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDE5MzQsImV4cCI6MjA5MTIxNzkzNH0.bmK5vn0phw9t_neRUI0mmETUi7p8J-HngEbxGSipDzA';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// AUTH HELPERS
const Auth = {
  async signUp(email, password, fullName) {
    const { data, error } = await db.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    return { data, error };
  },

  async signIn(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signOut() {
    await db.auth.signOut();
    window.location.href = '/Sampada/login.html';
  },

  async getUser() {
    const { data: { user } } = await db.auth.getUser();
    return user;
  },

  async requireAuth() {
    const user = await this.getUser();
    if (!user) { window.location.href = '/Sampada/login.html'; return null; }
    return user;
  },

  async getProfile(userId) {
    const { data } = await db.from('profiles').select('*').eq('id', userId).single();
    return data;
  }
};

// UI HELPERS
function toast(msg, type = 'default') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => el.className = '', 3000);
}

function inr(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pct(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + Number(n).toFixed(decimals) + '%';
}

function colorClass(n) { return n >= 0 ? 'green' : 'red'; }

function badge(text, type) { return `<span class="badge badge-${type}">${text}</span>`; }

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function showTab(tabId, btnEl, groupClass) {
  document.querySelectorAll(`.${groupClass}`).forEach(p => p.classList.remove('active'));
  document.querySelectorAll(`[data-tabgroup="${groupClass}"]`).forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if (btnEl) btnEl.classList.add('active');
}

// SIDEBAR ACTIVE STATE
function setActiveSidebarItem() {
  const page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === page) item.classList.add('active');
  });
}

// LIVE PRICES
const Prices = {
  cache: {},
  async fetch(tickers) {
    if (!tickers.length) return {};
    const syms = tickers.map(t => t.includes('.') ? t : `${t}.NS`).join(',');
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${syms}&range=1d&interval=1d`);
      const data = await res.json();
      const result = {};
      Object.entries(data).forEach(([key, val]) => {
        const sym = key.replace('.NS', '');
        if (val?.close?.length) result[sym] = val.close[val.close.length - 1];
      });
      this.cache = { ...this.cache, ...result };
      return result;
    } catch (e) {
      console.error('Price fetch failed:', e);
      return this.cache;
    }
  },

  async getMF(schemeCode) {
    try {
      const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`);
      const data = await res.json();
      return parseFloat(data.data?.[0]?.nav) || null;
    } catch { return null; }
  },

  // MCX Gold price approximation via Yahoo
  async getGold() {
    const data = await this.fetch(['GC=F']);
    const usdPrice = data['GC=F'];
    if (!usdPrice) return null;
    // Convert oz to grams, USD to INR (approx rate)
    const usdInr = 84;
    return (usdPrice / 31.1035) * usdInr;
  }
};

// XIRR CALCULATOR
function xirr(cashflows, dates) {
  if (cashflows.length < 2) return null;
  const d0 = dates[0];
  const days = dates.map(d => (new Date(d) - new Date(d0)) / 86400000);
  let r = 0.1;
  for (let i = 0; i < 200; i++) {
    let f = 0, df = 0;
    for (let j = 0; j < cashflows.length; j++) {
      const t = days[j] / 365;
      const v = Math.pow(1 + r, t);
      f += cashflows[j] / v;
      df += -t * cashflows[j] / (v * (1 + r));
    }
    if (Math.abs(df) < 1e-12) break;
    const rn = r - f / df;
    if (Math.abs(rn - r) < 1e-8) { r = rn; break; }
    r = isNaN(rn) ? r * 0.5 : rn;
  }
  return isFinite(r) && r > -1 && r < 100 ? r : null;
}

// SIDEBAR HTML
function sidebarHTML(activePage) {
  const nav = [
    { href: 'dashboard.html', icon: '◈', label: 'Dashboard' },
    { href: 'stocks.html', icon: '◉', label: 'Stocks & Smallcase', section: 'Assets' },
    { href: 'mutualfunds.html', icon: '◎', label: 'Mutual Funds' },
    { href: 'etf.html', icon: '◈', label: 'ETFs' },
    { href: 'ipo.html', icon: '◌', label: 'IPOs' },
    { href: 'fd.html', icon: '◍', label: 'Fixed Deposits', section: 'Safe Assets' },
    { href: 'physical.html', icon: '◆', label: 'Physical Assets' },
    { href: 'other.html', icon: '◇', label: 'Other Trading', section: 'Other' },
  ];

  const items = nav.map(item => {
    const sectionLabel = item.section ? `<div class="nav-section-label">${item.section}</div>` : '';
    const active = item.href === activePage ? 'active' : '';
    return `${sectionLabel}<a href="${item.href}" class="nav-item ${active}">
      <span class="nav-icon">${item.icon}</span>${item.label}
    </a>`;
  }).join('');

  return `<div class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="wordmark">Sampada</div>
      <div class="tagline">Your wealth, unified</div>
    </div>
    ${items}
    <div class="sidebar-bottom">
      <div class="user-pill">
        <div class="user-avatar" id="user-avatar">V</div>
        <div>
          <div class="user-name" id="user-name">Loading…</div>
          <div class="user-email" id="user-email"></div>
        </div>
      </div>
      <button class="logout-btn" onclick="Auth.signOut()">Sign out</button>
    </div>
  </div>`;
}

async function initPage(activePage) {
  const user = await Auth.requireAuth();
  if (!user) return null;

  // Inject sidebar
  const shell = document.getElementById('app-shell');
  if (shell) shell.insertAdjacentHTML('afterbegin', sidebarHTML(activePage));

  // Set user info
  const profile = await Auth.getProfile(user.id);
  const name = profile?.full_name || user.email.split('@')[0];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const avatarEl = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = user.email;

  setActiveSidebarItem();
  return user;
}
