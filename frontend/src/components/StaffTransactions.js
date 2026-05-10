import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Search, Calendar, X, ArrowLeft, HandCoins, User, CheckCircle2, TrendingUp, TrendingDown, ArrowRight, BookOpen, Pencil, Trash2, Filter, ChevronDown, Download, RefreshCcw, FileText } from 'lucide-react';
import StaffTransactionModal from './StaffTransactionModal';
import { generateStaffLedgerPDF } from '../utils/pdfGenerator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StaffTransactions = ({ onUpdate, onBack, canGoBack, ledgerType = "BANK", staffTypeFilter = "all" }) => {
  const [staffList, setStaffList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaffForTx, setSelectedStaffForTx] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // View State: 'summary' or 'ledger'
  const [view, setView] = useState('summary');
  const [activeStaffLedger, setActiveStaffLedger] = useState(null);
  const [ledgerData, setLedgerData] = useState({ transactions: [], current_balance: 0 });

  // Filters for summary
  const [searchTerm, setSearchTerm] = useState("");

  // Filters for Ledger
  const [ledgerFilters, setLedgerFilters] = useState({
    startDate: "",
    endDate: "",
    projectId: "all",
    type: "all"
  });
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    fetchStaffSummary();
  }, [ledgerType]);

  const fetchStaffSummary = async () => {
    setLoading(true);
    try {
      const [staffRes, projectsRes, txRes] = await Promise.all([
        axios.get(`${API}/staff`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/staff-transactions?ledger_type=${ledgerType}`)
      ]);
      
      const staff = staffRes.data;
      const txs = txRes.data;
      
      const filteredStaff = staffTypeFilter === "all" ? staff : staff.filter(s => s.staff_type === staffTypeFilter);
      const staffWithBalance = filteredStaff.map(s => {
        const staffTxs = txs.filter(t => t.staff_id === s.id);
        const balance = staffTxs.reduce((acc, t) => {
          if (t.transaction_type === 'Advance' || t.transaction_type === 'Salary' || t.transaction_type === 'Profit Share') return acc + t.amount;
          if (t.transaction_type === 'Expense' || t.transaction_type === 'Settlement') return acc - t.amount;
          return acc;
        }, 0);
        return { ...s, balance };
      });

      setStaffList(staffWithBalance);
      setProjects(projectsRes.data);
    } catch (err) {
      toast.error("Failed to fetch staff data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (staff) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/staff/${staff.id}/ledger?ledger_type=${ledgerType}`);
      setLedgerData(response.data);
      setActiveStaffLedger(staff);
      setView('ledger');
      setSelectedRows([]); // Clear selection when changing staff
    } catch (err) {
      toast.error("Failed to fetch ledger");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (txId) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await axios.delete(`${API}/staff-transactions/${txId}`);
        toast.success("Transaction deleted");
        fetchLedger(activeStaffLedger);
        onUpdate();
      } catch (err) {
        toast.error("Failed to delete transaction");
      }
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || "On Account / Office";

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.staff_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply Ledger Filters
  const filteredLedgerTransactions = ledgerData.transactions.filter(tx => {
    const matchesProject = ledgerFilters.projectId === "all" || tx.project_id === ledgerFilters.projectId;
    const matchesType = ledgerFilters.type === "all" || tx.transaction_type === ledgerFilters.type;
    let matchesDate = true;
    if (ledgerFilters.startDate) matchesDate = matchesDate && new Date(tx.transaction_date) >= new Date(ledgerFilters.startDate);
    if (ledgerFilters.endDate) matchesDate = matchesDate && new Date(tx.transaction_date) <= new Date(ledgerFilters.endDate);
    return matchesProject && matchesType && matchesDate;
  });

  const handleBackToSummary = () => {
    setView('summary');
    setActiveStaffLedger(null);
    fetchStaffSummary();
  };

  const toggleRowSelection = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredLedgerTransactions.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredLedgerTransactions.map(tx => tx.id));
    }
  };

  const handleExportPDF = (selectionOnly = false) => {
    const txToExport = selectionOnly 
      ? filteredLedgerTransactions.filter(tx => selectedRows.includes(tx.id))
      : filteredLedgerTransactions;
    
    const enrichedTx = txToExport.map(tx => ({
      ...tx,
      project_name: tx.project_id ? getProjectName(tx.project_id) : "On Account / Office"
    }));

    generateStaffLedgerPDF(activeStaffLedger, ledgerData, enrichedTx);
    toast.success(selectionOnly ? "Selected transactions exported" : "Full ledger exported");
  };

  if (view === 'ledger' && activeStaffLedger) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <button onClick={handleBackToSummary} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-slate-900" />
                {staffTypeFilter === 'Partner' ? 'Partner Advances' : (ledgerType === 'CASH' ? 'Cash Note' : 'Bank Note')}: {activeStaffLedger.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Account summary ({ledgerType}) for {activeStaffLedger.staff_type}
              </p>
            </div>
            <button
              onClick={() => fetchLedger(activeStaffLedger)}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Ledger"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-semibold">Remaining Balance</p>
              <p className={`text-2xl font-bold ${ledgerData.current_balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(ledgerData.current_balance))}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">
                {ledgerData.current_balance > 0 ? "Staff owes company" : "Company owes staff"}
              </p>
            </div>
            {selectedRows.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/20 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-900">
                {selectedRows.length} items selected
                <button onClick={() => setSelectedRows([])} className="p-1 hover:bg-slate-100 rounded"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>

        {/* Ledger Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Filter className="w-4 h-4" /> Filters:
            </div>
            <select 
              value={ledgerFilters.projectId} 
              onChange={(e) => setLedgerFilters({...ledgerFilters, projectId: e.target.value})}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-700"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select 
              value={ledgerFilters.type} 
              onChange={(e) => setLedgerFilters({...ledgerFilters, type: e.target.value})}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-700"
            >
              <option value="all">All Types</option>
              <option value="Advance">Advances</option>
              <option value="Expense">Expenses</option>
              <option value="Settlement">Returns</option>
            </select>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                value={ledgerFilters.startDate} 
                onChange={(e) => setLedgerFilters({...ledgerFilters, startDate: e.target.value})}
                className="bg-transparent border-none text-sm py-2 focus:ring-0"
              />
              <span className="text-gray-300">|</span>
              <input 
                type="date" 
                value={ledgerFilters.endDate} 
                onChange={(e) => setLedgerFilters({...ledgerFilters, endDate: e.target.value})}
                className="bg-transparent border-none text-sm py-2 focus:ring-0"
              />
            </div>
            {(ledgerFilters.projectId !== "all" || ledgerFilters.type !== "all" || ledgerFilters.startDate || ledgerFilters.endDate) && (
               <button 
                onClick={() => setLedgerFilters({ startDate: "", endDate: "", projectId: "all", type: "all" })}
                className="text-xs text-red-600 hover:underline font-medium"
               >
                 Clear Filters
               </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-slate-900 focus:ring-slate-700"
                      checked={selectedRows.length > 0 && selectedRows.length === filteredLedgerTransactions.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description / Project</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amt Paid On Account</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amt Spent (Exp)</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Running Balance</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredLedgerTransactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedRows.includes(tx.id) ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''}`}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-slate-900 focus:ring-slate-700"
                        checked={selectedRows.includes(tx.id)}
                        onChange={() => toggleRowSelection(tx.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(tx.transaction_date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tx.transaction_type === 'Settlement' ? 'Money Returned' : tx.transaction_type}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {tx.project_id ? getProjectName(tx.project_id) : "On Account / Office"}
                      </div>
                      {tx.description && (
                         <div className="text-xs italic text-gray-400 mt-1">{tx.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-orange-600 font-medium">
                      {tx.received > 0 ? formatCurrency(tx.received) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                      {tx.spent > 0 ? formatCurrency(tx.spent) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white bg-gray-50/10 dark:bg-gray-800/10">
                      {formatCurrency(tx.balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                       <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => { setEditingTransaction(tx); setIsModalOpen(true); }}
                            className="p-1.5 text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded-md transition-colors"
                          >
                             <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
                {filteredLedgerTransactions.length === 0 && (
                   <tr>
                     <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                       No transactions match your filters.
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center">
           <div className="flex gap-2">
              <button 
                onClick={() => handleExportPDF(false)}
                className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-red-600 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                <FileText className="w-4 h-4" /> Full Ledger PDF
              </button>
              <button 
                onClick={() => handleExportPDF(true)}
                disabled={selectedRows.length === 0}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" /> Export Selected
              </button>
           </div>
           <button 
            onClick={() => { setSelectedStaffForTx(activeStaffLedger); setEditingTransaction(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-950 shadow-lg shadow-slate-700/20 transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            New Transaction
          </button>
        </div>

        {isModalOpen && (activeStaffLedger || selectedStaffForTx) && (
          <StaffTransactionModal
            staff={activeStaffLedger || selectedStaffForTx}
            projects={projects}
            transaction={editingTransaction}
            excludeSalary={true}
            ledgerType={ledgerType}
            onClose={() => {
              setIsModalOpen(false);
              setEditingTransaction(null);
              fetchLedger(activeStaffLedger);
              onUpdate();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {canGoBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HandCoins className="w-6 h-6 text-slate-900" />
              {staffTypeFilter === 'Partner' ? 'Partner Advances' : (ledgerType === 'CASH' ? 'Cash Note' : 'Bank Note')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track {ledgerType.toLowerCase()} advances paid and expenses booked
            </p>
          </div>
        </div>
        <button
          onClick={fetchStaffSummary}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh Summary"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-700"
                  />
               </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
               {filteredStaff.map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => fetchLedger(staff)}
                    className={`w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-colors text-left ${activeStaffLedger?.id === staff.id ? 'bg-slate-50 dark:bg-slate-900/20 border-l-4 border-slate-900' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${staff.balance > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                          <User className={`w-5 h-5 ${staff.balance > 0 ? 'text-orange-600' : 'text-green-600'}`} />
                       </div>
                       <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{staff.name}</p>
                          <p className="text-xs text-gray-500">{staff.staff_type}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-bold ${staff.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(Math.abs(staff.balance))}
                       </p>
                       <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {staff.balance > 0 ? "Owed to Co" : "Cr"}
                       </p>
                    </div>
                  </button>
               ))}
            </div>
         </div>

         <div className="md:col-span-2">
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-8 text-center">
               <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900/30 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-slate-900" />
               </div>
               <h3 className="text-xl font-bold text-gray-900 dark:text-white">Staff Selection</h3>
               <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-sm">
                  Choose a staff member from the left list to manage their project payments and expenses with full filtering and selection options.
               </p>
            </div>
         </div>
      </div>

      {isModalOpen && (selectedStaffForTx || activeStaffLedger) && (
        <StaffTransactionModal
          staff={selectedStaffForTx || activeStaffLedger}
          projects={projects}
          transaction={editingTransaction}
          excludeSalary={true}
          ledgerType={ledgerType}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
            fetchStaffSummary();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default StaffTransactions;
