import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ArrowLeft, Search, Filter, X, FileSpreadsheet, RefreshCcw } from "lucide-react";
import VendorModal from "./VendorModal";
import ImportModal from "./ImportModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Vendors = ({ onUpdate, onBack, canGoBack }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/vendors`);
      setVendors(response.data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await axios.delete(`${API}/vendors/${id}`);
      toast.success("Vendor deleted successfully");
      fetchVendors();
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete vendor");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingVendor(null);
    fetchVendors();
    onUpdate();
  };

  const vendorTypes = [...new Set(vendors.map(v => v.vendor_type))].filter(Boolean);

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || v.vendor_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {canGoBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Agency</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchVendors}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)} 
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <FileSpreadsheet className="w-4 h-4" /><span>Import Excel</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 flex items-center space-x-2">
            <Plus className="w-4 h-4" /><span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-slate-700 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700"
              >
                <option value="all">All Vendor Types</option>
                {vendorTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            {(searchTerm || typeFilter !== "all") && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>
      ) : filteredVendors.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{vendor.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{vendor.vendor_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{vendor.contact_number || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{vendor.email || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button onClick={() => { setEditingVendor(vendor); setIsModalOpen(true); }} className="text-slate-900 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 mr-3"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(vendor.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {vendors.length === 0 ? "No vendors yet" : "No vendors match your filters"}
          </p>
          {vendors.length === 0 ? (
            <button onClick={() => setIsModalOpen(true)} className="text-slate-900 hover:text-slate-950 font-medium">Add your first vendor</button>
          ) : (
            <button onClick={clearFilters} className="text-slate-900 hover:text-slate-950 font-medium">Clear all filters</button>
          )}
        </div>
      )}
      {isModalOpen && <VendorModal vendor={editingVendor} onClose={handleModalClose} />}
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        entityType="vendors" 
        onImportSuccess={fetchVendors} 
      />
    </div>
  );
};

export default Vendors;