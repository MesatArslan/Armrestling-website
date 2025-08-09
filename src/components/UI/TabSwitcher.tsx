import React from 'react';
import { useTranslation } from 'react-i18next';

interface TabSwitcherProps {
  activeTab: 'active' | 'completed' | 'rankings';
  onTabChange: (tab: 'active' | 'completed' | 'rankings') => void;
}

const TabSwitcher: React.FC<TabSwitcherProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  return (
    <div className="tab-switcher">
      <button
        className={`tab-switcher-btn tab-switcher-btn-left tab-switcher-btn-blue ${activeTab === 'active' ? 'tab-switcher-btn-active tab-switcher-btn-active-blue' : ''}`}
        onClick={() => onTabChange('active')}
      >
        {t('matches.tabActive')}
      </button>
      <button
        className={`tab-switcher-btn tab-switcher-btn-purple ${activeTab === 'completed' ? 'tab-switcher-btn-active tab-switcher-btn-active-purple' : ''}`}
        onClick={() => onTabChange('completed')}
      >
        {t('matches.tabCompleted')}
      </button>
      <button
        className={`tab-switcher-btn tab-switcher-btn-right tab-switcher-btn-yellow ${activeTab === 'rankings' ? 'tab-switcher-btn-active tab-switcher-btn-active-yellow' : ''}`}
        onClick={() => onTabChange('rankings')}
      >
        {t('matches.tabRankings')}
      </button>
    </div>
  );
};

export default TabSwitcher; 