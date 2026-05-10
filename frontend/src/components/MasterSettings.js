import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Settings2, Briefcase, Users, AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MasterSettings = () => {
  const [activeTab, setActiveTab] = useState('vendor-types');
  const [vendorTypes, setVendorTypes] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'vendor-types') {
        const res = await axios.get(`${API}/masters/vendor-types`);
        setVendorTypes(res.data);
      } else {
        const res = await axios.get(`${API}/masters/designations`);
        setDesignations(res.data);
      }
    } catch (err) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    try {
      const endpoint = activeTab === 'vendor-types' ? 'vendor-types' : 'designations';
      await axios.post(`${API}/masters/${endpoint}`, { name: newTypeName.trim() });
      setNewTypeName('');
      toast.success("Added successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This might affect existing records.")) return;

    try {
      const endpoint = activeTab === 'vendor-types' ? 'vendor-types' : 'designations';
      await axios.delete(`${API}/masters/${endpoint}/${id}`);
      toast.success("Deleted successfully");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete. It may be in use.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-slate-900" />
            Master Settings
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage global types and categories used across the system
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('vendor-types')}
            className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'vendor-types'
                ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50/50 dark:bg-slate-900/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Vendor Types
          </button>
          <button
            onClick={() => setActiveTab('designations')}
            className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'designations'
                ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50/50 dark:bg-slate-900/10'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Staff Designations
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleAdd} className="flex gap-4 mb-8">
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder={`Enter new ${activeTab === 'vendor-types' ? 'vendor type' : 'designation'} name...`}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700 transition-all outline-none"
            />
            <button
              type="submit"
              disabled={!newTypeName.trim() || loading}
              className="bg-slate-900 hover:bg-slate-950 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          </form>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === 'vendor-types' ? vendorTypes : designations).map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-slate-700/50 transition-all"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.name}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(activeTab === 'vendor-types' ? vendorTypes : designations).length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No items found. Add one above.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-400">
          <p className="font-semibold mb-1">Important Note</p>
          <p>Existing records using deprecated categories will remain, but new records should use the types defined here.</p>
        </div>
      </div>
    </div>
  );
};

export default MasterSettings;
