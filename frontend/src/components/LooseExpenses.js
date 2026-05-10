import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ArrowLeft, Search, X, Calendar, Filter, FileSpreadsheet, RefreshCcw, FileText, Briefcase } from "lucide-react";
import LooseExpenseModal from "./LooseExpenseModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LooseExpenses = ({ onUpdate, onBack, canGoBack }) => {
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, projRes] = await Promise.all([
        axios.get(`${API}/loose-expenses`),
        axios.get(`${API}/projects`)
      ]);
      setExpenses(expRes.data);
      setProjects(projRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await axios.delete(`${API}/loose-expenses/${id}`);
      toast.success("Expense deleted");
      fetchData();
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    fetchData();
    onUpdate();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const categories = ["Material", "Labor", "Transportation", "Consultation", "Miscellaneous"];

  const filteredExpenses = expenses.filter(e => {
    const project = projects.find(p => p.id === e.project_id);
    const projectName = project ? project.name.toLowerCase() : "";
    
    const matchesSearch = e.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      projectName.includes(searchTerm.toLowerCase());
    
    const matchesProject = filterProject === "all" || e.project_id === filterProject;
    const matchesCategory = filterCategory === "all" || e.category === filterCategory;

    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && new Date(e.date) >= new Date(startDate);
    if (endDate) matchesDate = matchesDate && new Date(e.date) <= new Date(endDate);

    return matchesSearch && matchesProject && matchesCategory && matchesDate;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setFilterProject("all");
    setFilterCategory("all");
    setStartDate("");
    setEndDate("");
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loose Agency Expenses</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">One-time or misc project expenses • Total: {formatCurrency(totalAmount)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 flex items-center space-x-2 shadow-lg shadow-slate-700/20">
            <Plus className="w-4 h-4" /><span>Add Loose Expense</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor, project or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700"
            />
          </div>
          
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
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

          {(searchTerm || filterProject !== "all" || filterCategory !== "all" || startDate || endDate) && (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor / Particulars</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Added By</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredExpenses.map((expense) => {
                const project = projects.find(p => p.id === expense.project_id);
                return (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(expense.date)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{expense.vendor_name}</div>
                      {expense.description && <div className="text-xs text-gray-500 dark:text-gray-400">{expense.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                        <div className="flex items-center space-x-1 text-gray-700 dark:text-gray-300">
                            <Briefcase className="w-3 h-3 text-slate-700" />
                            <span>{project?.name || "Deleted Project"}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full">{expense.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 uppercase font-bold text-[10px]">
                      {expense.added_by || "System"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }} className="text-slate-900 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 mr-3"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(expense.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {expenses.length === 0 ? "No loose vendor expenses yet" : "No expenses match your filters"}
          </p>
          <button onClick={() => setIsModalOpen(true)} className="text-slate-900 hover:text-slate-950 font-medium">Add first loose expense</button>
        </div>
      )}

      {isModalOpen && <LooseExpenseModal expense={editingExpense} onClose={handleModalClose} projects={projects} />}
    </div>
  );
};

export default LooseExpenses;
