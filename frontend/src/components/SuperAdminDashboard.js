import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Search, 
  Lock, 
  Unlock, 
  TrendingUp, 
  Globe,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    total_companies: 0,
    total_users: 0,
    revenue_estimate: 0
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch Stats
    try {
      const statsRes = await axios.get('/api/super/stats');
      setStats(statsRes.data);
    } catch (error) {
      console.error("Stats fetch error:", error);
      toast.error("Failed to fetch platform stats");
    }

    // Fetch Companies
    try {
      const companiesRes = await axios.get('/api/super/companies');
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error("Companies fetch error:", error);
      toast.error("Failed to fetch registered companies");
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async (company) => {
    try {
      const newStatus = !company.is_active;
      await axios.patch(`/api/super/companies/${company.id}`, { is_active: newStatus });
      toast.success(`Company ${newStatus ? 'Unlocked' : 'Locked'} successfully`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update company status");
    }
  };

  const updatePlan = async (companyId, newPlan) => {
    try {
      await axios.patch(`/api/super/companies/${companyId}`, { plan_type: newPlan });
      toast.success(`Plan updated to ${newPlan}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update plan");
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">Loading platform stats...</div>;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-slate-900 dark:text-slate-400" />
          Global Platform Admin
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Manage tenants, subscriptions, and platform growth.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Companies</p>
              <h3 className="text-2xl font-bold">{stats.total_companies}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Platform Users</p>
              <h3 className="text-2xl font-bold">{stats.total_users}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimated MRR</p>
              <h3 className="text-2xl font-bold">₹{stats.revenue_estimate.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Company Management */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Registered Companies</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or subdomain..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 w-full md:w-64 outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-sm uppercase">
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Subdomain</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Created</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white">{company.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono text-sm">
                      <Globe className="w-3 h-3" />
                      {company.subdomain}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={company.plan_type}
                      onChange={(e) => updatePlan(company.id, e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-bold uppercase"
                    >
                      <option value="FREE">Free</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      company.is_active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {company.is_active ? 'Active' : 'Locked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleCompanyStatus(company)}
                      className={`p-2 rounded-lg transition-colors ${
                        company.is_active 
                          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                          : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title={company.is_active ? "Lock Company" : "Unlock Company"}
                    >
                      {company.is_active ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
