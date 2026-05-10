import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X, Upload, Camera, Loader2, Image as ImageIcon } from "lucide-react";

const API = `/api`;
const UPLOADS_BASE = `/api`; 

const PurchaseModal = ({ purchase, projects, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    item_name: "",
    vendor_name: "",
    project_id: "",
    date: new Date().toISOString().split('T')[0],
    image_url: "",
    status: "ORDERED",
    added_by: ""
  });
  const [uploading, setUploading] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (purchase) {
      setFormData({
        item_name: purchase.item_name || "",
        vendor_name: purchase.vendor_name || "",
        project_id: purchase.project_id || "",
        date: new Date(purchase.date).toISOString().split('T')[0],
        image_url: purchase.image_url || "",
        status: purchase.status || "ORDERED",
        added_by: purchase.added_by || currentUser.username
      });
    } else {
      setFormData(prev => ({ ...prev, added_by: currentUser.username }));
    }
  }, [purchase, currentUser.username]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      setUploading(true);
      const response = await axios.post(`${API}/upload`, uploadData);
      setFormData({ ...formData, image_url: response.data.url });
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (purchase) {
        await axios.put(`${API}/purchases/${purchase.id}`, formData);
        toast.success("Purchase updated");
      } else {
        await axios.post(`${API}/purchases`, formData);
        toast.success("Purchase posted to feed");
      }
      onUpdate();
      onClose();
    } catch (error) {
      toast.error("Failed to save purchase");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {purchase ? "Edit Purchase" : "Post New Purchase"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image Upload Area */}
          <div className="relative group">
            <div className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all ${
              formData.image_url 
              ? "border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-gray-800" 
              : "border-gray-300 dark:border-gray-700 hover:border-slate-400 bg-gray-50/50 dark:bg-gray-800/20"
            }`}>
              {formData.image_url ? (
                <div className="relative w-full h-full">
                  <img src={`${UPLOADS_BASE}${formData.image_url}`} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="p-2 bg-white text-slate-900 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <Camera className="w-5 h-5" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, image_url: ""})}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin text-slate-500" /> : <Camera className="w-6 h-6" />}
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Take Photo or Upload</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Capture item being purchased</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                 <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                    <span className="text-sm font-bold text-slate-700 dark:text-gray-200">Uploading...</span>
                 </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Item Name / Description</label>
              <input
                type="text"
                required
                placeholder="e.g. 5 bags of cement, 12mm steel rods"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all dark:text-white font-medium shadow-sm"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Loose Vendor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laxmi Hardware"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all dark:text-white font-medium shadow-sm"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Project</label>
                <select
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all dark:text-white font-medium shadow-sm"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all dark:text-white font-medium shadow-sm"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                <select
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all dark:text-white font-medium text-blue-600 dark:text-blue-400 shadow-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ORDERED">ORDERED</option>
                  <option value="RECEIVED">RECEIVED</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl shadow-lg shadow-slate-700/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {purchase ? "Update Post" : "Post Purchase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseModal;
