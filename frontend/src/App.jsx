// src/App.jsx
import React, { useCallback, useEffect, useState } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import TransferPage from './pages/TransferPage';
import TransactionsPage from './pages/TransactionsPage';
import MyCardsPage from './pages/MyCardsPage';
import OrderCardPage from './pages/OrderCardPage';
import InvestmentsPage from './pages/InvestmentsPage';
import AccountsPage from './pages/AccountsPage';
import UserManagementPage from './pages/UserManagementPage';
import SupportTicketsPage from './pages/SupportTicketsPage';
import SettingsPage from './pages/SettingsPage';
import RoleAssignmentPage from './pages/RoleAssignmentPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SupportChatPage from './pages/SupportChatPage';
import {
  clearSessionToken,
  getSessionToken,
  listContacts,
  listCards,
  login as loginRequest,
  logout as logoutRequest,
  me as fetchProfile,
  myAccount as fetchAccount,
  myTransactions as fetchTransactions,
  orderCard as orderCardRequest,
  register as registerRequest,
  saveSessionToken,
  updateCardStatus as updateCardStatusRequest,
  updateProfile as updateProfileRequest,
  uploadAvatar as uploadAvatarRequest,
} from './services/apiClient';

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000';

const DEFAULT_USER_DATA = {
  name: 'DiceBank User',
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  displayName: '',
  phoneNumber: '',
  country: '',
  city: '',
  profilePicture: '',
  balance: 0,
  savings: 0,
  income: 0,
  expense: 0,
};

const CONTACT_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];

const CARD_THEME_MAP = {
  'midnight-blue': 'from-indigo-600 to-purple-600',
  'ocean-breeze': 'from-blue-500 to-cyan-400',
  'sunset-gold': 'from-orange-500 to-pink-500',
  'forest-green': 'from-green-600 to-emerald-500',
  'royal-black': 'from-gray-800 to-gray-900',
  'ruby-red': 'from-red-600 to-rose-500',
};

const CARD_DESIGNS = [
  { id: 'midnight-blue', slug: 'midnight-blue', name: 'Midnight Blue', gradient: CARD_THEME_MAP['midnight-blue'], popular: true },
  { id: 'ocean-breeze', slug: 'ocean-breeze', name: 'Ocean Breeze', gradient: CARD_THEME_MAP['ocean-breeze'], popular: false },
  { id: 'sunset-gold', slug: 'sunset-gold', name: 'Sunset Gold', gradient: CARD_THEME_MAP['sunset-gold'], popular: false },
  { id: 'forest-green', slug: 'forest-green', name: 'Forest Green', gradient: CARD_THEME_MAP['forest-green'], popular: false },
  { id: 'royal-black', slug: 'royal-black', name: 'Royal Black', gradient: CARD_THEME_MAP['royal-black'], popular: true },
  { id: 'ruby-red', slug: 'ruby-red', name: 'Ruby Red', gradient: CARD_THEME_MAP['ruby-red'], popular: false },
];

const toTransactionRows = (rows, userId) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((tx) => {
    const timestamp = tx.timestamp ? new Date(tx.timestamp) : new Date();
    const isSender = tx.sender_id === userId;
    const amount = Number(tx.amount ?? 0);
    return {
      id: tx.id,
      type: isSender ? 'expense' : 'income',
      description: tx.description || (isSender ? 'Sent transfer' : 'Received transfer'),
      amount: isSender ? -Math.abs(amount) : Math.abs(amount),
      date: timestamp.toLocaleDateString(),
      time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  });
};

const toContacts = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((contact, index) => {
    const name = contact.alias || contact.username || 'Contact';
    return {
      id: contact.id,
      name,
      avatar: name[0]?.toUpperCase() || 'C',
      color: CONTACT_COLORS[index % CONTACT_COLORS.length],
    };
  });
};

const toCards = (rows = []) => {
  const statusLabel = {
    active: 'Active',
    frozen: 'Frozen',
    canceled: 'Canceled',
  };

  return rows.map((card) => {
    const number = String(card.card_number || '')
      .replace(/\D/g, '')
      .replace(/(.{4})/g, '$1 ')
      .trim();
    const expiry = `${String(card.expiry_month).padStart(2, '0')}/${String(card.expiry_year).slice(-2)}`;

    return {
      id: card.id,
      type: card.card_type === 'physical' ? 'Physical' : 'Virtual',
      number,
      holder: (card.holder_name || '').toUpperCase(),
      expiry,
      cvv: card.cvv,
      status: statusLabel[card.status] || 'Active',
      color: card.theme || CARD_THEME_MAP[card.design_slug] || CARD_THEME_MAP['midnight-blue'],
    };
  });
};

const App = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [showCardDetails, setShowCardDetails] = useState({});
  const [copiedField, setCopiedField] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userCards, setUserCards] = useState([]);
  const [userData, setUserData] = useState(DEFAULT_USER_DATA);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [quickContacts, setQuickContacts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [accountInfo, setAccountInfo] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [appError, setAppError] = useState('');

  const spendingData = [
    { category: 'Groceries', percentage: 35, color: 'bg-blue-500' },
    { category: 'Withdrawal', percentage: 25, color: 'bg-purple-500' },
    { category: 'Retail', percentage: 20, color: 'bg-green-500' },
    { category: 'Petrol', percentage: 20, color: 'bg-orange-500' }
  ];

  const cardDesigns = CARD_DESIGNS;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleCardVisibility = (cardId) => {
    setShowCardDetails((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const copyToClipboard = (text, field) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      });
      return;
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Salary received', time: '2m', read: false },
    { id: 2, title: 'New login from Chrome', time: '1h', read: false },
    { id: 3, title: 'Card ending 9010 used', time: '3h', read: true },
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })));

  const hydrateUser = useCallback(async () => {
    setLoadingData(true);
    setAppError('');
    try {
      const [profile, account, transactions, contactsResponse, cardsResponse] = await Promise.all([
        fetchProfile(),
        fetchAccount().catch(() => null),
        fetchTransactions(20).catch(() => []),
        listContacts().catch(() => []),
        listCards().catch(() => []),
      ]);

      const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.username;
      const displayName = profile.display_name?.trim() || fullName || profile.username;
      const parsedBalance = account?.balance != null ? Number(account.balance) : null;

      setUserRole(profile.role);
      setUserData((prev) => ({
        ...prev,
        name: displayName,
        displayName,
        username: profile.username,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        phoneNumber: profile.phone_number,
        country: profile.country || '',
        city: profile.city || '',
        profilePicture: profile.profile_picture ? `${API_BASE_URL}${profile.profile_picture}` : '',
        balance: Number.isFinite(parsedBalance) ? parsedBalance : prev.balance,
      }));

      const formattedCards = cardsResponse?.length ? toCards(cardsResponse) : account && account.card_number
        ? [{
            id: account.user_id,
            type: 'Primary',
            number: String(account.card_number).replace(/(.{4})/g, '$1 ').trim(),
            holder: fullName || profile.username,
            expiry: '--/--',
            cvv: '***',
            status: account.card_active ? 'Active' : 'Inactive',
            color: account.card_active ? CARD_THEME_MAP['midnight-blue'] : 'from-gray-500 to-gray-600',
          }]
        : [];

      setAccountInfo(account);
      setUserCards(formattedCards);
      setRecentTransactions(toTransactionRows(transactions, profile.id));
      setContacts(contactsResponse);
      setQuickContacts(toContacts(contactsResponse));
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to hydrate user', error);
      setAppError(error?.detail || error?.message || 'Failed to load user data. Please log in again.');
      clearSessionToken();
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const token = getSessionToken();
    if (token) {
      hydrateUser().catch(() => null).finally(() => setBootstrapping(false));
    } else {
      setBootstrapping(false);
    }
  }, [hydrateUser]);

  const handleLogin = useCallback(
    async ({ username, password }) => {
      try {
        const response = await loginRequest({ username, password });
        saveSessionToken(response.session_token);
        await hydrateUser();
        setCurrentPage('dashboard');
      } catch (error) {
        const message = error?.message || error?.detail || 'Unable to login';
        throw new Error(message);
      }
    },
    [hydrateUser]
  );

  const handleRegister = useCallback(
    async (payload) => {
      try {
        await registerRequest(payload);
        await handleLogin({ username: payload.username, password: payload.password });
      } catch (error) {
        const message = error?.detail || error?.message || 'Unable to register';
        throw new Error(message);
      }
    },
    [handleLogin]
  );

  const handleCardStatusChange = useCallback(
    async (cardId, nextStatus) => {
      try {
        await updateCardStatusRequest(cardId, nextStatus);
        await hydrateUser();
      } catch (error) {
        console.error('Unable to update card status', error);
        setAppError(error?.detail || error?.message || 'Unable to update card status');
        throw error;
      }
    },
    [hydrateUser]
  );

  const handleOrderCard = useCallback(
    async ({ designSlug, theme, cardType }) => {
      try {
        await orderCardRequest({
          design_slug: designSlug,
          theme,
          card_type: cardType,
        });
        await hydrateUser();
        setCurrentPage('cards');
      } catch (error) {
        console.error('Unable to order card', error);
        throw error;
      }
    },
    [hydrateUser]
  );

  const handleProfileSave = useCallback(
    async (payload) => {
      await updateProfileRequest(payload);
      await hydrateUser();
    },
    [hydrateUser]
  );

  const handleAvatarUpload = useCallback(
    async (file) => {
      await uploadAvatarRequest(file);
      await hydrateUser();
    },
    [hydrateUser]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSessionToken();
      setIsAuthenticated(false);
      setSidebarOpen(false);
      setCurrentPage('landing');
      setUserRole('user');
      setUserData(DEFAULT_USER_DATA);
      setUserCards([]);
      setRecentTransactions([]);
      setQuickContacts([]);
      setContacts([]);
      setAccountInfo(null);
      setAppError('');
    }
  }, []);

  const renderPage = () => {
    if (!isAuthenticated) {
      switch (currentPage) {
        case 'landing':
          return <LandingPage onNavigateRegister={() => setCurrentPage('register')} />;
        case 'login':
          return (
            <LoginPage
              onLogin={handleLogin}
              onSwitchRegister={() => setCurrentPage('register')}
            />
          );
        case 'register':
          return (
            <RegisterPage
              onRegister={handleRegister}
              onSwitchLogin={() => setCurrentPage('login')}
            />
          );
        default:
          return <LandingPage onNavigateRegister={() => setCurrentPage('register')} />;
      }
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            userData={userData}
            recentTransactions={recentTransactions}
            spendingData={spendingData}
            quickContacts={quickContacts}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        );
      case 'transfer':
        return (
          <TransferPage
            contacts={contacts}
            accountInfo={accountInfo}
            onTransferComplete={hydrateUser}
            isDarkMode={isDarkMode}
          />
        );
      case 'transactions':
        return <TransactionsPage recentTransactions={recentTransactions} isDarkMode={isDarkMode} />;
      case 'cards':
        return (
          <MyCardsPage
            userCards={userCards}
            showCardDetails={showCardDetails}
            toggleCardVisibility={toggleCardVisibility}
            copyToClipboard={copyToClipboard}
            copiedField={copiedField}
            onNavigateOrder={() => setCurrentPage('order-card')}
            onFreezeCard={handleCardStatusChange}
            onCancelCard={handleCardStatusChange}
            isDarkMode={isDarkMode}
          />
        );
      case 'order-card':
        return (
          <OrderCardPage
            userData={userData}
            cardDesigns={cardDesigns}
            onOrderCard={handleOrderCard}
            isDarkMode={isDarkMode}
          />
        );
      case 'investments':
        return <InvestmentsPage isDarkMode={isDarkMode} />;
      case 'accounts':
        return <AccountsPage userData={userData} isDarkMode={isDarkMode} />;
      case 'users':
        return <UserManagementPage isDarkMode={isDarkMode} />;
      case 'tickets':
        return <SupportTicketsPage isDarkMode={isDarkMode} />;
      case 'support-chat':
        return <SupportChatPage isDarkMode={isDarkMode} />;
      case 'roles':
        return <RoleAssignmentPage isDarkMode={isDarkMode} />;
      case 'settings':
        return (
          <SettingsPage
            userData={userData}
            onSave={handleProfileSave}
            onAvatarUpdate={handleAvatarUpload}
          />
        );
      default:
        return (
          <DashboardPage
            userData={userData}
            recentTransactions={recentTransactions}
            spendingData={spendingData}
            quickContacts={quickContacts}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        );
    }
  };

  if (bootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading application...
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {isAuthenticated && (
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userRole={userRole}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
        />
      )}

      {isAuthenticated && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {isAuthenticated && (
          <Header
            currentPage={currentPage}
            userData={userData}
            userRole={userRole}
            setSidebarOpen={setSidebarOpen}
            onNavigateSettings={() => setCurrentPage('settings')}
            onLogout={handleLogout}
            notifications={notifications}
            onMarkAllRead={markAllRead}
            unreadCount={unreadCount}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        )}
        {appError && (
          <div className="bg-red-500 text-white text-center text-sm py-2 px-4">
            {appError}
          </div>
        )}
        {loadingData && isAuthenticated && (
          <div className="bg-indigo-50 text-indigo-700 text-center text-xs py-1">
            Refreshing your data...
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
          <div className="sr-only" role="status" aria-live="polite">
            {copiedField ? 'Copied to clipboard' : ''}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
