const fileInput = document.getElementById('file-input');
const progressBar = document.getElementById('progress');
const fileLink = document.getElementById('file-link');

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
            fileLink.innerHTML = `File uploaded! <a href="${response.fileUrl}" target="_blank">Download Link</a>`;
        } else {
            fileLink.textContent = 'Failed to upload file.';
        }
    };

    xhr.send(formData);
});
