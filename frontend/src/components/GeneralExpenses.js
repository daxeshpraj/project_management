import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ArrowLeft, Search, X, Calendar, Filter, FileSpreadsheet, RefreshCcw, FileText } from "lucide-react";
import GeneralExpenseModal from "./GeneralExpenseModal";
import ImportModal from "./ImportModal";
import { generateGeneralExpensesPDF } from "../utils/pdfGenerator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GeneralExpenses = ({ onUpdate, onBack, canGoBack }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/general-expenses`);
      setExpenses(response.data);
    } catch (error) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await axios.delete(`${API}/general-expenses/${id}`);
      toast.success("Expense deleted");
      fetchExpenses();
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    fetchExpenses();
    onUpdate();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const categories = ["Office Supplies", "Software & Tools", "Marketing & Advertising", "Utilities", "Client Meetings", "Transportation", "Miscellaneous"];

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === "all" || e.category === filterCategory;
    const matchesMode = filterMode === "all" || e.payment_mode === filterMode;

    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && new Date(e.date) >= new Date(startDate);
    if (endDate) matchesDate = matchesDate && new Date(e.date) <= new Date(endDate);

    return matchesSearch && matchesCategory && matchesMode && matchesDate;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategory("all");
    setFilterMode("all");
    setStartDate("");
    setEndDate("");
  };

  const paymentModes = [...new Set(expenses.map(e => e.payment_mode))].filter(Boolean);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6" data-testid="general-expenses-page">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Office Expenses</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{filteredExpenses.length} expenses • Total: {formatCurrency(totalAmount)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchExpenses}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /><span>Import</span>
          </button>
          <button
            onClick={() => generateGeneralExpensesPDF(filteredExpenses, totalAmount)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-red-600 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 shadow-sm"
          >
            <FileText className="w-4 h-4" /><span>PDF</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 flex items-center space-x-2 shadow-lg shadow-slate-700/20" data-testid="add-general-expense-btn">
            <Plus className="w-4 h-4" /><span>Add Expense</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expense title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="all">All Payment Modes</option>
            {paymentModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
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

          {(searchTerm || filterCategory !== "all" || filterMode !== "all" || startDate || endDate) && (
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
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>
      ) : filteredExpenses.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mode</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Added By</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(expense.date)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">{expense.title}</div>
                    {expense.description && <div className="text-xs text-gray-500 dark:text-gray-400">{expense.description}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300 rounded-full">{expense.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{expense.payment_mode}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400">
                      {expense.added_by || "System"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }} className="text-slate-900 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 mr-3"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(expense.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {expenses.length === 0 ? "No general expenses yet" : "No expenses match your filters"}
          </p>
          {expenses.length === 0 ? (
            <button onClick={() => setIsModalOpen(true)} className="text-slate-900 hover:text-slate-950 font-medium">Add first expense</button>
          ) : (
            <button onClick={clearFilters} className="text-slate-900 hover:text-slate-950 font-medium">Clear all filters</button>
          )}
        </div>
      )}

      {isModalOpen && <GeneralExpenseModal expense={editingExpense} onClose={handleModalClose} />}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entityType="expenses"
        onImportSuccess={fetchExpenses}
      />
    </div>
  );
};

export default GeneralExpenses;
