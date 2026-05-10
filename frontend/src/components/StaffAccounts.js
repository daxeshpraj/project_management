import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Search, X, Calendar, Filter } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StaffAccounts = ({ onBack, canGoBack, staffTypeFilter = "all" }) => {
  const [transactions, setTransactions] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, staffRes, projRes] = await Promise.all([
        axios.get(`${API}/staff-transactions`),
        axios.get(`${API}/staff`),
        axios.get(`${API}/projects`),
      ]);
      const allTxs = txRes.data;
      const allStaff = staffRes.data;
      
      const filteredStaff = staffTypeFilter === "all" ? allStaff : allStaff.filter(s => s.staff_type === staffTypeFilter);
      const filteredTxs = staffTypeFilter === "all" ? allTxs : allTxs.filter(t => {
        const staff = allStaff.find(s => s.id === t.staff_id);
        return staff && staff.staff_type === staffTypeFilter;
      });

      setTransactions(filteredTxs);
      setStaffList(filteredStaff);
      setProjects(projRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const getStaffName = (id) => staffList.find((s) => s.id === id)?.name || "Unknown";
  const getProjectName = (id) => projects.find((p) => p.id === id)?.name || "-";

  const getTxColor = (type) => {
    switch (type) {
      case "Advance": return "bg-orange-100 text-orange-800";
      case "Expense": return "bg-red-100 text-red-800";
      case "Salary": return "bg-slate-100 text-slate-800";
      case "Settlement": return "bg-green-100 text-green-800";
      case "Profit Share": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filtered = transactions.filter((t) => {
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStaff = filterStaff === "all" || t.staff_id === filterStaff;
    const matchesType = filterType === "all" || t.transaction_type === filterType;

    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && new Date(t.transaction_date) >= new Date(startDate);
    if (endDate) matchesDate = matchesDate && new Date(t.transaction_date) <= new Date(endDate);

    return matchesSearch && matchesStaff && matchesType && matchesDate;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStaff("all");
    setFilterType("all");
    setStartDate("");
    setEndDate("");
  };

  // Compute staff-wise summary
  const summary = staffList.map((staff) => {
    const staffTx = transactions.filter((t) => t.staff_id === staff.id);
    const adv = staffTx.filter((t) => t.transaction_type === "Advance").reduce((s, t) => s + t.amount, 0);
    const exp = staffTx.filter((t) => t.transaction_type === "Expense").reduce((s, t) => s + t.amount, 0);
    const sett = staffTx.filter((t) => t.transaction_type === "Settlement").reduce((s, t) => s + t.amount, 0);
    const profit = staffTx.filter((t) => t.transaction_type === "Profit Share").reduce((s, t) => s + t.amount, 0);
    const sal = staffTx.filter((t) => t.transaction_type === "Salary").reduce((s, t) => s + t.amount, 0);
    return {
      ...staff,
      advance: adv,
      expense: exp,
      settlement: sett,
      profit_share: profit,
      salary: sal,
      balance: adv + profit - exp - sett,
    };
  }).filter((s) => s.advance > 0 || s.expense > 0 || s.salary > 0 || s.settlement > 0 || s.profit_share > 0);

  return (
    <div className="space-y-6" data-testid="staff-accounts-page">
      <div className="flex items-center space-x-4">
        {canGoBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {staffTypeFilter === 'Partner' ? 'Partner Accounts Ledger' : 'Staff Accounts Ledger'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">All staff financial transactions across the business</p>
        </div>
      </div>

      {/* Summary Table */}
      {summary.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Staff Balance Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Advance</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Expense</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Settlement</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit Share</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Salary Paid</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${s.staff_type === "Partner" ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-800"
                        }`}>{s.staff_type}</span>
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-orange-600">{formatCurrency(s.advance)}</td>
                    <td className="px-4 py-2 text-sm text-right text-red-600">{formatCurrency(s.expense)}</td>
                    <td className="px-4 py-2 text-sm text-right text-green-600">{formatCurrency(s.settlement)}</td>
                    <td className="px-4 py-2 text-sm text-right text-purple-600">{formatCurrency(s.profit_share)}</td>
                    <td className="px-4 py-2 text-sm text-right text-slate-900">{formatCurrency(s.salary)}</td>
                    <td className={`px-4 py-2 text-sm text-right font-bold ${s.balance >= 0 ? "text-slate-950" : "text-red-700"
                      }`}>{formatCurrency(s.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search in descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700 min-w-[140px]">
              <option value="all">All Staff</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700 min-w-[140px]">
            <option value="all">All Types</option>
            <option>Advance</option>
            <option>Expense</option>
            <option>Salary</option>
            <option>Settlement</option>
            <option>Profit Share</option>
          </select>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {(searchTerm || filterStaff !== "all" || filterType !== "all" || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 ml-auto"
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(tx.transaction_date)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{getStaffName(tx.staff_id)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getTxColor(tx.transaction_type)}`}>
                      {tx.transaction_type}
                      {tx.transaction_type === "Salary" && tx.is_advance && " (Advance)"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{getProjectName(tx.project_id)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{tx.description || "-"}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {transactions.length === 0 ? "No transactions yet" : "No transactions match your filters"}
          </p>
          {transactions.length > 0 && (
            <button onClick={clearFilters} className="text-slate-900 hover:text-slate-950 font-medium mt-2">Clear all filters</button>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffAccounts;
