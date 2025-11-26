const REPO_JSON_URL = 'https://rh-archive.ru/mods_files_github/mods.json';
const REPO_BUY_URL = 'https://rh-archive.ru/mods_files_github/buy.json';
const REPO_AUTHORS_URL = 'https://rh-archive.ru/mods_files_github/authors.json';
const REPO_BASE_URL = 'https://rh-archive.ru/mods_files_github/';

const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('page-title');
const splash = document.getElementById('splash-screen');
const toast = document.getElementById('toast-notification');

// Modals Elements
const progressModal = document.getElementById('progress-modal');
const installView = document.getElementById('install-view');
const successView = document.getElementById('success-view');
const errorView = document.getElementById('error-view');
const errorMessage = document.getElementById('error-message');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const modalStatus = document.getElementById('modal-status');
const modalTitle = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close-btn');

const infoModal = document.getElementById('info-modal');
const infoModName = document.getElementById('info-mod-name');
const infoDesc = document.getElementById('info-modal-desc');
const infoPrice = document.getElementById('info-price');
const infoActionBtn = document.getElementById('info-modal-action');
const infoCloseBtn = document.getElementById('info-close-btn');

const updateModal = document.getElementById('update-modal');
const updateVerSpan = document.getElementById('update-version');
const updateSizeSpan = document.getElementById('update-size');
const updateLogP = document.getElementById('update-changelog');
const btnStartUpdate = document.getElementById('btn-start-update');
const btnSkipUpdate = document.getElementById('btn-skip-update');
const btnCheckUpdates = document.getElementById('btn-check-updates');

const repairModal = document.getElementById('repair-modal');
const repairList = document.getElementById('repair-list');
const repairCloseBtn = document.getElementById('repair-close-btn');
const globalRepairBtn = document.getElementById('global-repair-btn');

const vpnModal = document.getElementById('vpn-modal');
const btnTestVpn = document.getElementById('btn-test-vpn');
const btnVpnReload = document.getElementById('btn-vpn-reload');

let currentInstallMethod = 'auto'; 
let globalModsList = [];
let globalBuyList = [];
let globalInstalledIds = [];
let newUpdateUrl = "";

document.addEventListener('DOMContentLoaded', () => {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) applyAccentColor(savedColor);

    // Init Sequence
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (window.pywebview || attempts > 50) {
            clearInterval(interval);
            
            // Load Content
            loadMods();
            
            // Check Network Delayed
            setTimeout(checkNetwork, 1500);
            
            // Hide Splash
            setTimeout(() => {
                if(splash) {
                    splash.style.opacity = 0;
                    setTimeout(() => splash.style.display = 'none', 800);
                }
            }, 1000);
        }
    }, 100);

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            if(!target) return;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            if (target === 'mods') { pageTitle.innerText = "Каталог модов"; loadMods(); }
            else if (target === 'settings') { pageTitle.innerText = "Настройки"; renderSettings(); }
            else if (target === 'about') { pageTitle.innerText = "О программе"; renderAbout(); }
        });
    });

    setupModalHandlers();
});

function setupModalHandlers() {
    // VPN
    if(btnTestVpn) btnTestVpn.addEventListener('click', () => vpnModal.classList.remove('hidden'));
    if(btnVpnReload) btnVpnReload.addEventListener('click', () => window.location.reload());

    // Install
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', () => {
        if(window.pywebview) window.pywebview.api.cancel_install();
        progressModal.classList.add('hidden');
    });

    // Info
    if(infoCloseBtn) infoCloseBtn.addEventListener('click', () => infoModal.classList.add('hidden'));

    // Update
    if(btnCheckUpdates) btnCheckUpdates.addEventListener('click', checkForUpdates);
    if(btnSkipUpdate) btnSkipUpdate.addEventListener('click', () => updateModal.classList.add('hidden'));
    if(btnStartUpdate) btnStartUpdate.addEventListener('click', () => {
        if(window.pywebview) window.pywebview.api.perform_update(newUpdateUrl);
    });

    // Repair
    if(repairCloseBtn) repairCloseBtn.addEventListener('click', () => repairModal.classList.add('hidden'));
    if(globalRepairBtn) globalRepairBtn.addEventListener('click', openRepairModal);
}

async function checkNetwork() {
    if(!window.pywebview) return;
    try {
        const res = await window.pywebview.api.check_connection_status();
        if (res.status === 'blocked' && res.country === 'UA') {
            vpnModal.classList.remove('hidden');
        } else if (res.status === 'error') {
            showToast("Сервер недоступен");
        }
    } catch(e) { console.error(e); }
}

async function loadMods() {
    if(contentArea) contentArea.innerHTML = '<div class="loader-spinner">Загрузка...</div>';
    try {
        const [mods, buy] = await Promise.all([
            fetch(REPO_JSON_URL).then(r => r.json()).catch(()=>[]),
            fetch(REPO_BUY_URL).then(r => r.json()).catch(()=>[])
        ]);
        
        globalModsList = mods;
        globalBuyList = buy;
        
        if(window.pywebview) {
            globalInstalledIds = await window.pywebview.api.check_installed_mods(mods);
        }
        
        renderMods(mods, buy, globalInstalledIds);
    } catch(e) {
        if(contentArea) contentArea.innerHTML = `<div class="error-text">Ошибка: ${e.message}</div>`;
    }
}

function renderMods(mods, buyList, installed) {
    if(!contentArea) return;
    contentArea.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'mods-grid';
    
    mods.forEach(mod => {
        const b = buyList.find(x => x.id === mod.id);
        const isInst = installed.includes(mod.id);
        let btnTxt = 'Установить', icon = 'download', cls = 'install-btn';
        let action = `startInstall('${mod.id}', '${mod.file}', '${mod.name}')`;

        if(b) {
            btnTxt = b.status === 'preorder' ? 'Предзаказ' : 'Купить';
            icon = 'shopping_cart';
            action = `openInfoModal('${mod.id}', '${mod.name}', '${b.desc}', '${b.price}', '${b.link}')`;
        } else if(isInst) {
            btnTxt = 'Установлен';
            cls += ' installed';
            icon = 'check';
        }

        const card = document.createElement('div');
        card.className = 'mod-card';
        let img = mod.image || "";
        if(img && !img.startsWith('http')) img = REPO_BASE_URL + img;
        
        card.innerHTML = `
            <img src="${img}" class="mod-image" onerror="this.style.display='none'">
            <div class="mod-content">
                <h3 class="mod-title">${mod.name}</h3>
                <div class="mod-author">by ${mod.author}</div>
                <div class="mod-desc">${mod.description}</div>
                <div class="mod-actions">
                    <button class="${cls}" onclick="${action}">
                        <span class="material-symbols-rounded">${icon}</span> ${btnTxt}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    contentArea.appendChild(grid);
}

function startInstall(id, url, name) {
    if(!window.pywebview) { showToast("Только в приложении"); return; }
    if(url && !url.startsWith('http')) url = REPO_BASE_URL + url;
    
    modalTitle.innerText = name;
    modalStatus.innerText = "Start...";
    progressBar.style.width = '0%';
    progressPercent.innerText = '0%';
    
    installView.classList.remove('view-hidden');
    successView.classList.add('view-hidden');
    errorView.classList.add('view-hidden');
    progressModal.classList.remove('hidden');
    
    window.pywebview.api.install_mod(id, url, currentInstallMethod);
}

// Callbacks
window.updateRealProgress = (pct, txt) => {
    if(progressBar) progressBar.style.width = pct + "%";
    if(progressPercent) progressPercent.innerText = pct + "%";
    if(modalStatus) modalStatus.innerText = txt;
};

window.finishInstall = (ok, msg) => {
    if(ok) {
        installView.classList.add('view-hidden');
        successView.classList.remove('view-hidden');
        setTimeout(() => { progressModal.classList.add('hidden'); loadMods(); }, 2000);
    } else {
        if(msg === 'Canceled') progressModal.classList.add('hidden');
        else {
            installView.classList.add('view-hidden');
            errorView.classList.remove('view-hidden');
            if(errorMessage) errorMessage.innerText = msg;
        }
    }
};

function openInfoModal(id, name, desc, price, link) {
    infoModName.innerText = name;
    infoDesc.innerText = desc || "Нет описания";
    infoPrice.innerText = price || "Цена не указана";
    infoActionBtn.onclick = () => window.open(link, '_blank');
    infoModal.classList.remove('hidden');
}

function openRepairModal() {
    repairList.innerHTML = '';
    if(globalInstalledIds.length === 0) repairList.innerHTML = '<div style="text-align:center;padding:20px;">Пусто</div>';
    else {
        globalInstalledIds.forEach(id => {
            const m = globalModsList.find(x=>x.id===id);
            if(!m) return;
            const item = document.createElement('div');
            item.className = 'repair-item';
            item.innerHTML = `<span>${m.name}</span><button class="repair-btn-small" onclick="doRestore('${m.id}')">Удалить</button>`;
            repairList.appendChild(item);
        });
    }
    repairModal.classList.remove('hidden');
}

async function doRestore(id) {
    repairModal.classList.add('hidden');
    showToast("Удаление...");
    const res = await window.pywebview.api.restore_mod(id);
    if(res.success) { showToast("Удалено"); loadMods(); }
    else showToast(res.message);
}

async function checkForUpdates() {
    if(!window.pywebview) return;
    showToast("Проверка...");
    try {
        const res = await window.pywebview.api.check_for_updates();
        if(res.available) {
            newUpdateUrl = res.url;
            updateVerSpan.innerText = res.version;
            updateLogP.innerText = res.changelog;
            updateModal.classList.remove('hidden');
        } else showToast("Обновлений нет");
    } catch(e) { showToast("Ошибка"); }
}

function renderSettings() {
    contentArea.innerHTML = `
        <div class="settings-section">
            <div class="settings-title">Настройки</div>
            <div class="setting-item">
                <div class="setting-info"><h4>SDLS Метод</h4><p>Использовать Documents/packs</p></div>
                <label class="switch"><input type="checkbox" id="sdls-toggle" ${currentInstallMethod==='auto'?'checked':''}><span class="slider"></span></label>
            </div>
            <div class="setting-item">
                <div class="setting-info"><h4>Цвет</h4></div>
                <div class="color-options">
                    <div class="color-circle" style="background:#d0bcff" onclick="applyAccentColor('#d0bcff')"></div>
                    <div class="color-circle" style="background:#ffb7b2" onclick="applyAccentColor('#ffb7b2')"></div>
                </div>
            </div>
        </div>`;
    const tg = document.getElementById('sdls-toggle');
    if(tg) tg.onchange = (e) => currentInstallMethod = e.target.checked ? 'auto' : 'standard';
}

function applyAccentColor(hex) {
    document.documentElement.style.setProperty('--md-sys-color-primary', hex);
    localStorage.setItem('accentColor', hex);
}

function renderAbout() {
    contentArea.innerHTML = '<div class="big-panel"><h2>Loader ASTR</h2><p>v1.0.0</p></div>';
}

function showToast(msg) {
    if(!toast) return;
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
