import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Search, Calendar, Filter, Pencil, Trash2, ArrowLeft, ReceiptText, Wallet, User } from 'lucide-react';
import ServiceExpenseModal from './ServiceExpenseModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceExpenses = ({ onUpdate, onBack, canGoBack }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    category: "all"
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/service-expenses`);
      setExpenses(response.data);
    } catch (err) {
      toast.error("Failed to fetch service expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await axios.delete(`${API}/service-expenses/${id}`);
        toast.success("Expense deleted");
        fetchExpenses();
        onUpdate();
      } catch (err) {
        toast.error("Failed to delete expense");
      }
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.vendor_name && exp.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filters.category === "all" || exp.category === filters.category;
    
    let matchesDate = true;
    if (filters.startDate) matchesDate = matchesDate && new Date(exp.date) >= new Date(filters.startDate);
    if (filters.endDate) matchesDate = matchesDate && new Date(exp.date) <= new Date(filters.endDate);
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {canGoBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Turnkey Common Expenses</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Stand-alone services and old project costs • Total: {formatCurrency(totalAmount)}</p>
          </div>
        </div>
        <button
          onClick={() => { setSelectedExpense(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 shadow-lg shadow-slate-700/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          Log Service Expense
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search services, vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-700"
          >
            <option value="all">All Categories</option>
            <option value="Consultation">Consultation</option>
            <option value="Legal Fees">Legal Fees</option>
            <option value="AMC / Maintenance">AMC / Maintenance</option>
            <option value="Professional Services">Professional Services</option>
            <option value="Legacy Project Expense">Legacy Project Expense</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm py-2 px-3 focus:ring-2 focus:ring-slate-700"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm py-2 px-3 focus:ring-2 focus:ring-slate-700"
            />
          </div>
          {(searchTerm || filters.category !== "all" || filters.startDate || filters.endDate) && (
            <button 
              onClick={() => {
                setSearchTerm("");
                setFilters({ startDate: "", endDate: "", category: "all" });
              }}
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service / Particulars</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor / Provider</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Added By</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{exp.service_name}</div>
                    {exp.description && <div className="text-xs text-gray-500 italic mt-0.5 line-clamp-1">{exp.description}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-900/20 text-slate-900 rounded-full font-medium">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {exp.vendor_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 uppercase font-semibold">
                      {exp.payment_mode.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      <span>{exp.added_by}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setSelectedExpense(exp); setIsModalOpen(true); }} className="p-1.5 text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded-md transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <Wallet className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No turnkey expenses found</p>
                      <p className="text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ServiceExpenseModal
          expense={selectedExpense}
          onClose={() => { setIsModalOpen(false); setSelectedExpense(null); fetchExpenses(); onUpdate(); }}
        />
      )}
    </div>
  );
};

export default ServiceExpenses;
