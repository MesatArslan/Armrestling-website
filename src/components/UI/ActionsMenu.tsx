import * as React from 'react';

type ActionItem = {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type ActionsMenuProps = {
  items: ActionItem[];
  buttonLabel?: string;
  iconOnly?: boolean;
  ariaLabel?: string;
};

const ActionsMenu: React.FC<ActionsMenuProps> = ({ items, buttonLabel = 'Actions', iconOnly = false, ariaLabel }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (action: ActionItem) => {
    if (action.disabled) return;
    setIsOpen(false);
    action.onClick();
  };

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        aria-label={ariaLabel || buttonLabel}
        className={`${iconOnly
          ? 'inline-flex items-center justify-center w-10 h-10 p-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow transition-all duration-200 border border-transparent overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-300/50 appearance-none bg-clip-padding'
          : 'inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow transition-all duration-200 text-sm sm:text-base font-semibold border border-transparent overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-300/50'}`}
      >
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 16.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
        </svg>
        {!iconOnly && buttonLabel}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl bg-white/95 backdrop-blur-md border border-gray-200 focus:outline-none z-50">
          <div className="p-2">
            {items.map((item, idx) => (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center gap-3 rounded-xl text-sm transition-colors ${
                    item.disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                </button>
                {idx < items.length - 1 && <div className="mx-2 h-px bg-gray-100" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionsMenu;


