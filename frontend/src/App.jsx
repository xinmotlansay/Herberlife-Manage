import React, { useState } from 'react';
import { UploadCloud, History, Package, Users, ShieldCheck, Leaf } from 'lucide-react';
import PurchaseImport from './pages/PurchaseImport';
import PurchaseHistory from './pages/PurchaseHistory';
import InventoryView from './pages/InventoryView';
import Customers from './pages/Customers';

export default function App() {
  const [activeTab, setActiveTab] = useState('import'); // 'import', 'history', 'inventory', 'customers'

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#064e3b'
          }}>
            <Leaf size={22} fontWeight="bold" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              HERBALIFE
            </h2>
            <div style={{ fontSize: '0.7rem', color: '#a7f3d0', fontWeight: 600 }}>Quản Lý Cửa Hàng</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <UploadCloud className="icon" />
            <span>1. Nhập Hàng & OCR</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History className="icon" />
            <span>2. Lịch Sử Nhập Hàng</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package className="icon" />
            <span>3. Danh Mục Kho</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users className="icon" />
            <span>4. Quản Lý Khách Hàng</span>
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#a7f3d0' }}>
            <ShieldCheck size={16} />
            <span>Local SQLite App</span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-title">
            <h1>
              {activeTab === 'import' && 'Module 1: Nhập Hàng Qua Hoá Đơn OCR'}
              {activeTab === 'history' && 'Lịch Sử Các Đơn Nhập Hàng'}
              {activeTab === 'inventory' && 'Module 2: Quản Lý Tồn Kho Sản Phẩm'}
              {activeTab === 'customers' && 'Module 3: Quản Lý Khách Hàng & Công Nợ'}
            </h1>
            <p>Hệ thống Quản lý Cửa hàng Herbalife (Chạy Local - Miễn phí)</p>
          </div>

          <div className="user-profile">
            <div className="user-avatar">CS</div>
            <div style={{ fontSize: '0.85rem' }}>
              <strong style={{ color: '#064e3b', display: 'block' }}>Chủ Shop</strong>
              <span style={{ color: '#059669', fontSize: '0.75rem' }}>Quyền Quản Lý</span>
            </div>
          </div>
        </header>

        <main className="page-wrapper">
          {activeTab === 'import' && (
            <PurchaseImport onNavigateHistory={() => setActiveTab('history')} />
          )}
          {activeTab === 'history' && <PurchaseHistory />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'customers' && <Customers />}
        </main>
      </div>
    </div>
  );
}
