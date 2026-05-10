import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, FileDown, ArrowLeft, X, Calendar, Filter, RefreshCcw } from "lucide-react";
import CustomerPaymentModal from "./CustomerPaymentModal";
import { generateCustomerReceiptPDF } from "../utils/pdfGenerator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerPayments = ({ onUpdate, onBack, canGoBack, company }) => {
  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  // Filter States
  const [filterProject, setFilterProject] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, projectsRes] = await Promise.all([
        axios.get(`${API}/customer-payments`),
        axios.get(`${API}/projects`)
      ]);
      setPayments(paymentsRes.data);
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
      await axios.delete(`${API}/customer-payments/${id}`);
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
  const getProject = (id) => projects.find(p => p.id === id);

  const filteredPayments = payments.filter(p => {
    const matchesProject = filterProject === "all" || p.project_id === filterProject;
    const matchesMode = filterMode === "all" || p.payment_mode === filterMode;

    let matchesDate = true;
    if (startDate) matchesDate = matchesDate && new Date(p.payment_date) >= new Date(startDate);
    if (endDate) matchesDate = matchesDate && new Date(p.payment_date) <= new Date(endDate);

    return matchesProject && matchesMode && matchesDate;
  });

  const clearFilters = () => {
    setFilterProject("all");
    setFilterMode("all");
    setStartDate("");
    setEndDate("");
  };

  const paymentModes = [...new Set(payments.map(p => p.payment_mode))].filter(Boolean);

  const totalReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate ledger summary by project
  const ledgerSummary = projects.map(project => {
    const projectPayments = payments.filter(p => p.project_id === project.id);
    const totalPaid = projectPayments.reduce((sum, p) => sum + p.amount, 0);
    const contract = project.contract_amount || 0;
    return {
      ...project,
      total_paid: totalPaid,
      outstanding: contract - totalPaid,
      payment_count: projectPayments.length
    };
  }).filter(p => p.contract_amount > 0 || p.payment_count > 0);

  return (
    <div className="space-y-6" data-testid="customer-payments-page">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Payments Received</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{filteredPayments.length} payments • Total Received: {formatCurrency(totalReceived)}</p>
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
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 flex items-center space-x-2" data-testid="add-customer-payment-btn">
            <Plus className="w-4 h-4" /><span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Ledger Summary by Project */}
      {ledgerSummary.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Project-wise Payment Ledger</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contract</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ledgerSummary.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.client_name}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">{formatCurrency(item.contract_amount || 0)}</td>
                    <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">{formatCurrency(item.total_paid)}</td>
                    <td className={`px-6 py-4 text-sm text-right font-semibold ${item.outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrency(item.outstanding)}</td>
                    <td className="px-6 py-4 text-center">
                      {item.outstanding <= 0 && item.contract_amount > 0 ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Paid</span>
                      ) : item.total_paid > 0 ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Partial</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Unpaid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name} - {p.client_name}</option>)}
            </select>
          </div>
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

          {(filterProject !== "all" || filterMode !== "all" || startDate || endDate) && (
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

      {/* Payment Records */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>
      ) : filteredPayments.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Records</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receipt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredPayments.map((payment) => {
                const project = getProject(payment.project_id);
                return (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(payment.payment_date)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">{project?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{project?.client_name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.payment_mode}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.receipt_number || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{payment.description || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button onClick={() => generateCustomerReceiptPDF(payment, project, company)} className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-3" title="Download Receipt"><FileDown className="w-4 h-4" /></button>
                      <button onClick={() => { setEditingPayment(payment); setIsModalOpen(true); }} className="text-slate-900 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 mr-3"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(payment.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
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
            {payments.length === 0 ? "No customer payments recorded" : "No payments match your filters"}
          </p>
          {payments.length === 0 ? (
            <button onClick={() => setIsModalOpen(true)} className="text-slate-900 hover:text-slate-950 font-medium">Record first payment</button>
          ) : (
            <button onClick={clearFilters} className="text-slate-900 hover:text-slate-950 font-medium">Clear all filters</button>
          )}
        </div>
      )}

      {isModalOpen && <CustomerPaymentModal payment={editingPayment} projects={projects} onClose={handleModalClose} />}
    </div>
  );
};

export default CustomerPayments;
