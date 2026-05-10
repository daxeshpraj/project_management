import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ArrowLeft, BookOpen, Search, Filter, Calendar, 
  Download, FileText, FileSpreadsheet, Plus, 
  TrendingUp, TrendingDown, Wallet, Pencil, Trash2, X, RefreshCcw
} from 'lucide-react';
import { generateProjectLedgerPDF } from '../utils/pdfGenerator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectLedger = ({ project, onBack, onUpdate }) => {
  const [ledgerData, setLedgerData] = useState({ ledger: [], summary: {}, project: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "all" // Inflow or Outflow
  });
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchLedger();
  }, [project.id]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/projects/${project.id}/ledger`);
      setLedgerData(response.data);
    } catch (err) {
      toast.error("Failed to fetch project ledger");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Filtering Logic
  const filteredLedger = ledgerData.ledger.filter(item => {
    const matchesSearch = item.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.reference && item.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filters.type === "all" || item.type === filters.type;
    
    let matchesDate = true;
    if (filters.startDate) matchesDate = matchesDate && new Date(item.date) >= new Date(filters.startDate);
    if (filters.endDate) matchesDate = matchesDate && new Date(item.date) <= new Date(filters.endDate);
    
    return matchesSearch && matchesType && matchesDate;
  });

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredLedger.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredLedger.map(item => item.id));
    }
  };

  const toggleRow = (id) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Export to PDF
  const handleExportPDF = () => {
    generateProjectLedgerPDF(project, ledgerData, filteredLedger);
  };

  // Export to Excel (CSV)
  const exportExcel = () => {
    const headers = ["Date", "Particulars", "Category", "Type", "Amount", "Reference", "Running Balance"];
    const rows = filteredLedger.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.particulars,
      item.category,
      item.type,
      item.amount,
      item.reference || "",
      item.balance
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Ledger_${ledgerData.project.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel/CSV exported successfully");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        <p className="mt-4 text-gray-600">Loading project financials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-slate-900" />
              Project Ledger: {ledgerData.project.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Detailed financial history for {ledgerData.project.client_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLedger}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all text-red-600">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all text-green-600">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Received</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(ledgerData.summary.total_inflow)}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(ledgerData.summary.total_outflow)}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-slate-200 dark:border-slate-900 shadow-sm bg-slate-50/30 dark:bg-slate-900/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Net Project Profit</p>
              <p className={`text-2xl font-bold mt-1 ${ledgerData.summary.net_balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                {formatCurrency(ledgerData.summary.net_balance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900/30 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-slate-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search particulars, category or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none"
          >
            <option value="all">All Transactions</option>
            <option value="Inflow">Payments Received</option>
            <option value="Outflow">Payments Spent</option>
          </select>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="bg-transparent border-none text-sm py-2 focus:ring-0"
            />
            <span className="text-gray-300">|</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-transparent border-none text-sm py-2 focus:ring-0"
            />
          </div>
          
          {(searchTerm || filters.type !== "all" || filters.startDate || filters.endDate) && (
            <button 
              onClick={() => { setSearchTerm(""); setFilters({ startDate: "", endDate: "", type: "all" }); }}
              className="text-xs text-red-600 hover:underline font-medium p-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-slate-900"
                    checked={selectedRows.length > 0 && selectedRows.length === filteredLedger.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Particulars</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-green-600">Inflow (+)</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-red-600">Outflow (-)</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredLedger.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedRows.includes(item.id) ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''}`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-slate-900"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => toggleRow(item.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{item.particulars}</div>
                    {item.reference && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ref: {item.reference}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      item.type === 'Inflow' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                    {item.type === 'Inflow' ? formatCurrency(item.amount) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-600">
                    {item.type === 'Outflow' ? formatCurrency(item.amount) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white bg-gray-50/30 dark:bg-gray-800/30">
                    {formatCurrency(item.balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                     <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Actions could lead to respective modals */}
                        <p className="text-[10px] text-gray-400 italic">Manage in original module</p>
                     </div>
                  </td>
                </tr>
              ))}
              {filteredLedger.length === 0 && (
                 <tr>
                   <td colSpan="8" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 italic">
                     No transactions found matching your criteria.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Bottom Info */}
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
        <p>• Showing {filteredLedger.length} transactions</p>
        <p>• Net Project Value: {formatCurrency(ledgerData.summary.net_balance)}</p>
      </div>
    </div>
  );
};

export default ProjectLedger;
