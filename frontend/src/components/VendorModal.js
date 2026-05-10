import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VendorModal = ({ vendor, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    vendor_type_id: "",
    contact_number: "",
    email: "",
    address: "",
    vendor_type: ""
  });
  const [vendorTypes, setVendorTypes] = useState([]);

  useEffect(() => {
    fetchVendorTypes();
  }, []);

  const fetchVendorTypes = async () => {
    try {
      const res = await axios.get(`${API}/masters/vendor-types`);
      setVendorTypes(res.data);
    } catch (err) {
      console.error("Failed to fetch vendor types");
    }
  };

  useEffect(() => {
    if (vendor) {
      setFormData({
        ...vendor,
        vendor_type_id: vendor.vendor_type_id || "",
        vendor_type: vendor.vendor_type || ""
      });
    }
  }, [vendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (vendor) {
        await axios.put(`${API}/vendors/${vendor.id}`, formData);
        toast.success("Vendor updated");
      } else {
        await axios.post(`${API}/vendors`, formData);
        toast.success("Vendor created");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save vendor");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{vendor ? "Edit Vendor" : "Add Vendor"}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Vendor Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Vendor Type *</label>
            <select
              value={formData.vendor_type_id}
              onChange={(e) => setFormData({ ...formData, vendor_type_id: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            >
              <option value="">Select Vendor Type</option>
              {vendorTypes.map(vt => (
                <option key={vt.id} value={vt.id}>{vt.name}</option>
              ))}
            </select></div>
          <div><label className="block text-sm font-medium mb-1">Contact Number</label>
            <input type="text" value={formData.contact_number} onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Address</label>
            <textarea rows="2" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border rounded-lg" /></div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950">{vendor ? "Update" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorModal;