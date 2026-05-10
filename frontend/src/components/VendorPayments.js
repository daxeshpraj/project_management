import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, FileDown, ArrowLeft, X, Calendar, Filter, RefreshCcw } from "lucide-react";
import VendorPaymentModal from "./VendorPaymentModal";
import { generateVendorVoucherPDF } from "../utils/pdfGenerator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VendorPayments = ({ onUpdate, onBack, canGoBack, company }) => {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  // Filter States
  const [filterProject, setFilterProject] = useState("all");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, vendorsRes, projectsRes] = await Promise.all([
        axios.get(`${API}/vendor-payments`),
        axios.get(`${API}/vendors`),
        axios.get(`${API}/projects`)
      ]);
      setPayments(paymentsRes.data);
      setVendors(vendorsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment?")) return;
    try {
      await axios.delete(`${API}/vendor-payments/${id}`);
      toast.success("Payment deleted");
      fetchData();
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
    fetchData();
    onUpdate();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: company?.currency || 'INR', maximumFractionDigits: 0 }).format(amount);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const getVendorName = (id) => vendors.find(v => v.id === id)?.name || 'Unknown';
  const getProjectName = (id) => projects.find(p => p.id === id)?.name || 'Unknown';

  const filteredPayments = payments.filter(p => {
    const matchesProject = filterProject === "all" || p.project_id === filterProject;
    const matchesVendor = filterVendor === "all" || p.vendor_id === filterVendor;
    const matchesMode = filterMode === "all" || p.payment_mode === filterMode;

    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && new Date(p.payment_date) >= new Date(startDate);
    if (endDate) matchesDate = matchesDate && new Date(p.payment_date) <= new Date(endDate);

    return matchesProject && matchesVendor && matchesMode && matchesDate;
  });

  const clearFilters = () => {
    setFilterProject("all");
    setFilterVendor("all");
    setFilterMode("all");
    setStartDate("");
    setEndDate("");
  };

  const paymentModes = [...new Set(payments.map(p => p.payment_mode))].filter(Boolean);

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6" data-testid="vendor-payments-page">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agency Payments Entry</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{filteredPayments.length} payments • Total: {formatCurrency(totalAmount)}</p>
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
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 flex items-center space-x-2" data-testid="add-vendor-payment-btn">
            <Plus className="w-4 h-4" /><span>Add Payment</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
              data-testid="filter-project"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white min-w-[150px]"
            data-testid="filter-vendor"
          >
            <option value="all">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white min-w-[150px]"
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
                placeholder="Start Date"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                placeholder="End Date"
              />
            </div>
          </div>

          {(filterProject !== "all" || filterVendor !== "all" || filterMode !== "all" || startDate || endDate) && (
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
      ) : filteredPayments.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(payment.payment_date)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{getVendorName(payment.vendor_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{getProjectName(payment.project_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.payment_mode}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.invoice_number || '-'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button onClick={() => { const v = vendors.find(v => v.id === payment.vendor_id); const p = projects.find(p => p.id === payment.project_id); if (v && p) generateVendorVoucherPDF(payment, v, p, company); }} className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-3" title="Download Voucher"><FileDown className="w-4 h-4" /></button>
                    <button onClick={() => { setEditingPayment(payment); setIsModalOpen(true); }} className="text-slate-900 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 mr-3"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(payment.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {payments.length === 0 ? "No vendor payments yet" : "No payments match your filters"}
          </p>
          {payments.length === 0 ? (
            <button onClick={() => setIsModalOpen(true)} className="text-slate-900 hover:text-slate-950 font-medium">Record first payment</button>
          ) : (
            <button onClick={clearFilters} className="text-slate-900 hover:text-slate-950 font-medium">Clear all filters</button>
          )}
        </div>
      )}

      {isModalOpen && <VendorPaymentModal payment={editingPayment} vendors={vendors} projects={projects} onClose={handleModalClose} />}
    </div>
  );
};

export default VendorPayments;
