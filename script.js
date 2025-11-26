const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json'; 
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');

// Окна
const modal = document.getElementById('progress-modal');
const installView = document.getElementById('install-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const errorMessage = document.getElementById('error-message');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const modalStatus = document.getElementById('modal-status');
const modalTitle = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close-btn');

const repairModal = document.getElementById('repair-modal'); 
const repairList = document.getElementById('repair-list');
const repairCloseBtn = document.getElementById('repair-close-btn');

const infoModal = document.getElementById('info-modal'); 
const infoTitle = document.getElementById('info-modal-title');
const infoDesc = document.getElementById('info-modal-desc');
const infoActionBtn = document.getElementById('info-modal-action');
const infoCloseBtn = document.getElementById('info-close-btn');

const splash = document.getElementById('splash-screen');

let currentInstallMethod = 'auto'; 
let globalModsList = []; 
let globalBuyList = []; 
let globalInstalledIds = [];

document.addEventListener('DOMContentLoaded', () => {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor); else applyAccentColor('#d0bcff');
    
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods(); 
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);
    
    checkPing(); 
    setInterval(checkPing, 5000);
});

window.addEventListener('pywebviewready', checkEnvironment);

async function checkPing() {
    const pingText = document.getElementById('ping-text');
    const pingDot = document.getElementById('ping-dot');
    if (!pingText || !pingDot) return;
    
    const start = Date.now();
    try {
        await fetch(REPO_JSON_URL + '?t=' + start, { method: 'HEAD', cache: 'no-store' });
        const end = Date.now();
        const ping = end - start;
        pingText.innerText = `Соединено: ${ping} ms`;
        pingDot.style.backgroundColor = ping < 150 ? '#4caf50' : (ping < 300 ? '#ff9800' : '#f44336');
        pingDot.style.boxShadow = `0 0 8px ${pingDot.style.backgroundColor}`;
    } catch (e) {
        pingText.innerText = 'Нет сети';
        pingDot.style.backgroundColor = '#f44336';
        pingDot.style.boxShadow = 'none';
    }
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}

function applyAccentColor(color) {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color; 
    document.body.removeChild(div);

    const rgbMatch = computed.match(/\d+/g);
    if (rgbMatch) {
        const rgbVal = `${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}`;
        document.documentElement.style.setProperty('--md-sys-color-primary', computed);
        document.documentElement.style.setProperty('--md-sys-color-primary-rgb', rgbVal);
        document.documentElement.style.setProperty('--md-sys-color-on-primary', '#1e1e1e');
    }
}

function renderSettings() {
    let col = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim();
    
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="big-panel grow-panel">
                <h2 class="panel-title">Персонализация</h2>
                
                <div class="custom-color-picker">
                    <div class="picker-header">
                        <div class="current-color-preview" id="color-preview" style="background-color: ${col};"></div>
                        <div class="picker-info">
                            <h3>Акцентный цвет</h3>
                            <p>Выберите основной цвет интерфейса</p>
                        </div>
                    </div>
                    
                    <div class="picker-controls">
                        <label>Оттенок</label>
                        <input type="range" min="0" max="360" value="260" class="slider-hue" id="hue-slider">
                        
                        <label style="margin-top:16px;">Пресеты</label>
                        <div class="presets-grid">
                            <div class="color-preset" style="background: #d0bcff" data-col="#d0bcff"></div>
                            <div class="color-preset" style="background: #ff4081" data-col="#ff4081"></div>
                            <div class="color-preset" style="background: #00e676" data-col="#00e676"></div>
                            <div class="color-preset" style="background: #2979ff" data-col="#2979ff"></div>
                            <div class="color-preset" style="background: #ffea00" data-col="#ffea00"></div>
                            <div class="color-preset" style="background: #e040fb" data-col="#e040fb"></div>
                        </div>
                    </div>
                </div>

                <div class="divider" style="margin: 24px 0;"></div>
                <button class="reset-theme-btn" onclick="resetTheme()">
                    <span class="material-symbols-outlined">restart_alt</span> Сбросить тему
                </button>
            </div>
        </div>`;

    const hueSlider = document.getElementById('hue-slider');
    const preview = document.getElementById('color-preview');
    const presets = document.querySelectorAll('.color-preset');

    if (hueSlider) {
        hueSlider.addEventListener('input', (e) => {
            const hue = e.target.value;
            const color = `hsl(${hue}, 100%, 75%)`; 
            applyAccentColor(color);
            localStorage.setItem('accentColor', color);
            preview.style.backgroundColor = color;
        });
    }

    presets.forEach(p => {
        p.addEventListener('click', () => {
            const color = p.getAttribute('data-col');
            applyAccentColor(color);
            localStorage.setItem('accentColor', color);
            preview.style.backgroundColor = color;
        });
    });
}

window.resetTheme = function() { applyAccentColor('#d0bcff'); localStorage.removeItem('accentColor'); renderSettings(); }

function checkEnvironment() {
    const repairBtn = document.getElementById('global-repair-btn');
    if (window.pywebview && repairBtn) repairBtn.classList.remove('hidden');
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active')); item.classList.add('active');
        handleTabChange(item.getAttribute('data-tab'));
    });
});
function handleTabChange(tab) {
    contentArea.classList.add('fade-out');
    setTimeout(() => {
        contentArea.innerHTML = ''; contentArea.className = '';
        if (tab === 'mods') { contentArea.classList.add('content-grid'); loadMods(); }
        else if (tab === 'install-methods') renderInstallMethods();
        else if (tab === 'authors') loadAuthors();
        else if (tab === 'settings') renderSettings();
        requestAnimationFrame(() => contentArea.classList.remove('fade-out'));
    }, 250);
}

async function loadMods() {
    try {
        const [modsResp, buyResp] = await Promise.all([
            fetch(REPO_JSON_URL).catch(e => null),
            fetch(REPO_BUY_URL).catch(() => ({ json: () => [] }))
        ]);

        if (!modsResp || !modsResp.ok) throw new Error("Не удалось загрузить каталог");

        globalModsList = await modsResp.json(); 
        globalBuyList = await buyResp.json();
        globalInstalledIds = [];
        
        if (window.pywebview) {
            try { globalInstalledIds = await window.pywebview.api.check_installed_mods(globalModsList); } catch (e) {}
        }
        renderMods(globalModsList, globalInstalledIds, globalBuyList);
    } catch (e) { 
        contentArea.innerHTML = `<div class="empty-state"><p>Ошибка загрузки: ${e.message}</p></div>`; 
    } finally {
        setTimeout(() => { if(splash) splash.classList.add('fade-out'); }, 500);
    }
}

function renderMods(mods, installedIds, buyList) {
    contentArea.innerHTML = '';
    if (!mods || mods.length === 0) { contentArea.innerHTML = '<p class="empty-text">Пусто.</p>'; return; }

    mods.forEach(mod => {
        let img = mod.image || ""; if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
        if(!img) img = "https://via.placeholder.com/400x220/111/fff?text=No+Image";
        
        const isInst = installedIds.includes(mod.id);
        const buyInfo = buyList.find(b => b.id === mod.id);
        
        let btnText = 'Установить';
        let btnIcon = 'download';
        let btnClass = 'install-btn';
        let isDisabled = false;
        let onClickAction = `startInstallProcess('${mod.id}', '${mod.name}', '${mod.file}')`;

        if (buyInfo) {
            if (buyInfo.status === 'preorder') {
                btnText = 'Предзаказ';
                btnIcon = 'schedule';
                onClickAction = `openInfoModal('preorder', '${mod.id}')`;
            } else {
                btnText = 'Купить';
                btnIcon = 'shopping_cart';
                onClickAction = `openInfoModal('paid', '${mod.id}')`;
            }
        } else {
            if (!window.pywebview) {
                btnText = 'Доступно в приложении';
                isDisabled = true;
            } else if (isInst) {
                btnText = 'Уже установлен';
                btnIcon = 'check';
                btnClass = 'install-btn installed';
                isDisabled = true;
            }
        }

        const card = document.createElement('div');
        card.className = 'mod-card';
        card.innerHTML = `
            <img src="${img}" class="card-image" loading="lazy">
            <div class="card-content">
                <h3 class="card-title">${mod.name}</h3>
                <p class="card-author">Автор: <span>${mod.author || "?"}</span></p>
                <p class="card-desc">${mod.description || ""}</p>
                <button class="${btnClass}" ${isDisabled ? 'disabled' : ''} onclick="${onClickAction}">
                    <span class="material-symbols-outlined">${btnIcon}</span> ${btnText}
                </button>
            </div>`;
        contentArea.appendChild(card);
    });
}

function openInfoModal(type, modId) {
    const buyItem = globalBuyList.find(b => b.id === modId);
    const modItem = globalModsList.find(m => m.id === modId);
    if (!buyItem || !modItem) return;

    infoModal.classList.remove('hidden');
    infoActionBtn.className = 'modal-action-btn'; 

    let statusTitle = type === 'preorder' ? 'Предзаказ' : 'Платный контент';
    let btnText = type === 'preorder' ? 'ЗАКАЗАТЬ' : 'КУПИТЬ';
    let btnIcon = type === 'preorder' ? 'schedule' : 'shopping_cart';

    infoTitle.innerText = statusTitle;
    
    infoDesc.innerHTML = `
        <div class="info-row"><span class="info-label">Мод:</span><span class="info-value">${modItem.name}</span></div>
        <div class="info-row"><span class="info-label">Автор:</span><span class="info-value author-highlight">${modItem.author}</span></div>
        <div class="divider" style="margin: 16px 0;"></div>
        <p class="info-description">${buyItem.desc || "Описание недоступно."}</p>
        <div class="info-price-tag">${buyItem.price || "Цена договорная"}</div>
    `;

    infoActionBtn.innerHTML = `${btnText} <span class="material-symbols-outlined">${btnIcon}</span>`;
    infoActionBtn.onclick = () => { if (buyItem.link) window.open(buyItem.link, '_blank'); };
}

if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

function renderInstallMethods() {
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="methods-grid">
                <div class="method-card-new ${currentInstallMethod === 'auto' ? 'active-method' : ''}" id="card-auto"><div class="method-icon"><span class="material-symbols-outlined">smart_toy</span></div><div class="method-content"><h3>Автоматически</h3><p>Сам найдет папку packs</p></div><label class="switch"><input type="checkbox" id="toggle-auto" ${currentInstallMethod === 'auto' ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="method-card-new ${currentInstallMethod === 'sdls' ? 'active-method' : ''}" id="card-sdls"><div class="method-icon"><span class="material-symbols-outlined">folder_zip</span></div><div class="method-content"><h3>sDLS Метод</h3><p>Ручной режим (Documents)</p></div><label class="switch"><input type="checkbox" id="toggle-sdls" ${currentInstallMethod === 'sdls' ? 'checked' : ''}><span class="slider"></span></label></div>
                <div class="method-card-new ${currentInstallMethod === 'no_sdls' ? 'active-method' : ''}" id="card-nosdls"><div class="method-icon"><span class="material-symbols-outlined">folder_open</span></div><div class="method-content"><h3>Стандартный (No-SDLS)</h3><p>Прямая замена файлов</p></div><label class="switch"><input type="checkbox" id="toggle-nosdls" ${currentInstallMethod === 'no_sdls' ? 'checked' : ''}><span class="slider"></span></label></div>
            </div>
            <div class="big-panel grow-panel"><h2 class="panel-title">Справка по методам</h2><div class="methods-info-list"><div class="info-item"><div class="info-content"><span class="dash">—</span><p>Обычно не нужен, но если ты не знаешь что конкретно щас, микропатч или просто обнова, тыкни тумблер, лаунчер поможет.</p></div><span class="info-badge badge-auto">Автоматически</span></div><div class="divider"></div><div class="info-item"><div class="info-content"><span class="dash">—</span><p>Если ты уже в курсе что у игры есть микропатч, тыкай сюда и устаналивай.</p></div><span class="info-badge badge-sdls">sDLS Метод</span></div><div class="divider"></div><div class="info-item"><div class="info-content"><span class="dash">—</span><p>Тоже самое что и второй, только при условии что это обычная обнова :3</p></div><span class="info-badge badge-nosdls">Стандартный</span></div></div></div>
        </div>`;
    const tA = document.getElementById('toggle-auto'), tS = document.getElementById('toggle-sdls'), tN = document.getElementById('toggle-nosdls');
    const cA = document.getElementById('card-auto'), cS = document.getElementById('card-sdls'), cN = document.getElementById('card-nosdls');
    function upd(m) { currentInstallMethod = m; cA.classList.remove('active-method'); cS.classList.remove('active-method'); cN.classList.remove('active-method'); if(m==='auto')cA.classList.add('active-method'); if(m==='sdls')cS.classList.add('active-method'); if(m==='no_sdls')cN.classList.add('active-method'); }
    tA.addEventListener('change', ()=>{if(tA.checked){tS.checked=false;tN.checked=false;upd('auto');}else tA.checked=true;});
    tS.addEventListener('change', ()=>{if(tS.checked){tA.checked=false;tN.checked=false;upd('sdls');}else tS.checked=true;});
    tN.addEventListener('change', ()=>{if(tN.checked){tA.checked=false;tS.checked=false;upd('no_sdls');}else tN.checked=true;});
}

async function loadAuthors() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div></div>`;
    try {
        const response = await fetch(REPO_AUTHORS_URL);
        const authors = await response.json();
        let authorsListHtml = '';
        authors.forEach((author) => {
            let avatarUrl = author.avatar || "";
            if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = REPO_BASE_URL + avatarUrl;
            const firstLetter = author.name ? author.name.charAt(0).toUpperCase() : "?";
            authorsListHtml += `
                <div class="author-row">
                    <div class="author-avatar-wrapper">
                        <img src="${avatarUrl}" alt="${author.name}" class="author-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="author-avatar-placeholder" style="background-color: rgba(var(--md-sys-color-primary-rgb), 0.2); color: var(--md-sys-color-primary); display: none;">${firstLetter}</div>
                    </div>
                    <div class="author-details">
                        <h3>${author.name}</h3>
                        <span class="role">${author.role}</span>
                        <p>${author.bio || ""}</p>
                    </div>
                </div>`;
        });
        contentArea.innerHTML = `
            <div class="about-page-container">
                <div class="big-panel authors-panel">
                    <h2 class="panel-title">Команда проекта</h2>
                    <div class="authors-list">${authorsListHtml}</div>
                </div>
                
                <div class="big-panel app-info-panel">
                    <h2 class="panel-title">О приложении</h2>
                    <div class="app-details">
                        <div class="app-header-row">
                            <span class="app-version-badge">LOADER ASTR v1.0.0 Beta</span>
                            <span style="font-size: 13px; color: #666;">Build: 2025.11.25</span>
                        </div>
                        
                        <div class="app-description-block">
                            <p class="app-desc-text">Это универсальный лаунчер-загрузчик модов в игру <strong>Tanks Blitz</strong>.</p>
                            <ul class="app-features-list-new">
                                <li>Учитывает <strong>sDLS</strong></li>
                                <li>Поддерживает обычные обновления</li>
                                <li>Автоматические бэкапы</li>
                                <li>Удобный каталог модификаций</li>
                                <li>Быстрое восстановление игры</li>
                            </ul>
                        </div>
                        
                        <div style="flex-grow: 1;"></div>
                        
                        <div class="app-footer-row">
                            <p class="app-credits">(C) Launcher 2025</p>
                        </div>
                    </div>
                </div>
            </div>`;
    } catch (error) { contentArea.innerHTML = `<p style="color:#ff5252;">Ошибка авторов.</p>`; }
}

function startInstallProcess(id, name, url) {
    if(!window.pywebview) return;
    if(url && !url.startsWith('http')) url = REPO_BASE_URL + url;
    installView.classList.remove('view-hidden'); successView.classList.add('view-hidden'); errorView.classList.add('view-hidden');
    progressBar.style.width = "0%"; progressPercent.innerText = "0%"; modalTitle.innerText = name; modalStatus.innerText = "Подготовка...";
    modal.classList.remove('hidden');
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

if(modalCloseBtn) modalCloseBtn.addEventListener('click', () => { if(window.pywebview) window.pywebview.api.cancel_install(); closeModal(); });
function closeModal() { modal.classList.add('hidden'); }

window.updateRealProgress = (p, t) => { progressBar.style.width = p + "%"; progressPercent.innerText = p + "%"; modalStatus.innerText = t; }
window.finishInstall = (s, m) => {
    if(s) { installView.classList.add('view-hidden'); successView.classList.remove('view-hidden'); setTimeout(() => { closeModal(); loadMods(); }, 2000); }
    else { if(m==="Canceled"){closeModal();} else { installView.classList.add('view-hidden'); errorView.classList.remove('view-hidden'); errorMessage.innerText = m; setTimeout(closeModal, 3000); } }
}

function openRepairModal() {
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));
    repairList.innerHTML = '';
    if (installedMods.length === 0) repairList.innerHTML = '<p class="empty-text">Нет установленных модов для починки.</p>';
    else {
        installedMods.forEach(mod => {
            const item = document.createElement('div'); item.className = 'repair-item';
            item.innerHTML = `<span>${mod.name}</span><button class="repair-action-btn" onclick="restoreMod('${mod.id}', '${mod.name}')"><span class="material-symbols-outlined">build</span></button>`;
            repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}

async function restoreMod(id, name) {
    repairModal.classList.add('hidden');
    installView.classList.remove('view-hidden'); successView.classList.add('view-hidden'); errorView.classList.add('view-hidden');
    progressBar.style.width = "100%"; progressPercent.innerText = ""; modalTitle.innerText = "Восстановление..."; modalStatus.innerText = "Обработка...";
    modal.classList.remove('hidden');
    const res = await window.pywebview.api.restore_mod(id);
    if (res.success) finishInstall(true, res.message); else finishInstall(false, res.message);
}

if(repairCloseBtn) repairCloseBtn.addEventListener('click', () => repairModal.classList.add('hidden'));

const rb = document.getElementById('global-repair-btn'); if(rb) rb.addEventListener('click', openRepairModal);
