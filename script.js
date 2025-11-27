const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

// Элементы
const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const splash = document.getElementById('splash-screen');

// Модалки и UI
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

// Обновление
const btnCheckUpdates = document.getElementById('btn-check-updates');
const updateModal = document.getElementById('update-modal');
const updateVerSpan = document.getElementById('update-version');
const updateSizeSpan = document.getElementById('update-size');
const updateLogP = document.getElementById('update-changelog');
const btnStartUpdate = document.getElementById('btn-start-update');
const btnSkipUpdate = document.getElementById('btn-skip-update');
const toast = document.getElementById('toast-notification');

let currentInstallMethod = 'auto';
let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = [];
let newUpdateUrl = "";

// === ЛОГИКА ПЛАВНОГО ПОЯВЛЕНИЯ ИКОНОК ===
// 1. Отслеживаем загрузку шрифтов, чтобы сразу показать иконки
document.fonts.ready.then(() => {
    document.body.classList.add('fonts-loaded');
});

// 2. Дополнительно, при полной загрузке страницы (картинки, стили)
window.addEventListener('load', () => {
    document.body.classList.add('fonts-loaded');
    // Убираем сплэш через полсекунды, чтобы пользователь увидел интерфейс без рывков
    setTimeout(() => {
        if(splash) splash.classList.add('fade-out');
    }, 500);
});

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАПУСКЕ ===
document.addEventListener('DOMContentLoaded', () => {
    // Восстанавливаем цвет темы
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);
    else applyAccentColor('#d0bcff');

    // Ожидание PyWebView
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        // Если pywebview готов или прошло слишком много времени (отладка в браузере)
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods();
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);

    checkPing();
    setInterval(checkPing, 5000);
});

// Если pywebview сам сообщил о готовности
window.addEventListener('pywebviewready', checkEnvironment);

function showToast(msg) {
    if(!toast) return;
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function checkForUpdates(manual = false) {
    if (!window.pywebview) {
        if(manual) showToast("Доступно только в приложении");
        return;
    }
    if(manual && btnCheckUpdates) {
         const icon = btnCheckUpdates.querySelector('span');
         icon.style.animation = "spin 1s linear infinite";
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
             icon.style.animation = "none";
        }
    }
}

if (btnCheckUpdates) btnCheckUpdates.addEventListener('click', () => checkForUpdates(true));

if (btnStartUpdate) {
    btnStartUpdate.addEventListener('click', () => {
        btnStartUpdate.innerHTML = '<span class="material-symbols-outlined">downloading</span> Скачивание...';
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
        // Добавляем timestamp чтобы избежать кэширования
        await fetch(REPO_JSON_URL + '?t=' + start, { method: 'HEAD', cache: 'no-store' });
        const end = Date.now();
        const ping = end - start;

        pingText.innerText = `Соединено: ${ping} ms`;
        
        if (ping < 150) {
            pingDot.style.backgroundColor = '#4caf50'; // Green
            pingDot.style.boxShadow = '0 0 8px #4caf50';
        } else if (ping < 300) {
            pingDot.style.backgroundColor = '#ff9800'; // Orange
            pingDot.style.boxShadow = '0 0 8px #ff9800';
        } else {
            pingDot.style.backgroundColor = '#f44336'; // Red
            pingDot.style.boxShadow = '0 0 8px #f44336';
        }

    } catch (e) {
        pingText.innerText = 'Нет сети';
        pingDot.style.backgroundColor = '#f44336';
        pingDot.style.boxShadow = 'none';
    }
}

// === UI LOGIC (TABS) ===
const navButtons = document.querySelectorAll('.nav-item');
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (!tab) return;

        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        handleTabChange(tab);
    });
});

function handleTabChange(tab) {
    // Анимация ухода
    contentArea.classList.add('fade-out');

    setTimeout(() => {
        if (tab === 'mods') {
            document.getElementById('page-title').innerText = 'Каталог модификаций';
            loadMods(); 
        } else if (tab === 'install-methods') {
            document.getElementById('page-title').innerText = 'Методы установки';
            renderMethods();
        } else if (tab === 'authors') {
            document.getElementById('page-title').innerText = 'Авторы';
            renderAuthors();
        } else if (tab === 'settings') {
            document.getElementById('page-title').innerText = 'Персонализация';
            renderSettings();
        }
        contentArea.classList.remove('fade-out');
    }, 250);
}

function applyAccentColor(color) {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color; // "rgb(r, g, b)"
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
                         <div class="current-color-preview" style="background-color: ${col}"></div>
                         <div class="picker-info">
                             <h3>Цветовая схема</h3>
                             <p>Выберите акцентный цвет интерфейса</p>
                         </div>
                    </div>
                    
                    <div class="picker-controls">
                        <label>Оттенок (Hue)</label>
                        <input type="range" min="0" max="360" value="0" class="slider-hue" id="hue-slider">
                        
                        <div class="presets-grid">
                             <div class="color-preset" style="background-color: #d0bcff;" onclick="pickPreset('#d0bcff')"></div>
                             <div class="color-preset" style="background-color: #77f2a1;" onclick="pickPreset('#77f2a1')"></div>
                             <div class="color-preset" style="background-color: #ffb787;" onclick="pickPreset('#ffb787')"></div>
                             <div class="color-preset" style="background-color: #82d8ff;" onclick="pickPreset('#82d8ff')"></div>
                             <div class="color-preset" style="background-color: #ff8a80;" onclick="pickPreset('#ff8a80')"></div>
                             <div class="color-preset" style="background-color: #e0e0e0;" onclick="pickPreset('#e0e0e0')"></div>
                        </div>
                    </div>
                    
                    <button class="reset-theme-btn" onclick="pickPreset('#d0bcff')">
                        <span class="material-symbols-outlined">restart_alt</span> Сбросить
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const hueSlider = document.getElementById('hue-slider');
    if(hueSlider) {
        hueSlider.addEventListener('input', (e) => {
            const hue = e.target.value;
            const color = `hsl(${hue}, 100%, 80%)`;
            applyAccentColor(color);
            localStorage.setItem('accentColor', color);
            const p = document.querySelector('.current-color-preview');
            if(p) p.style.backgroundColor = color;
        });
    }
}

window.pickPreset = (color) => {
    applyAccentColor(color);
    localStorage.setItem('accentColor', color);
    const p = document.querySelector('.current-color-preview');
    if(p) p.style.backgroundColor = color;
}


async function checkEnvironment() {
    if(!window.pywebview) return;
    try {
        const env = await window.pywebview.api.get_env_info();
        globalInstalledIds = env.installed_mods || [];
        if (env.geo_blocked) {
            const gm = document.getElementById('geo-modal');
            if(gm) gm.classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
    }
}

async function loadMods() {
    contentArea.innerHTML = '<div class="loader-spinner"><div class="spinner"></div><p>Загрузка каталога...</p></div>';
    try {
        const [modsRes, authorsRes, buyRes] = await Promise.all([
            fetch(REPO_JSON_URL),
            fetch(REPO_AUTHORS_URL),
            fetch(REPO_BUY_URL)
        ]);
        
        if (!modsRes.ok) throw new Error('Mods error');
        const modsData = await modsRes.json();
        globalModsList = modsData.mods || [];
        
        // Авторы (опционально загружаются, не критично)
        if (buyRes.ok) {
            const buyData = await buyRes.json();
            globalBuyList = buyData || [];
        }

        // Также нужно обновить список установленных через API (на случай изменений)
        if (window.pywebview) {
             const env = await window.pywebview.api.get_env_info();
             globalInstalledIds = env.installed_mods || [];
        }

        renderCatalog(globalModsList, globalInstalledIds, globalBuyList);

    } catch (e) {
        contentArea.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined empty-icon">wifi_off</span><h3>Ошибка загрузки</h3><p>${e.message}</p></div>`;
    }
}

function renderCatalog(mods, installedIds, buyList) {
    if (!mods || mods.length === 0) {
        contentArea.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined empty-icon">folder_off</span><h3>Каталог пуст</h3><p>Моды не найдены.</p></div>';
        return;
    }

    contentArea.innerHTML = '';

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
            } else if (buyInfo.status === 'BT') {
                 if (isInst) {
                     btnText = 'Обновить (BT)';
                     btnIcon = 'sync';
                     onClickAction = `startInstallProcess('${mod.id}', '${mod.name}', '${mod.file}')`;
                 } else {
                     btnText = 'Временно недоступен';
                     btnIcon = 'schedule';
                     onClickAction = `openInfoModal('testing', '${mod.id}')`;
                 }
            } else {
                btnText = 'Купить';
                btnIcon = 'shopping_cart';
                onClickAction = `openInfoModal('paid', '${mod.id}')`;
            }
        } else {
            // FREE
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
            <img src="${img}" loading="lazy" class="card-image" alt="${mod.name}">
            <div class="card-content">
                <div class="card-title">${mod.name}</div>
                <div class="card-author">Автор: <span>${mod.author || 'Неизвестно'}</span></div>
                <div class="card-desc">${mod.description || ""}</div>
                
                <button class="${btnClass}" onclick="${onClickAction}" ${isDisabled ? 'disabled' : ''}>
                    <span class="material-symbols-outlined">${btnIcon}</span> ${btnText}
                </button>
            </div>
        `;
        contentArea.appendChild(card);
    });
}

window.openInfoModal = (type, modId) => {
    const buyItem = globalBuyList.find(b => b.id === modId);
    if (!buyItem) return;

    infoTitle.innerText = buyItem.title || "Информация";
    infoActionBtn.innerText = "Понятно";
    infoActionBtn.onclick = () => { infoModal.classList.add('hidden'); };

    let descHtml = `<p class="info-description">${buyItem.desc || "Описание недоступно."}</p>`;
    
    if (type === 'paid') {
         descHtml += `<span class="info-price-tag">${buyItem.price || "Цена не указана"}</span>`;
         infoActionBtn.innerText = "Перейти к покупке";
         infoActionBtn.onclick = () => { 
             if(window.pywebview) window.pywebview.api.open_url(buyItem.link || "#");
         };
    } else if (type === 'preorder') {
         infoActionBtn.innerText = "Узнать подробнее";
         infoActionBtn.onclick = () => { 
             if(window.pywebview) window.pywebview.api.open_url(buyItem.link || "https://t.me/RHJMODS");
         };
    } else if (type === 'testing') {
        descHtml += `<p style="color:#ffab91; margin-top:10px; font-size:13px;">Этот мод находится на стадии закрытого тестирования.</p>`;
    }

    infoDesc.innerHTML = descHtml;
    infoModal.classList.remove('hidden');
}
if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));


function renderMethods() {
    contentArea.innerHTML = `
    <div class="full-height-container">
        <div class="big-panel shrink-panel">
            <h2 class="panel-title">Выбор метода установки</h2>
            <div class="methods-grid">
                
                <div class="method-card-new ${currentInstallMethod === 'auto' ? 'active-method' : ''}" onclick="selectMethod('auto')">
                    <div class="method-icon"><span class="material-symbols-outlined">smart_toy</span></div>
                    <div class="method-content">
                        <h3>Автоматически (Рекомендуется)</h3>
                        <p>Сам найдет папку packs</p>
                    </div>
                    <div class="method-check"><span class="material-symbols-outlined">radio_button_${currentInstallMethod === 'auto' ? 'checked' : 'unchecked'}</span></div>
                </div>

                <div class="method-card-new ${currentInstallMethod === 'manual' ? 'active-method' : ''}" onclick="selectMethod('manual')">
                    <div class="method-icon"><span class="material-symbols-outlined">folder_open</span></div>
                    <div class="method-content">
                        <h3>Ручной режим (Documents)</h3>
                        <p>Прямая замена файлов</p>
                    </div>
                    <div class="method-check"><span class="material-symbols-outlined">radio_button_${currentInstallMethod === 'manual' ? 'checked' : 'unchecked'}</span></div>
                </div>

            </div>
        </div>

        <div class="big-panel grow-panel">
             <h2 class="panel-title">Информация о методе</h2>
             <div class="methods-info-list">
                 
                 <div class="info-item">
                     <div class="info-content">
                         <span class="dash">—</span>
                         <div style="flex:1;">
                             <div style="display:flex; align-items:center;">
                                 <strong>DLC (Downloadable Content)</strong>
                                 <div class="info-badge badge-auto">Только Авто</div>
                             </div>
                             <p style="margin-top:4px;">Обычно не нужен, но если ты не знаешь что конкретно щас, микропатч или просто обнова, тыкни тумблер, лаунчер поможет.</p>
                         </div>
                         <label class="switch">
                             <input type="checkbox" id="chk-dlc" disabled>
                             <span class="slider"></span>
                         </label>
                     </div>
                 </div>

                 <div class="info-item">
                     <div class="info-content">
                         <span class="dash">—</span>
                         <div style="flex:1;">
                             <div style="display:flex; align-items:center;">
                                 <strong>Super-DLC-System</strong>
                                 <div class="info-badge badge-sdls">Рекомендация</div>
                             </div>
                             <p style="margin-top:4px;">Если ты уже в курсе что у игры есть микропатч, тыкай сюда и устаналивай.</p>
                         </div>
                         <label class="switch">
                             <input type="checkbox" id="chk-sdls" checked onchange="toggleSDLS(this)">
                             <span class="slider"></span>
                         </label>
                     </div>
                 </div>

                 <div class="info-item">
                     <div class="info-content">
                         <span class="dash">—</span>
                         <div style="flex:1;">
                             <div style="display:flex; align-items:center;">
                                 <strong>No-DLC-System</strong>
                                 <div class="info-badge badge-nosdls">Опасно</div>
                             </div>
                             <p style="margin-top:4px;">Тоже самое что и второй, только при условии что это обычная обнова :3</p>
                         </div>
                         <label class="switch">
                             <input type="checkbox" id="chk-nodls" onchange="toggleNoSDLS(this)">
                             <span class="slider"></span>
                         </label>
                     </div>
                 </div>

             </div>
        </div>
    </div>
    `;
}

window.selectMethod = (m) => {
    currentInstallMethod = m;
    renderMethods(); 
}

window.toggleSDLS = (el) => {
    const nodls = document.getElementById('chk-nodls');
    if (el.checked && nodls) nodls.checked = false;
}
window.toggleNoSDLS = (el) => {
    const sdls = document.getElementById('chk-sdls');
    if (el.checked && sdls) sdls.checked = false;
}

async function renderAuthors() {
    contentArea.innerHTML = '<div class="loader-spinner"><div class="spinner"></div><p>Загрузка авторов...</p></div>';
    try {
        const res = await fetch(REPO_AUTHORS_URL);
        if(!res.ok) throw new Error('Err');
        const data = await res.json();
        const authors = data.authors || [];

        if (authors.length === 0) {
             contentArea.innerHTML = '<div class="empty-state"><p>Список пуст</p></div>';
             return;
        }
        
        let html = `
        <div class="about-page-container">
             <div class="app-details big-panel shrink-panel" style="flex-direction: row; gap: 32px; align-items: flex-start;">
                 <div style="width: 120px; height: 120px; background: #222; border-radius: 24px; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                      <img src="icon.ico" style="width:64px; opacity:0.8;">
                 </div>
                 <div style="flex-grow:1;">
                      <div class="app-header-row">
                          <h2 style="margin:0; font-size:28px;">LOADER ASTR</h2>
                          <div class="app-version-badge">BETA 1.0.0</div>
                      </div>
                      <div class="app-description-block">
                          <p class="app-desc-text">
                              Это универсальный лаунчер-загрузчик модов в игру <strong>Tanks Blitz</strong>.
                              Проект создан с целью упростить установку модификаций, объединив их в единый удобный каталог.
                          </p>
                          <ul class="app-features-list-new">
                              <li><strong>Автоматическая установка</strong> — забудьте про ручной поиск папок</li>
                              <li><strong>Безопасность</strong> — все моды проверяются перед публикацией</li>
                              <li><strong>Удобство</strong> — понятный интерфейс в стиле Material You</li>
                          </ul>
                      </div>
                      <div class="app-footer-row">
                          <div class="app-credits">Created by <strong>ASSTRALLITY TEAM</strong></div>
                          <div class="social-links">
                              <a href="#" class="social-btn"><span class="material-symbols-outlined">language</span></a>
                              <a href="#" class="social-btn"><span class="material-symbols-outlined">code</span></a>
                          </div>
                      </div>
                 </div>
             </div>

             <div class="big-panel grow-panel">
                 <h2 class="panel-title">Наши авторы</h2>
                 <div class="authors-list">
        `;

        authors.forEach(a => {
             let imgTag = "";
             if (a.avatar) {
                 let src = a.avatar.startsWith('http') ? a.avatar : REPO_BASE_URL + a.avatar;
                 imgTag = `<img src="${src}" class="author-img">`;
             } else {
                 imgTag = `<div class="author-avatar-placeholder" style="background: ${getRandomColor()}">${a.name[0]}</div>`;
             }
             
             html += `
             <div class="author-row">
                 <div class="author-avatar-wrapper">
                     ${imgTag}
                 </div>
                 <div class="author-details">
                     <h3>${a.name}</h3>
                     ${a.role ? `<div class="role">${a.role}</div>` : ''}
                     <p>${a.desc || 'Описание отсутствует'}</p>
                 </div>
                 <a href="${a.link || '#'}" target="_blank" class="social-btn">
                     <span class="material-symbols-outlined">open_in_new</span>
                 </a>
             </div>
             <div class="divider"></div>
             `;
        });

        html += `</div></div></div>`;
        contentArea.innerHTML = html;

    } catch (e) {
        contentArea.innerHTML = `Ошибка авторов.`;
    }
}

function getRandomColor() {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50'];
    return colors[Math.floor(Math.random() * colors.length)];
}


function startInstallProcess(id, name, url) {
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

// Callbacks from Python
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


// === REPAIR LOGIC ===
function openRepairModal() {
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));
    repairList.innerHTML = '';
    
    if (installedMods.length === 0) repairList.innerHTML = '<p style="color:#999; padding:10px; text-align:center;">Нет установленных модов для починки.</p>';
    else {
        installedMods.forEach(mod => {
            const item = document.createElement('div');
            item.className = 'repair-item';
            item.innerHTML = `
                <span>${mod.name}</span>
                <button class="repair-action-btn" onclick="restoreMod('${mod.id}', '${mod.name}')" title="Восстановить оригинальные файлы">
                    <span class="material-symbols-outlined">history</span>
                </button>
            `;
            repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}

async function restoreMod(id, name) {
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


// === GEO RESTRICTION LOGIC ===
const geoModal = document.getElementById('geo-modal');
const geoExitBtn = document.getElementById('geo-exit-btn');

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
