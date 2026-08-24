import React, { useState, useEffect } from 'react';
import { UploadCloud, History, Package, Users, ShoppingCart, ShoppingBag, BarChart2, ShieldCheck, Leaf } from 'lucide-react';
import PurchaseImport from './pages/PurchaseImport';
import PurchaseHistory from './pages/PurchaseHistory';
import InventoryView from './pages/InventoryView';
import Customers from './pages/Customers';
import SalesCreate from './pages/SalesCreate';
import SalesHistory from './pages/SalesHistory';
import Statistics from './pages/Statistics';

const VALID_TABS = ['import', 'history', 'inventory', 'customers', 'sales_create', 'sales_history', 'statistics'];

export default function App() {
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#', '').trim();
    if (VALID_TABS.includes(hash)) return hash;
    const saved = localStorage.getItem('herbalife_active_tab');
    if (VALID_TABS.includes(saved)) return saved;
    return 'import';
  };

  const [activeTab, setActiveTab] = useState(getTabFromHash);

  // Sync active tab with URL Hash & Browser Back/Forward buttons
  useEffect(() => {
    // Set initial hash if missing
    if (!window.location.hash || !VALID_TABS.includes(window.location.hash.replace('#', ''))) {
      window.history.replaceState(null, '', `#${activeTab}`);
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
        localStorage.setItem('herbalife_active_tab', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const handleTabChange = (newTab) => {
    if (!VALID_TABS.includes(newTab)) return;
    setActiveTab(newTab);
    window.location.hash = `#${newTab}`;
    localStorage.setItem('herbalife_active_tab', newTab);
  };

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
            onClick={() => handleTabChange('import')}
          >
            <UploadCloud className="icon" />
            <span>1. Nhập Hàng & OCR</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            <History className="icon" />
            <span>2. Lịch Sử Nhập Hàng</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => handleTabChange('inventory')}
          >
            <Package className="icon" />
            <span>3. Danh Mục Kho</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => handleTabChange('customers')}
          >
            <Users className="icon" />
            <span>4. Quản Lý Khách Hàng</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'sales_create' ? 'active' : ''}`}
            onClick={() => handleTabChange('sales_create')}
          >
            <ShoppingCart className="icon" />
            <span>5. Tạo Đơn Bán Hàng</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'sales_history' ? 'active' : ''}`}
            onClick={() => handleTabChange('sales_history')}
          >
            <ShoppingBag className="icon" />
            <span>6. Lịch Sử Bán Hàng</span>
          </div>

          <div
            className={`nav-item ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => handleTabChange('statistics')}
          >
            <BarChart2 className="icon" />
            <span>7. Thống Kê & Báo Cáo</span>
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#a7f3d0' }}>
            <ShieldCheck size={16} />
            <span>Local SQLite App</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'import' && <PurchaseImport onNavigateHistory={() => handleTabChange('history')} />}
        {activeTab === 'history' && <PurchaseHistory />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'customers' && <Customers />}
        {activeTab === 'sales_create' && <SalesCreate onNavigateHistory={() => handleTabChange('sales_history')} />}
        {activeTab === 'sales_history' && <SalesHistory />}
        {activeTab === 'statistics' && <Statistics />}
      </main>
    </div>
  );
}
