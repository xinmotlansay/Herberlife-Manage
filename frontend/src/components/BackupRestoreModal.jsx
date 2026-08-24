import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, ShieldCheck, RefreshCw, X, AlertTriangle, CheckCircle2, History, HardDrive } from 'lucide-react';

export default function BackupRestoreModal({ isOpen, onClose }) {
  const [backups, setBackups] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchBackupList();
    }
  }, [isOpen]);

  const fetchBackupList = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/backup/list');
      const data = await res.json();
      if (data.success) {
        setBackups(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleExportBackup = () => {
    window.location.href = '/api/backup/export';
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.sqlite') && !selectedFile.name.toLowerCase().endsWith('.db')) {
      alert('Vui lòng chọn đúng file sao lưu cơ sở dữ liệu có đuôi .sqlite hoặc .db');
      return;
    }

    if (!window.confirm(`⚠️ CẢNH BÁO KHÔI PHỤC DỮ LIỆU!\n\nBạn có chắc chắn muốn khôi phục dữ liệu từ file "${selectedFile.name}"?\nToàn bộ dữ liệu hiện tại sẽ được thay thế bằng dữ liệu từ bản sao lưu này.`)) {
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('backupFile', selectedFile);

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'Lỗi khôi phục: ' + data.error });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể kết nối máy chủ để khôi phục' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRestoreSnapshot = async (filename) => {
    if (!window.confirm(`⚠️ CẢNH BÁO KHÔI PHỤC DỮ LIỆU!\n\nBạn có chắc muốn khôi phục dữ liệu về bản sao lưu tự động ngày "${filename}"?\nDữ liệu hiện tại sẽ được cập nhật lùi về thời điểm bản sao lưu đó.`)) {
      return;
    }

    setRestoringFilename(filename);
    setMessage(null);

    try {
      const res = await fetch('/api/backup/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'Lỗi khôi phục: ' + data.error });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Lỗi kết nối khi khôi phục' });
    } finally {
      setRestoringFilename(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={28} color="#a7f3d0" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Sao Lưu & Khôi Phục Dữ Liệu 1-Click</h2>
              <p style={{ fontSize: '0.82rem', color: '#a7f3d0' }}>An toàn tuyệt đối - Dễ dàng tải bản lưu hoặc chuyển đổi máy tính</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {message && (
            <div style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '0.75rem',
              marginBottom: '1.25rem',
              backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: message.type === 'success' ? '#047857' : '#b91c1c',
              border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Quick Actions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {/* Download Backup Box */}
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: '1rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                  <Download size={22} /> Tải Bản Sao Lưu Về Máy
                </div>
                <p style={{ fontSize: '0.82rem', color: '#065f46', lineHeight: 1.4, marginBottom: '1rem' }}>
                  Tải ngay 1 file CSDL <code>.sqlite</code> đính kèm ngày giờ về máy tính, USB hoặc lưu lên Google Drive để phòng sự cố.
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.65rem', fontWeight: 800, fontSize: '0.9rem' }}
                onClick={handleExportBackup}
              >
                <Download size={18} /> Tải Bản Sao Lưu (.sqlite)
              </button>
            </div>

            {/* Restore Backup Box */}
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1.5px solid #93c5fd',
              borderRadius: '1rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                  <Upload size={22} /> Khôi Phục Từ File Sao Lưu
                </div>
                <p style={{ fontSize: '0.82rem', color: '#1e3a8a', lineHeight: 1.4, marginBottom: '1rem' }}>
                  Chọn 1 file <code>.sqlite</code> đã tải về trước đó từ máy tính để phục hồi lại 100% dữ liệu sản phẩm, đơn hàng và kho.
                </p>
              </div>
              <label
                className="btn"
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.75rem'
                }}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Đang Khôi Phục...
                  </>
                ) : (
                  <>
                    <Upload size={18} /> Chọn File Để Khôi Phục
                  </>
                )}
                <input
                  type="file"
                  accept=".sqlite,.db"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Daily Auto-Backups Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={18} color="#059669" />
                Lịch Sử Các Bản Sao Lưu Tự Động Hàng Ngày:
              </h3>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                onClick={fetchBackupList}
              >
                <RefreshCw size={14} /> Tải lại danh sách
              </button>
            </div>

            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Đang nạp danh sách sao lưu...</div>
            ) : backups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', color: '#94a3b8' }}>
                Chưa có bản sao lưu tự động nào. Hệ thống sẽ tự động tạo 1 bản sao lưu mới vào mỗi ngày bạn sử dụng app.
              </div>
            ) : (
              <div className="table-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tên Bản Sao Lưu</th>
                      <th>Dung Lượng</th>
                      <th>Thời Gian Tạo</th>
                      <th style={{ textAlign: 'right' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map(b => (
                      <tr key={b.filename}>
                        <td style={{ fontWeight: 700, color: '#064e3b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <HardDrive size={16} color="#059669" />
                          {b.filename}
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>{b.size}</td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {new Date(b.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', borderColor: '#93c5fd' }}
                            onClick={() => handleRestoreSnapshot(b.filename)}
                            disabled={restoringFilename === b.filename}
                          >
                            {restoringFilename === b.filename ? (
                              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              'Khôi Phục Bản Này'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
