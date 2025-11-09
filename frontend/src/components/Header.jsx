import React, { useState } from 'react';
import { Menu, Search, Bell, ChevronDown } from 'lucide-react';

const Header = ({ currentPage, userData, userRole, setSidebarOpen, onNavigateSettings, onNavigateProfile, onLogout, notifications = [], unreadCount = 0, onMarkAllRead }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const displayName = userData.name || userData.displayName || userData.username || 'User';
  const initials = (displayName || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden" aria-label="Open menu">
            <Menu size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentPage
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </h1>
            <p className="text-sm text-gray-500">Welcome back, {displayName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 relative">
          <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg px-4 py-2">
            <Search size={20} className="text-gray-400" />
            <input type="text" placeholder="Search transactions..." className="bg-transparent border-none outline-none text-sm w-64" />
          </div>
          <div className="relative">
            <button
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-[18px] rounded-full text-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button
                    onClick={() => { onMarkAllRead && onMarkAllRead(); }}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`px-4 py-3 text-sm flex items-center justify-between ${n.read ? 'bg-white' : 'bg-indigo-50'}`}>
                        <div className="pr-3">
                          <p className="text-gray-900">{n.title}</p>
                          <p className="text-[11px] text-gray-500">{n.time} ago</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 bg-indigo-600 rounded-full" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3 pl-4 border-l border-gray-200 cursor-pointer select-none" onClick={() => setUserMenuOpen((v) => !v)}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {userData.profilePicture ? (
                <img src={userData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </div>

          {userMenuOpen && (
            <div className="absolute right-0 top-14 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
              <button onClick={() => { onNavigateSettings(); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Settings</button>
              <button onClick={() => { onNavigateProfile && onNavigateProfile(); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Profile</button>
              <button onClick={() => { setUserMenuOpen(false); onLogout && onLogout(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500">Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
