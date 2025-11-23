// --- ЗАПУСК ЗАСТАВКИ ---
document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');

    // Гарантируем, что заставка висит минимум 6 секунд
    // Используем requestAnimationFrame для плавности
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (splash) {
                splash.classList.add('fade-out');
                // Полностью убираем из DOM через секунду (после анимации CSS)
                setTimeout(() => {
                    splash.style.display = 'none';
                }, 1000);
            }
        }, 6000); // 6000 мс = 6 секунд задержки
    });

    // Загружаем данные
    loadMods();
});

// --- КОНСТАНТЫ И ЭЛЕМЕНТЫ UI ---
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

// --- НАВИГАЦИЯ ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        handleTabChange(item.getAttribute('data-tab'));
    });
});

function handleTabChange(tab) {
    if (!contentArea) return;
    
    contentArea.classList.add('fade-out');

    setTimeout(() => {
        const title = document.getElementById('page-title');
        contentArea.innerHTML = '';
        
        // Сбрасываем классы и восстанавливаем grid только для модов
        contentArea.className = ''; 
        if (tab === 'mods') contentArea.classList.add('content-grid');

        if (tab === 'mods') {
            if (title) title.innerText = 'Каталог модификаций';
            loadMods();
        } else if (tab === 'install-methods') {
            if (title) title.innerText = 'Методы установки';
            renderInstallMethods();
        } else if (tab === 'authors') {
            if (title) title.innerText = 'Авторы';
            contentArea.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons empty-icon">construction</span>
                    <h3>Раздел находится в разработке</h3>
                </div>
            `;
        }

        contentArea.classList.remove('fade-out');
    }, 250);
}

// --- ОТРИСОВКА СТРАНИЦЫ "МЕТОДЫ УСТАНОВКИ" ---
function renderInstallMethods() {
    contentArea.innerHTML = `
        <div class="settings-container">
            <div class="setting-card" data-method="sdls">
                <div class="setting-info">
                    <h3>SDLS</h3>
                    <p>Установка модов в папку Documents/packs.</p>
                </div>
                <label class="switch">
                    <input type="radio" name="install-method" value="sdls" ${currentInstallMethod === 'sdls' ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>

            <div class="setting-card" data-method="replace">
                <div class="setting-info">
                    <h3>Замена файлов</h3>
                    <p>Прямая замена файлов игры.</p>
                </div>
                <label class="switch">
                    <input type="radio" name="install-method" value="replace" ${currentInstallMethod === 'replace' ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        </div>
    `;

    document.querySelectorAll('input[name="install-method"]').forEach(input => {
        input.addEventListener('change', (e) => {
            currentInstallMethod = e.target.value;
        });
    });
}

// --- ЗАГРУЗКА МОДОВ С GITHUB ---
async function loadMods() {
    if (!contentArea) return;

    contentArea.innerHTML = `
        <div class="loader-spinner">
            <div class="spinner"></div>
            <p>Загрузка списка...</p>
        </div>
    `;

    try {
        const response = await fetch(REPO_JSON_URL);
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const data = await response.json();
        const mods = Array.isArray(data.mods) ? data.mods : [];
        renderMods(mods);
    } catch (error) {
        console.error('Ошибка загрузки mods.json:', error);
        // Исправлена строка ниже - теперь нет синтаксической ошибки
        contentArea.innerHTML = `
            <div class="empty-state">
                <span class="material-icons empty-icon">cloud_off</span>
                <h3>Не удалось загрузить моды</h3>
                <p style="margin-top: 8px; font-size: 14px;">Ошибка загрузки данных</p>
            </div>
        `;
    }
}

// --- ОТРИСОВКА КАРТОЧЕК МОДОВ ---
function renderMods(mods) {
    if (!contentArea) return;
    contentArea.innerHTML = '';

    if (!mods || mods.length === 0) {
        contentArea.innerHTML = `
            <div class="empty-state">
                <span class="material-icons empty-icon">inbox</span>
                <h3>Модов пока нет</h3>
            </div>
        `;
        return;
    }

    mods.forEach(mod => {
        let rawUrl = mod.file || mod.file_url || mod.url || '';
        let fullUrl = rawUrl;

        if (rawUrl && !rawUrl.startsWith('http')) {
            fullUrl = REPO_BASE_URL + rawUrl;
        }

        // Проверка картинки
        const imageUrl = mod.image || 'https://via.placeholder.com/400x220/111/fff?text=No+Image';

        const card = document.createElement('div');
        card.className = 'mod-card';

        card.innerHTML = `
            <img src="${imageUrl}" alt="${mod.name}" class="card-image">
            <div class="card-content">
                <h3 class="card-title">${mod.name}</h3>
                <p class="card-desc">${mod.description || ''}</p>
                <button class="install-btn">
                    <span class="material-icons">download</span>
                    Установить
                </button>
            </div>
        `;

        const btn = card.querySelector('.install-btn');
        btn.addEventListener('click', () => {
            installMod(mod.name, fullUrl);
        });

        contentArea.appendChild(card);
    });
}

// --- УСТАНОВКА МОДА (МОДАЛКА + ПРОГРЕСС) ---
function installMod(modName, modUrl) {
    if (!modal) return;

    modal.classList.remove('hidden');
    
    if (installView) installView.classList.remove('view-hidden');
    if (successView) successView.classList.add('view-hidden');
    if (errorView) errorView.classList.add('view-hidden');

    if (modalTitle) modalTitle.innerText = 'Установка...';
    if (modalStatus) modalStatus.innerText = 'Инициализация...';
    if (progressBar) progressBar.style.width = '0%';
    if (progressPercent) progressPercent.innerText = '0%';

    // Имитация прогресса
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;

        if (progressBar) progressBar.style.width = progress + '%';
        if (progressPercent) progressPercent.innerText = Math.floor(progress) + '%';

        if (progress >= 100) {
            clearInterval(interval);
            
            setTimeout(() => {
                if (installView) installView.classList.add('view-hidden');
                if (successView) successView.classList.remove('view-hidden');

                setTimeout(() => {
                    modal.classList.add('hidden');
                }, 2000);
            }, 400);
        }
    }, 200);
}
