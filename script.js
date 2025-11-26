const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
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

// Обновление
const btnCheckUpdates = document.getElementById('btn-check-updates');
const updateModal = document.getElementById('update-modal');
const updateVerSpan = document.getElementById('update-version');
const updateSizeSpan = document.getElementById('update-size');
const updateLogP = document.getElementById('update-changelog');
const btnStartUpdate = document.getElementById('btn-start-update');
const btnSkipUpdate = document.getElementById('btn-skip-update');

const toast = document.getElementById('toast-notification');

// GEO Check
const geoModal = document.getElementById('geo-modal');
const geoExitBtn = document.getElementById('geo-exit-btn');
const geoContinueBtn = document.getElementById('geo-continue-btn');

let currentInstallMethod = 'auto';
let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = [];
let newUpdateUrl = "";

document.addEventListener('DOMContentLoaded', () => {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);
    else applyAccentColor('#d0bcff');
    
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

function showToast(msg) {
    if(!toast) return;
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- GEO RESTRICTION LOGIC ---
async function checkGeoRestriction() {
    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.check_connection_status) {
        return;
    }
    try {
        const res = await window.pywebview.api.check_connection_status();
        if (res && res.status === 'blocked') {
            if (geoModal) {
                geoModal.classList.remove('hidden');
            }
        }
    } catch (e) {
        console.warn('Geo check failed', e);
    }
}

if (geoExitBtn) {
    geoExitBtn.addEventListener('click', () => {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.close) {
            window.pywebview.api.close();
        } else if (geoModal) {
            geoModal.classList.add('hidden');
        }
    });
}

if (geoContinueBtn) {
    geoContinueBtn.addEventListener('click', () => {
        if (geoModal) {
            geoModal.classList.add('hidden');
        }
    });
}
// -----------------------------

function checkEnvironment() {
    // Проверка окружения (вызывается при старте)
    if (!window.pywebview) {
        // Если запущено в браузере
    } else {
        // Если в приложении
    }
    // Запускаем проверку IP
    checkGeoRestriction();
}

async function checkForUpdates(manual = false) {
    if (!window.pywebview) {
        if(manual) showToast("Доступно только в приложении");
        return;
    }
    if(manual && btnCheckUpdates) {
        const icon = btnCheckUpdates.querySelector('span');
        if(icon) icon.style.animation = "spin 1s linear infinite";
    }
    try {
        const res = await window.pywebview.api.check_for_updates();
        if (res.available) {
            newUpdateUrl = res.url;
            updateVerSpan.innerText = "v" + res.version;
            updateLogP.innerText = res.changelog;
            updateSizeSpan.innerText = res.size || "Неизвестно";
            updateModal.classList.remove('hidden');
        } else {
            if (manual) showToast(res.message || "Обновлений не найдено");
        }
    } catch (e) {
        if (manual) showToast("Ошибка проверки");
    } finally {
        if(manual && btnCheckUpdates) {
             const icon = btnCheckUpdates.querySelector('span');
             if(icon) icon.style.animation = "none";
        }
    }
}

if (btnCheckUpdates) btnCheckUpdates.addEventListener('click', () => checkForUpdates(true));

if (btnStartUpdate) {
    btnStartUpdate.addEventListener('click', () => {
        btnStartUpdate.innerHTML = '<span class="material-symbols-outlined spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></span> Скачивание...';
        btnStartUpdate.disabled = true;
        btnSkipUpdate.style.display = 'none';
        window.pywebview.api.perform_update(newUpdateUrl);
    });
}

if (btnSkipUpdate) btnSkipUpdate.addEventListener('click', () => updateModal.classList.add('hidden'));

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
        
        if (ping < 150) {
            pingDot.style.backgroundColor = '#4caf50';
            pingDot.style.boxShadow = '0 0 8px rgba(76, 175, 80, 0.4)';
        } else if (ping < 300) {
            pingDot.style.backgroundColor = '#ff9800';
            pingDot.style.boxShadow = '0 0 8px rgba(255, 152, 0, 0.4)';
        } else {
            pingDot.style.backgroundColor = '#f44336';
            pingDot.style.boxShadow = '0 0 8px rgba(244, 67, 54, 0.4)';
        }
    } catch (e) {
        pingText.innerText = 'Нет сети';
        pingDot.style.backgroundColor = '#f44336';
        pingDot.style.boxShadow = 'none';
    }
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
        document.documentElement.style.setProperty('--md-sys-color-on-primary', '#1e1e1e'); // Dark text on primary
    }
}

// --- TABS ---
navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (!tab) return; 
        
        navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        contentArea.classList.add('fade-out');
        
        setTimeout(() => {
            if (tab === 'mods') renderMods();
            else if (tab === 'install-methods') renderMethods();
            else if (tab === 'authors') renderAuthors();
            else if (tab === 'settings') renderSettings();
            
            contentArea.classList.remove('fade-out');
        }, 250);
    });
});

function renderSettings() {
    let col = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim();
    
    contentArea.innerHTML = `
    <div class="big-panel">
        <h2 class="panel-title">Персонализация</h2>
        <div class="custom-color-picker">
            <div class="picker-header">
                <div class="current-color-preview" style="background-color: ${col};" id="color-preview-box"></div>
                <div class="picker-info">
                    <h3>Основной цвет</h3>
                    <p>Выберите акцентный цвет интерфейса</p>
                </div>
            </div>
            
            <div class="picker-controls">
                 <label>Оттенок</label>
                 <input type="range" min="0" max="360" value="0" class="slider-hue" id="hue-slider">
                 <div class="presets-grid">
                     <div class="color-preset" style="background: #d0bcff;" onclick="pickColor('#d0bcff')"></div>
                     <div class="color-preset" style="background: #ffb7b2;" onclick="pickColor('#ffb7b2')"></div>
                     <div class="color-preset" style="background: #a0e7ff;" onclick="pickColor('#a0e7ff')"></div>
                     <div class="color-preset" style="background: #b2fba5;" onclick="pickColor('#b2fba5')"></div>
                     <div class="color-preset" style="background: #fffeb3;" onclick="pickColor('#fffeb3')"></div>
                 </div>
            </div>
        </div>
        <br><br>
        <button class="reset-theme-btn" id="reset-theme">
            <span class="material-symbols-outlined">restart_alt</span> Сбросить
        </button>
    </div>
    `;

    const hueSlider = document.getElementById('hue-slider');
    const box = document.getElementById('color-preview-box');
    const resetBtn = document.getElementById('reset-theme');

    hueSlider.addEventListener('input', (e) => {
        const h = e.target.value;
        const color = `hsl(${h}, 100%, 85%)`; 
        box.style.backgroundColor = color;
        applyAccentColor(color);
        localStorage.setItem('accentColor', color);
    });

    resetBtn.addEventListener('click', () => {
         pickColor('#d0bcff');
    });
}

window.pickColor = (c) => {
    applyAccentColor(c);
    localStorage.setItem('accentColor', c);
    const box = document.getElementById('color-preview-box');
    if(box) box.style.backgroundColor = c;
}

function renderAuthors() {
    contentArea.innerHTML = '<div class="loader-spinner"><div class="spinner"></div><p>Загрузка авторов...</p></div>';
    
    fetch(REPO_AUTHORS_URL + '?t=' + Date.now())
    .then(r => r.json())
    .then(data => {
        let html = `<div class="big-panel"><h2 class="panel-title">Авторы Модификаций</h2><div class="authors-list">`;
        data.forEach(a => {
            let ava = a.avatar ? (REPO_BASE_URL + a.avatar) : null;
            let avaEl = ava 
                ? `<img src="${ava}" class="author-img">`
                : `<div class="author-avatar-placeholder" style="background: rgba(255,255,255,0.1); color: var(--md-sys-color-primary);">${a.name[0]}</div>`;
                
            html += `
            <div class="author-row">
                <div class="author-avatar-wrapper">${avaEl}</div>
                <div class="author-details">
                    <h3>${a.name}</h3>
                    ${a.role ? `<span class="role">${a.role}</span>` : ''}
                    <p>${a.about || "Информация отсутствует"}</p>
                </div>
            </div>`;
        });
        html += `</div></div>`;
        contentArea.innerHTML = html;
    })
    .catch(() => {
        contentArea.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined empty-icon">error</span><h3>Ошибка загрузки</h3></div>';
    });
}

function renderMethods() {
    contentArea.innerHTML = `
    <div class="full-height-container">
        <div class="big-panel shrink-panel">
            <h2 class="panel-title">Метод установки</h2>
            <div class="methods-grid">
                <div class="method-card-new ${currentInstallMethod === 'auto' ? 'active-method' : ''}" onclick="setMethod('auto')">
                    <div class="method-icon"><span class="material-symbols-outlined">smart_toy</span></div>
                    <div class="method-content">
                        <h3>Автоматически (Smart)</h3>
                        <p>Лаунчер сам решит, куда ставить мод (packs или Data)</p>
                    </div>
                </div>
                
                <div class="method-card-new ${currentInstallMethod === 'sdls' ? 'active-method' : ''}" onclick="setMethod('sdls')">
                     <div class="method-icon"><span class="material-symbols-outlined">folder_open</span></div>
                     <div class="method-content">
                        <h3>Через Packs (Documents)</h3>
                        <p>Безопасный метод, файлы не заменяются в игре</p>
                     </div>
                </div>

                <div class="method-card-new ${currentInstallMethod === 'no_sdls' ? 'active-method' : ''}" onclick="setMethod('no_sdls')">
                     <div class="method-icon"><span class="material-symbols-outlined">snippet_folder</span></div>
                     <div class="method-content">
                        <h3>В папку Data (Root)</h3>
                        <p>Для старых модов (.dvpl) и озвучек</p>
                     </div>
                </div>
            </div>
            
            <div class="methods-info-list">
                <div class="info-item">
                    <div class="info-content">
                         <span class="dash">-</span>
                         <span class="info-badge badge-auto">AUTO</span>
                         <p>Рекомендуемый режим. Лаунчер анализирует архив и выбирает лучший путь.</p>
                    </div>
                </div>
                <div class="info-item">
                     <div class="info-content">
                         <span class="dash">-</span>
                         <span class="info-badge badge-sdls">Packs</span>
                         <p>Использует папку Documents/packs. Идеально для GFX модов.</p>
                     </div>
                </div>
                <div class="info-item">
                     <div class="info-content">
                         <span class="dash">-</span>
                         <span class="info-badge badge-nosdls">Data</span>
                         <p>Прямая замена файлов в папке игры. Используйте с осторожностью.</p>
                     </div>
                </div>
            </div>
        </div>
        
        <div class="big-panel grow-panel">
            <h2 class="panel-title">О приложении</h2>
            <div class="app-details">
                <div class="app-header-row">
                     <h3>Loader ASTR</h3>
                     <span class="app-version-badge">v 1.0.0 Beta</span>
                </div>
                <div class="app-description-block">
                    <p class="app-desc-text">Универсальный установщик модификаций для <strong>Tanks Blitz</strong>.</p>
                    <ul class="app-features-list-new">
                        <li>Автоматическое определение путей игры</li>
                        <li>Поддержка <strong>Smart Install</strong> (анализ архива)</li>
                        <li>Бекапы заменяемых файлов (Data)</li>
                        <li>Функция "Починить" для удаления модов</li>
                    </ul>
                </div>
                <div style="flex-grow:1;"></div>
                <div class="app-footer-row">
                    <span class="app-credits">Created by <strong>Asstrallity</strong></span>
                    <span class="app-credits">2024-2025</span>
                </div>
            </div>
        </div>
    </div>
    `;
}

window.setMethod = (m) => {
    currentInstallMethod = m;
    renderMethods();
}

async function loadMods() {
    splash.style.opacity = '0';
    setTimeout(() => { 
        splash.style.display = 'none';
    }, 800);

    contentArea.innerHTML = '<div class="loader-spinner"><div class="spinner"></div><p>Загрузка каталога...</p></div>';
    
    try {
        // 1. Load Mods
        let r = await fetch(REPO_JSON_URL + '?t=' + Date.now());
        if(!r.ok) throw new Error("JSON error");
        let mods = await r.json();
        
        // 2. Load Buy Info
        let buys = [];
        try {
            let r2 = await fetch(REPO_BUY_URL + '?t=' + Date.now());
            if(r2.ok) buys = await r2.json();
        } catch(e){}
        
        // 3. Get Installed
        let installedIds = [];
        if(window.pywebview) {
            installedIds = await window.pywebview.api.check_installed_mods(mods);
        }
        
        globalModsList = mods;
        globalBuyList = buys;
        globalInstalledIds = installedIds;
        
        renderModsList(mods, installedIds, buys);
        
        // Show repair btn if needed
        const rb = document.getElementById('global-repair-btn');
        if (installedIds.length > 0) {
            rb.classList.remove('hidden');
        } else {
            rb.classList.add('hidden');
        }
        
    } catch (e) {
        contentArea.innerHTML = `
        <div class="empty-state">
            <span class="material-symbols-outlined empty-icon">wifi_off</span>
            <h3>Ошибка сети</h3>
            <p>${e.message}</p>
        </div>`;
    }
}

function renderMods() {
    if(globalModsList.length === 0) {
        loadMods(); 
        return; 
    }
    renderModsList(globalModsList, globalInstalledIds, globalBuyList);
}

function renderModsList(mods, installedIds, buyList) {
    contentArea.innerHTML = '';
    if (mods.length === 0) {
        contentArea.innerHTML = '<div class="empty-state"><h3>Пусто.</h3></div>';
        return;
    }
    
    mods.forEach(mod => {
        let img = mod.image || "";
        if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
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
                <div class="card-author">by <span>${mod.author}</span></div>
                <div class="card-desc">${mod.description || ""}</div>
                
                <button class="${btnClass}" onclick="${!isDisabled ? onClickAction : ''}" ${isDisabled ? 'disabled' : ''}>
                    <span class="material-symbols-outlined">${btnIcon}</span> ${btnText}
                </button>
            </div>
        `;
        contentArea.appendChild(card);
    });
}

window.openInfoModal = (type, id) => {
    infoModal.classList.remove('hidden');
    const buyItem = globalBuyList.find(b => b.id === id);
    const modItem = globalModsList.find(m => m.id === id);
    
    if(!buyItem || !modItem) return;

    infoTitle.innerText = modItem.name;
    infoActionBtn.style.display = 'flex';

    let html = '';
    
    if (type === 'preorder') {
         html = `
         <div class="info-description">
            <p>${buyItem.desc || "Описание недоступно."}</p>
         </div>
         <span class="info-price-tag">ПРЕДЗАКАЗ: ${buyItem.price || "???"} ₽</span>
         `;
         infoActionBtn.innerText = "Оформить предзаказ";
         infoActionBtn.onclick = () => {
             if(window.pywebview) window.pywebview.api.open_url(buyItem.url || "https://t.me/astrremod");
         };
    } else {
         html = `
         <div class="info-description">
            <p>${buyItem.desc || "Описание недоступно."}</p>
         </div>
         <span class="info-price-tag">ЦЕНА: ${buyItem.price || "???"} ₽</span>
         `;
         infoActionBtn.innerText = "Купить";
         infoActionBtn.onclick = () => {
             if(window.pywebview) window.pywebview.api.open_url(buyItem.url || "https://t.me/astrremod");
         };
    }
    
    infoDesc.innerHTML = html;
}

if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

window.startInstallProcess = (id, name, url) => {
    if(!window.pywebview) return;
    
    if(url && !url.startsWith('http')) url = REPO_BASE_URL + url;
    
    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    
    progressBar.style.width = "0%";
    progressPercent.innerText = "0%";
    modalTitle.innerText = name;
    modalStatus.innerText = "Подготовка...";
    
    modal.classList.remove('hidden');
    
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

if(modalCloseBtn) modalCloseBtn.addEventListener('click', () => {
    if(window.pywebview) window.pywebview.api.cancel_install();
    closeModal();
});

function closeModal() {
    modal.classList.add('hidden');
}

window.updateRealProgress = (p, t) => {
    progressBar.style.width = p + "%";
    progressPercent.innerText = p + "%";
    modalStatus.innerText = t;
}

window.finishInstall = (s, m) => {
    if(s) {
        installView.classList.add('view-hidden');
        successView.classList.remove('view-hidden');
        setTimeout(() => {
            closeModal();
            loadMods(); 
        }, 2000);
    } else {
        if(m==="Canceled"){closeModal();}
        else {
            installView.classList.add('view-hidden');
            errorView.classList.remove('view-hidden');
            errorMessage.innerText = m;
            setTimeout(closeModal, 3000);
        }
    }
}

function openRepairModal() {
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));
    repairList.innerHTML = '';
    
    if (installedMods.length === 0) repairList.innerHTML = '<p style="color:#938f99; text-align:center;">Нет установленных модов для починки.</p>';
    else {
        installedMods.forEach(mod => {
             const item = document.createElement('div');
             item.className = 'repair-item';
             item.innerHTML = `
             <span>${mod.name}</span>
             <button class="repair-action-btn" onclick="restoreMod('${mod.id}', '${mod.name}')" title="Удалить / Починить">
                 <span class="material-symbols-outlined">delete</span>
             </button>
             `;
             repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}

window.restoreMod = async (id, name) => {
    repairModal.classList.add('hidden');
    
    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    progressBar.style.width = "100%";
    progressPercent.innerText = "";
    modalTitle.innerText = "Восстановление...";
    modalStatus.innerText = "Обработка...";
    modal.classList.remove('hidden');
    
    const res = await window.pywebview.api.restore_mod(id);
    if (res.success) finishInstall(true, res.message);
    else finishInstall(false, res.message);
}

if(repairCloseBtn) repairCloseBtn.addEventListener('click', () => repairModal.classList.add('hidden'));

const rb = document.getElementById('global-repair-btn');
if(rb) rb.addEventListener('click', openRepairModal);
