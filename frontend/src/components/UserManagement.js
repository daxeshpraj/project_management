import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { UserPlus, Edit2, Trash2, Shield, User as UserIcon, Loader2, RefreshCcw, HardHat } from "lucide-react";
import UserModal from "./UserModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Get current logged in user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id, username) => {
    if (username === currentUser.username) {
      toast.error("You cannot delete your own account");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      await axios.delete(`${API}/users/${id}`);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const openModal = (user = null) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "ADMIN":
        return (
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
            <Shield className="w-3 h-3 mr-1" /> ADMIN
          </div>
        );
      case "STAFF":
        return (
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            <HardHat className="w-3 h-3 mr-1" /> STAFF
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <UserIcon className="w-3 h-3 mr-1" /> USER
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        <p className="text-gray-500 font-medium">Loading user accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage login access and roles for your team</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-950 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-slate-700/20 transition-all active:scale-95 text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Account</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Holder</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">System Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full border-2 border-slate-100 dark:border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900/30">
                        {user.profile_image ? (
                          <img src={`/api${user.profile_image}`} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-slate-900 dark:text-slate-500 font-bold text-sm">{user.full_name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                          {user.full_name}
                          {user.username === currentUser.username && (
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">YOU</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500">{user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">{user.username}</td>
                  <td className="px-6 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openModal(user)}
                        className="p-2 text-gray-400 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded-lg transition-all"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.username)}
                        disabled={user.username === currentUser.username}
                        className={`p-2 rounded-lg transition-all ${
                          user.username === currentUser.username
                          ? "text-gray-200 dark:text-gray-800 cursor-not-allowed"
                          : "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        }`}
                        title={user.username === currentUser.username ? "Cannot delete self" : "Delete User"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="py-20 text-center">
            <UserIcon className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No user accounts found</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <UserModal
          user={selectedUser}
          onClose={() => setIsModalOpen(false)}
          onUpdate={fetchUsers}
        />
      )}
    </div>
  );
};

export default UserManagement;
