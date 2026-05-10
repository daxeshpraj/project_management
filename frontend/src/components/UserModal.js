import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Eye, EyeOff, User as UserIcon, Upload, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserModal = ({ user, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "USER",
    linked_staff_id: "",
    profile_image: "",
  });
  const [staffList, setStaffList] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStaff();
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        username: user.username || "",
        password: "********", // Placeholder
        role: user.role || "USER",
        linked_staff_id: user.linked_staff_id || "",
        profile_image: user.profile_image || "",
      });
    }
  }, [user]);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API}/staff`);
      setStaffList(response.data);
    } catch (error) {
      console.error("Failed to fetch staff", error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      setUploading(true);
      const response = await axios.post(`${API}/upload`, uploadData);
      setFormData({ ...formData, profile_image: response.data.url });
      toast.success("Profile image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = { ...formData };
      if (dataToSave.role !== "STAFF") {
        dataToSave.linked_staff_id = null;
      }

      if (user) {
        await axios.put(`${API}/users/${user.id}`, dataToSave);
        toast.success("User updated successfully");
      } else {
        await axios.post(`${API}/users`, dataToSave);
        toast.success("User created successfully");
      }
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {user ? "Edit User Account" : "Create Login Account"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center space-y-3 mb-2">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                {formData.profile_image ? (
                  <img src={`/api${formData.profile_image}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Upload className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
            {uploading && <div className="text-xs text-slate-500 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Uploading...</div>}
            <p className="text-xs text-gray-500">Profile Photo</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none transition-all dark:text-white"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  placeholder="jdoe88"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none transition-all dark:text-white"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">System Role</label>
                <select
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none transition-all dark:text-white"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="USER">User</option>
                  <option value="STAFF">Staff Member</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
            </div>

            {formData.role === "STAFF" && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 text-blue-600 dark:text-blue-400">Link to Staff Profile</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                  value={formData.linked_staff_id}
                  onChange={(e) => setFormData({ ...formData, linked_staff_id: e.target.value })}
                >
                  <option value="">-- Select Staff Member --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.staff_type})</option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-500 mt-1">Linking allows automatic name fetching in modules.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {user ? "New Password (leave to keep)" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required={!user}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-transparent outline-none transition-all dark:text-white"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-medium rounded-lg shadow-lg shadow-slate-700/20 transition-all active:scale-95"
            >
              {user ? "Update Account" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
