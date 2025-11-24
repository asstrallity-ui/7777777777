document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => { 
        splash.classList.add('fade-out'); 
    }, 2600); 
    
    loadMods(); 
    setTimeout(checkEnvironment, 1000);
});

const REPO_BASE_URL = 'https://raw.githubusercontent.com/asstrallity-ui/Tanks_Blitz_Mods_Files/main/';
const REPO_JSON_URL = REPO_BASE_URL + 'mods.json';

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
        document.querySelectorAll('.install-btn').forEach(btn => btn.disabled = false);
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
            title.innerText = 'Авторы';
            contentArea.innerHTML = `
                <div class="authors-container">
                    <!-- REFUZO -->
                    <div class="author-card">
                        <div class="author-header">
                            <div class="author-avatar" style="background-color: #ffb74d;">R</div>
                            <div class="author-info">
                                <h3>Refuzo</h3>
                                <span class="author-role">Lead Modder / Founder</span>
                            </div>
                        </div>
                        <p class="author-bio">
                            Основной мододел танкового дерьма. Живёт и спит в этой параше более 6 лет.
                            Знает о структуре файлов игры больше, чем сами разработчики.
                        </p>
                    </div>

                    <!-- ASSTRALLITY -->
                    <div class="author-card">
                        <div class="author-header">
                            <div class="author-avatar" style="background-color: #d0bcff;">A</div>
                            <div class="author-info">
                                <h3>ASSTRALLITY</h3>
                                <span class="author-role">Developer / UI/UX</span>
                            </div>
                        </div>
                        <p class="author-bio">
                            Левая или правая рука и половина извилин в ебанутой черепушке. 
                            Тоже чёт может :3. Отвечает за то, чтобы эта программа выглядела не как говно.
                        </p>
                    </div>
                </div>
            `;
        }
        requestAnimationFrame(() => { contentArea.classList.remove('fade-out'); });
    }, 250); 
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

    autoToggle.addEventListener('change', () => { 
        if (autoToggle.checked) { sdlsToggle.checked = false; noSdlsToggle.checked = false; currentInstallMethod = 'auto'; } 
        else { autoToggle.checked = true; }
    });

    sdlsToggle.addEventListener('change', () => { 
        if (sdlsToggle.checked) { autoToggle.checked = false; noSdlsToggle.checked = false; currentInstallMethod = 'sdls'; } 
        else { sdlsToggle.checked = true; }
    });

    noSdlsToggle.addEventListener('change', () => { 
        if (noSdlsToggle.checked) { autoToggle.checked = false; sdlsToggle.checked = false; currentInstallMethod = 'no_sdls'; } 
        else { noSdlsToggle.checked = true; }
    });
}

async function loadMods() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div><p>Загрузка списка...</p></div>`;
    try {
        const response = await fetch(REPO_JSON_URL);
        if (!response.ok) throw new Error('Ошибка сети');
        const mods = await response.json();
        renderMods(mods);
    } catch (error) {
        contentArea.innerHTML = `<p style="color:#ff5252; text-align:center;">Не удалось загрузить список модов.<br>${error.message}</p>`;
    }
}

function renderMods(mods) {
    contentArea.innerHTML = '';
    mods.forEach(mod => {
        let rawUrl = mod.file || mod.file_url || mod.url || "";
        let fullUrl = rawUrl;
        if (rawUrl && !rawUrl.startsWith('http')) { fullUrl = REPO_BASE_URL + rawUrl; }
        const imageUrl = mod.image || "https://via.placeholder.com/400x220/111/fff?text=No+Image";
        const card = document.createElement('div');
        card.className = 'mod-card';
        
        const btnText = isAppEnvironment ? 'Установить' : 'Доступно в приложении';
        
        card.innerHTML = `
            <img src="${imageUrl}" class="card-image" alt="${mod.name}">
            <div class="card-content">
                <h3 class="card-title">${mod.name || "Без названия"}</h3>
                <p class="card-desc">${mod.description || ""}</p>
                <button class="install-btn" onclick="startInstallProcess('${mod.id}', '${mod.name}', '${fullUrl}')">
                    <span class="material-symbols-outlined">download</span> ${btnText}
                </button>
            </div>
        `;
        contentArea.appendChild(card);
    });
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

    if (!url || url === "undefined") return;
    
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
