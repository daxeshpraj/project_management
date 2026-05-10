import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoanModal = ({ loan, onClose }) => {
  const [formData, setFormData] = useState({
    person_name: "",
    loan_type: "HELP",
    amount: "",
    given_date: new Date().toISOString().split("T")[0],
    purpose: "",
    contact_number: "",
    address: "",
    status: "PAID",
    expected_return_date: "",
    payment_mode: "CASH",
    notes: "",
  });

  useEffect(() => {
    if (loan) {
      setFormData({
        person_name: loan.person_name,
        loan_type: loan.loan_type,
        amount: loan.amount.toString(),
        given_date: new Date(loan.given_date).toISOString().split("T")[0],
        purpose: loan.purpose || "",
        contact_number: loan.contact_number || "",
        address: loan.address || "",
        status: loan.status,
        expected_return_date: loan.expected_return_date ? new Date(loan.expected_return_date).toISOString().split("T")[0] : "",
        payment_mode: loan.payment_mode,
        notes: loan.notes || "",
      });
    }
  }, [loan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        given_date: new Date(formData.given_date).toISOString(),
        expected_return_date: formData.expected_return_date ? new Date(formData.expected_return_date).toISOString() : null,
      };
      if (loan) {
        await axios.put(`${API}/personal-loans/${loan.id}`, payload);
        toast.success("Entry updated");
      } else {
        await axios.post(`${API}/personal-loans`, payload);
        toast.success("Entry created");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{loan ? "Edit Entry" : "New Ledger Entry"}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Person Name *</label>
            <input type="text" required placeholder="Who are you giving money to?" value={formData.person_name} onChange={(e) => setFormData({ ...formData, person_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Entry Type</label>
              <input type="text" disabled value="HELP" className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status *</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="PAID">Paid</option>
                <option value="RETURNED">Returned</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount Given (₹) *</label>
              <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Given *</label>
              <input type="date" required value={formData.given_date} onChange={(e) => setFormData({ ...formData, given_date: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payment Mode *</label>
              <select value={formData.payment_mode} onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expected Return Date</label>
              <input type="date" value={formData.expected_return_date} onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Purpose / Reason</label>
            <input type="text" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="e.g., Emergency, Medical, Business" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Number</label>
              <input type="text" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Additional Notes</label>
            <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950 font-medium">
              {loan ? "Update Ledger" : "Book Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanModal;
