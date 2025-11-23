// --- ЗАПУСК ЗАСТАВКИ ---
document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    
    // Мы гарантируем, что заставка висит минимум 6 секунд
    // Используем requestAnimationFrame для уверенности, что отрисовка началась
    requestAnimationFrame(() => {
        setTimeout(() => {
            splash.classList.add('fade-out');
            
            // Полностью убираем из DOM через секунду (после анимации CSS)
            // чтобы не перекрывал клики, если visibility: hidden не сработает
            setTimeout(() => {
                splash.style.display = 'none';
            }, 1000);
            
        }, 6000); // 6000 мс = 6 секунд задержки
    });
    
    // Загружаем данные параллельно
    loadMods(); 
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

let currentInstallMethod = 'sdls'; 

// Навигация
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
            // КРАСИВАЯ ЗАГЛУШКА
            contentArea.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined empty-icon">engineering</span>
                    <h3>Временно недоступна</h3>
                    <p>Раздел находится в разработке</p>
                </div>
            `;
        }
        
        requestAnimationFrame(() => {
            contentArea.classList.remove('fade-out');
        });

    }, 250); 
}

function renderInstallMethods() {
    contentArea.innerHTML = `
        <div class="settings-container">
            <div class="setting-card">
                <div class="setting-info">
                    <h3>sDLS Метод (Рекомендуется)</h3>
                    <p>Установка модов в папку Documents/packs.</p>
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
    const sdlsToggle = document.getElementById('toggle-sdls');
    const noSdlsToggle = document.getElementById('toggle-nosdls');

    sdlsToggle.addEventListener('change', () => {
        if (sdlsToggle.checked) { noSdlsToggle.checked = false; currentInstallMethod = 'sdls'; } 
        else { noSdlsToggle.checked = true; currentInstallMethod = 'no_sdls'; }
    });
    noSdlsToggle.addEventListener('change', () => {
        if (noSdlsToggle.checked) { sdlsToggle.checked = false; currentInstallMethod = 'no_sdls'; } 
        else { sdlsToggle.checked = true; currentInstallMethod = 'sdls'; }
    });
}

async function loadMods() {
    contentArea.innerHTML = `<div class="loader-spinner"><div class="spinner"></div><p>Загрузка списка...</p></div>`;
    try {
        let mods = [];
        try {
            const response = await fetch(REPO_JSON_URL);
            if (!response.ok) throw new Error('GitHub JSON not found');
            mods = await response.json();
        } catch (err) {
            console.warn('Demo Mode');
            mods = [{ id: "demo", name: "Demo Mod", file: "demo.zip" }];
        }
        renderMods(mods);
    } catch (error) {
        contentArea.innerHTML = `<p style="color:#ff5252; text-align:center;">Ошибка: ${error.message}</p>`;
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
        card.innerHTML = `
            <img src="${imageUrl}" class="card-image" alt="${mod.name}">
            <div class="card-content">
                <h3 class="card-title">${mod.name || "Без названия"}</h3>
                <p class="card-desc">${mod.description || ""}</p>
                <button class="install-btn" onclick="startInstallProcess('${mod.id}', '${mod.name}', '${fullUrl}')">
                    <span class="material-symbols-outlined">download</span> Установить
                </button>
            </div>
        `;
        contentArea.appendChild(card);
    });
}

function startInstallProcess(id, name, url) {
    if (!url || url === "undefined") return alert("Ссылка не найдена!");

    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    
    progressBar.style.width = "0%";
    progressPercent.innerText = "0%";
    modalTitle.innerText = `Установка: ${name}`;
    modalStatus.innerText = "Подготовка...";
    modal.classList.remove('hidden');

    if (window.pywebview) {
        window.pywebview.api.install_mod(id, url, currentInstallMethod);
    } else {
        alert("Запустите через Python!");
        closeModal();
    }
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
        if (message.includes("уже установлен")) {
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
