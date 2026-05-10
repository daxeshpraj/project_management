import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GeneralExpenseModal = ({ expense, onClose }) => {
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "Office Supplies",
    date: new Date().toISOString().split('T')[0],
    description: "",
    payment_mode: "CASH",
    added_by: ""
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title,
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
        await axios.put(`${API}/general-expenses/${expense.id}`, payload);
        toast.success("Expense updated");
      } else {
        await axios.post(`${API}/general-expenses`, payload);
        toast.success("Expense added");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save expense");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{expense ? "Edit" : "Add"} Office Expense</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="e.g., Office Stationery" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
              <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                <option>Office Supplies</option>
                <option>Software & Tools</option>
                <option>Marketing & Advertising</option>
                <option>Utilities</option>
                <option>Client Meetings</option>
                <option>Transportation</option>
                <option>Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Mode *</label>
              <select value={formData.payment_mode} onChange={(e) => setFormData({...formData, payment_mode: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Added By (Name)</label>
            <input type="text" value={formData.added_by} onChange={(e) => setFormData({...formData, added_by: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="Enter name" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950">{expense ? "Update" : "Add Office Expense"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GeneralExpenseModal;
