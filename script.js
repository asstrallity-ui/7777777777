const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

const contentArea = document.getElementById('content-area');

// UI Elements
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

let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = [];

document.addEventListener('DOMContentLoaded', () => {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);
    
    // Ждем pywebview
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            checkEnvironment();
            loadMods(); 
            if (window.pywebview) clearInterval(interval);
        }
    }, 100);
});

function checkEnvironment() {
    if (window.pywebview) {
        document.body.classList.add('desktop-mode');
    }
}

// === ЗАГРУЗКА ДАННЫХ ===
async function loadMods() {
    try {
        contentArea.innerHTML = '<div class="loader"></div>';
        
        const [modsRes, buyRes, authorsRes] = await Promise.all([
            fetch(REPO_JSON_URL),
            fetch(REPO_BUY_URL),
            fetch(REPO_AUTHORS_URL)
        ]);

        globalModsList = await modsRes.json();
        globalBuyList = await buyRes.json();
        const authors = await authorsRes.json();

        // Если десктоп - проверяем установленные моды
        if (window.pywebview) {
            globalInstalledIds = await window.pywebview.api.check_installed_mods(globalModsList);
        }

        renderMods(globalModsList, globalBuyList);
    } catch (e) {
        contentArea.innerHTML = `<div class="error">Ошибка загрузки: ${e.message}</div>`;
    }
}

// === ОТРИСОВКА ===
function renderMods(mods, buyList) {
    contentArea.innerHTML = '';
    mods.forEach(mod => {
        let img = mod.image || "";
        if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
        
        const isInst = globalInstalledIds.includes(mod.id);
        const buyInfo = buyList.find(b => b.id === mod.id);
        
        let btnText = 'Установить';
        let btnClass = 'install-btn';
        let isDisabled = false;
        let action = `startInstall('${mod.id}', '${mod.name}', '${mod.file}')`;

        if (buyInfo) {
            btnText = buyInfo.status === 'preorder' ? 'Предзаказ' : 'Купить';
            action = `alert('Платный контент')`; 
        } else {
            if (!window.pywebview) {
                btnText = 'Доступно в приложении';
                isDisabled = true;
            } else if (isInst) {
                btnText = 'Установлено'; // Текст изменен
                btnClass += ' installed'; // Можно стилизовать серым
                isDisabled = true;
            }
        }

        const card = document.createElement('div');
        card.className = 'mod-card';
        card.innerHTML = `
            <img src="${img}" class="mod-image" loading="lazy">
            <div class="mod-info">
                <h3 class="mod-title">${mod.name}</h3>
                <p class="mod-author">Автор: ${mod.author}</p>
                <p class="mod-desc">${mod.description || ""}</p>
                <button class="${btnClass}" ${isDisabled ? 'disabled' : ''} 
                    onclick="${action}">
                    ${isInst ? '<span class="material-icons">check</span> ' : ''}${btnText}
                </button>
            </div>
        `;
        contentArea.appendChild(card);
    });
}

// === ЛОГИКА УСТАНОВКИ ===
function startInstall(id, name, url) {
    if(!window.pywebview) return;
    
    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    
    progressBar.style.width = "0%";
    progressPercent.innerText = "0 MB";
    modalTitle.innerText = name;
    modalStatus.innerText = "Подготовка...";
    
    modal.classList.remove('hidden');
    
    // Вызов Python
    window.pywebview.api.install_mod(id, url, 'auto');
}

// === API ДЛЯ PYTHON ===

// p: процент (int)
// status: текст снизу (string)
// label: текст размера/скорости (string), например "15.2 MB"
window.updateRealProgress = (p, status, label) => {
    if (progressBar) progressBar.style.width = p + "%";
    
    // Если передан лейбл (МБ), показываем его. Если нет - проценты.
    if (progressPercent) progressPercent.innerText = label ? label : (p + "%");
    if (modalStatus) modalStatus.innerText = status;
}

window.finishInstall = (success, message) => {
    if(success) {
        installView.classList.add('view-hidden');
        successView.classList.remove('view-hidden');
        
        setTimeout(() => {
            closeModal();
            loadMods(); // ПЕРЕЗАГРУЗКА СПИСКА, чтобы обновились кнопки
        }, 2000);
    } else {
        if(message === "Canceled"){
            closeModal();
        } else {
            installView.classList.add('view-hidden');
            errorView.classList.remove('view-hidden');
            errorMessage.innerText = message;
            setTimeout(closeModal, 3000);
        }
    }
}

// Закрытие модального окна
if(modalCloseBtn) modalCloseBtn.addEventListener('click', () => {
    if(window.pywebview) window.pywebview.api.cancel_install();
    closeModal();
});

function closeModal() {
    modal.classList.add('hidden');
}

// Вспомогательные функции цвета
function applyAccentColor(color) {
    document.documentElement.style.setProperty('--md-sys-color-primary', color);
}
