import React from 'react';
import { useTranslation } from 'react-i18next';

type TabKey = 'filters' | 'templates';

interface TemplateModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  header: React.ReactNode;
  render: (ctx: {
    activeTab: TabKey;
    setActiveTab: (tab: TabKey) => void;
    sidebarClass: string;
    contentClass: string;
  }) => React.ReactNode;
}

const TemplateModalShell: React.FC<TemplateModalShellProps> = ({
  isOpen,
  onClose,
  header,
  render,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<TabKey>('filters');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {header}

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden border-b border-gray-200 bg-white">
          <div className="flex">
            <button
              onClick={() => setActiveTab('filters')}
              className={`${
                activeTab === 'filters'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              } flex-1 px-4 py-3 text-sm font-semibold transition-colors`}
            >
              {t('tournaments.filters')}
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`${
                activeTab === 'templates'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800'
              } flex-1 px-4 py-3 text-sm font-semibold transition-colors`}
            >
              {t('tournaments.templates')}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h:[calc(85vh-120px)] lg:h-[calc(85vh-120px)]">
          {render({
            activeTab,
            setActiveTab,
            sidebarClass:
              `w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6 overflow-y-auto max-h-[55vh] lg:max-h-none ${activeTab !== 'filters' ? 'hidden lg:block' : ''}`,
            contentClass:
              `flex-1 p-4 sm:p-8 overflow-y-auto bg-gray-50 max-h-[55vh] lg:max-h-none ${activeTab !== 'templates' ? 'hidden lg:block' : ''}`,
          })}
        </div>
      </div>
    </div>
  );
};

export default TemplateModalShell;


