// ================================
// MySnowBox Frontend - Google Apps Script Integration (Complete)
// ================================

// ✅ ใส่ URL Web App ที่ได้จากการ Deploy Google Apps Script
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxPTP69ENJx_RXB6V2QGcDW3_DyMUg_Cc7RuNy4uutXMFZMOdTr-zOi6dDxx5-Skc-E/exec';

// ✅ เรียก API จาก GAS
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

// ✅ โหลดข้อมูลจาก GAS
async function loadDataFromGAS() {
    try {
        showLoader(true);

        const imagesResult = await callGASAPI('getImages');
        imageData = imagesResult.data || [];

        const categoriesResult = await callGASAPI('getCategories');
        if (categoriesResult.data) categories = categoriesResult.data;

        const usersResult = await callGASAPI('getUsers');
        if (usersResult.data && usersResult.data.length > 0) {
            updateUserOptions(usersResult.data);
        }

        updateCategoryOptions();
        loadGallery();
    } catch (error) {
        showMessage('โหลดข้อมูลล้มเหลว: ' + error.message, 'error');
    } finally {
        showLoader(false);
    }
}

function updateUserOptions(users) {
    const userSelect = document.getElementById('username');
    const filterUser = document.getElementById('filterUser');

    userSelect.innerHTML = '';
    filterUser.innerHTML = '<option value="">ทุกผู้ใช้</option>';

    users.forEach(user => {
        userSelect.innerHTML += `<option value="${user}">${user}</option>`;
        filterUser.innerHTML += `<option value="${user}">${user}</option>`;
    });
}

// ✅ อัปโหลดภาพไปยัง Google Drive ผ่าน GAS
async function uploadImages() {
    const username = document.getElementById('username').value;
    const mainCat = document.getElementById('mainCategory').value;
    const subCat = document.getElementById('subCategory').value;
    const fileInput = document.getElementById('imageFile');

    if (!username || !mainCat || !subCat || !fileInput.files.length) {
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
                        mainCategory: mainCat,
                        subCategory: subCat,
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

// ✅ โหลดอัตโนมัติเมื่อเปิดหน้าเว็บ
document.addEventListener('DOMContentLoaded', function () {
    loadDataFromGAS();
});
