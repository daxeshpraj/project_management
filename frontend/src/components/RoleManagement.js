import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  Settings2, 
  UserCheck, 
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  CreditCard,
  MessageSquare,
  AlertCircle,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API = `/api`;

const RoleManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const roles = [
    { id: 'ADMIN', name: 'Administrator', description: 'Full access to all modules and settings' },
    { id: 'STAFF', name: 'Staff Member', description: 'Access to projects, feed, and basic transactions' },
    { id: 'USER', name: 'General User', description: 'Limited view-only access to assigned projects' }
  ];

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'procurement', label: 'Procurement Feed', icon: MessageSquare },
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'staff', label: 'Staff Management', icon: UserCheck },
    { id: 'expenses', label: 'Expense Tracking', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'user-management', label: 'User Management', icon: Shield },
    { id: 'role-management', label: 'Role Management', icon: Shield },
    { id: 'master-settings', label: 'Master Settings', icon: Settings2 }
  ];

  const [permissions, setPermissions] = useState({
    ADMIN: modules.map(m => m.id),
    STAFF: [],
    USER: []
  });

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/permissions`);
      if (response.data.length > 0) {
        const newPerms = { ADMIN: modules.map(m => m.id), STAFF: [], USER: [] };
        response.data.forEach(p => {
          if (p.is_enabled) {
            newPerms[p.role].push(p.module_id);
          }
        });
        setPermissions(newPerms);
      }
    } catch (error) {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (roleId, moduleId) => {
    if (roleId === 'ADMIN') {
       toast.info("Administrator permissions are fixed");
       return;
    }
    
    setPermissions(prev => {
      const rolePerms = prev[roleId];
      if (rolePerms.includes(moduleId)) {
        return { ...prev, [roleId]: rolePerms.filter(id => id !== moduleId) };
      } else {
        return { ...prev, [roleId]: [...rolePerms, moduleId] };
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = [];
      Object.keys(permissions).forEach(role => {
        modules.forEach(m => {
          payload.push({
            role: role,
            module_id: m.id,
            is_enabled: permissions[role].includes(m.id)
          });
        });
      });
      await axios.post(`${API}/permissions/sync`, payload);
      toast.success("Permissions saved to database");
    } catch (error) {
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-slate-300" />
        <p className="mt-4 text-gray-500">Loading permission system...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-slate-700" />
            Role & Permission Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure module-level access for different user roles</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-950 text-white px-6 py-3 rounded-xl shadow-lg shadow-slate-700/20 transition-all active:scale-95 disabled:opacity-50 font-semibold"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white">{role.name}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                  role.id === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                  role.id === 'STAFF' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {role.id}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{role.description}</p>
            </div>
            
            <div className="p-4 flex-grow space-y-2">
              {modules.map(module => {
                const hasPermission = permissions[role.id].includes(module.id);
                const isLocked = role.id === 'ADMIN';
                
                return (
                  <button
                    key={module.id}
                    onClick={() => togglePermission(role.id, module.id)}
                    disabled={isLocked}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      hasPermission 
                        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700' 
                        : 'bg-transparent border-gray-100 dark:border-gray-800 opacity-60'
                    } ${!isLocked && 'hover:border-slate-400'}`}
                  >
                    <div className="flex items-center gap-3">
                      <module.icon className={`w-4 h-4 ${hasPermission ? 'text-slate-900 dark:text-slate-400' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${hasPermission ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                        {module.label}
                      </span>
                    </div>
                    {hasPermission ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-700" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-400">
          <p className="font-bold mb-1">Live Permission Sync</p>
          <p>Saving changes here will immediately update the accessible modules for all users in these roles. The sidebar will refresh upon their next page load or navigation.</p>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
