import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerPaymentModal = ({ payment, projects, onClose }) => {
  const [formData, setFormData] = useState({
    project_id: "",
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: "BANK_TRANSFER",
    description: "",
    receipt_number: ""
  });

  useEffect(() => {
    if (payment) {
      setFormData({
        project_id: payment.project_id,
        amount: payment.amount.toString(),
        payment_date: new Date(payment.payment_date).toISOString().split('T')[0],
        payment_mode: payment.payment_mode,
        description: payment.description || "",
        receipt_number: payment.receipt_number || ""
      });
    }
  }, [payment]);

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
        payment_date: new Date(formData.payment_date).toISOString()
      };
      if (payment) {
        await axios.put(`${API}/customer-payments/${payment.id}`, payload);
        toast.success("Payment updated");
      } else {
        await axios.post(`${API}/customer-payments`, payload);
        toast.success("Payment recorded");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save payment");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{payment ? "Edit" : "Record"} Customer Payment</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project *</label>
            <select required value={formData.project_id} onChange={(e) => setFormData({ ...formData, project_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name} - {p.client_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
              <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date *</label>
              <input type="date" required value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payment Mode *</label>
              <select value={formData.payment_mode} onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Receipt Number</label>
              <input type="text" value={formData.receipt_number} onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description / Notes</label>
            <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="e.g., 30% advance payment, milestone payment..." />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950">{payment ? "Update" : "Record Payment"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerPaymentModal;
