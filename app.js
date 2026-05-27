// ============================================================
// ✦ SUPABASE CONFIGURATION (Hardcoded)
// ============================================================
const SUPABASE_URL = 'https://hnhezggruiivjfiqubiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaGV6Z2dydWlpdmpmaXF1Yml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjI0NDQsImV4cCI6MjA5NDgzODQ0NH0.L0TyFh1R6Sn1BoPi64P1OvrwwKNY844sou2qkyWh2AU';

let supabaseClient = null;
let currentUserId = null;
const LOCAL_STORAGE_USER_KEY = 'berryeyes_user_id';

// ============================================================
// ✦ STATE
// ============================================================
let state = { lenses: [], activeLensId: null };

// ============================================================
// ✦ DATE UTILITIES
// ============================================================
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
const TODAY_DATE = getLocalDateString();

// ============================================================
// ✦ SUPABASE INIT
// ============================================================
function initSupabase() {
  try {
    const { createClient } = window.supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (e) {
    console.error('Supabase init failed', e);
    return false;
  }
}

// ============================================================
// ✦ LOADING OVERLAY
// ============================================================
function showLoading(visible) {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 244, 245, 0.85); backdrop-filter: blur(4px);
      z-index: 200; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px;
    `;
    overlay.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 100 100" style="animation: spin 1.2s linear infinite;">
        <path d="M 50,25 C 50,25 38,10 20,10 C 8,10 0,20 0,35 C 0,55 25,75 50,90 C 75,75 100,55 100,35 C 100,20 92,10 80,10 C 62,10 50,25 50,25 Z"
          fill="none" stroke="#FF6B8B" stroke-width="5"/>
      </svg>
      <span style="font-family: 'Fredoka', sans-serif; font-size: 0.8rem; color: #A39699; font-weight: 600;">同步中...</span>
      <style>@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }</style>
    `;
    document.getElementById('app-screen').appendChild(overlay);
  }
  overlay.style.display = visible ? 'flex' : 'none';
}

// ============================================================
// ✦ SUPABASE DATA OPERATIONS
// ============================================================
async function loadFromSupabase() {
  showLoading(true);
  try {
    const { data, error } = await supabaseClient
      .from('lenses')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    state.lenses = data.map(row => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      colorHex: row.color_hex || '#FFB3C6',
      photos: row.photos || [],
      activatedDate: row.activated_date,
      wearDates: row.wear_dates || [],
      isActive: row.is_active,
    }));

    const activeLens = state.lenses.find(l => l.isActive);
    state.activeLensId = activeLens ? activeLens.id : null;

  } catch (err) {
    console.error('Failed to load from Supabase, using local fallback:', err);
    loadLocalState();
  } finally {
    showLoading(false);
  }
}

async function saveNewLens(lensObj) {
  if (!supabaseClient) { saveLocalState(); return; }
  try {
    const { error } = await supabaseClient
      .from('lenses')
      .insert([{
        id: lensObj.id,
        user_id: currentUserId,
        name: lensObj.name,
        brand: lensObj.brand,
        color_hex: lensObj.colorHex,
        photos: lensObj.photos,
        activated_date: lensObj.activatedDate,
        wear_dates: lensObj.wearDates,
        is_active: lensObj.isActive || false,
      }]);
    if (error) throw error;
  } catch (err) {
    console.error('Error saving new lens:', err);
  }
}

async function setActiveLensInDB(lensId) {
  if (!supabaseClient) { saveLocalState(); return; }
  try {
    await supabaseClient
      .from('lenses')
      .update({ is_active: false })
      .eq('user_id', currentUserId);

    await supabaseClient
      .from('lenses')
      .update({ is_active: true, activated_date: getLocalDateString() })
      .eq('id', lensId);
  } catch (err) {
    console.error('Error setting active lens:', err);
  }
}

async function updateWearDatesInDB(lensId, wearDates, activatedDate = null) {
  if (!supabaseClient) { saveLocalState(); return; }
  try {
    const updateObj = { wear_dates: wearDates };
    if (activatedDate) {
      updateObj.activated_date = activatedDate;
    }
    const { error } = await supabaseClient
      .from('lenses')
      .update(updateObj)
      .eq('id', lensId)
      .eq('user_id', currentUserId);
    if (error) throw error;
  } catch (err) {
    console.error('Error updating wear dates:', err);
  }
}

// ============================================================
// ✦ LOCAL STORAGE FALLBACK
// ============================================================
const LOCAL_STORAGE_KEY = 'berryeyes_lens_tracker_v3';

function loadLocalState() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); } catch { state = { lenses: [], activeLensId: null }; }
  } else {
    state = { lenses: [], activeLensId: null };
  }
}

function saveLocalState() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}

// ============================================================
// ✦ IMAGE COMPRESSION (Canvas)
// ============================================================
function compressImage(base64Str, maxWidth = 500, quality = 0.72) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64Str;
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

// ============================================================
// ✦ SESSION MANAGEMENT (Login / Logout)
// ============================================================
function goToHome() {
  // Show correct screens
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('screen-home').classList.add('active');
  document.querySelector('.phone-navbar').style.display = 'flex';

  // Update user display
  document.getElementById('current-user-display').textContent = currentUserId;

  // Set home as active tab
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active-tab'));
  document.querySelector('[data-target="home"]').classList.add('active-tab');

  document.querySelectorAll('.screen').forEach(s => {
    if (s.id !== 'screen-home') s.classList.remove('active');
  });
  document.getElementById('screen-home').classList.add('active');
}

function goToLoginScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-login').classList.add('active');
  document.querySelector('.phone-navbar').style.display = 'none';
  state = { lenses: [], activeLensId: null };
}

async function loginUser(userId) {
  currentUserId = userId.trim().toLowerCase().replace(/\s+/g, '_');
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, currentUserId);

  const ok = initSupabase();
  if (ok) {
    await loadFromSupabase();
  } else {
    loadLocalState();
  }

  goToHome();
  updateHomeUI();
  updateCollectionUI();
  renderCalendar();
}

function logoutUser() {
  currentUserId = null;
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  goToLoginScreen();
}

// ============================================================
// ✦ STATE HELPERS
// ============================================================
function getActiveLens() {
  return state.lenses.find(l => l.id === state.activeLensId) || null;
}

// ============================================================
// ✦ CONFETTI EFFECTS (Y2K Pastel Colors: #FFD1DC, #FF85A2, #FFFFFF)
// ============================================================
function triggerConfetti(element) {
  try {
    if (typeof confetti === 'function') {
      let originX = 0.5;
      let originY = 0.5;
      if (element) {
        const rect = element.getBoundingClientRect();
        originX = (rect.left + rect.width / 2) / window.innerWidth;
        originY = (rect.top + rect.height / 2) / window.innerHeight;
      }
      confetti({
        particleCount: 90,
        spread: 60,
        colors: ['#FFD1DC', '#FF85A2', '#FFFFFF'],
        origin: { x: originX, y: originY },
        ticks: 200,
        gravity: 1.1,
        scalar: 1.1
      });
    }
  } catch (err) {
    console.error('Confetti trigger failed', err);
  }
}

// ============================================================
// ✦ SPARKLE EFFECTS
// ============================================================
function burstSparkles(x, y) {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle-effect';
    s.innerText = ['✦', '✧', '★', '🌸'][Math.floor(Math.random() * 4)];
    s.style.color = ['#FF4D6D', '#FF85A1', '#FFB3C6', '#C5D3E8'][Math.floor(Math.random() * 4)];
    s.style.fontSize = `${10 + Math.random() * 12}px`;
    s.style.cssText += `position:fixed;z-index:9999;pointer-events:none;`;
    const angle = (i / n) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
    const dist = 30 + Math.random() * 40;
    s.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    document.body.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

document.addEventListener('click', (e) => {
  const t = e.target;
  if (
    t.closest('.nav-tab') || t.closest('.add-lens-btn') ||
    t.closest('.heart-switch') || t.closest('.calendar-day-cell') ||
    t.closest('.activate-btn') || t.closest('.close-modal-btn') ||
    t.closest('.form-submit-btn') || t.closest('.polaroid-card')
  ) {
    burstSparkles(e.clientX, e.clientY);
  }
});

// ============================================================
// ✦ HOME SCREEN UI
// ============================================================
function updateHomeUI() {
  const activeLens = getActiveLens();
  const fillElement = document.getElementById('progress-fill');
  const percentText = document.getElementById('home-progress-percent');
  const badgeElement = document.getElementById('active-lens-badge');
  const toggleInput = document.getElementById('today-wear-toggle');
  const toggleStatusText = document.getElementById('toggle-status-text');
  const wornDaysNum = document.getElementById('stat-worn-days');
  const leftDaysNum = document.getElementById('stat-left-days');

  if (!activeLens) {
    percentText.textContent = '0%';
    badgeElement.textContent = '請先啟用款式';
    fillElement.setAttribute('y', '90');
    toggleInput.disabled = true;
    toggleInput.checked = false;
    toggleStatusText.textContent = '請先至收藏庫新增並開啟一款月拋';
    wornDaysNum.textContent = '0 天';
    leftDaysNum.textContent = '30 天';
    return;
  }

  const wornDaysCount = activeLens.wearDates
    ? activeLens.wearDates.filter(d => d <= TODAY_DATE).length
    : 0;
  const remainingCount = Math.max(0, 30 - wornDaysCount);
  const percentage = Math.min(100, Math.round((wornDaysCount / 30) * 100));

  percentText.textContent = `${percentage}%`;
  badgeElement.textContent = activeLens.name;
  wornDaysNum.textContent = `${wornDaysCount} 天`;
  leftDaysNum.textContent = `${remainingCount} 天`;

  const yVal = 90 - (percentage / 100) * 80;
  fillElement.setAttribute('y', String(yVal));

  toggleInput.disabled = false;
  const wornToday = activeLens.wearDates.includes(TODAY_DATE);
  toggleInput.checked = wornToday;
  toggleStatusText.textContent = wornToday
    ? '今日已配戴！水汪汪的一天 ✿'
    : '今天尚未戴上隱形眼鏡';
}

// ============================================================
// ✦ SVG LENS ART GENERATOR
// ============================================================
function generateLensSVGArt(colorHex) {
  return `
    <div class="polaroid-svg-art">
      <span class="sparkle-decor sp-1">✦</span>
      <span class="sparkle-decor sp-2">✦</span>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="42" fill="none" stroke="${colorHex}" stroke-width="2.5" stroke-dasharray="6 3" opacity="0.6"/>
        <circle cx="50" cy="50" r="35" fill="${colorHex}" opacity="0.25"/>
        <circle cx="50" cy="50" r="29" fill="none" stroke="${colorHex}" stroke-width="3" opacity="0.8"/>
        <g stroke="${colorHex}" stroke-width="1.8" opacity="0.75" stroke-linecap="round">
          <line x1="50" y1="20" x2="50" y2="27"/><line x1="50" y1="80" x2="50" y2="73"/>
          <line x1="20" y1="50" x2="27" y2="50"/><line x1="80" y1="50" x2="73" y2="50"/>
          <line x1="29" y1="29" x2="35" y2="35"/><line x1="71" y1="71" x2="65" y2="65"/>
          <line x1="29" y1="71" x2="35" y2="65"/><line x1="71" y1="29" x2="65" y2="35"/>
        </g>
        <circle cx="50" cy="50" r="14" fill="#FFFFFF"/>
        <circle cx="44" cy="44" r="4.5" fill="#FFFFFF" opacity="0.9"/>
        <circle cx="56" cy="56" r="2" fill="#FFFFFF" opacity="0.75"/>
      </svg>
    </div>
  `;
}

// ============================================================
// ✦ COLLECTION SCREEN UI
// ============================================================
function updateCollectionUI() {
  const container = document.getElementById('lens-list-container');
  if (!container) return;
  container.innerHTML = '';

  if (state.lenses.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🌸</div>
        <div style="font-family: var(--font-serif); font-style: italic; font-size: 1rem; color: var(--primary-dark); margin-bottom: 6px;">
          收藏庫是空的
        </div>
        <div style="font-size: 0.72rem; line-height: 1.5;">
          點擊上方「＋ 新增款式」<br>加入您的第一款月拋！
        </div>
      </div>
    `;
    return;
  }

  state.lenses.forEach(lens => {
    const isActived = lens.id === state.activeLensId;
    const card = document.createElement('div');
    card.className = `polaroid-card ${isActived ? 'active-lens' : ''}`;
    card.dataset.id = lens.id;

    const photoList = lens.photos || [];
    let imgBlock = '';

    if (photoList.length === 0) {
      imgBlock = `<div class="polaroid-img-container">${generateLensSVGArt(lens.colorHex)}</div>`;
    } else if (photoList.length === 1) {
      imgBlock = `<div class="polaroid-img-container"><img class="polaroid-img" src="${photoList[0]}" alt="${lens.name}"></div>`;
    } else {
      imgBlock = `
        <div class="polaroid-img-container carousel-container">
          <img class="polaroid-img" src="${photoList[0]}" alt="${lens.name}">
          <button class="carousel-arrow prev-arrow">‹</button>
          <button class="carousel-arrow next-arrow">›</button>
          <div class="carousel-dots">
            ${photoList.map((_, idx) => `<span class="carousel-dot-indicator ${idx === 0 ? 'active' : ''}"></span>`).join('')}
          </div>
        </div>
      `;
    }

    const wornCount = lens.wearDates
      ? lens.wearDates.filter(d => d <= TODAY_DATE).length
      : 0;

    let activationText = '🆕 尚未啟用';
    if (lens.activatedDate) {
      const parts = lens.activatedDate.split('-');
      if (parts.length === 3) {
        activationText = `📅 ${parseInt(parts[0])} 年 ${parseInt(parts[1])} 月份款式`;
      }
    }

    card.innerHTML = `
      ${isActived ? `
        <div class="polaroid-active-badge">
          <svg style="width:10px;height:10px;fill:#fff;" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg>
          配戴中
        </div>
      ` : ''}
      ${imgBlock}
      <div class="polaroid-caption">
        <span class="polaroid-title">${lens.name}</span>
        <span class="polaroid-brand">${lens.brand}</span>
        <div style="font-size: 0.68rem; color: var(--primary-dark); font-weight: 600; margin-top: 4px;">
          ${activationText}
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px; font-weight: 500;">
          已戴天數: ${wornCount} / 30 天
        </div>
        ${!isActived ? `
          <button class="activate-btn" data-activate-id="${lens.id}">開啟用這款</button>
        ` : ''}
      </div>
    `;

    if (!isActived) {
      card.querySelector('.activate-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        activateLens(lens.id);
      });
    }

    container.appendChild(card);
  });

  // Carousel arrows
  container.querySelectorAll('.carousel-container').forEach(carousel => {
    const img = carousel.querySelector('.polaroid-img');
    const dots = carousel.querySelectorAll('.carousel-dot-indicator');
    const lensId = parseInt(carousel.closest('.polaroid-card').dataset.id);
    const lensObj = state.lenses.find(l => l.id === lensId);
    const photoList = lensObj ? (lensObj.photos || []) : [];
    if (photoList.length <= 1) return;
    let currentIndex = 0;

    const updateDots = () => {
      dots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentIndex));
    };

    carousel.querySelector('.prev-arrow').addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex - 1 + photoList.length) % photoList.length;
      img.src = photoList[currentIndex];
      updateDots();
    });
    carousel.querySelector('.next-arrow').addEventListener('click', (e) => {
      e.stopPropagation();
      currentIndex = (currentIndex + 1) % photoList.length;
      img.src = photoList[currentIndex];
      updateDots();
    });
  });
}

// ============================================================
// ✦ ACTIVATE LENS
// ============================================================
async function activateLens(id) {
  state.activeLensId = id;
  state.lenses.forEach(l => { l.isActive = l.id === id; });

  updateHomeUI();
  updateCollectionUI();
  renderCalendar();

  await setActiveLensInDB(id);
}

// ============================================================
// ✦ CALENDAR
// ============================================================
let calendarDate = new Date();

function renderCalendar() {
  const container = document.getElementById('calendar-days-container');
  const monthTitle = document.getElementById('calendar-month-title');
  if (!container || !monthTitle) return;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  monthTitle.textContent = `${monthNames[month]} ${year}`;
  container.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const activeLens = getActiveLens();
  const bowTemplate = document.getElementById('svg-bow-template').innerHTML;

  for (let i = 0; i < firstDayIndex; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day-cell empty-day';
    container.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.textContent = day;

    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (cellDateStr === TODAY_DATE) cell.classList.add('is-today');

    // Find if a lens was worn on this day
    const wornLens = state.lenses.find(l => l.wearDates && l.wearDates.includes(cellDateStr));
    if (wornLens) {
      const stamp = document.createElement('div');
      stamp.className = 'bow-stamp-overlay';
      // Fill the bow with the lens's colorHex and add a white + primary-dark double border for Y2K style & clarity
      stamp.innerHTML = `
        <svg viewBox="0 0 100 100" style="fill: ${wornLens.colorHex}; stroke: var(--primary-dark); stroke-width: 4px; stroke-linejoin: round;">
          ${bowTemplate}
        </svg>
      `;
      cell.appendChild(stamp);
      
      // Hover tooltip showing which lens model was worn on this day
      cell.title = `配戴款式: ${wornLens.name} (${wornLens.brand})`;
    }

    cell.addEventListener('click', async (e) => {
      if (!activeLens) {
        alert('請先到『收藏庫』新增並啟用一款月拋款式唷！');
        return;
      }

      if (activeLens.wearDates && activeLens.wearDates.includes(cellDateStr)) {
        // Cancel ONLY this single day from the wearDates array
        activeLens.wearDates = activeLens.wearDates.filter(d => d !== cellDateStr);
      } else {
        // Generate 30 days starting from the clicked date
        const parts = cellDateStr.split('-');
        const startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const newWearDates = [];
        for (let i = 0; i < 30; i++) {
          const next = new Date(startDate);
          next.setDate(startDate.getDate() + i);
          newWearDates.push(getLocalDateString(next));
        }
        activeLens.wearDates = newWearDates;

        // Auto-set the activation date if not set yet
        if (!activeLens.activatedDate) {
          activeLens.activatedDate = cellDateStr;
        }

        // Trigger Y2K canvas-confetti sparkle animation centered on the calendar cell
        triggerConfetti(cell);
      }

      updateHomeUI();
      updateCollectionUI();
      renderCalendar();

      await updateWearDatesInDB(activeLens.id, activeLens.wearDates, activeLens.activatedDate);
    });

    container.appendChild(cell);
  }

  // Render a dynamic color-coded lens legend for the displayed month
  const displayedMonthStr = String(month + 1).padStart(2, '0');
  const monthPrefix = `${year}-${displayedMonthStr}`;
  const lensesWornThisMonth = state.lenses.filter(l => 
    l.wearDates && l.wearDates.some(d => d.startsWith(monthPrefix))
  );

  const legendContainer = document.getElementById('calendar-lens-legend-container');
  if (legendContainer) {
    legendContainer.innerHTML = '';
    if (lensesWornThisMonth.length > 0) {
      const legendCard = document.createElement('div');
      legendCard.className = 'card';
      legendCard.style.cssText = 'padding: 12px 14px; margin-top: 14px; width: 100%; display: flex; flex-direction: column; gap: 8px;';
      
      let html = `
        <div style="font-family: var(--font-serif); font-size: 0.78rem; font-style: italic; color: var(--primary-dark); font-weight: 600; text-align: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px; margin-bottom: 2px;">
          ✦ 本月配戴美瞳款式對照 ✦
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
      `;
      
      lensesWornThisMonth.forEach(l => {
        html += `
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 600; background: var(--primary-light); padding: 4.5px 10px; border-radius: 12px; border: 1px solid rgba(255, 179, 198, 0.2);" title="${l.brand}">
            <span style="display: inline-block; width: 12px; height: 12px; background: ${l.colorHex}; border: 1.5px solid var(--primary-dark); border-radius: 50%;"></span>
            <span style="color: var(--text-main);">${l.name}</span>
          </div>
        `;
      });
      
      html += `</div>`;
      legendCard.innerHTML = html;
      legendContainer.appendChild(legendCard);
    }
  }
}

// ============================================================
// ✦ NAVIGATION TABS
// ============================================================
const tabs = document.querySelectorAll('.nav-tab');
tabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    e.preventDefault();
    tabs.forEach(t => t.classList.remove('active-tab'));
    tab.classList.add('active-tab');

    const target = tab.dataset.target;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const activeScreen = document.getElementById(`screen-${target}`);
    if (activeScreen) activeScreen.classList.add('active');

    // Reset scroll position to top when switching tabs
    const appScreen = document.getElementById('app-screen');
    if (appScreen) appScreen.scrollTop = 0;

    if (target === 'calendar') renderCalendar();
    if (target === 'news') loadAndRenderNews();
  });
});

// ============================================================
// ✦ WEAR TOGGLE (Home Switch)
// ============================================================
const todayWearToggle = document.getElementById('today-wear-toggle');
if (todayWearToggle) {
  todayWearToggle.addEventListener('change', async (e) => {
    const activeLens = getActiveLens();
    if (!activeLens) return;

    if (e.target.checked) {
      // If it doesn't already contain today, auto-populate 30 days starting today
      if (!activeLens.wearDates.includes(TODAY_DATE)) {
        const startDate = new Date();
        const newWearDates = [];
        for (let i = 0; i < 30; i++) {
          const next = new Date(startDate);
          next.setDate(startDate.getDate() + i);
          newWearDates.push(getLocalDateString(next));
        }
        activeLens.wearDates = newWearDates;

        // Auto-set the activation date if not set yet
        if (!activeLens.activatedDate) {
          activeLens.activatedDate = TODAY_DATE;
        }
      }

      // Trigger Y2K canvas-confetti sparkle animation centered on the heart switch
      triggerConfetti(e.target);
    } else {
      // Remove ONLY today's date from the wearDates array instead of resetting the entire 30 days
      activeLens.wearDates = activeLens.wearDates.filter(d => d !== TODAY_DATE);
    }

    updateHomeUI();
    updateCollectionUI();
    renderCalendar();

    await updateWearDatesInDB(activeLens.id, activeLens.wearDates, activeLens.activatedDate);
  });
}

// ============================================================
// ✦ ADD LENS MODAL
// ============================================================
const openModalBtn = document.getElementById('open-add-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalOverlay = document.getElementById('add-lens-modal');
const formSubmit = document.getElementById('add-lens-form');
const photoInput = document.getElementById('lens-photo');
const uploadBtnLabel = document.getElementById('upload-btn-label');

let uploadedPhotosBase64 = [];

if (openModalBtn && modalOverlay) {
  openModalBtn.addEventListener('click', () => {
    modalOverlay.classList.add('active');
    uploadedPhotosBase64 = [];
    if (uploadBtnLabel) uploadBtnLabel.textContent = '📷 選擇照片或拍照';
  });
}

if (closeModalBtn && modalOverlay) {
  closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });
}

if (photoInput) {
  photoInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (uploadBtnLabel) {
      uploadBtnLabel.textContent = '⏳ 壓縮照片中...';
    }

    try {
      const rawBase64s = await Promise.all(files.map(f => readFileAsDataURL(f)));
      uploadedPhotosBase64 = await Promise.all(rawBase64s.map(b => compressImage(b)));

      if (uploadBtnLabel) {
        uploadBtnLabel.textContent = files.length === 1
          ? `💖 已選擇: ${files[0].name.substring(0, 14)}...`
          : `💖 已選擇 ${files.length} 張照片`;
      }
    } catch (err) {
      console.error('Error compressing images:', err);
    }
  });
}

if (formSubmit) {
  formSubmit.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('lens-name').value.trim();
    const brand = document.getElementById('lens-brand').value.trim();
    if (!name || !brand) return;

    const pastelColors = ['#FFB3C6', '#FFA3B8', '#DDB892', '#C5D3E8', '#DFCCF1', '#F9E4B7'];
    const randomColorHex = pastelColors[Math.floor(Math.random() * pastelColors.length)];

    const newLens = {
      id: Date.now(),
      name,
      brand,
      colorHex: randomColorHex,
      photos: uploadedPhotosBase64,
      activatedDate: null,
      wearDates: [],
      isActive: false,
    };

    // Auto-activate if first lens
    if (!state.activeLensId) {
      newLens.isActive = true;
      newLens.activatedDate = getLocalDateString();
      state.activeLensId = newLens.id;
    }

    state.lenses.push(newLens);

    formSubmit.reset();
    uploadedPhotosBase64 = [];
    modalOverlay.classList.remove('active');

    updateHomeUI();
    updateCollectionUI();
    renderCalendar();

    await saveNewLens(newLens);
    if (newLens.isActive) {
      await setActiveLensInDB(newLens.id);
    }
  });
}

// ============================================================
// ✦ CALENDAR MONTH NAVIGATION
// ============================================================
const prevMonthBtn = document.getElementById('calendar-prev-month');
const nextMonthBtn = document.getElementById('calendar-next-month');

if (prevMonthBtn) {
  prevMonthBtn.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
}
if (nextMonthBtn) {
  nextMonthBtn.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });
}

// ============================================================
// ✦ LOGIN SCREEN
// ============================================================
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('login-username').value.trim();
    if (!userId) return;
    await loginUser(userId);
  });
}

const logoutBtn = document.getElementById('logout-user-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    if (confirm('確定要登出嗎？')) logoutUser();
  });
}

// ============================================================
// ✦ NEWS SCREEN & LIVE SCRAPER
// ============================================================
function parseNewsLens(title, subtitle) {
  let cleanTitle = title.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim();
  
  let brand = "Chacha";
  let name = cleanTitle;
  
  const cnMatch = cleanTitle.match(/[\u4e00-\u9fa5]+/);
  const enMatch = cleanTitle.match(/[A-Za-z\s'\+]+/);
  
  if (cnMatch && enMatch) {
    brand = enMatch[0].trim();
    name = cnMatch[0].trim();
  } else if (enMatch) {
    brand = enMatch[0].trim();
    name = "熱門款式";
  } else if (cnMatch) {
    name = cnMatch[0].trim();
    const subEnMatch = subtitle.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").match(/[A-Za-z\s'\+]+/);
    if (subEnMatch) {
      brand = subEnMatch[0].trim();
    }
  }
  
  if (brand.length > 20) brand = brand.substring(0, 20);
  if (name.length > 20) name = name.substring(0, 20);
  
  return { brand, name };
}

function renderNewsUI(newsItems) {
  const container = document.getElementById('news-list-container');
  if (!container) return;
  container.innerHTML = '';

  // 過濾掉無標題、無副標題、無內文的空白橫幅宣傳框 (例如官網最上方的背景 LOGO Banner)
  const validItems = (newsItems || []).filter(item => {
    return (item.title && item.title.trim() !== '') || 
           (item.subtitle && item.subtitle.trim() !== '') || 
           (item.content && item.content.trim() !== '');
  });

  if (validItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">📰</div>
        <div style="font-family: var(--font-serif); font-style: italic; font-size: 1rem; color: var(--primary-dark); margin-bottom: 6px;">
          目前尚無情報資料
        </div>
        <div style="font-size: 0.72rem; line-height: 1.5;">
          請確認網路連線，並點擊上方「重新整理」<br>嘗試線上即時爬取情報！
        </div>
      </div>
    `;
    return;
  }

  validItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'news-card';
    
    let imgBlock = '';
    if (item.image) {
      imgBlock = `
        <div class="news-card-img-wrapper">
          <img class="news-card-img" src="${item.image}" alt="${item.title || '美瞳情報'}" loading="lazy">
        </div>
      `;
    }

    const titleHtml = item.title ? `<div class="news-card-title">${item.title}</div>` : '';
    const subtitleHtml = item.subtitle ? `<div class="news-card-subtitle">${item.subtitle}</div>` : '';
    
    let contentHtml = '';
    let toggleBtnHtml = '';
    if (item.content) {
      const isLong = item.content.length > 80;
      contentHtml = `
        <div class="news-card-content-container ${isLong ? 'collapsed' : ''}">
          ${item.content}
        </div>
      `;
      if (isLong) {
        toggleBtnHtml = `<button class="news-card-toggle-btn"><span>✨</span> 展開完整情報</button>`;
      }
    }

    const linkBtnHtml = item.link ? `<a class="news-card-btn news-card-btn-link" href="${item.link}" target="_blank">前往官網 🔗</a>` : '';
    const addBtnHtml = item.title ? `<button class="news-card-btn news-card-btn-add" data-news-title="${item.title}" data-news-subtitle="${item.subtitle || ''}">快速加入款式 🌸</button>` : '';
    
    const actionsHtml = (linkBtnHtml || addBtnHtml) ? `
      <div class="news-card-actions">
        ${linkBtnHtml}
        ${addBtnHtml}
      </div>
    ` : '';

    card.innerHTML = `
      ${imgBlock}
      <div class="news-card-body">
        ${subtitleHtml}
        ${titleHtml}
        ${contentHtml}
        ${toggleBtnHtml}
        ${actionsHtml}
      </div>
    `;

    const toggleBtn = card.querySelector('.news-card-toggle-btn');
    if (toggleBtn) {
      const contentContainer = card.querySelector('.news-card-content-container');
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = contentContainer.classList.toggle('collapsed');
        toggleBtn.innerHTML = isCollapsed 
          ? '<span>✨</span> 展開完整情報' 
          : '<span>✦</span> 收合';
      });
    }

    const addBtn = card.querySelector('.news-card-btn-add');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const titleVal = addBtn.dataset.newsTitle;
        const subtitleVal = addBtn.dataset.newsSubtitle;
        const parsed = parseNewsLens(titleVal, subtitleVal);
        
        const nameInput = document.getElementById('lens-name');
        const brandInput = document.getElementById('lens-brand');
        const addModal = document.getElementById('add-lens-modal');
        
        if (nameInput && brandInput && addModal) {
          nameInput.value = parsed.name;
          brandInput.value = parsed.brand;
          uploadedPhotosBase64 = [];
          const uploadLabel = document.getElementById('upload-btn-label');
          if (uploadLabel) uploadLabel.textContent = '📷 選擇照片或拍照';
          
          addModal.classList.add('active');
        }
      });
    }

    container.appendChild(card);
  });
}

async function loadAndRenderNews(forceUpdate = false) {
  const syncTimeEl = document.getElementById('news-sync-time');
  const cacheKey = 'berryeyes_news_cache';
  const cacheTimeKey = 'berryeyes_news_cache_time';

  const cachedNews = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);

  if (cachedNews && !forceUpdate) {
    if (syncTimeEl) syncTimeEl.textContent = `上次同步: ${cachedTime || '未知'}`;
    try {
      renderNewsUI(JSON.parse(cachedNews));
      return;
    } catch (e) {
      console.error('Failed to parse cached news', e);
    }
  }

  if (syncTimeEl) syncTimeEl.textContent = '讀取快照資料中...';
  try {
    const res = await fetch('./news_data.json');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      const syncStr = new Date().toLocaleString();
      localStorage.setItem(cacheTimeKey, syncStr);
      if (syncTimeEl) syncTimeEl.textContent = `快照更新時間: ${syncStr}`;
      renderNewsUI(data);
      return;
    }
  } catch (err) {
    console.warn('Failed to load news fallback JSON via fetch, using embedded JS backup:', err);
  }

  // File protocol fallback using imported news_data.js script variable
  if (window.DEFAULT_NEWS_DATA && window.DEFAULT_NEWS_DATA.length > 0) {
    const data = window.DEFAULT_NEWS_DATA;
    localStorage.setItem(cacheKey, JSON.stringify(data));
    const syncStr = new Date().toLocaleString() + ' (離線備份)';
    localStorage.setItem(cacheTimeKey, syncStr);
    if (syncTimeEl) syncTimeEl.textContent = `載入本地備份: ${syncStr}`;
    renderNewsUI(data);
  } else {
    renderNewsUI([]);
  }
}

async function fetchHTMLWithFallback(url) {
  // Proxy 1: corsproxy.io
  try {
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 200) {
        console.log("Successfully fetched via corsproxy.io");
        return text;
      }
    }
  } catch (e) {
    console.warn("corsproxy.io failed, trying next proxy", e);
  }

  // Proxy 2: api.allorigins.win
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.contents) {
        console.log("Successfully fetched via allorigins.win");
        return json.contents;
      }
    }
  } catch (e) {
    console.warn("allorigins.win failed, trying next proxy", e);
  }

  // Proxy 3: thingproxy.freeboard.io
  try {
    const res = await fetch(`https://thingproxy.freeboard.io/fetch/${url}`);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 200) {
        console.log("Successfully fetched via thingproxy");
        return text;
      }
    }
  } catch (e) {
    console.warn("thingproxy failed", e);
  }

  throw new Error("All CORS proxies failed");
}

async function syncLiveNews() {
  const syncTimeEl = document.getElementById('news-sync-time');
  const syncBtn = document.getElementById('news-sync-btn');
  const indicator = document.querySelector('.sync-indicator-dot');

  if (syncBtn) syncBtn.disabled = true;
  if (indicator) indicator.classList.add('syncing');
  if (syncTimeEl) syncTimeEl.textContent = '正在連線爬取最新消息...';

  try {
    const url = 'https://www.chachalook.com/pages/news-2024';
    const htmlText = await fetchHTMLWithFallback(url);

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    const sections = doc.querySelectorAll('.shopline-section');
    const newsItems = [];

    sections.forEach(sec => {
      const secId = sec.id || '';
      if (secId.includes('header') || secId.includes('footer')) return;

      const img = sec.querySelector('img');
      let imgUrl = '';
      if (img) {
        imgUrl = img.getAttribute('src') || img.getAttribute('data-src') || '';
        if (imgUrl.startsWith('//')) {
          imgUrl = 'https:' + imgUrl;
        }
      }

      const titleEl = sec.querySelector('.text-block__title');
      const title = titleEl ? titleEl.textContent.trim() : '';

      const subtitleEl = sec.querySelector('.text-block__subtitle');
      const subtitle = subtitleEl ? subtitleEl.textContent.trim() : '';

      const contentEl = sec.querySelector('.text-block__content');
      let content = '';
      if (contentEl) {
        let innerHtml = contentEl.innerHTML;
        innerHtml = innerHtml.replace(/<\/p>\s*<p>/g, '\n');
        innerHtml = innerHtml.replace(/<br\s*\/?>/g, '\n');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = innerHtml;
        content = tempDiv.textContent.trim();
        content = content.replace(/\n+/g, '\n');
      }

      const btn = sec.querySelector('.text-block__button');
      let link = btn ? (btn.getAttribute('href') || '') : '';
      if (link && link.startsWith('/')) {
        link = 'https://www.chachalook.com' + link;
      }

      if (title || subtitle || imgUrl) {
        newsItems.push({
          section_id: secId,
          title,
          subtitle,
          content,
          image: imgUrl,
          link
        });
      }
    });

    if (newsItems.length === 0) {
      throw new Error('No news items parsed');
    }

    const nowStr = new Date().toLocaleString();
    localStorage.setItem('berryeyes_news_cache', JSON.stringify(newsItems));
    localStorage.setItem('berryeyes_news_cache_time', nowStr);

    if (syncTimeEl) syncTimeEl.textContent = `即時更新: ${nowStr}`;
    renderNewsUI(newsItems);
    // Success - show inline status instead of blocking alert

  } catch (err) {
    console.error('Dynamic scraping failed', err);
    if (syncTimeEl) syncTimeEl.textContent = '⚠️ 即時爬取失敗，已載入備用資料';
    await loadAndRenderNews(true);
  } finally {
    if (syncBtn) syncBtn.disabled = false;
    if (indicator) indicator.classList.remove('syncing');
  }
}

// Setup refresh button event
const syncBtn = document.getElementById('news-sync-btn');
if (syncBtn) {
  syncBtn.addEventListener('click', () => {
    syncLiveNews();
  });
}

// ============================================================
// ✦ SUPABASE CONFIG MODAL
// ============================================================
const configModal = document.getElementById('supabase-config-modal');
const closeConfigBtn = document.getElementById('close-config-modal-btn');
const loginOpenConfigBtn = document.getElementById('login-open-config-btn');
const homeOpenConfigBtn = document.getElementById('home-open-config-btn');
const configForm = document.getElementById('supabase-config-form');

function openConfigModal() {
  if (!configModal) return;
  // Pre-fill with current values
  const urlInput = document.getElementById('db-url');
  const keyInput = document.getElementById('db-anon-key');
  if (urlInput) urlInput.value = SUPABASE_URL;
  if (keyInput) keyInput.value = SUPABASE_ANON_KEY;
  configModal.classList.add('active');
}

if (loginOpenConfigBtn) loginOpenConfigBtn.addEventListener('click', openConfigModal);
if (homeOpenConfigBtn) homeOpenConfigBtn.addEventListener('click', openConfigModal);
if (closeConfigBtn) closeConfigBtn.addEventListener('click', () => configModal.classList.remove('active'));

if (configForm) {
  configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    configModal.classList.remove('active');
    alert('✓ 目前使用的是預設雲端設定，無需修改。');
  });
}



// ============================================================
// ✦ INIT
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
  // Hide nav bar initially
  document.querySelector('.phone-navbar').style.display = 'none';

  // Check saved user
  const savedUserId = localStorage.getItem(LOCAL_STORAGE_USER_KEY);

  if (savedUserId) {
    // Restore session
    await loginUser(savedUserId);
  } else {
    // Show login screen
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-login').classList.add('active');
  }
});
