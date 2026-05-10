import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceExpenseModal = ({ expense, onClose }) => {
  const [formData, setFormData] = useState({
    service_name: "",
    vendor_name: "",
    amount: "",
    category: "Consultation",
    date: new Date().toISOString().split('T')[0],
    description: "",
    payment_mode: "BANK_TRANSFER",
    added_by: ""
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        service_name: expense.service_name,
        vendor_name: expense.vendor_name || "",
        amount: expense.amount.toString(),
        category: expense.category,
        date: new Date(expense.date).toISOString().split('T')[0],
        description: expense.description || "",
        payment_mode: expense.payment_mode,
        added_by: expense.added_by || ""
      });
    }
  }, [expense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString()
      };
      if (expense) {
        await axios.put(`${API}/service-expenses/${expense.id}`, payload);
        toast.success("Expense updated");
      } else {
        await axios.post(`${API}/service-expenses`, payload);
        toast.success("Expense recorded");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save expense");
    }
  };

  const categories = ["Consultation", "Legal Fees", "AMC / Maintenance", "Subscription", "Professional Services", "Legacy Project Expense", "Miscellaneous"];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{expense ? "Edit" : "Record"} Turnkey Common Expense</h2>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Standalone Accounting Module</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Service / Particulars *</label>
            <input type="text" required value={formData.service_name} onChange={(e) => setFormData({...formData, service_name: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-700 outline-none" placeholder="e.g., Annual Legal Consultant Fee" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Vendor / Provider Name</label>
            <input type="text" value={formData.vendor_name} onChange={(e) => setFormData({...formData, vendor_name: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-700 outline-none" placeholder="e.g., Adv. Rajesh Kumar" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Amount (₹) *</label>
              <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-700 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date *</label>
              <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-700 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category *</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-700 outline-none">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Payment Mode *</label>
              <select value={formData.payment_mode} onChange={(e) => setFormData({...formData, payment_mode: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-700 outline-none">
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
            <textarea rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-700 outline-none" placeholder="Additional details or notes..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Added By (Name)</label>
            <input type="text" value={formData.added_by} onChange={(e) => setFormData({...formData, added_by: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-700 outline-none" placeholder="Enter name" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 border dark:border-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950 shadow-lg shadow-slate-700/20 transition-all font-semibold">{expense ? "Update Record" : "Save Expense"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceExpenseModal;
