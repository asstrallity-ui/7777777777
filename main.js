let bridge = null;

const MODS_URL = "https://raw.githubusercontent.com/asstrallity-ui/Tanks_Blitz_Mods_Files/main/mods.json";
const BASE_REPO_URL = "https://raw.githubusercontent.com/asstrallity-ui/Tanks_Blitz_Mods_Files/main/";

function setupWebChannel() {
    if (typeof QWebChannel === "undefined" || typeof qt === "undefined") return;
    new QWebChannel(qt.webChannelTransport, function (channel) {
        bridge = channel.objects.bridge;
    });
}

async function loadMods() {
    const container = document.getElementById('mods-container');
    if (!container) return;

    try {
        container.innerHTML = '<div class="empty-state"><p>Загрузка каталога...</p></div>';

        const response = await fetch(MODS_URL);
        if (!response.ok) throw new Error("Ошибка сети");
        
        const mods = await response.json();
        container.innerHTML = '';

        if (mods.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Нет доступных модов</h3>
                    <p>Каталог пуст</p>
                </div>`;
            return;
        }

        mods.forEach(mod => {
            const card = document.createElement('div');
            card.className = 'mod-card';
            
            const versionText = mod.version ? `v${mod.version}` : '';
            const versionHtml = versionText ? `<span class="mod-version-badge">${versionText}</span>` : '';
            
            const imageUrl = mod.image && mod.image.startsWith('http') ? mod.image : (BASE_REPO_URL + (mod.image || 'placeholder.png'));
            const fileUrl = mod.file && mod.file.startsWith('http') ? mod.file : (BASE_REPO_URL + mod.file);

            card.innerHTML = `
                <div class="mod-image-wrapper">
                    <div class="mod-image" style="background-image: url('${imageUrl}')"></div>
                    ${versionHtml}
                </div>
                <div class="mod-info">
                    <div class="mod-header">
                        <h4 class="mod-title">${mod.name}</h4>
                    </div>
                    <p class="mod-desc">${mod.description || 'Описание отсутствует'}</p>
                    <button class="btn-install" onclick="installMod('${mod.id}', '${fileUrl}')">
                        Установить
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="empty-state">
                <h3 style="color: #ef4444">Ошибка</h3>
                <p>Не удалось загрузить моды</p>
                <button class="btn-retry" onclick="loadMods()">Повторить</button>
            </div>`;
    }
}

function installMod(modId, fileUrl) {
    if (bridge) {
        bridge.onAction(JSON.stringify({
            action: "install_mod",
            mod_id: modId,
            url: fileUrl
        }));
    } else {
        console.log(`Install: ${modId}`);
    }
}

function onTabClick(tabId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`button[data-tab="${tabId}"]`).classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    changeTitle(tabId);
    
    if (tabId === 'tab-mods') {
        const container = document.getElementById('mods-container');
        if (!container.querySelector('.mod-card')) {
            loadMods();
        }
    }
    if (bridge) bridge.onTabClicked(tabId);
}

function changeTitle(tabId) {
    const titleEl = document.getElementById('page-title');
    const titles = { 'tab-mods': 'БИБЛИОТЕКА', 'tab-info': 'ИНФОРМАЦИЯ', 'tab-methods': 'УСТАНОВКА' };
    const newText = titles[tabId] || 'МЕНЮ';
    if (titleEl.innerText === newText) return;

    titleEl.classList.add('fade-text');
    setTimeout(() => {
        titleEl.innerText = newText;
        titleEl.classList.remove('fade-text');
    }, 150);
}

function onActionClick(action) {
    if (bridge) bridge.onAction(action);
}

document.addEventListener("DOMContentLoaded", () => {
    setupWebChannel();
    loadMods();
});
