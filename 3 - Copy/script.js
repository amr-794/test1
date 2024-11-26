// إعدادات الوضع الليلي/النهاري
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
});

// إعدادات رفع الملفات
const fileInput = document.getElementById('file-input');
const progressBar = document.getElementById('progress');
const linkContainer = document.getElementById('link-container');
const shareLink = document.getElementById('share-link');
const copyBtn = document.getElementById('copy-btn');
const qrContainer = document.getElementById('qr-container');
const qrCanvas = document.getElementById('qr-code');

// وظيفة لتحميل الجسيمات المتحركة باستخدام Particles.js
window.onload = () => {
    particlesJS.load('particles-js', 'particles.json', function() {
        console.log('Particles.js loaded successfully!');
    });
};

// تفعيل رفع الملف
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload');

    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            progressBar.style.width = percent + '%';
        }
    };

    xhr.onload = () => {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
            shareLink.value = response.fileUrl;
            generateQRCode(response.fileUrl);
            linkContainer.classList.remove('hidden');
        } else {
            alert('فشل تحميل الملف، حاول مرة أخرى.');
        }
    };

    xhr.send(formData);
});

// توليد رمز QR
function generateQRCode(url) {
    new QRCode(qrCanvas, {
        text: url,
        width: 128,
        height: 128,
    });
    qrContainer.classList.remove('hidden');
}

// نسخ الرابط إلى الحافظة
copyBtn.addEventListener('click', () => {
    shareLink.select();
    document.execCommand('copy');
    alert('تم نسخ الرابط إلى الحافظة!');
});
