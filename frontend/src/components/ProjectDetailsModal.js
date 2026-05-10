import { useState, useEffect } from "react";
import axios from "axios";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectDetailsModal = ({ project, onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [a, s] = await Promise.all([
        axios.get(`${API}/analytics/project/${project.id}`),
        axios.get(`${API}/staff`),
      ]);
      setAnalytics(a.data);
      setStaffList(s.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStaffName = (id) => staffList.find((s) => s.id === id)?.name || "Unknown";

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">{project.name}</h2>
            <p className="text-sm text-gray-600">{project.client_name}</p>
          </div>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Contract Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.contract_amount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Received</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.total_received)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(analytics.outstanding_balance)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Vendor Payments</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.total_vendor_paid)}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Project Profit</p>
                <p className={`text-3xl font-bold ${analytics.profit >= 0 ? "text-slate-900" : "text-red-600"}`}>
                  {formatCurrency(analytics.profit)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;
