import React from 'react';

interface TabSwitcherProps {
  activeTab: 'active' | 'completed' | 'rankings';
  onTabChange: (tab: 'active' | 'completed' | 'rankings') => void;
}

const TabSwitcher: React.FC<TabSwitcherProps> = ({ activeTab, onTabChange }) => (
  <div className="tab-switcher">
    <button
      className={`tab-switcher-btn tab-switcher-btn-left ${activeTab === 'active' ? 'tab-switcher-btn-active tab-switcher-btn-active-blue' : ''}`}
      onClick={() => onTabChange('active')}
    >
      Aktif Maçlar
    </button>
    <button
      className={`tab-switcher-btn ${activeTab === 'completed' ? 'tab-switcher-btn-active tab-switcher-btn-active-purple' : ''}`}
      onClick={() => onTabChange('completed')}
    >
      Oynanmış Maçlar
    </button>
    <button
      className={`tab-switcher-btn tab-switcher-btn-right ${activeTab === 'rankings' ? 'tab-switcher-btn-active tab-switcher-btn-active-yellow' : ''}`}
      onClick={() => onTabChange('rankings')}
    >
      Sıralama
    </button>
  </div>
);

export default TabSwitcher; 