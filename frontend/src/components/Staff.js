import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import StaffModal from "./StaffModal";
import StaffLedgerModal from "./StaffLedgerModal";
import ImportModal from "./ImportModal";
import { Plus, Edit2, Trash2, Eye, UserCheck, UserCog, ArrowLeft, Search, X, Filter, FileSpreadsheet, RefreshCcw } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Staff = ({ onUpdate, onBack, canGoBack, staffTypeFilter = "all" }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/staff`);
      setStaffList(res.data);
    } catch (error) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff member? This will also delete their transaction history and profit shares.")) return;
    try {
      await axios.delete(`${API}/staff/${id}`);
      toast.success("Staff deleted");
      fetchStaff();
      onUpdate();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    fetchStaff();
    onUpdate();
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);

  // Filter logic
  const filtered = staffList.filter(s => {
    const matchesType = staffTypeFilter === "all" || s.staff_type === staffTypeFilter;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.designation && s.designation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = activeStatusFilter === "all" ||
      (activeStatusFilter === "active" && s.is_active) ||
      (activeStatusFilter === "inactive" && !s.is_active);
    return matchesType && matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setActiveStatusFilter("all");
  };

  const pageTitle = staffTypeFilter === "Employee"
    ? "Employee Salary"
    : staffTypeFilter === "Partner"
      ? "Partner Advances"
      : "Staff & Partners";

  const pageDescription = staffTypeFilter === "Employee"
    ? "Regular staff members with monthly salary"
    : staffTypeFilter === "Partner"
      ? "Partners and family members with profit sharing"
      : "All staff members";

  return (
    <div className="space-y-6" data-testid="staff-page">
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filtered.length} {pageTitle.toLowerCase()} • {pageDescription}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchStaff}
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 flex items-center space-x-2"
            data-testid="add-staff-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add {staffTypeFilter === "Partner" ? "Partner" : staffTypeFilter === "Employee" ? "Employee" : "Staff"}</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff name or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={activeStatusFilter}
              onChange={(e) => setActiveStatusFilter(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700 min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          {(searchTerm || activeStatusFilter !== "all") && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 ml-auto"
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((staff) => (
            <div key={staff.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${staff.staff_type === "Partner" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-slate-100 dark:bg-slate-900/30"
                    }`}>
                    {staff.staff_type === "Partner" ? (
                      <UserCog className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <UserCheck className="w-5 h-5 text-slate-900 dark:text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{staff.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{staff.designation || "-"}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${staff.staff_type === "Partner" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300"
                  }`}>
                  {staff.staff_type}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {staff.contact_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Contact:</span>
                    <span className="text-gray-900 dark:text-white">{staff.contact_number}</span>
                  </div>
                )}
                {staff.monthly_salary && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Salary:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(staff.monthly_salary)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`font-medium ${staff.is_active ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
                    {staff.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setSelectedStaff(staff)}
                  className="text-slate-900 hover:text-slate-950 dark:text-slate-500 text-sm font-medium flex items-center"
                  data-testid={`view-ledger-${staff.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Ledger
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingStaff(staff);
                      setIsModalOpen(true);
                    }}
                    className="text-gray-600 dark:text-gray-400 hover:text-slate-900 p-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(staff.id)}
                    className="text-gray-600 dark:text-gray-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {staffList.length === 0 ? `No ${pageTitle.toLowerCase()} yet` : "No staff match your filters"}
          </p>
          {staffList.length === 0 ? (
            <button onClick={() => setIsModalOpen(true)} className="text-slate-900 hover:text-slate-950 dark:text-slate-500 font-medium">
              Add first {staffTypeFilter === "Partner" ? "partner" : "employee"}
            </button>
          ) : (
            <button onClick={clearFilters} className="text-slate-900 hover:text-slate-950 dark:text-slate-500 font-medium">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {isModalOpen && (
        <StaffModal
          staff={editingStaff}
          defaultType={staffTypeFilter !== "all" ? staffTypeFilter : null}
          onClose={handleModalClose}
        />
      )}
      {selectedStaff && (
        <StaffLedgerModal
          staff={selectedStaff}
          salaryOnly={staffTypeFilter === "Employee"}
          excludeSalary={staffTypeFilter !== "Employee"}
          onClose={() => {
            setSelectedStaff(null);
            onUpdate();
          }}
        />
      )}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entityType="staff"
        onImportSuccess={fetchStaff}
      />
    </div>
  );
};

export default Staff;
