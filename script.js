const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

// === ЭЛЕМЕНТЫ ИНТЕРФЕЙСА ===
const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');

// Модальное окно установки
const modal = document.getElementById('progress-modal');
const installView = document.getElementById('install-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const errorMessage = document.getElementById('error-message');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent'); // Сюда пишем MB
const modalStatus = document.getElementById('modal-status');       // Сюда пишем статус
const modalTitle = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close-btn');

// Модальное окно восстановления/починки
const repairModal = document.getElementById('repair-modal');
const repairList = document.getElementById('repair-list');
const repairCloseBtn = document.getElementById('repair-close-btn');

// Модальное окно обновлений лаунчера
const updateModal = document.getElementById('update-modal'); // Если есть в HTML
const btnCheckUpdates = document.getElementById('btn-check-updates');

// Глобальные переменные
let currentInstallMethod = 'auto';
let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = []; // Список ID установленных модов

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
    // Восстановление темы
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);
    else applyAccentColor('#d0bcff'); // Дефолтный лиловый

    // Ожидание PyWebview
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods(); // Загрузка списка модов
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);

    // Пинг сервера
    checkPing();
    setInterval(checkPing, 10000);
    
    // Навигация
    setupNavigation();
    
    // Кнопка обновлений
    if(btnCheckUpdates) {
        btnCheckUpdates.addEventListener('click', checkForUpdates);
    }
});

// === ПРОВЕРКА ОКРУЖЕНИЯ ===
function checkEnvironment() {
    if (window.pywebview) {
        document.body.classList.add('desktop-mode');
        console.log("Desktop mode activated");
    }
}

// === ПИНГ СЕРВЕРА ===
async function checkPing() {
    const pingText = document.getElementById('ping-text');
    const pingDot = document.getElementById('ping-dot');
    if (!pingText || !pingDot) return;

    const start = Date.now();
    try {
        // Head запрос для проверки отклика
        await fetch(REPO_JSON_URL + '?t=' + start, { method: 'HEAD', cache: 'no-store' });
        const end = Date.now();
        const ping = end - start;

        pingText.innerText = `Соединено: ${ping} ms`;
        // Цветовая индикация
        let color = '#4caf50'; // Green
        if (ping > 150) color = '#ff9800'; // Orange
        if (ping > 300) color = '#f44336'; // Red
        
        pingDot.style.backgroundColor = color;
        pingDot.style.boxShadow = `0 0 8px ${color}`;
    } catch (e) {
        pingText.innerText = 'Нет сети';
        pingDot.style.backgroundColor = '#f44336';
        pingDot.style.boxShadow = 'none';
    }
}

// === ЗАГРУЗКА КОНТЕНТА ===
async function loadMods() {
    try {
        contentArea.innerHTML = '<div class="loader"></div>';
        
        // Параллельная загрузка всех JSON
        const [modsRes, buyRes, authorsRes] = await Promise.all([
            fetch(REPO_JSON_URL, {cache: "no-store"}),
            fetch(REPO_BUY_URL, {cache: "no-store"}),
            fetch(REPO_AUTHORS_URL, {cache: "no-store"})
        ]);

        if(!modsRes.ok) throw new Error("Ошибка доступа к списку модов");

        globalModsList = await modsRes.json();
        globalBuyList = await buyRes.json();
        // const authors = await authorsRes.json(); // Пока не используем, но скачали

        // Если мы в приложении, спрашиваем у Python, что установлено
        if (window.pywebview) {
            try {
                globalInstalledIds = await window.pywebview.api.check_installed_mods(globalModsList);
            } catch(err) {
                console.error("Ошибка проверки установленных модов:", err);
            }
        }

        renderMods(globalModsList, globalBuyList);
    } catch (e) {
        contentArea.innerHTML = `
            <div class="error-container">
                <h3>Ошибка загрузки</h3>
                <p>${e.message}</p>
                <button onclick="loadMods()" class="retry-btn">Повторить</button>
            </div>`;
    }
}

// === ОТРИСОВКА МОДОВ ===
function renderMods(mods, buyList) {
    contentArea.innerHTML = '';
    
    if (mods.length === 0) {
        contentArea.innerHTML = '<p class="empty-msg">Список модов пуст.</p>';
        return;
    }

    mods.forEach(mod => {
        // Обработка картинки (если относительный путь)
        let img = mod.image || "";
        if(img && !img.startsWith('http')) {
            img = REPO_BASE_URL + img;
        }
        if(!img) img = "assets/no-image.png"; // Заглушка

        // Статусы
        const isInst = globalInstalledIds.includes(mod.id);
        const buyInfo = buyList.find(b => b.id === mod.id);
        
        let btnText = 'Установить';
        let btnIcon = 'download';
        let btnClass = 'install-btn';
        let isDisabled = false;
        // Генерируем вызов функции установки
        // Важно: экранируем кавычки
        let onClickAction = `startInstallProcess('${mod.id}', '${mod.name.replace(/'/g, "\\'")}', '${mod.file}')`;

        if (buyInfo) {
            // Логика для платных модов
            if (buyInfo.status === 'preorder') {
                btnText = 'Предзаказ';
                btnIcon = 'schedule';
                onClickAction = `alert('Предзаказ доступен в Telegram')`;
            } else {
                btnText = 'Купить';
                btnIcon = 'shopping_cart';
                onClickAction = `alert('Покупка доступна в Telegram')`;
            }
            btnClass += ' premium-btn';
        } else {
            // Логика для бесплатных
            if (!window.pywebview) {
                btnText = 'Доступно в приложении';
                isDisabled = true;
            } else if (isInst) {
                btnText = 'Установлено';
                btnIcon = 'check';
                btnClass = 'install-btn installed';
                isDisabled = true; // Блокируем кнопку, если установлено
            }
        }

        const card = document.createElement('div');
        card.className = 'mod-card';
        // HTML карточки
        card.innerHTML = `
            <div class="card-image" style="background-image: url('${img}')"></div>
            <div class="card-content">
                <h3 class="mod-title">${mod.name}</h3>
                <p class="mod-author">By ${mod.author}</p>
                <p class="mod-desc">${mod.description || "Описание отсутствует."}</p>
                <button class="${btnClass}" ${isDisabled ? 'disabled' : ''} onclick="${onClickAction}">
                    <span class="material-icons">${btnIcon}</span> ${btnText}
                </button>
            </div>
        `;
        contentArea.appendChild(card);
    });
}

// === ЛОГИКА УСТАНОВКИ (Взаимодействие с Python) ===

function startInstallProcess(id, name, url) {
    if(!window.pywebview) return;

    // Сброс UI модального окна
    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    
    progressBar.style.width = "0%";
    progressPercent.innerText = "0.0 MB"; 
    modalTitle.innerText = name;
    modalStatus.innerText = "Подготовка к загрузке...";
    
    modal.classList.remove('hidden');

    // Вызываем Python
    // url передаем как есть, Python сам склеит с базовым URL если надо
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

// Кнопка отмены
if(modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
        if(window.pywebview) {
            // Сообщаем Python об отмене
            window.pywebview.api.cancel_install();
        }
        closeModal();
    });
}

function closeModal() {
    modal.classList.add('hidden');
}

// === API METHODS (Вызываются из Python) ===

/**
 * Обновляет прогресс-бар
 * @param {number} p - Процент (0-100)
 * @param {string} t - Текст статуса (например "Скачивание: 10/50 MB")
 * @param {string} label - (Опционально) Текст лейбла, например "12.5 MB"
 */
window.updateRealProgress = (p, t, label) => {
    if (progressBar) {
        progressBar.style.width = p + "%";
    }
    if (progressPercent) {
        // Если передан лейбл (размер), показываем его. Иначе проценты.
        progressPercent.innerText = label ? label : (p + "%");
    }
    if (modalStatus) {
        modalStatus.innerText = t;
    }
}

/**
 * Завершение установки
 * @param {boolean} success 
 * @param {string} message 
 */
window.finishInstall = (success, message) => {
    if(success) {
        installView.classList.add('view-hidden');
        successView.classList.remove('view-hidden');
        
        // Автоматически закрываем и обновляем список
        setTimeout(() => {
            closeModal();
            loadMods(); // ВАЖНО: Перезагружаем список, чтобы обновились галочки
        }, 2000);
    } else {
        if(message === "Canceled" || message === "Отменено пользователем"){
            closeModal();
        } else {
            installView.classList.add('view-hidden');
            errorView.classList.remove('view-hidden');
            errorMessage.innerText = message;
            // Даем прочитать ошибку 3 секунды
            setTimeout(closeModal, 4000);
        }
    }
}

// === ОБНОВЛЕНИЕ ЛАУНЧЕРА ===

async function checkForUpdates() {
    const icon = document.querySelector('#btn-check-updates .material-icons');
    if(icon) icon.classList.add('spin'); // Анимация вращения

    try {
        if(window.pywebview) {
            const res = await window.pywebview.api.check_for_updates();
            if(icon) icon.classList.remove('spin');

            if(res.available) {
                // Показываем окно обновления (если оно сверстано в HTML)
                // Для простоты используем alert или confirm, если нет модалки
                // Но у вас в ТЗ была модалка #update-modal
                if(updateModal) {
                    document.getElementById('update-ver').innerText = res.version;
                    document.getElementById('update-size').innerText = res.size;
                    document.getElementById('update-desc').innerText = res.changelog;
                    
                    // Кнопка "Обновить" внутри модалки
                    const btnDoUpdate = document.getElementById('btn-perform-update');
                    // Удаляем старые листенеры (клонированием)
                    const newBtn = btnDoUpdate.cloneNode(true);
                    btnDoUpdate.parentNode.replaceChild(newBtn, btnDoUpdate);
                    
                    newBtn.addEventListener('click', () => {
                        window.pywebview.api.perform_update(res.url);
                    });
                    
                    updateModal.classList.remove('hidden');
                } else {
                    if(confirm(`Доступна версия ${res.version}\nСкачать?`)) {
                        window.pywebview.api.perform_update(res.url);
                    }
                }
            } else {
                showToast(res.message || "Обновлений нет");
            }
        }
    } catch (e) {
        if(icon) icon.classList.remove('spin');
        showToast("Ошибка проверки обновлений");
    }
}

// Простой Toast (всплывашка)
function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}


// === ЦВЕТОВАЯ СХЕМА И НАСТРОЙКИ ===

function applyAccentColor(color) {
    // Сохраняем
    localStorage.setItem('accentColor', color);
    
    // Применяем CSS переменные
    document.documentElement.style.setProperty('--md-sys-color-primary', color);
    
    // Генерируем RGB для полупрозрачности
    const rgb = hexToRgb(color);
    if(rgb) {
        document.documentElement.style.setProperty('--md-sys-color-primary-rgb', rgb);
    }
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if(hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}

// Рендер страницы настроек (вызывается из навбара)
function renderSettings() {
    contentArea.innerHTML = `
        <h2>Настройки</h2>
        <div class="settings-section">
            <h3>Тема оформления</h3>
            <div class="color-picker">
                ${['#d0bcff', '#f44336', '#4caf50', '#2196f3', '#ff9800', '#e91e63']
                  .map(c => `<div class="color-circle" style="background:${c}" onclick="applyAccentColor('${c}')"></div>`).join('')}
            </div>
        </div>
        <div class="settings-section">
            <h3>Управление</h3>
            <button class="install-btn" onclick="window.pywebview.api.check_for_updates()">Проверить обновления</button>
            <button class="install-btn secondary" id="global-repair-btn">Восстановить клиент</button>
        </div>
    `;
    
    // Привязка кнопки починки
    setTimeout(() => {
        const rb = document.getElementById('global-repair-btn');
        if(rb) rb.addEventListener('click', openRepairModal);
    }, 100);
}

// === НАВИГАЦИЯ ===
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            navItems.forEach(n => n.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const target = e.currentTarget.getAttribute('data-target');
            if(target === 'mods') loadMods();
            else if(target === 'settings') renderSettings();
            // Для других вкладок можно добавить свои обработчики
        });
    });
}

// === ВОССТАНОВЛЕНИЕ (REPAIR) ===
function openRepairModal() {
    // Показываем список установленных модов
    repairList.innerHTML = '';
    
    // Фильтруем глобальный список по установленным ID
    const installedMods = globalModsList.filter(m => globalInstalledIds.includes(m.id));

    if (installedMods.length === 0) {
        repairList.innerHTML = '<p>Нет установленных модов для починки.</p>';
    } else {
        installedMods.forEach(mod => {
            const item = document.createElement('div');
            item.className = 'repair-item';
            item.innerHTML = `
                <span>${mod.name}</span>
                <button onclick="restoreMod('${mod.id}')">Сбросить</button>
            `;
            repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}

async function restoreMod(id) {
    if(!window.pywebview) return;
    repairModal.classList.add('hidden');
    
    // Используем то же окно прогресса
    installView.classList.remove('view-hidden');
    modal.classList.remove('hidden');
    modalTitle.innerText = "Восстановление...";
    modalStatus.innerText = "Очистка файлов...";
    
    const res = await window.pywebview.api.restore_mod(id);
    finishInstall(res.success, res.message);
}

if(repairCloseBtn) repairCloseBtn.addEventListener('click', () => repairModal.classList.add('hidden'));
