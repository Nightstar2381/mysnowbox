// ================================
// MySnowBox Frontend - Folder Management + Delete
// ================================

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzub40tiSGk1QS5_iBk3M-6L-X3y78XnFyyR-iQGuV9CtKea5vBQyiugI6tybi4FDxJ/exec';

async function callGASAPI(action, method = 'GET', data = null) {
    try {
        let url = `${GAS_WEB_APP_URL}?action=${action}`;
        let options = { method: method };

        if (method === 'GET' && data) {
            const params = new URLSearchParams(data);
            url += `&${params.toString()}`;
        } else if (method === 'POST' && data) {
            const formData = new FormData();
            for (const key in data) {
                formData.append(key, data[key]);
            }
            formData.append('action', action);
            options.body = formData;
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!result.success) throw new Error(result.message);

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function deleteFolder(main, sub = '') {
    if (!main) return;
    const confirmed = confirm(`คุณต้องการลบโฟลเดอร์ "${main}${sub ? ' > ' + sub : ''}" หรือไม่?\n\nคำเตือน: การลบนี้จะลบภาพทั้งหมดในโฟลเดอร์ด้วย!`);
    if (!confirmed) return;

    try {
        await callGASAPI('deleteCategoryFolder', 'POST', { mainCategory: main, subCategory: sub });
        showMessage('ลบโฟลเดอร์เรียบร้อย', 'success');
        loadDriveFoldersToUI();
    } catch (err) {
        showMessage('ลบโฟลเดอร์ไม่สำเร็จ: ' + err.message, 'error');
    }
}

async function loadDriveFoldersToUI() {
    try {
        const res = await callGASAPI('listDriveFolders');
        const data = res.data;

        const mainSel = document.getElementById('uploadMainSelect');
        const subSel = document.getElementById('uploadSubSelect');
        const link = document.getElementById('folderPreviewLink');

        mainSel.innerHTML = '<option value="">เลือกหมวดหลัก</option>';
        subSel.innerHTML = '<option value="">เลือกหมวดย่อย</option>';

        const folderListEl = document.getElementById('folderList');
        folderListEl.innerHTML = '';

        for (const main of data.main) {
            mainSel.innerHTML += `<option value="${main}">${main}</option>`;
            folderListEl.innerHTML += `<div style="margin-bottom: 10px;">
                <strong>📁 ${main}</strong>
                <button class="btn btn-danger" style="margin-left: 10px; font-size: 12px;" onclick="deleteFolder('${main}')">
                    <i data-lucide='trash'></i> ลบหมวด
                </button>
            </div>`;

            if (data.sub[main]) {
                for (const sub of data.sub[main]) {
                    folderListEl.innerHTML += `<div style="margin-left: 30px; margin-bottom: 5px;">
                        📂 ${sub}
                        <button class="btn btn-danger" style="margin-left: 10px; font-size: 12px;" onclick="deleteFolder('${main}', '${sub}')">
                            <i data-lucide='trash'></i> ลบหมวดย่อย
                        </button>
                    </div>`;
                }
            }
        }

        mainSel.onchange = () => {
            const selected = mainSel.value;
            subSel.innerHTML = '<option value="">เลือกหมวดย่อย</option>';
            if (data.sub[selected]) {
                for (const sub of data.sub[selected]) {
                    subSel.innerHTML += `<option value="${sub}">${sub}</option>`;
                }
            }
            link.href = `https://drive.google.com/drive/folders/${selected}`;
        };

        subSel.onchange = () => {
            const main = mainSel.value;
            const sub = subSel.value;
            link.href = `https://drive.google.com/drive/folders/${main}/${sub}`;
        };

        lucide.createIcons();
    } catch (err) {
        showMessage('ไม่สามารถโหลดโฟลเดอร์: ' + err.message, 'error');
    }
}

function setupFolderCreateUI() {
    const form = document.getElementById('createFolderForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const main = form.querySelector('#newMainCategory').value.trim();
        const sub = form.querySelector('#newSubCategory').value.trim();
        if (!main) return showMessage('กรุณาใส่หมวดหลัก', 'error');
        await createDriveFolders(main, sub);
        form.reset();
    };
}

async function createDriveFolders(mainCategory, subCategory = '') {
    try {
        await callGASAPI('createCategoryFolders', 'POST', {
            mainCategory,
            subCategory
        });
        showMessage('สร้างโฟลเดอร์เรียบร้อย', 'success');
        loadDriveFoldersToUI();
    } catch (err) {
        showMessage('สร้างโฟลเดอร์ผิดพลาด: ' + err.message, 'error');
    }
}

function getSelectedFolderCategory() {
    const main = document.getElementById('uploadMainSelect').value;
    const sub = document.getElementById('uploadSubSelect').value;
    return { mainCategory: main, subCategory: sub };
}

async function uploadImages() {
    const username = document.getElementById('username').value;
    const { mainCategory, subCategory } = getSelectedFolderCategory();
    const fileInput = document.getElementById('imageFile');

    if (!username || !mainCategory || !subCategory || !fileInput.files.length) {
        showMessage('กรุณากรอกข้อมูลให้ครบและเลือกไฟล์ภาพ', 'error');
        return;
    }

    showLoader(true);

    const files = Array.from(fileInput.files);
    let successCount = 0;

    for (const file of files) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
            reader.onload = async function (e) {
                try {
                    const base64Data = e.target.result.split(',')[1];
                    await callGASAPI('uploadImage', 'POST', {
                        username,
                        mainCategory,
                        subCategory,
                        image: base64Data,
                    });
                    successCount++;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    showLoader(false);
    fileInput.value = '';
    showMessage(`อัปโหลด ${successCount} ไฟล์สำเร็จ`, 'success');
    loadDataFromGAS();
}

window.addEventListener('DOMContentLoaded', () => {
    loadDataFromGAS();
    setupFolderCreateUI();
    loadDriveFoldersToUI();
});
