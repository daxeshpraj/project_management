import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StaffTransactionModal = ({ staff, projects, onClose, transaction = null, salaryOnly = false, excludeSalary = false, ledgerType = "BANK" }) => {
  const isPartner = staff.staff_type === "Partner";
  const [formData, setFormData] = useState({
    transaction_type: transaction?.transaction_type || (salaryOnly ? "Salary" : (isPartner ? "Advance" : (excludeSalary ? "Advance" : "Salary"))),
    amount: transaction?.amount || "",
    transaction_date: transaction?.transaction_date ? new Date(transaction.transaction_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    project_id: transaction?.project_id || "",
    description: transaction?.description || "",
    is_advance: transaction?.is_advance || false,
    reference_number: transaction?.reference_number || "",
    paid_by: transaction?.paid_by || "",
    ledger_type: transaction?.ledger_type || ledgerType
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        staff_id: staff.id,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        transaction_date: new Date(formData.transaction_date).toISOString(),
        project_id: formData.project_id || null,
        description: formData.description || null,
        is_advance: formData.transaction_type === "Salary" ? formData.is_advance : false,
        reference_number: formData.reference_number || null,
        paid_by: formData.paid_by || null,
        ledger_type: formData.ledger_type
      };
      if (transaction) {
        await axios.put(`${API}/staff-transactions/${transaction.id}`, payload);
        toast.success("Transaction updated");
      } else {
        await axios.post(`${API}/staff-transactions`, payload);
        toast.success("Transaction recorded");
      }
      onClose();
    } catch (error) {
      toast.error(transaction ? "Failed to update transaction" : "Failed to record transaction");
    }
  };

  // Partner sees all transaction types; Employee sees simpler set
  // Filter available types
  let availableTypes = isPartner
    ? ["Advance", "Expense", "Salary", "Settlement"]
    : ["Salary", "Advance", "Expense", "Settlement"];

  if (salaryOnly) {
    availableTypes = ["Salary"];
  } else if (excludeSalary) {
    availableTypes = availableTypes.filter(t => t !== "Salary");
  }

  const typeDescriptions = {
    Advance: "Money given TO staff for project work",
    Expense: "Money staff spent on project (deducts from advance)",
    Salary: isPartner ? "Salary payment (not counted in profit)" : "Monthly salary payment",
    Settlement: "Staff returned remaining advance money",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Transaction</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {staff.name}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${isPartner ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
                }`}>{staff.staff_type}</span>
            </p>
          </div>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Transaction Type *</label>
            <select
              value={formData.transaction_type}
              onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              {availableTypes.map(t => <option key={t}>{t}</option>)}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{typeDescriptions[formData.transaction_type]}</p>
          </div>

          {formData.transaction_type === "Salary" && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_advance}
                  onChange={(e) => setFormData({ ...formData, is_advance: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Mark as Advance Salary Payment</span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
              <input
                type="number" required step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input
                type="date" required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          {(formData.transaction_type === "Advance" || formData.transaction_type === "Expense") && !isPartner && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {formData.transaction_type === "Expense" ? "Project * (Mandatory for Expense)" : "Related Project (Optional - On Account)"}
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required={formData.transaction_type === "Expense"}
              >
                <option value="">{formData.transaction_type === "Expense" ? "Select a Project..." : "No Project (On Account)"}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} - {p.client_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Paid By / Authorized By</label>
            <input
              type="text"
              value={formData.paid_by}
              onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Name of person who paid/authorized"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Invoice/Bill/Receipt number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Notes about this transaction..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950">
              {transaction ? "Update Transaction" : "Record Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffTransactionModal;
