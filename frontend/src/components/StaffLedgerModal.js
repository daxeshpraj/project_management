import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Plus, Trash2, Download, RefreshCcw } from "lucide-react";
import StaffTransactionModal from "./StaffTransactionModal";
import { generateStaffSalaryReceiptPDF } from "../utils/pdfGenerator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StaffLedgerModal = ({ staff, onClose, salaryOnly = false }) => {
  const [ledger, setLedger] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const isPartner = staff.staff_type === "Partner";

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ledgerRes, txRes, projRes] = await Promise.all([
        axios.get(`${API}/staff/${staff.id}/ledger`),
        axios.get(`${API}/staff-transactions?staff_id=${staff.id}`),
        axios.get(`${API}/projects`),
      ]);
      setLedger(ledgerRes.data);
      setTransactions(txRes.data);
      setProjects(projRes.data);
    } catch (error) {
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTx = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await axios.delete(`${API}/staff-transactions/${id}`);
      toast.success("Transaction deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleTxClose = () => {
    setIsTxModalOpen(false);
    fetchData();
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const getTxColor = (type) => {
    switch (type) {
      case "Advance": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "Expense": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "Salary": return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300";
      case "Settlement": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Profit Share": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || "-";

  // Filter transactions
  let displayTx = isPartner ? transactions : transactions.filter(t => t.transaction_type !== "Profit Share");

  if (salaryOnly) {
    displayTx = displayTx.filter(t => t.transaction_type === "Salary");
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {staff.name} - {salaryOnly ? "Salary Ledger" : isPartner ? "Partner Ledger" : "Employee Ledger"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {staff.designation || staff.staff_type}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${isPartner ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
                }`}>{staff.staff_type}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Ledger"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-950 flex items-center space-x-1 text-sm"
            >
              <Plus className="w-4 h-4" /><span>Add Transaction</span>
            </button>
            <button onClick={onClose}><X className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
            </div>
          ) : ledger ? (
            <div className="space-y-6">
              {/* Summary Cards - Different for Employee vs Partner */}
              {isPartner ? (
                // PARTNER: Show all 5 cards including Profit Share
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Advance</p>
                    <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{formatCurrency(ledger.total_advance)}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Expense</p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">{formatCurrency(ledger.total_expense)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Settlement</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(ledger.total_settlement)}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Profit Share</p>
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{formatCurrency(ledger.total_profit_share)}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${ledger.current_balance >= 0 ? "bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800"
                      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    }`}>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Current Balance</p>
                    <p className={`text-lg font-bold ${ledger.current_balance >= 0 ? "text-slate-950 dark:text-slate-500" : "text-red-700 dark:text-red-400"}`}>
                      {formatCurrency(ledger.current_balance)}
                    </p>
                  </div>
                </div>
              ) : (
                // EMPLOYEE: Simplified view - Focus on Salary only
                <div className={`grid gap-4 ${salaryOnly ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
                  <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Monthly Salary</p>
                    <p className="text-xl font-bold text-slate-950 dark:text-slate-500">{formatCurrency(staff.monthly_salary)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Salary Paid</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(ledger.total_salary)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Payments Count</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {transactions.filter(t => t.transaction_type === "Salary").length}
                    </p>
                  </div>
                  {!salaryOnly && (
                    <div className={`rounded-lg p-4 border ${ledger.current_balance >= 0 ? "bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800"
                        : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                      }`}>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Current Adv/Exp Balance</p>
                      <p className={`text-xl font-bold ${ledger.current_balance >= 0 ? "text-slate-950 dark:text-slate-500" : "text-red-700 dark:text-red-400"}`}>
                        {formatCurrency(ledger.current_balance)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Transactions Table */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  {isPartner ? "Transaction History" : "Salary & Payment History"}
                </h3>
                {displayTx.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          {isPartner && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>}
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid By</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {displayTx.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{formatDate(tx.transaction_date)}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTxColor(tx.transaction_type)}`}>
                                {tx.transaction_type}
                                {tx.transaction_type === "Salary" && tx.is_advance && " (Advance)"}
                              </span>
                            </td>
                            {isPartner && <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{getProjectName(tx.project_id)}</td>}
                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-medium">{tx.paid_by || "-"}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{tx.description || "-"}</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(tx.amount)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end items-center space-x-2">
                                {tx.transaction_type === "Salary" && (
                                  <button
                                    onClick={() => generateStaffSalaryReceiptPDF(tx, staff)}
                                    className="text-slate-900 hover:text-slate-900 p-1 rounded-full hover:bg-slate-50 transition-colors"
                                    title="Download Receipt"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => handleDeleteTx(tx.id)} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500 dark:text-gray-400">No transactions yet</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {isTxModalOpen && (
          <StaffTransactionModal staff={staff} projects={projects} salaryOnly={salaryOnly} onClose={handleTxClose} />
        )}
      </div>
    </div>
  );
};

export default StaffLedgerModal;
