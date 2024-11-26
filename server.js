const express = require('express');
const multer = require('multer');
const shortid = require('shortid');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname))); // لتقديم الملفات الثابتة مثل HTML و CSS و JS

// إعداد التخزين
const storage = multer.diskStorage({
  destination: __dirname, // حفظ الملفات في نفس المجلد الرئيسي
  filename: (req, file, cb) => {
    const uniqueName = `${shortid.generate()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// مسار رفع الملفات
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const fileUrl = `${req.protocol}://${req.get('host')}/${req.file.filename}`;
  res.json({ success: true, fileUrl });
});

// تشغيل الخادم
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
