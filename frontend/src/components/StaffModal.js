import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StaffModal = ({ staff, defaultType, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    staff_type: defaultType || "Employee",
    designation: "",
    contact_number: "",
    email: "",
    address: "",
    monthly_salary: "",
    join_date: new Date().toISOString().split("T")[0],
    is_active: true,
    designation_id: "",
  });
  const [designations, setDesignations] = useState([]);

  useEffect(() => {
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    try {
      const res = await axios.get(`${API}/masters/designations`);
      setDesignations(res.data);
    } catch (err) {
      console.error("Failed to fetch designations");
    }
  };

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        staff_type: staff.staff_type,
        contact_number: staff.contact_number || "",
        email: staff.email || "",
        address: staff.address || "",
        monthly_salary: staff.monthly_salary ? staff.monthly_salary.toString() : "",
        join_date: new Date(staff.join_date).toISOString().split("T")[0],
        is_active: staff.is_active,
        designation_id: staff.designation_id || "",
        designation: staff.designation || "",
      });
    }
  }, [staff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        monthly_salary: formData.monthly_salary ? parseFloat(formData.monthly_salary) : null,
        join_date: new Date(formData.join_date).toISOString(),
      };
      if (staff) {
        await axios.put(`${API}/staff/${staff.id}`, payload);
        toast.success("Staff updated");
      } else {
        await axios.post(`${API}/staff`, payload);
        toast.success("Staff added");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save staff");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{staff ? "Edit Staff" : "Add Staff / Partner"}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select value={formData.staff_type} onChange={(e) => setFormData({ ...formData, staff_type: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option>Employee</option>
                <option>Partner</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Designation</label>
              <select 
                value={formData.designation_id} 
                onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })} 
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Select Designation</option>
                {designations.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Salary (₹)</label>
              <input type="number" step="0.01" value={formData.monthly_salary} onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Number</label>
              <input type="text" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea rows="2" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Join Date *</label>
              <input type="date" required value={formData.join_date} onChange={(e) => setFormData({ ...formData, join_date: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2 mt-5">
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950">{staff ? "Update" : "Add Staff"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffModal;
