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

let currentInstallMethod = 'auto';
let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = [];
let newUpdateUrl = "";

document.addEventListener('DOMContentLoaded', () => {
    // --- ИНИЦИАЛИЗАЦИЯ МОДАЛКИ БЛОКИРОВКИ ---
    createGeoModal();

    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) {
        applyAccentColor(savedColor);
    } else {
        applyAccentColor('#d0bcff');
    }

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

// --- ФУНКЦИЯ СОЗДАНИЯ ОКНА БЛОКИРОВКИ (ДИНАМИЧЕСКИ) ---
function createGeoModal() {
    // Создаем элементы, используя существующие классы стилей
    const overlay = document.createElement('div');
    overlay.id = 'geo-modal';
    overlay.className = 'modal-overlay hidden';
    overlay.style.zIndex = '10000'; // Поверх всего

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.textAlign = 'center';
    content.style.maxWidth = '400px';

    content.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 48px; color: #ff5252; margin-bottom: 16px;">public_off</span>
        <h3 style="margin-bottom: 10px;">Доступ ограничен</h3>
        <p style="color: #938f99; margin-bottom: 24px; line-height: 1.5;">
            Обнаружен IP-адрес из региона, доступ для которого ограничен (UA).<br>
            Пожалуйста, включите VPN (RU/EU) и перезапустите лаунчер.
        </p>
        <button id="geo-restart-btn" class="install-btn" style="background-color: #ff5252; color: white;">
            <span class="material-symbols-outlined">restart_alt</span>
            Перезапустить
        </button>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Логика кнопки
    document.getElementById('geo-restart-btn').addEventListener('click', () => {
        if(window.pywebview) {
            window.pywebview.api.restart_app();
        } else {
            location.reload();
        }
    });
}

function showToast(msg) {
    if(!toast) return;
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
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

if (btnCheckUpdates) {
    btnCheckUpdates.addEventListener('click', () => checkForUpdates(true));
}

if (btnStartUpdate) {
    btnStartUpdate.addEventListener('click', () => {
        btnStartUpdate.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Скачивание...';
        btnStartUpdate.disabled = true;
        btnSkipUpdate.style.display = 'none';
        window.pywebview.api.perform_update(newUpdateUrl);
    });
}

if (btnSkipUpdate) {
    btnSkipUpdate.addEventListener('click', () => {
        updateModal.classList.add('hidden');
    });
}

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
    
    // --- ОРИГИНАЛЬНЫЙ HTML с одной вставкой кнопки теста ---
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="big-panel shrink-panel">
                <div class="panel-title">НАСТРОЙКА ИНТЕРФЕЙСА</div>
                
                <div class="custom-color-picker">
                    <div class="picker-header">
                        <div class="current-color-preview" id="current-color-preview" style="background-color: ${col};"></div>
                        <div class="picker-info">
                            <h3>Акцентный цвет</h3>
                            <p>Подбери цвет под свой вкус. По умолчанию — нежно‑лиловый.</p>
                        </div>
                    </div>
                    
                    <div class="picker-controls">
                        <label for="accent-hue-slider">Оттенок</label>
                        <input type="range" id="accent-hue-slider" class="slider-hue" min="0" max="360" value="0">
                        
                        <div class="presets-grid">
                            <div class="color-preset" style="background-color: #d0bcff;" data-color="#d0bcff"></div>
                            <div class="color-preset" style="background-color: #ffb4ab;" data-color="#ffb4ab"></div>
                            <div class="color-preset" style="background-color: #82d3e0;" data-color="#82d3e0"></div>
                            <div class="color-preset" style="background-color: #aaddaa;" data-color="#aaddaa"></div>
                            <div class="color-preset" style="background-color: #e6c9a8;" data-color="#e6c9a8"></div>
                        </div>
                    </div>

                    <button class="reset-theme-btn" id="reset-theme-btn">
                        <span class="material-symbols-outlined">restart_alt</span>
                        Сбросить тему
                    </button>
                    
                    <!-- ВСТАВКА КНОПКИ ТЕСТА (Стилизована под reset-theme-btn для единства) -->
                    <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.05); margin: 20px 0;"></div>
                    
                    <div class="picker-info" style="margin-bottom: 10px;">
                        <h3>Тест функционала</h3>
                        <p>Проверка блокировки по IP (для отладки)</p>
                    </div>
                    
                    <button class="reset-theme-btn" id="btn-test-geo">
                        <span class="material-symbols-outlined">public</span>
                        Тест региона (IP)
                    </button>
                    <!-- КОНЕЦ ВСТАВКИ -->

                </div>
            </div>
        </div>
    `;

    // --- ЛОГИКА НАСТРОЕК (ОРИГИНАЛ + ТЕСТ) ---
    const slider = document.getElementById('accent-hue-slider');
    const preview = document.getElementById('current-color-preview');
    const resetBtn = document.getElementById('reset-theme-btn');
    const presets = document.querySelectorAll('.color-preset');

    slider.addEventListener('input', (e) => {
        const hue = e.target.value;
        const color = `hsl(${hue}, 100%, 80%)`;
        preview.style.backgroundColor = color;
        document.documentElement.style.setProperty('--md-sys-color-primary', color);
        applyAccentColor(color);
        localStorage.setItem('accentColor', color);
    });

    presets.forEach(p => {
        p.addEventListener('click', () => {
            const c = p.getAttribute('data-color');
            applyAccentColor(c);
            preview.style.backgroundColor = c;
            localStorage.setItem('accentColor', c);
        });
    });

    resetBtn.addEventListener('click', () => {
        localStorage.removeItem('accentColor');
        applyAccentColor('#d0bcff');
        renderSettings(); 
    });

    // --- ЛОГИКА КНОПКИ ТЕСТА ---
    const testBtn = document.getElementById('btn-test-geo');
    testBtn.addEventListener('click', async () => {
        if (!window.pywebview) {
            showToast("Работает только в приложении");
            return;
        }
        
        // Показываем спиннер
        const oldHtml = testBtn.innerHTML;
        testBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Проверка...';
        testBtn.disabled = true;

        try {
            const res = await window.pywebview.api.check_connection_status();
            if (res.status === 'blocked') {
                // Показываем модалку блокировки
                document.getElementById('geo-modal').classList.remove('hidden');
            } else {
                showToast("Все отлично: IP доступен");
            }
        } catch(e) {
            showToast("Ошибка проверки");
        } finally {
            testBtn.innerHTML = oldHtml;
            testBtn.disabled = false;
        }
    });
}

function checkEnvironment() {
    if (window.pywebview) {
        const closeBtn = document.querySelector('.close-btn');
        const minBtn = document.querySelector('.min-btn');
        
        if(closeBtn) closeBtn.addEventListener('click', () => window.pywebview.api.close());
        if(minBtn) minBtn.addEventListener('click', () => window.pywebview.api.minimize());

        // Disable install buttons if installing
        window.pywebview.api.check_installed_mods(globalModsList).then(ids => {
            globalInstalledIds = ids;
            loadMods(false); 
        });

        // --- АВТОМАТИЧЕСКАЯ ПРОВЕРКА ПРИ СТАРТЕ ---
        window.pywebview.api.check_connection_status().then(res => {
            if (res.status === 'blocked') {
                 document.getElementById('geo-modal').classList.remove('hidden');
            } else {
                checkForUpdates(); // Если не заблочено, чекаем обновы
            }
        });
    }
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        const section = item.getAttribute('data-section');
        
        contentArea.classList.add('fade-out');
        setTimeout(() => {
            if (section === 'catalog') loadMods();
            else if (section === 'settings') renderSettings();
            else if (section === 'methods') renderMethodsPage(); 
            else if (section === 'about') renderAboutPage();
            contentArea.classList.remove('fade-out');
        }, 250);
    });
});

function renderMethodsPage() {
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="big-panel grow-panel">
                <div class="panel-title">МЕТОДЫ УСТАНОВКИ</div>
                <div class="methods-grid">
                    
                    <!-- Auto -->
                    <div class="method-card-new ${currentInstallMethod==='auto'?'active-method':''}" onclick="setMethod('auto')">
                        <div class="method-icon"><span class="material-symbols-outlined">smart_toy</span></div>
                        <div class="method-content">
                            <h3>Автоматический (Рекомендуется)</h3>
                            <p>Сам найдет папку packs (Steam) или Data (LGC/WG)</p>
                        </div>
                        <div class="switch">
                            <input type="radio" name="method" ${currentInstallMethod==='auto'?'checked':''}>
                            <span class="slider"></span>
                        </div>
                    </div>

                    <!-- SDLS -->
                    <div class="method-card-new ${currentInstallMethod==='sdls'?'active-method':''}" onclick="setMethod('sdls')">
                        <div class="method-icon"><span class="material-symbols-outlined">folder_special</span></div>
                        <div class="method-content">
                            <h3>Ручной режим (Documents)</h3>
                            <p>Для Steam версии (папка packs)</p>
                        </div>
                        <div class="switch">
                            <input type="radio" name="method" ${currentInstallMethod==='sdls'?'checked':''}>
                            <span class="slider"></span>
                        </div>
                    </div>

                    <!-- No SDLS -->
                    <div class="method-card-new ${currentInstallMethod==='no_sdls'?'active-method':''}" onclick="setMethod('no_sdls')">
                        <div class="method-icon"><span class="material-symbols-outlined">sd_card</span></div>
                        <div class="method-content">
                            <h3>Прямая замена файлов</h3>
                            <p>Для LGC/WG версий (папка Data)</p>
                        </div>
                        <div class="switch">
                            <input type="radio" name="method" ${currentInstallMethod==='no_sdls'?'checked':''}>
                            <span class="slider"></span>
                        </div>
                    </div>

                </div>

                <div class="methods-info-list">
                    <div class="info-item">
                        <div class="info-badge badge-auto">Auto</div>
                        <div class="info-content">
                            <div class="dash">-</div>
                            <p>Обычно не нужен, но если ты не знаешь что конкретно щас, микропатч или просто обнова, тыкни тумблер, лаунчер поможет.</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-badge badge-sdls">Steam</div>
                        <div class="info-content">
                            <div class="dash">-</div>
                            <p>Если ты уже в курсе что у игры есть микропатч, тыкай сюда и устаналивай.</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-badge badge-nosdls">Classic</div>
                        <div class="info-content">
                            <div class="dash">-</div>
                            <p>Тоже самое что и второй, только при условии что это обычная обнова :3</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setMethod(m) {
    currentInstallMethod = m;
    renderMethodsPage(); 
}

function renderAboutPage() {
    contentArea.innerHTML = `
        <div class="about-page-container">
            <div class="big-panel shrink-panel">
                <div class="panel-title">О ПРИЛОЖЕНИИ</div>
                <div class="app-details">
                    <div class="app-header-row">
                        <div class="logo-icon-img" style="background:url('https://rh-archive.ru/mods_files_github/images/logo.png') no-repeat center/contain; width:48px; height:48px;"></div>
                        <div style="display:flex; flex-direction:column;">
                            <h2 style="font-size:24px; font-weight:700; letter-spacing:1px;">LOADER ASTR</h2>
                            <span class="app-version-badge">BETA 1.0.0</span>
                        </div>
                    </div>
                    <div class="app-description-block">
                        <p class="app-desc-text">
                            Это универсальный лаунчер-загрузчик модов в игру <strong>Tanks Blitz</strong>.
                            Приложение разработано для упрощения процесса установки модификаций, 
                            автоматического поиска путей игры и управления контентом.
                        </p>
                        <ul class="app-features-list-new">
                            <li><strong>Автообновление:</strong> Лаунчер сам проверит наличие новой версии.</li>
                            <li><strong>Умная установка:</strong> Поддержка Steam (packs) и LGC/WG (Data).</li>
                            <li><strong>Безопасность:</strong> Бэкап заменяемых файлов перед установкой.</li>
                        </ul>
                    </div>
                    <div class="app-footer-row">
                        <div class="social-links">
                            <a href="https://t.me/Asstrallity_mods" target="_blank" class="social-btn telegram-btn">
                                <span class="material-symbols-outlined">send</span>
                            </a>
                            <a href="https://t.me/forblitz_mods" target="_blank" class="social-btn telegram-btn">
                                <span class="material-symbols-outlined">rocket_launch</span>
                            </a>
                        </div>
                        <div class="app-credits">Created by 01.01.2024</div>
                    </div>
                </div>
            </div>

            <div class="big-panel grow-panel">
                <div class="panel-title">АВТОРЫ И КОНТРИБЬЮТОРЫ</div>
                <div class="authors-list" id="authors-list-container">
                    <div class="loader-spinner"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;
    
    fetch(REPO_AUTHORS_URL)
        .then(r => r.json())
        .then(data => {
            const container = document.getElementById('authors-list-container');
            if(!container) return;
            container.innerHTML = '';
            data.forEach(au => {
                const row = document.createElement('div');
                row.className = 'author-row';
                let avatarHtml = `<div class="author-avatar-placeholder" style="background:${au.color||'#555'}">${au.name[0]}</div>`;
                if(au.avatar) {
                    avatarHtml = `<img src="${au.avatar.startsWith('http')?au.avatar:REPO_BASE_URL+au.avatar}" class="author-img">`;
                }
                row.innerHTML = `
                    <div class="author-avatar-wrapper">${avatarHtml}</div>
                    <div class="author-details">
                        <h3>${au.name}</h3>
                        <span class="role">${au.role}</span>
                        <p>${au.desc}</p>
                    </div>
                `;
                container.appendChild(row);
            });
        })
        .catch(() => {
            const c = document.getElementById('authors-list-container');
            if(c) c.innerHTML = '<p style="color:#777; text-align:center;">Ошибка загрузки авторов</p>';
        });
}

async function loadMods(force = true) {
    if (force) {
        contentArea.innerHTML = `
            <div class="loader-container" style="margin-top:100px;">
                <div class="status-text dots">Загрузка каталога</div>
                <div class="progress-track" style="width:200px;"><div class="progress-fill"></div></div>
            </div>
        `;
    }

    try {
        const [modsResp, buyResp] = await Promise.all([
            fetch(REPO_JSON_URL + '?nocache=' + Date.now()),
            fetch(REPO_BUY_URL + '?nocache=' + Date.now())
        ]);
        
        const mods = await modsResp.json();
        globalModsList = mods;
        
        let buyList = [];
        try {
            buyList = await buyResp.json();
            globalBuyList = buyList;
        } catch(e) {
            console.warn("Buy list load failed");
        }

        // Get installed IDs from python
        let installedIds = [];
        if (window.pywebview) {
            installedIds = await window.pywebview.api.check_installed_mods(mods);
            globalInstalledIds = installedIds;
        }
        
        renderModsGrid(mods, installedIds, buyList);
        
        // Splash fade out if needed
        if(splash && !splash.classList.contains('fade-out')) {
             setTimeout(() => splash.classList.add('fade-out'), 500);
        }

    } catch (e) {
        contentArea.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined empty-icon">wifi_off</span><h3>Ошибка загрузки: ${e.message}</h3></div>`;
    }
}

function renderModsGrid(mods, installedIds, buyList) {
    contentArea.innerHTML = '<div class="content-grid" id="mods-grid"></div>';
    const grid = document.getElementById('mods-grid');
    
    if (mods.length === 0) {
        grid.innerHTML = 'Пусто.';
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
                <div class="card-title">${mod.name}</div>
                <div class="card-author">by <span>${mod.author}</span></div>
                <div class="card-desc">${mod.description || ""}</div>
                <button class="${btnClass}" onclick="${onClickAction}" ${isDisabled?'disabled':''}>
                    <span class="material-symbols-outlined">${btnIcon}</span>
                    ${btnText}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function openInfoModal(type, modId) {
    const buyItem = globalBuyList.find(x => x.id === modId);
    const modItem = globalModsList.find(x => x.id === modId);
    if (!buyItem || !modItem) return;

    infoTitle.innerText = modItem.name;
    
    let htmlDesc = `<div class="info-description">${buyItem.desc || "Описание недоступно."}</div>`;
    
    htmlDesc += `<div class="info-price-tag">${buyItem.price}</div>`;

    if (type === 'preorder') {
        infoActionBtn.innerText = "Связаться для предзаказа";
    } else {
        infoActionBtn.innerText = "Купить сейчас";
    }
    
    // Clean up old listeners
    const newBtn = infoActionBtn.cloneNode(true);
    infoActionBtn.parentNode.replaceChild(newBtn, infoActionBtn);
    
    newBtn.addEventListener('click', () => {
        if(window.pywebview) window.pywebview.api.open_link(buyItem.link);
        else window.open(buyItem.link, '_blank');
    });
    
    infoDesc.innerHTML = htmlDesc;
    infoModal.classList.remove('hidden');
}

if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

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

// === REPAIR SYSTEM ===
function openRepairModal() {
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));
    repairList.innerHTML = '';
    
    if (installedMods.length === 0) {
        repairList.innerHTML = '<div class="empty-state" style="height:150px;"><p>Нет установленных модов для починки.</p></div>';
    } else {
        installedMods.forEach(mod => {
            const item = document.createElement('div');
            item.className = 'repair-item';
            item.innerHTML = `
                <span>${mod.name}</span>
                <button class="repair-action-btn" onclick="restoreMod('${mod.id}', '${mod.name}')">
                    <span class="material-symbols-outlined">delete_forever</span>
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
    if (res.success) {
        finishInstall(true, res.message);
    } else {
        finishInstall(false, res.message);
    }
}

if(repairCloseBtn) repairCloseBtn.addEventListener('click', () => repairModal.classList.add('hidden'));
const rb = document.getElementById('global-repair-btn');
if(rb) rb.addEventListener('click', openRepairModal);
