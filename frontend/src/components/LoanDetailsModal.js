import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Plus, Trash2, Calendar, CreditCard, CheckCircle2, History, ArrowDownCircle, Download } from "lucide-react";
import { generateLoanLedgerPDF } from "../utils/pdfGenerator";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoanDetailsModal = ({ loan, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddRepayment, setShowAddRepayment] = useState(false);
  const [repaymentData, setRepaymentData] = useState({
    amount: "",
    repayment_date: new Date().toISOString().split("T")[0],
    payment_mode: "CASH",
    type: "RETURNED", // "GIVEN" or "RETURNED"
    notes: "",
  });

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/personal-loans/${loan.id}/details`);
      setDetails(res.data);
    } catch (error) {
      toast.error("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    const newStatus = details.loan.status === 'PAID' ? 'RETURNED' : 'PAID';
    try {
      await axios.put(`${API}/personal-loans/${loan.id}`, {
        ...details.loan,
        status: newStatus
      });
      toast.success(`Status updated to ${newStatus}`);
      fetchDetails();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleAddRepayment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        loan_id: loan.id,
        amount: parseFloat(repaymentData.amount),
        repayment_date: new Date(repaymentData.repayment_date).toISOString(),
        payment_mode: repaymentData.payment_mode,
        type: repaymentData.type,
        notes: repaymentData.notes || null,
      };
      await axios.post(`${API}/loan-repayments`, payload);
      toast.success(repaymentData.type === 'GIVEN' ? "Payment recorded" : "Repayment recorded");
      setShowAddRepayment(false);
      setRepaymentData({
        amount: "",
        repayment_date: new Date().toISOString().split("T")[0],
        payment_mode: "CASH",
        type: "RETURNED",
        notes: "",
      });
      fetchDetails();
    } catch (error) {
      toast.error("Failed to record repayment");
    }
  };

  const handleDeleteRepayment = async (id) => {
    if (!window.confirm("Delete this repayment?")) return;
    try {
      await axios.delete(`${API}/loan-repayments/${id}`);
      toast.success("Repayment deleted");
      fetchDetails();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleDownloadPDF = () => {
    if (!details) return;
    generateLoanLedgerPDF(details.loan, details, getTimeline());
    toast.success("Ledger downloaded");
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const getTimeline = () => {
    if (!details) return [];
    const events = [
      {
        date: details.loan.given_date,
        type: 'GIVEN',
        title: 'Money Given',
        amount: details.loan.amount,
        mode: details.loan.payment_mode,
        icon: <ArrowDownCircle className="w-4 h-4 text-orange-600" />
      }
    ];

    details.repayments.forEach(r => {
      const isGiven = r.type === 'GIVEN';
      events.push({
        date: r.repayment_date,
        type: r.type,
        title: isGiven ? 'Money Given (Additional)' : 'Repayment Received',
        amount: r.amount,
        mode: r.payment_mode,
        notes: r.notes,
        id: r.id,
        icon: isGiven ? <ArrowDownCircle className="w-4 h-4 text-orange-600" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />
      });
    });

    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-bold">{loan.person_name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${loan.status === 'RETURNED' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {loan.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             <button
              onClick={handleStatusToggle}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                loan.status === 'PAID' 
                ? 'border-green-200 text-green-700 hover:bg-green-50' 
                : 'border-orange-200 text-orange-700 hover:bg-orange-50'
              }`}
            >
              Mark as {loan.status === 'PAID' ? 'Returned' : 'Paid'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600 border border-gray-200"
              title="Download Ledger PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
            </div>
          ) : details ? (
            <>
              {/* Left Column: Summary & Repayment Form */}
              <div className="md:col-span-1 space-y-6 border-r pr-6 border-gray-100">
                <div className="space-y-4">
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                    <p className="text-xs text-orange-600 uppercase font-bold tracking-wider">Total Given</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(details.total_given)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <p className="text-xs text-green-600 uppercase font-bold tracking-wider">Total Returned</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(details.total_repaid)}</p>
                  </div>
                  <div className={`rounded-lg p-4 border ${details.outstanding > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                    <p className="text-xs text-gray-600 uppercase font-bold tracking-wider">Balance Due</p>
                    <p className={`text-2xl font-bold ${details.outstanding > 0 ? "text-red-700" : "text-slate-950"}`}>
                      {formatCurrency(details.outstanding)}
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                   <button
                    onClick={() => setShowAddRepayment(!showAddRepayment)}
                    className="w-full bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-950 flex items-center justify-center space-x-2 font-medium transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Payment / Return</span>
                  </button>
                </div>

                {showAddRepayment && (
                  <form onSubmit={handleAddRepayment} className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200 mt-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Transaction Type</label>
                        <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                          <button
                            type="button"
                            onClick={() => setRepaymentData({ ...repaymentData, type: 'GIVEN' })}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${repaymentData.type === 'GIVEN' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            PAID (Giving)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRepaymentData({ ...repaymentData, type: 'RETURNED' })}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${repaymentData.type === 'RETURNED' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            RETURN (Receiving)
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₹)</label>
                        <input type="number" required step="0.01" value={repaymentData.amount} onChange={(e) => setRepaymentData({ ...repaymentData, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-700 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                        <input type="date" required value={repaymentData.repayment_date} onChange={(e) => setRepaymentData({ ...repaymentData, repayment_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-700 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mode</label>
                        <select value={repaymentData.payment_mode} onChange={(e) => setRepaymentData({ ...repaymentData, payment_mode: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-700 outline-none">
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="UPI">UPI</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                        <input type="text" placeholder="Optional notes..." value={repaymentData.notes} onChange={(e) => setRepaymentData({ ...repaymentData, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-700 outline-none" />
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-2">
                      <button type="button" onClick={() => setShowAddRepayment(false)} className="flex-1 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-white transition-colors">Cancel</button>
                      <button type="submit" className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-950 transition-colors">Save</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Middle & Right Columns: Timeline (Audit History) */}
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center space-x-2 text-gray-900 font-bold">
                  <History className="w-5 h-5 text-slate-900" />
                  <h3 className="text-lg">Audit History & Timeline</h3>
                </div>

                <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                  {getTimeline().map((event, index) => (
                    <div key={index} className="relative">
                      <div className="absolute -left-[25px] top-1 w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center z-10 shadow-sm">
                        {event.icon}
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{formatDate(event.date)}</p>
                            <h4 className="font-bold text-gray-900">{event.title}</h4>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${event.type === 'GIVEN' ? 'text-orange-600' : 'text-green-600'}`}>
                              {event.type === 'GIVEN' ? '-' : '+'}{formatCurrency(event.amount)}
                            </p>
                            <p className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full inline-block mt-1">{event.mode}</p>
                          </div>
                        </div>
                        {event.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">"{event.notes}"</p>
                        )}
                        {(event.type === 'REPAYMENT' || event.type === 'GIVEN' || event.type === 'RETURNED') && event.id && (
                          <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                            <button 
                              onClick={() => handleDeleteRepayment(event.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1"
                              title="Delete this record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {details.loan.status === 'RETURNED' && (
                    <div className="relative">
                      <div className="absolute -left-[25px] top-1 w-5 h-5 rounded-full bg-green-600 border-2 border-white flex items-center justify-center z-10 shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <h4 className="font-bold text-green-900">Entry Settled (RETURNED)</h4>
                        <p className="text-sm text-green-700 mt-1">This entry has been marked as fully returned and closed.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500 italic">Could not load details.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanDetailsModal;
