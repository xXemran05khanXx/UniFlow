import { LucideIcon, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import React from 'react';
import { NavLink } from 'react-router-dom';

export interface SidebarNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  navigation: SidebarNavItem[];
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const linkBaseClass =
  'group relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300';

const Sidebar: React.FC<SidebarProps> = ({
  navigation,
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <>
      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-secondary-900/40 transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onMobileClose}
          aria-hidden="true"
        />

        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-secondary-200 shadow-xl transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
          aria-label="Mobile sidebar"
        >
          <div className="flex h-16 items-center justify-between px-5 border-b border-secondary-200">
            <div className="flex items-center">
              <img
                src="/uniflow.jpeg"
                alt="UniFlow"
                className="h-8 w-auto object-contain"
              />
            </div>
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-md text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 transition-colors duration-200"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="h-[calc(100%-4rem)] overflow-y-auto px-4 py-5" aria-label="Primary navigation">
            <ul className="space-y-1.5">
              {navigation.map((item) => (
                <li key={`mobile-${item.href}`}>
                  <NavLink
                    to={item.href}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      `${linkBaseClass} ${isActive
                        ? 'bg-primary-50 text-primary-700 border-l-2 border-primary-500 pl-2.5 shadow-sm'
                        : 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900'
                      }`
                    }
                    aria-label={item.name}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="ml-3 truncate">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col bg-white/95 backdrop-blur-sm border-r border-secondary-200 shadow-sm transition-all duration-200 ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
        aria-label="Sidebar"
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-secondary-200">
          {collapsed ? (
            <img
              src="/uniflow.jpeg"
              alt="UniFlow"
              className="h-8 w-8 rounded-md object-cover object-left"
            />
          ) : (
            <img
              src="/uniflow.jpeg"
              alt="UniFlow"
              className="h-8 w-auto object-contain"
            />
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse();
            }}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-secondary-500 transition-colors duration-200 hover:bg-secondary-100 hover:text-secondary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            <span className="sr-only">Toggle Sidebar</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Primary navigation">
          <ul className="space-y-1.5">
            {navigation.map((item) => (
              <li key={`desktop-${item.href}`}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `${linkBaseClass} ${collapsed ? 'justify-center' : ''
                    } ${isActive
                      ? 'bg-primary-50 text-primary-700 border-l-2 border-primary-500 shadow-sm'
                      : 'text-secondary-700 hover:bg-secondary-100/90 hover:text-secondary-900'
                    }`
                  }
                  aria-label={item.name}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="ml-3 truncate">{item.name}</span>}

                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-secondary-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10">
                      {item.name}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
