document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => { 
        splash.classList.add('fade-out'); 
    }, 2600); 
    
    loadMods(); 
    
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);
});

window.addEventListener('pywebviewready', function() {
    checkEnvironment();
});

const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';
const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';

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

let currentInstallMethod = 'auto'; 
let isAppEnvironment = false;

function checkEnvironment() {
    if (window.pywebview) {
        isAppEnvironment = true;
        const buttons = document.querySelectorAll('.install-btn');
        buttons.forEach(btn => {
            btn.disabled = false;
            if (btn.innerText.includes("Доступно")) {
                btn.innerHTML = '<span class="material-symbols-outlined">download</span> Установить';
            }
        });
    }
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
        contentArea.className = tab === 'mods' ? 'content-grid' : '';

        if (tab === 'mods') {
            title.innerText = 'Каталог модификаций';
            contentArea.classList.add('content-grid');
            loadMods();
        } else if (tab === 'install-methods') {
            title.innerText = 'Методы установки';
            renderInstallMethods();
        } else if (tab === 'authors') {
            title.innerText = 'Информация';
            loadAuthors();
        }
        requestAnimationFrame(() => { contentArea.classList.remove('fade-out'); });
    }, 250); 
}

async function loadAuthors() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div></div>`;
    
    try {
        const response = await fetch(REPO_AUTHORS_URL);
        if (!response.ok) throw new Error('Authors file not found');
        const authors = await response.json();
        
        let authorsListHtml = '';
        
        authors.forEach((author, index) => {
            let avatarUrl = author.avatar || "";
            if (avatarUrl && !avatarUrl.startsWith('http')) { avatarUrl = REPO_BASE_URL + avatarUrl; }
            const firstLetter = author.name ? author.name.charAt(0).toUpperCase() : "?";
            const colors = ['#ffb74d', '#d0bcff', '#4caf50', '#64b5f6'];
            const bgColor = colors[index % colors.length];

            authorsListHtml += `
                <div class="author-row">
                    <div class="author-avatar-wrapper">
                        <img src="${avatarUrl}" alt="${author.name}" class="author-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="author-avatar-placeholder" style="background-color: ${bgColor}; display: none;">${firstLetter}</div>
                    </div>
                    <div class="author-details">
                        <h3>${author.name}</h3>
                        <span class="role">${author.role}</span>
                        <p>${author.bio}</p>
                    </div>
                </div>
            `;
            if (index < authors.length - 1) { authorsListHtml += `<div class="divider"></div>`; }
        });

        contentArea.innerHTML = `
            <div class="about-page-container">
                <div class="big-panel authors-panel">
                    <h2 class="panel-title">Команда проекта</h2>
                    <div class="authors-list">
                        ${authorsListHtml}
                    </div>
                </div>

                <div class="big-panel app-info-panel">
                    <h2 class="panel-title">О приложении</h2>
                    <div class="app-details">
                        <span class="app-version-badge">LOADER ASTR v1.0.0 Beta</span>
                        <p class="app-desc">
                            Автоматический установщик модов для Tanks Blitz. Поддерживает Steam DLC System (sDLS) и безопасную установку без поломки клиента игры.
                        </p>
                        <p class="app-credits">Powered by Python, PyWebView & Pure Hate.</p>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        contentArea.innerHTML = `<p style="color:#ff5252; text-align:center;">Ошибка загрузки списка авторов.<br>${error.message}</p>`;
    }
}

function renderInstallMethods() {
    contentArea.innerHTML = `
        <div class="settings-container">
            <div class="setting-card" style="border-color: var(--md-sys-color-primary);">
                <div class="setting-info">
                    <h3 style="color: var(--md-sys-color-primary);">Автоматически (Рекомендуется)</h3>
                    <p>Сам найдет папку packs с кэшем игры.</p>
                </div>
                <label class="switch">
                    <input type="checkbox" id="toggle-auto" ${currentInstallMethod === 'auto' ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <div class="setting-card">
                <div class="setting-info">
                    <h3>sDLS Метод (Ручной)</h3>
                    <p>Принудительно в Documents/packs.</p>
                </div>
                <label class="switch">
                    <input type="checkbox" id="toggle-sdls" ${currentInstallMethod === 'sdls' ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            <div class="setting-card">
                <div class="setting-info">
                    <h3>Стандартный метод (No-SDLS)</h3>
                    <p>Прямая замена файлов игры.</p>
                </div>
                <label class="switch">
                    <input type="checkbox" id="toggle-nosdls" ${currentInstallMethod === 'no_sdls' ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        </div>
    `;

    const autoToggle = document.getElementById('toggle-auto');
    const sdlsToggle = document.getElementById('toggle-sdls');
    const noSdlsToggle = document.getElementById('toggle-nosdls');

    autoToggle.addEventListener('change', () => { if (autoToggle.checked) { sdlsToggle.checked = false; noSdlsToggle.checked = false; currentInstallMethod = 'auto'; } else { autoToggle.checked = true; } });
    sdlsToggle.addEventListener('change', () => { if (sdlsToggle.checked) { autoToggle.checked = false; noSdlsToggle.checked = false; currentInstallMethod = 'sdls'; } else { sdlsToggle.checked = true; } });
    noSdlsToggle.addEventListener('change', () => { if (noSdlsToggle.checked) { autoToggle.checked = false; sdlsToggle.checked = false; currentInstallMethod = 'no_sdls'; } else { noSdlsToggle.checked = true; } });
}

async function loadMods() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div><p>Загрузка списка...</p></div>`;
    try {
        const response = await fetch(REPO_JSON_URL);
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
        const mods = await response.json();
        renderMods(mods);
    } catch (error) {
        console.error(error);
        contentArea.innerHTML = `<p style="color:#ff5252; text-align:center;">Не удалось загрузить список модов.<br>${error.message}<br>Проверьте CORS на сервере.</p>`;
    }
}

function renderMods(mods) {
    contentArea.innerHTML = '';
    
    if (window.pywebview) isAppEnvironment = true;

    mods.forEach(mod => {
        let fileUrl = mod.file || "";
        if (fileUrl && !fileUrl.startsWith('http')) { fileUrl = REPO_BASE_URL + fileUrl; }
        
        let imageUrl = mod.image || "";
        if (imageUrl && !imageUrl.startsWith('http')) { imageUrl = REPO_BASE_URL + imageUrl; }
        if (!imageUrl) imageUrl = "https://via.placeholder.com/400x220/111/fff?text=No+Image";

        const card = document.createElement('div');
        card.className = 'mod-card';
        
        const btnText = isAppEnvironment ? 'Установить' : 'Доступно в приложении';
        const disabledAttr = isAppEnvironment ? '' : 'disabled';
        
        const authorHtml = mod.author ? `<p class="card-author">Автор: <span>${mod.author}</span></p>` : '';

        card.innerHTML = `
            <img src="${imageUrl}" class="card-image" alt="${mod.name}">
            <div class="card-content">
                <h3 class="card-title">${mod.name || "Без названия"}</h3>
                ${authorHtml}
                <p class="card-desc">${mod.description || ""}</p>
                <button class="install-btn" ${disabledAttr} onclick="startInstallProcess('${mod.id}', '${mod.name}', '${fileUrl}')">
                    <span class="material-symbols-outlined">download</span> ${btnText}
                </button>
            </div>
        `;
        contentArea.appendChild(card);
    });
    
    checkEnvironment();
}

function startInstallProcess(id, name, url) {
    if (!window.pywebview) {
        installView.classList.add('view-hidden');
        successView.classList.add('view-hidden');
        errorView.classList.remove('view-hidden');
        errorMessage.innerText = "Установка доступна только в приложении LOADER ASTR!";
        modal.classList.remove('hidden');
        setTimeout(closeModal, 3000);
        return;
    }

    if (!url || url === "undefined") {
        alert("Ошибка: Ссылка на файл не найдена!");
        return;
    }
    
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

window.updateRealProgress = function(percent, text) {
    progressBar.style.width = percent + "%";
    progressPercent.innerText = percent + "%";
    modalStatus.innerText = text;
}

window.finishInstall = function(success, message) {
    installView.classList.add('view-hidden');
    if (success) {
        successView.classList.remove('view-hidden');
        setTimeout(closeModal, 2500); 
    } else {
        errorView.classList.remove('view-hidden');
        if (message && message.includes("уже установлен")) {
            errorMessage.innerText = "Сорян, у тебя уже есть такой мод....";
        } else {
            errorMessage.innerText = message;
        }
        setTimeout(closeModal, 3500);
    }
}

function closeModal() {
    modal.classList.add('hidden');
}
