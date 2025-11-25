// --- КОНФИГУРАЦИЯ ---
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';
const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';

// --- DOM ЭЛЕМЕНТЫ ---
const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const modal = document.getElementById('progress-modal');
const installView = document.getElementById('install-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const errorMessage = document.getElementById('error-message');
const modalTitle = document.getElementById('modal-title');
const modalStatus = document.getElementById('modal-status');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const modalCloseBtn = document.getElementById('modal-close-btn');

let currentInstallMethod = 'auto'; 
let isAppEnvironment = false;

// --- ИНИЦИАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);
    else applyAccentColor('#d0bcff');

    setTimeout(() => splash.classList.add('fade-out'), 2600); 
    
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods(); // Грузим моды только после проверки среды
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);
});

window.addEventListener('pywebviewready', checkEnvironment);

// --- ТЕМА И НАСТРОЙКИ ---
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}

function applyAccentColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--md-sys-color-primary', color);
    const rgb = hexToRgb(color);
    root.style.setProperty('--md-sys-color-primary-rgb', rgb);
    root.style.setProperty('--md-sys-color-on-primary', '#1e1e1e'); 
}

function renderSettings() {
    let currentColor = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim();
    contentArea.innerHTML = `
        <div class="full-height-container">
            <div class="big-panel grow-panel">
                <h2 class="panel-title">Персонализация</h2>
                <div class="color-picker-container">
                    <div class="color-preview-wrapper">
                        <input type="color" id="accent-color-input" value="${currentColor}">
                        <div class="color-preview-icon" style="background-color: ${currentColor};"></div>
                    </div>
                    <div class="color-info"><h3>Акцентный цвет</h3><p>Выберите основной цвет интерфейса.</p></div>
                </div>
                <div class="divider" style="margin: 24px 0;"></div>
                <button class="reset-theme-btn" onclick="resetTheme()">
                    <span class="material-symbols-outlined">restart_alt</span> Сбросить тему
                </button>
            </div>
        </div>`;
    
    const colorInput = document.getElementById('accent-color-input');
    const previewIcon = document.querySelector('.color-preview-icon');
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            const newColor = e.target.value;
            previewIcon.style.backgroundColor = newColor;
            applyAccentColor(newColor);
            localStorage.setItem('accentColor', newColor);
        });
    }
}

window.resetTheme = function() {
    applyAccentColor('#d0bcff');
    localStorage.removeItem('accentColor');
    renderSettings();
}

// --- НАВИГАЦИЯ ---
function checkEnvironment() {
    if (window.pywebview) isAppEnvironment = true;
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        handleTabChange(item.getAttribute('data-tab'));
    });
});

function handleTabChange(tab) {
    contentArea.classList.add('fade-out');
    setTimeout(() => {
        const title = document.getElementById('page-title');
        contentArea.innerHTML = '';
        contentArea.className = ''; 
        if (tab === 'mods') {
            title.innerText = 'Каталог модификаций';
            contentArea.classList.add('content-grid');
            loadMods();
        } else if (tab === 'install-methods') {
            title.innerText = 'Настройки установки';
            renderInstallMethods();
        } else if (tab === 'authors') {
            title.innerText = 'Информация';
            loadAuthors();
        } else if (tab === 'settings') {
            title.innerText = 'Настройки темы';
            renderSettings();
        }
        requestAnimationFrame(() => contentArea.classList.remove('fade-out'));
    }, 250); 
}

// --- ЗАГРУЗКА КОНТЕНТА ---
async function loadMods() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div><p>Загрузка списка...</p></div>`;
    try {
        const response = await fetch(REPO_JSON_URL);
        const mods = await response.json();

        // Проверка установленных модов
        let installedList = [];
        if (window.pywebview) {
            try {
                installedList = await window.pywebview.api.check_installed_mods(mods);
            } catch (e) { console.error(e); }
        }

        renderMods(mods, installedList);
    } catch (error) {
        contentArea.innerHTML = `<p style="color:#ff5252; text-align:center;">Ошибка загрузки.<br>${error.message}</p>`;
    }
}

function renderMods(mods, installedList) {
    contentArea.innerHTML = '';
    mods.forEach(mod => {
        let fileUrl = mod.file || "";
        if (fileUrl && !fileUrl.startsWith('http')) fileUrl = REPO_BASE_URL + fileUrl;
        let imageUrl = mod.image || "";
        if (imageUrl && !imageUrl.startsWith('http')) imageUrl = REPO_BASE_URL + imageUrl;
        if (!imageUrl) imageUrl = "https://via.placeholder.com/400x220/111/fff?text=No+Image";

        const isInstalled = installedList.includes(mod.id);
        const card = document.createElement('div');
        card.className = 'mod-card';
        
        let btnText = isAppEnvironment ? (isInstalled ? 'Уже установлен' : 'Установить') : 'Доступно в приложении';
        let btnIcon = isInstalled ? 'check' : 'download';
        let btnClass = isInstalled ? 'install-btn installed' : 'install-btn';
        let isDisabled = !isAppEnvironment || isInstalled;

        const authorHtml = mod.author ? `<p class="card-author">Автор: <span>${mod.author}</span></p>` : '';

        card.innerHTML = `
            <img src="${imageUrl}" class="card-image" alt="${mod.name}">
            <div class="card-content">
                <h3 class="card-title">${mod.name || "Без названия"}</h3>
                ${authorHtml}
                <p class="card-desc">${mod.description || ""}</p>
                <button class="${btnClass}" ${isDisabled ? 'disabled' : ''} onclick="startInstallProcess('${mod.id}', '${mod.name}', '${fileUrl}')">
                    <span class="material-symbols-outlined">${btnIcon}</span> ${btnText}
                </button>
            </div>`;
        contentArea.appendChild(card);
    });
}

async function loadAuthors() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div></div>`;
    try {
        const response = await fetch(REPO_AUTHORS_URL);
        const authors = await response.json();
        let authorsListHtml = '';
        authors.forEach((author, index) => {
            let avatarUrl = author.avatar || "";
            if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = REPO_BASE_URL + avatarUrl;
            const firstLetter = author.name ? author.name.charAt(0).toUpperCase() : "?";
            authorsListHtml += `
                <div class="author-row">
                    <div class="author-avatar-wrapper">
                        <img src="${avatarUrl}" alt="${author.name}" class="author-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="author-avatar-placeholder" style="background-color: rgba(var(--md-sys-color-primary-rgb), 0.2); color: var(--md-sys-color-primary); display: none;">${firstLetter}</div>
                    </div>
                    <div class="author-details"><h3>${author.name}</h3><span class="role">${author.role}</span><p>${author.bio}</p></div>
                </div>`;
            if (index < authors.length - 1) authorsListHtml += `<div class="divider"></div>`;
        });
        contentArea.innerHTML = `
            <div class="about-page-container">
                <div class="big-panel authors-panel"><h2 class="panel-title">Команда проекта</h2><div class="authors-list">${authorsListHtml}</div></div>
                <div class="big-panel app-info-panel"><h2 class="panel-title">О приложении</h2>
                    <div class="app-details">
                        <div class="app-header-row"><span class="app-version-badge">LOADER ASTR v1.0.0 Beta</span><span style="font-size: 12px; color: #666;">Build: 2025.11.25</span></div>
                        <div class="app-description-block">
                            <p class="app-desc-text">Это универсальный лаунчер-загрузчик модов в игру <strong>Tanks Blitz</strong>.</p>
                            <ul class="app-features-list-small"><li>Учитывает <strong>sDLS</strong> (Steam DLC System)</li><li>Поддерживает обычные обновления</li><li>Автоматические бэкапы</li></ul>
                            <p class="app-desc-text" style="margin-top: 12px;">Содержит в себе актуальные моды, созданные: <span style="color: #ffb74d; font-weight: 600;">Refuzo</span> + <span style="color: var(--md-sys-color-primary); font-weight: 600;">ASSTRALLITY</span>.</p>
                        </div>
                        <div style="flex-grow: 1;"></div>
                        <div class="app-footer-row"><p class="app-credits">(C) Launcher 2025 | Mod loader</p><p class="app-credits" style="opacity: 0.5;">Powered by Python, PyWebView & Pure Hate</p></div>
                    </div>
                </div>
            </div>`;
    } catch (error) { contentArea.innerHTML = `<p style="color:#ff5252; text-align:center;">Ошибка.<br>${error.message}</p>`; }
}

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
    
    const autoToggle = document.getElementById('toggle-auto');
    const sdlsToggle = document.getElementById('toggle-sdls');
    const noSdlsToggle = document.getElementById('toggle-nosdls');
    const cardAuto = document.getElementById('card-auto');
    const cardSdls = document.getElementById('card-sdls');
    const cardNosdls = document.getElementById('card-nosdls');

    function updateVisuals(method) {
        currentInstallMethod = method;
        cardAuto.classList.remove('active-method'); cardSdls.classList.remove('active-method'); cardNosdls.classList.remove('active-method');
        if (method === 'auto') cardAuto.classList.add('active-method');
        if (method === 'sdls') cardSdls.classList.add('active-method');
        if (method === 'no_sdls') cardNosdls.classList.add('active-method');
    }
    autoToggle.addEventListener('change', () => { if(autoToggle.checked){sdlsToggle.checked=false;noSdlsToggle.checked=false;updateVisuals('auto');}else autoToggle.checked=true; });
    sdlsToggle.addEventListener('change', () => { if(sdlsToggle.checked){autoToggle.checked=false;noSdlsToggle.checked=false;updateVisuals('sdls');}else sdlsToggle.checked=true; });
    noSdlsToggle.addEventListener('change', () => { if(noSdlsToggle.checked){autoToggle.checked=false;sdlsToggle.checked=false;updateVisuals('no_sdls');}else noSdlsToggle.checked=true; });
}

// --- УСТАНОВКА И ОТМЕНА ---
function startInstallProcess(id, name, url) {
    if (!window.pywebview) return;
    if (!url || url === "undefined") { alert("Ошибка: Ссылка на файл не найдена!"); return; }
    
    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    progressBar.style.width = "0%";
    progressPercent.innerText = "0%";
    modalTitle.innerText = name;
    modalStatus.innerText = "Подключение...";
    modal.classList.remove('hidden');
    
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
        if (window.pywebview) window.pywebview.api.cancel_install();
        closeModal();
    });
}

window.updateRealProgress = function(percent, text) {
    progressBar.style.width = percent + "%";
    progressPercent.innerText = percent + "%";
    modalStatus.innerText = text;
}

window.finishInstall = function(success, message) {
    installView.classList.add('view-hidden');
    if (success) {
        successView.classList.remove('view-hidden');
        setTimeout(() => { closeModal(); loadMods(); }, 2500); 
    } else {
        if (message === "Canceled") closeModal();
        else {
            errorView.classList.remove('view-hidden');
            errorMessage.innerText = message;
            setTimeout(closeModal, 3500);
        }
    }
}

function closeModal() {
    modal.classList.add('hidden');
}
