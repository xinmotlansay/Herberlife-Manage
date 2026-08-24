const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/connection');
const Database = require('better-sqlite3');

const dataDir = process.env.HERBALIFE_DATA_DIR || path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'data.sqlite');
const backupDir = process.env.HERBALIFE_BACKUPS_DIR || path.join(__dirname, '../../backups');
const tmpRestoreDir = process.env.HERBALIFE_TMP_DIR || path.join(__dirname, '../../tmp_restore');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
if (!fs.existsSync(tmpRestoreDir)) {
  fs.mkdirSync(tmpRestoreDir, { recursive: true });
}

// Multer storage for uploaded restore files
const upload = multer({
  dest: tmpRestoreDir
});

/**
 * Helper: Run automatic daily backup snapshot
 */

function runAutoDailyBackup() {
  try {
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const autoBackupPath = path.join(backupDir, `backup-${todayStr}.sqlite`);

    if (!fs.existsSync(autoBackupPath)) {
      // Checkpoint WAL log into main sqlite file
      try { db.pragma('wal_checkpoint(FULL)'); } catch (e) {}
      fs.copyFileSync(dbPath, autoBackupPath);
      console.log(`[Auto Backup] Created daily backup snapshot: backup-${todayStr}.sqlite`);

      // Clean up backups older than 30 days
      const files = fs.readdirSync(backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
        .sort();

      if (backupFiles.length > 30) {
        const toDelete = backupFiles.slice(0, backupFiles.length - 30);
        toDelete.forEach(f => {
          fs.unlinkSync(path.join(backupDir, f));
        });
      }
    }
  } catch (err) {
    console.error('[Auto Backup Error]', err);
  }
}

// Execute auto daily backup on module load
runAutoDailyBackup();

/**
 * 1. GET /api/backup/export
 * Download current database file as .sqlite backup
 */
router.get('/export', (req, res) => {
  try {
    // Flush WAL to main sqlite file
    try { db.pragma('wal_checkpoint(FULL)'); } catch (e) {}

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `Herbalife_Backup_${dateStr}_${timeStr}.sqlite`;

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(dbPath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('[Export Error]', err);
    res.status(500).json({ success: false, error: 'Không thể xuất bản sao lưu: ' + err.message });
  }
});

/**
 * 2. GET /api/backup/list
 * List daily auto-backup snapshots
 */
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(f => f.endsWith('.sqlite'))
      .map(filename => {
        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          size_bytes: stats.size,
          created_at: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. POST /api/backup/restore
 * Restore database from uploaded .sqlite file
 */
router.post('/restore', upload.single('backupFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Vui lòng chọn file sao lưu (.sqlite)' });
  }

  const tempFilePath = req.file.path;

  try {
    // 1. Test database integrity of uploaded file
    const testDb = new Database(tempFilePath, { readonly: true });
    const checkRes = testDb.pragma('integrity_check');
    testDb.close();

    if (!checkRes || checkRes[0].integrity_check !== 'ok') {
      fs.unlinkSync(tempFilePath);
      return res.status(400).json({ success: false, error: 'File sao lưu không hợp lệ hoặc bị hư hỏng' });
    }

    // 2. Make safety pre-restore backup of current db
    const safetyBackupPath = path.join(backupDir, `safety-prerestore-${Date.now()}.sqlite`);
    try { db.pragma('wal_checkpoint(FULL)'); } catch (e) {}
    fs.copyFileSync(dbPath, safetyBackupPath);

    // 3. Overwrite db file
    db.close(); // Close active connection
    fs.copyFileSync(tempFilePath, dbPath);
    fs.unlinkSync(tempFilePath);

    // 4. Re-open connection
    const newDb = new Database(dbPath);
    newDb.pragma('foreign_keys = ON');

    // Mutate exported db reference in connection.js
    Object.assign(db, newDb);

    res.json({
      success: true,
      message: 'Khôi phục dữ liệu thành công! Trình duyệt sẽ tự động làm mới trang.'
    });
  } catch (err) {
    console.error('[Restore Error]', err);
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    res.status(500).json({ success: false, error: 'Lỗi khôi phục dữ liệu: ' + err.message });
  }
});

/**
 * 4. POST /api/backup/restore-snapshot
 * Restore from a daily backup snapshot filename
 */
router.post('/restore-snapshot', (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ success: false, error: 'Thiếu tên file sao lưu' });
  }

  const snapshotPath = path.join(backupDir, filename);
  if (!fs.existsSync(snapshotPath)) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy file sao lưu tự động này' });
  }

  try {
    // Make safety backup of current
    const safetyBackupPath = path.join(backupDir, `safety-prerestore-${Date.now()}.sqlite`);
    try { db.pragma('wal_checkpoint(FULL)'); } catch (e) {}
    fs.copyFileSync(dbPath, safetyBackupPath);

    // Close db and overwrite
    db.close();
    fs.copyFileSync(snapshotPath, dbPath);

    const newDb = new Database(dbPath);
    newDb.pragma('foreign_keys = ON');
    Object.assign(db, newDb);

    res.json({
      success: true,
      message: `Đã khôi phục thành công bản sao lưu ngày: ${filename}`
    });
  } catch (err) {
    console.error('[Restore Snapshot Error]', err);
    res.status(500).json({ success: false, error: 'Lỗi khôi phục: ' + err.message });
  }
});

module.exports = router;
