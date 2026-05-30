import { useState, useEffect } from "react";
import axios from "axios";
import { DollarSign, TrendingUp, Briefcase, Users, Calendar, Filter, X, RefreshCcw } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { HK_TECH_BRAND } from "@/config/brand";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ refreshTrigger, onNavigate, company }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState([]);

  const months = [
    { id: 1, name: 'Jan' }, { id: 2, name: 'Feb' }, { id: 3, name: 'Mar' },
    { id: 4, name: 'Apr' }, { id: 5, name: 'May' }, { id: 6, name: 'Jun' },
    { id: 7, name: 'Jul' }, { id: 8, name: 'Aug' }, { id: 9, name: 'Sep' },
    { id: 10, name: 'Oct' }, { id: 11, name: 'Nov' }, { id: 12, name: 'Dec' }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [refreshTrigger, year, selectedMonths]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let url = `${API}/analytics/dashboard`;
      const params = [];
      if (year) params.push(`year=${year}`);
      if (selectedMonths.length > 0) params.push(`months=${selectedMonths.join(',')}`);

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const response = await axios.get(url);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (monthId) => {
    setSelectedMonths(prev =>
      prev.includes(monthId)
        ? prev.filter(id => id !== monthId)
        : [...prev, monthId].sort((a, b) => a - b)
    );
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: company?.currency || 'INR', 
      maximumFractionDigits: 0 
    }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hk-teal mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!analytics) return <div>No data</div>;

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div className="bg-white dark:bg-gray-900 border border-hk-teal/20 dark:border-gray-800 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <BrandLogo size="lg" subtitle={company?.name ? `${company.name} workspace` : HK_TECH_BRAND.tagline} />
        <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-right space-y-0.5">
          <p>{HK_TECH_BRAND.phone}</p>
          <p>{HK_TECH_BRAND.email}</p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Overview</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your projects, payments, and profitability
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 dark:text-gray-300 outline-none"
            >
              <option value="">All Years</option>
              {[2023, 2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1 shadow-sm">
            {months.map(m => (
              <button
                key={m.id}
                onClick={() => toggleMonth(m.id)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${selectedMonths.includes(m.id)
                    ? 'bg-hk-teal text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                {m.name}
              </button>
            ))}
            {selectedMonths.length > 0 && (
              <button
                onClick={() => setSelectedMonths([])}
                className="ml-1 p-1 text-gray-400 hover:text-red-500 rounded-md"
                title="Clear months"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-hk-teal dark:hover:text-hk-teal-light hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 ml-auto md:ml-0"
            title="Refresh Dashboard"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => onNavigate('customer-payments')}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-green-500/30 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Total Revenue</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">(Customer Payments)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                {formatCurrency(analytics.total_revenue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('vendor-payments')}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-orange-500/30 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Project Expenses</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">(Vendor + Staff Expenses)</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {formatCurrency(analytics.total_vendor_payments)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
              <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('general-expenses')}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-red-500/30 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">General Expenses</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">(Business Costs)</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                {formatCurrency(analytics.total_general_expenses)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
              <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('reports')}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-slate-700/30 transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-slate-500 transition-colors">Net Profit</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">(Revenue - All Expenses)</p>
              <p className={`text-2xl font-bold mt-2 ${analytics.total_profit >= 0 ? 'text-slate-900 dark:text-slate-500' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(analytics.total_profit)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${analytics.total_profit >= 0 ? 'bg-slate-100 dark:bg-slate-900/30 group-hover:bg-slate-200 dark:group-hover:bg-slate-900/50' : 'bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-900/50'}`}>
              <Briefcase className={`w-6 h-6 ${analytics.total_profit >= 0 ? 'text-slate-900 dark:text-slate-500' : 'text-red-600 dark:text-red-400'}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => onNavigate('projects')}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-slate-700/30 transition-all duration-200 group"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 group-hover:text-slate-900 dark:group-hover:text-slate-500 transition-colors">Project Statistics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Projects</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{analytics.total_projects}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Projects</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">{analytics.active_projects}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Completed Projects</span>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-500">{analytics.total_projects - analytics.active_projects}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Profit Margin</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {analytics.total_revenue > 0 ? `${((analytics.total_profit / analytics.total_revenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Vendor Cost Ratio</span>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {analytics.total_revenue > 0 ? `${((analytics.total_vendor_payments / analytics.total_revenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Business Expense Ratio</span>
              <span className="text-xl font-bold text-red-600 dark:text-red-400">
                {analytics.total_revenue > 0 ? `${((analytics.total_general_expenses / analytics.total_revenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-300 mb-2">💡 Quick Overview</h3>
        <div className="text-sm text-slate-800 dark:text-slate-500 space-y-1">
          <p>• Use <strong>Projects</strong> to create Turnkey or Consultation-based projects</p>
          <p>• Add <strong>Vendors</strong> (Carpenter, POP Work, Electric, etc.) to track who you work with</p>
          <p>• Record <strong>Vendor Payments</strong> for project-specific expenses</p>
          <p>• Track <strong>Customer Payments</strong> to monitor payment installments and outstanding balances</p>
          <p>• Manage <strong>Staff & Partners</strong> with advance tracking and profit sharing</p>
          <p>• Record <strong>Personal Loans</strong> and help money given to others</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
