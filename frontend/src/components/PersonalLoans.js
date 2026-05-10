import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, HandCoins, HeartHandshake, Gift, ArrowLeft, Search, X, Calendar, Filter, RefreshCcw } from "lucide-react";
import LoanModal from "./LoanModal";
import LoanDetailsModal from "./LoanDetailsModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PersonalLoans = ({ onUpdate, onBack, canGoBack }) => {
  const [loans, setLoans] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/personal-loans`),
        axios.get(`${API}/personal-loans/analytics/summary`),
      ]);
      setLoans(loansRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error("Load error:", error);
      toast.error(`Failed to load: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry? All repayments will also be deleted.")) return;
    try {
      await axios.delete(`${API}/personal-loans/${id}`);
      toast.success("Entry deleted");
      fetchData();
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected records?`)) return;
    try {
      await axios.post(`${API}/personal-loans/bulk-delete`, { ids: selectedIds });
      toast.success("Selected records deleted");
      setSelectedIds([]);
      fetchData();
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete selected");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(l => l.id));
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingLoan(null);
    fetchData();
    onUpdate();
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const getTypeIcon = (type) => {
    return <HeartHandshake className="w-4 h-4 text-pink-600" />;
  };

  const getTypeBadge = (type) => {
    return "bg-pink-100 text-pink-800";
  };

  const getStatusBadge = (status) => {
    if (status === "PAID") return "bg-slate-100 text-slate-800";
    if (status === "RETURNED") return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const filtered = loans.filter((l) => {
    const matchesSearch = l.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.contact_number && l.contact_number.includes(searchTerm));
    const matchesType = filterType === "all" || l.loan_type === filterType;
    const matchesStatus = filterStatus === "all" || l.status === filterStatus;

    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && new Date(l.given_date) >= new Date(startDate);
    if (endDate) matchesDate = matchesDate && new Date(l.given_date) <= new Date(endDate);

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  // Reactive analytics based on filters
  const reactiveAnalytics = {
    totalGiven: filtered.reduce((acc, curr) => acc + (curr.total_given || curr.amount || 0), 0),
    totalReturned: filtered.reduce((acc, curr) => acc + (curr.total_repaid || 0), 0),
    balanceDue: filtered.reduce((acc, curr) => acc + (curr.outstanding || 0), 0),
    entriesCount: filtered.length,
    paidEntries: filtered.filter(l => l.status === 'PAID').length
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatus("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6" data-testid="personal-loans-page">
      <div className="flex justify-between items-center">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loans & Help</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track money given to others as help and repayments received</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 flex items-center space-x-2 font-medium border border-red-200 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingLoan(null); setIsModalOpen(true); }}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 flex items-center space-x-2"
            data-testid="add-loan-btn"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <p className="text-sm text-gray-600">Total Given</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(reactiveAnalytics.totalGiven)}</p>
          <p className="text-xs text-gray-500 mt-1">{reactiveAnalytics.paidEntries} paid entries</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <p className="text-sm text-gray-600">Total Returned</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(reactiveAnalytics.totalReturned)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <p className="text-sm text-gray-600">Balance Due</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(reactiveAnalytics.balanceDue)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
          <p className="text-sm text-gray-600">Entries Count</p>
          <p className="text-xl font-bold text-purple-600 mt-1">
            {reactiveAnalytics.entriesCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search person name or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700">
              <option value="all">All Status</option>
              <option value="PAID">Paid</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>

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
          {(searchTerm || filterType !== "all" || filterStatus !== "all" || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1"
            >
              <X className="w-4 h-4" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-slate-900 focus:ring-slate-700 h-4 w-4"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((loan) => (
                <tr key={loan.id} className={`hover:bg-gray-50 ${selectedIds.includes(loan.id) ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(loan.id)}
                      onChange={() => toggleSelect(loan.id)}
                      className="rounded border-gray-300 text-slate-900 focus:ring-slate-700 h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(loan.given_date)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{loan.person_name}</div>
                    {loan.contact_number && <div className="text-xs text-gray-500">{loan.contact_number}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{loan.purpose || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{loan.payment_mode}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(loan.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(loan.status)}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedLoan(loan)}
                      className="text-slate-900 hover:text-slate-900 mr-2"
                      title="View / Record Repayment"
                      data-testid={`view-loan-${loan.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditingLoan(loan); setIsModalOpen(true); }}
                      className="text-gray-600 hover:text-slate-900 mr-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(loan.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {loans.length === 0 ? "No entries yet" : "No entries match your filters"}
          </p>
          {loans.length === 0 ? (
            <button onClick={() => setIsModalOpen(true)} className="text-slate-900 hover:text-slate-950 dark:text-slate-500 font-medium">
              Add your first entry
            </button>
          ) : (
            <button onClick={clearFilters} className="text-slate-900 hover:text-slate-950 dark:text-slate-500 font-medium">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {isModalOpen && <LoanModal loan={editingLoan} onClose={handleModalClose} />}
      {selectedLoan && (
        <LoanDetailsModal
          loan={selectedLoan}
          onClose={() => {
            setSelectedLoan(null);
            fetchData();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default PersonalLoans;
