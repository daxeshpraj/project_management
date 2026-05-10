import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "@/App.css";
import Dashboard from "@/components/Dashboard";
import Projects from "@/components/Projects";
import Vendors from "@/components/Vendors";
import VendorPayments from "@/components/VendorPayments";
import CustomerPayments from "@/components/CustomerPayments";
import GeneralExpenses from "@/components/GeneralExpenses";
import ServiceExpenses from "@/components/ServiceExpenses";
import Reports from "@/components/Reports";
import Staff from "@/components/Staff";
import StaffAccounts from "@/components/StaffAccounts";
import PersonalLoans from "@/components/PersonalLoans";
import Login from "@/components/Login";
import UserManagement from "@/components/UserManagement";
import MasterSettings from "@/components/MasterSettings";
import StaffTransactions from "@/components/StaffTransactions";
import PurchaseTracking from "@/components/PurchaseTracking";
import RoleManagement from "@/components/RoleManagement";
import CompanySettings from "@/components/CompanySettings";
import Signup from "@/components/Signup";
import LooseExpenses from "@/components/LooseExpenses";
import SuperAdminDashboard from "@/components/SuperAdminDashboard";
import { Toaster } from "@/components/ui/sonner";
import { getSubdomain } from "@/utils/tenancy";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Briefcase,
  Users,
  Wallet,
  FileText,
  UserCog,
  HandCoins,
  Menu,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ShieldCheck,
  Settings,
  ReceiptText,
  UserCheck,
  MessageSquare,
  Shield,
  Building2,
} from "lucide-react";
// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL;

// Configure axios to send the token with every request
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Use setImmediate or similar to avoid state updates during render if needed, 
      // but here we just want to trigger a redirect or state change.
      // A simple reload is the most reliable way to reset the app state.
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);


// --- Sub-components moved outside to prevent unmounting on every render ---

const PageWrapper = ({ id, currentPage, children, allowed = true }) => {
  if (!allowed && currentPage === id) {
    return <div className="p-8 text-center text-gray-500">Access Denied</div>;
  }
  return currentPage === id ? <div className="animate-in fade-in duration-300">{children}</div> : null;
};
const Sidebar = ({
  isCollapsed,
  collapsed,
  setCollapsed,
  setHovering,
  darkMode,
  setDarkMode,
  currentPage,
  handleMenuClick,
  handleLogout,
  toggleGroup,
  expandedGroups,
  menuItems,
  company,
  mobile = false
}) => (
  <aside
    onMouseEnter={() => !mobile && setHovering(true)}
    onMouseLeave={() => !mobile && setHovering(false)}
    className={`${mobile ? "w-64" : isCollapsed ? "w-20" : "w-64"} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-all duration-300 ease-in-out z-40`}
  >
    {/* Logo */}
    <div className="px-3 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center space-x-3 h-[73px]">
      <img
        src={company?.logo_url || "/logo.png"}
        alt={company?.name || "aemje architect"}
        className="h-10 w-10 object-contain flex-shrink-0"
      />
      {(!isCollapsed || mobile) && (
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">{company?.name || "aemje architect"}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{company?.tagline || "Business Management"}</p>
        </div>
      )}
    </div>

    {/* Navigation */}
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      {menuItems.map((item) => {
        const Icon = item.icon;

        if (item.type === "single") {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              title={isCollapsed ? item.label : ""}
              className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${active
                ? "bg-slate-50 dark:bg-slate-900/30 text-slate-950 dark:text-slate-500"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              data-testid={`nav-${item.id}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-slate-900 dark:text-slate-500" : "text-gray-500 dark:text-gray-400"}`} />
              {(!isCollapsed || mobile) && <span>{item.label}</span>}
            </button>
          );
        }

        const isExpanded = expandedGroups[item.id];
        const hasActive = item.items.some((i) => i.id === currentPage);

        if (isCollapsed) {
          // Collapsed mode: show group icon only
          return (
            <div key={item.id} className="relative group">
              <button
                title={item.label}
                className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${hasActive ? "bg-slate-50 dark:bg-slate-900/30 text-slate-950 dark:text-slate-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                <Icon className={`w-5 h-5 ${hasActive ? "text-slate-900 dark:text-slate-500" : "text-gray-500 dark:text-gray-400"}`} />
              </button>
            </div>
          );
        }

        return (
          <div key={item.id}>
            <button
              onClick={() => toggleGroup(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${hasActive ? "text-slate-950 dark:text-slate-500" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              data-testid={`nav-${item.id}`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${hasActive ? "text-slate-900 dark:text-slate-500" : "text-gray-500 dark:text-gray-400"}`} />
                <span>{item.label}</span>
              </div>
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {isExpanded && (
              <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                {item.items.map((subItem) => {
                  const active = currentPage === subItem.id;
                  return (
                    <button
                      key={subItem.id}
                      onClick={() => handleMenuClick(subItem.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${active
                        ? "bg-slate-50 dark:bg-slate-900/30 text-slate-950 dark:text-slate-500 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      data-testid={`nav-${subItem.id}`}
                    >
                      {subItem.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>

    {/* Bottom Controls */}
    <div className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-1">
      <button
        onClick={() => setDarkMode(!darkMode)}
        title={darkMode ? "Light Mode" : "Dark Mode"}
        className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
        data-testid="dark-mode-toggle"
      >
        {darkMode ? <Sun className="w-5 h-5 flex-shrink-0 text-yellow-500" /> : <Moon className="w-5 h-5 flex-shrink-0 text-gray-500" />}
        {(!isCollapsed || mobile) && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
      </button>
      <button
        onClick={handleLogout}
        className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {(!isCollapsed || mobile) && <span>Log Out</span>}
      </button>
      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
          data-testid="sidebar-toggle"
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5 flex-shrink-0 text-gray-500" /> : <PanelLeftClose className="w-5 h-5 flex-shrink-0 text-gray-500" />}
          {!isCollapsed && <span>Collapse</span>}
        </button>
      )}
      {(!isCollapsed || mobile) && (
        <div className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500">
          {company?.name || "aemje architect"} © 2026
        </div>
      )}
    </div>
  </aside>
);

function App() {
  const [pageHistory, setPageHistory] = useState(() => {
    const saved = localStorage.getItem("page-history");
    try {
      return saved ? JSON.parse(saved) : ["dashboard"];
    } catch (e) {
      return ["dashboard"];
    }
  });

  useEffect(() => {
    localStorage.setItem("page-history", JSON.stringify(pageHistory));
  }, [pageHistory]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState({
    "projects-menu": true,
    "vendors-menu": true,
    "staff-menu": true,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage = pageHistory[pageHistory.length - 1];

  // Authentication State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [company, setCompany] = useState(() => {
    const saved = localStorage.getItem("company");
    return saved ? JSON.parse(saved) : null;
  });

  const [showSignup, setShowSignup] = useState(false);

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });
  const [hovering, setHovering] = useState(false);
  const isCollapsed = collapsed && !hovering;

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("dark-mode");
    return saved === "true";
  });

  // Global Axios Interceptor for Tenancy
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const subdomain = getSubdomain();
      if (subdomain) {
        config.headers['X-Tenant-Subdomain'] = subdomain;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Lookup branding by subdomain on mount
  useEffect(() => {
    const lookupBranding = async () => {
      const subdomain = getSubdomain();
      if (subdomain) {
        try {
          const response = await axios.get(`/api/company/lookup/${subdomain}`);
          setCompany(response.data);
        } catch (error) {
          console.error("Subdomain lookup failed", error);
        }
      }
    };
    lookupBranding();
  }, []);

  // Collapsed state for desktop sidebar (icon-only mode)

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed);
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem("dark-mode", darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Handle responsive auto-collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 1024) {
        setCollapsed(true);
      } else if (window.innerWidth >= 1280) {
        setCollapsed(false);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const userResponse = await axios.get("/api/auth/me");
          setUser(userResponse.data);
          localStorage.setItem("user", JSON.stringify(userResponse.data));
          
          const companyResponse = await axios.get("/api/company/profile");
          setCompany(companyResponse.data);
          localStorage.setItem("company", JSON.stringify(companyResponse.data));
        } catch (error) {
          console.error("Session verification failed", error);
          handleLogout();
        }
      }
    };
    verifySession();
  }, []);


  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleNavigate = (page) => {
    if (page === currentPage) return;
    setPageHistory((prev) => [...prev, page]);
    setSidebarOpen(false);
  };

  const handleBack = () => {
    if (pageHistory.length > 1) {
      setPageHistory((prev) => prev.slice(0, -1));
    }
  };

  const handleMenuClick = (page) => {
    handleNavigate(page);
  };

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("company");
    localStorage.removeItem("page-history");
    setUser(null);
    setCompany(null);
    setPageHistory(["dashboard"]);
  };

  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await axios.get("/api/permissions");
        setPermissions(response.data);
      } catch (error) {
        console.error("Failed to fetch permissions", error);
      }
    };
    if (user) {
      fetchPermissions();
    }
  }, [user]);

  const allowedModules = useMemo(() => {
    if (!user) return [];
    return permissions
      .filter(p => p.role === user.role && p.is_enabled)
      .map(p => p.module_id);
  }, [user, permissions]);

  const menuItems = useMemo(() => {
    if (!user) return [];
    
    const userRole = user.role;

    // Helper to check if item is allowed
    const isAllowed = (item) => {
      if (userRole === 'OWNER' || userRole === 'ADMIN') return true;
      return allowedModules.includes(item.id);
    };

    const items = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, type: "single" },
      { id: "procurement", label: "Procurement Feed", icon: MessageSquare, type: "single" },
      {
        id: "projects-menu", label: "Projects", icon: Briefcase, type: "group",
        items: [
          { id: "projects", label: "All Projects" },
          { id: "customer-payments", label: "Client Payments Received" },
        ],
      },
      {
        id: "vendors-menu", label: "Agency", icon: Users, type: "group",
        items: [
          { id: "vendors", label: "All Agency" },
          { id: "vendor-payments", label: "Agency Payments Entry" },
          { id: "loose-expenses", label: "Loose Agency Expenses" },
        ],
      },
      {
        id: "staff-menu", label: "Staff", icon: UserCog, type: "group",
        items: [
          { id: "employees", label: "Employee Salary" },
          { id: "staff-advances", label: "Bank Note" },
          { id: "staff-cash", label: "Cash Note" },
          { id: "staff-accounts", label: "Staff Accounts Ledger" },
        ],
      },
      {
        id: "partner-menu", label: "Partners", icon: ShieldCheck, type: "group",
        items: [
          { id: "partner-master", label: "Partner Master" },
          { id: "partners", label: "Partner Advances" },
          { id: "partner-ledger", label: "Partner Accounts Ledger" },
        ],
      },
      { id: "personal-loans", label: "Loans & Help", icon: HandCoins, type: "single" },
      { id: "general-expenses", label: "Office Expenses", icon: Wallet, type: "single" },
      { id: "service-expenses", label: "Turnkey Common Expenses", icon: ReceiptText, type: "single" },
      { id: "reports", label: "Reports", icon: FileText, type: "single" },
      { id: "user-management", label: "User Management", icon: UserCheck, type: "single" },
      { id: "role-management", label: "Role Management", icon: Shield, type: "single" },
      { id: "company-settings", label: "Company Settings", icon: Building2, type: "single" },
      { id: "master-settings", label: "Master Settings", icon: Settings, type: "single" },
    ];

    // Add Super Admin Dashboard if user is superadmin
    if (user.is_superadmin) {
      items.push({ id: "super-admin", label: "Global Admin", icon: ShieldCheck, type: "single" });
    }

    return items.filter(item => {
      // In this V1, we filter by ID. If group ID is in allowedModules, show group.
      // Roles are also checked via isAllowed.
      return isAllowed(item);
    });
  }, [user, permissions]);


  const renderContent = () => {
    const commonProps = {
      onUpdate: handleRefresh,
      onNavigate: handleNavigate,
      onBack: handleBack,
      canGoBack: pageHistory.length > 1,
      company: company,
    };

    const isAllowedPage = (id) => {
      if (user.role === 'OWNER' || user.role === 'ADMIN') return true;
      return allowedModules.includes(id);
    };

    return (
      <>
        <PageWrapper id="dashboard" currentPage={currentPage} allowed={isAllowedPage('dashboard')}>
          <Dashboard refreshTrigger={refreshTrigger} onNavigate={handleNavigate} />
        </PageWrapper>
        <PageWrapper id="projects" currentPage={currentPage} allowed={isAllowedPage('projects')}>
          <Projects {...commonProps} />
        </PageWrapper>
        <PageWrapper id="vendors" currentPage={currentPage} allowed={isAllowedPage('vendors')}>
          <Vendors {...commonProps} />
        </PageWrapper>
        <PageWrapper id="vendor-payments" currentPage={currentPage} allowed={isAllowedPage('vendor-payments')}>
          <VendorPayments {...commonProps} />
        </PageWrapper>
        <PageWrapper id="customer-payments" currentPage={currentPage} allowed={isAllowedPage('customer-payments')}>
          <CustomerPayments {...commonProps} />
        </PageWrapper>
        <PageWrapper id="general-expenses" currentPage={currentPage} allowed={isAllowedPage('general-expenses')}>
          <GeneralExpenses {...commonProps} />
        </PageWrapper>
        <PageWrapper id="service-expenses" currentPage={currentPage} allowed={isAllowedPage('service-expenses')}>
          <ServiceExpenses {...commonProps} />
        </PageWrapper>
        <PageWrapper id="reports" currentPage={currentPage} allowed={isAllowedPage('reports')}>
          <Reports {...commonProps} />
        </PageWrapper>
        <PageWrapper id="employees" currentPage={currentPage} allowed={isAllowedPage('staff-menu')}>
          <Staff {...commonProps} staffTypeFilter="Employee" />
        </PageWrapper>
        <PageWrapper id="partner-master" currentPage={currentPage} allowed={isAllowedPage('partner-menu')}>
          <Staff {...commonProps} staffTypeFilter="Partner" />
        </PageWrapper>
        <PageWrapper id="partners" currentPage={currentPage} allowed={isAllowedPage('partner-menu')}>
          <StaffTransactions {...commonProps} ledgerType="BANK" staffTypeFilter="Partner" />
        </PageWrapper>
        <PageWrapper id="staff-advances" currentPage={currentPage} allowed={isAllowedPage('staff-menu')}>
          <StaffTransactions {...commonProps} ledgerType="BANK" staffTypeFilter="Employee" />
        </PageWrapper>
        <PageWrapper id="staff-cash" currentPage={currentPage} allowed={isAllowedPage('staff-menu')}>
          <StaffTransactions {...commonProps} ledgerType="CASH" staffTypeFilter="Employee" />
        </PageWrapper>
        <PageWrapper id="staff-accounts" currentPage={currentPage} allowed={isAllowedPage('staff-menu')}>
          <StaffAccounts {...commonProps} staffTypeFilter="Employee" />
        </PageWrapper>
        <PageWrapper id="partner-ledger" currentPage={currentPage} allowed={isAllowedPage('partner-menu')}>
          <StaffAccounts {...commonProps} staffTypeFilter="Partner" />
        </PageWrapper>
        <PageWrapper id="personal-loans" currentPage={currentPage} allowed={isAllowedPage('personal-loans')}>
          <PersonalLoans {...commonProps} />
        </PageWrapper>
        <PageWrapper id="user-management" currentPage={currentPage} allowed={isAllowedPage('user-management')}>
          <UserManagement {...commonProps} />
        </PageWrapper>
        <PageWrapper id="role-management" currentPage={currentPage} allowed={isAllowedPage('role-management')}>
          <RoleManagement {...commonProps} />
        </PageWrapper>
        <PageWrapper id="master-settings" currentPage={currentPage} allowed={isAllowedPage('master-settings')}>
          <MasterSettings {...commonProps} />
        </PageWrapper>

        {user.is_superadmin && (
          <PageWrapper id="super-admin" currentPage={currentPage} allowed={true}>
            <SuperAdminDashboard />
          </PageWrapper>
        )}

        <PageWrapper id="company-settings" currentPage={currentPage} allowed={user.role === 'ADMIN' || user.role === 'OWNER'}>
          <CompanySettings {...commonProps} />
        </PageWrapper>
        <PageWrapper id="loose-expenses" currentPage={currentPage} allowed={isAllowedPage('vendors-menu')}>
          <LooseExpenses {...commonProps} />
        </PageWrapper>
        <PageWrapper id="procurement" currentPage={currentPage} allowed={isAllowedPage('procurement')}>
          <PurchaseTracking {...commonProps} />
        </PageWrapper>
      </>
    );
  };

  const sidebarProps = {
    isCollapsed,
    collapsed,
    setCollapsed,
    setHovering,
    darkMode,
    setDarkMode,
    currentPage,
    handleMenuClick,
    handleLogout,
    toggleGroup,
    expandedGroups,
    menuItems,
    company
  };

  if (!user) {
    return (
      <div className={darkMode ? "dark" : ""}>
        {showSignup ? (
          <Signup onBack={() => setShowSignup(false)} />
        ) : (
          <Login onLoginSuccess={setUser} onShowSignup={() => setShowSignup(true)} />
        )}
        <Toaster position="top-right" theme={darkMode ? "dark" : "light"} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex w-full">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block sticky top-0 h-screen z-30">
          <Sidebar {...sidebarProps} />
        </div>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50">
              <Sidebar {...sidebarProps} mobile />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 dark:text-gray-300">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <img
                src={company?.logo_url || "/logo.png"}
                alt={company?.name || "aemje"}
                className="h-8 w-auto object-contain"
              />
              <span className="font-semibold text-gray-900 dark:text-white">{company?.name || "aemje architect"}</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="text-gray-600 dark:text-gray-300"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </header>

          <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{renderContent()}</main>
        </div>

        <Toaster position="top-right" theme={darkMode ? "dark" : "light"} />
      </div>
    </div>
  );
}

export default App;

