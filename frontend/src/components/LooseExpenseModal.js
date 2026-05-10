import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LooseExpenseModal = ({ expense, onClose, projects = [] }) => {
  const [formData, setFormData] = useState({
    project_id: "",
    vendor_name: "",
    amount: "",
    category: "Material",
    date: new Date().toISOString().split('T')[0],
    description: "",
    payment_mode: "CASH",
    added_by: ""
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        project_id: expense.project_id,
        vendor_name: expense.vendor_name,
        amount: expense.amount.toString(),
        category: expense.category,
        date: new Date(expense.date).toISOString().split('T')[0],
        description: expense.description || "",
        payment_mode: expense.payment_mode,
        added_by: expense.added_by || ""
      });
    } else if (projects.length > 0) {
        setFormData(prev => ({...prev, project_id: projects[0].id}));
    }
  }, [expense, projects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) {
        toast.error("Please select a project");
        return;
    }
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString()
      };
      if (expense) {
        await axios.put(`${API}/loose-expenses/${expense.id}`, payload);
        toast.success("Expense updated");
      } else {
        await axios.post(`${API}/loose-expenses`, payload);
        toast.success("Expense added");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save expense");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{expense ? "Edit" : "Add"} Loose Agency Expense</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Project *</label>
            <select 
                required 
                value={formData.project_id} 
                onChange={(e) => setFormData({...formData, project_id: e.target.value})} 
                className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg"
            >
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Vendor Name / Particulars *</label>
            <input type="text" required value={formData.vendor_name} onChange={(e) => setFormData({...formData, vendor_name: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" placeholder="e.g., Local Hardware Shop" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Amount (₹) *</label>
              <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date *</label>
              <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category *</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                <option>Material</option>
                <option>Labor</option>
                <option>Transportation</option>
                <option>Consultation</option>
                <option>Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Payment Mode *</label>
              <select value={formData.payment_mode} onChange={(e) => setFormData({...formData, payment_mode: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg">
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
            <textarea rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Added By (Name)</label>
            <input type="text" value={formData.added_by} onChange={(e) => setFormData({...formData, added_by: e.target.value})} className="w-full px-4 py-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg" placeholder="Enter name" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border dark:border-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950">{expense ? "Update" : "Add Loose Expense"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LooseExpenseModal;
