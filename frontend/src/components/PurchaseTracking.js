import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, 
  Filter, 
  Image as ImageIcon, 
  Eye,
  Calendar, 
  Tag, 
  Building2,
  Edit2,
  Trash2,
  X,
  MessageSquare,
  Package,
  Loader2,
  RefreshCcw,
  FileDown,
  User,
  CheckCircle2,
  Clock
} from "lucide-react";
import PurchaseModal from "./PurchaseModal";

const API = `/api`; 
const UPLOADS_BASE = `/api`; 

const PurchaseTracking = () => {
  const [purchases, setPurchases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchData();
  }, [filterProject]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, projectsRes] = await Promise.all([
        axios.get(`${API}/purchases${filterProject ? `?project_id=${filterProject}` : ""}`),
        axios.get(`${API}/projects`)
      ]);
      setPurchases(purchasesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      toast.error("Failed to fetch procurement data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this conversation entry?")) return;
    try {
      await axios.delete(`${API}/purchases/${id}`);
      toast.success("Entry removed");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const openModal = (purchase = null) => {
    setSelectedPurchase(purchase);
    setIsModalOpen(true);
  };

  const getProjectName = (id) => {
    return projects.find(p => p.id === id)?.name || "General Project";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 print:max-w-full print:p-0">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-700" />
            Procurement Feed
          </h1>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={fetchData} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => window.print()} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <FileDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm print:hidden flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-transparent text-sm font-medium focus:outline-none dark:text-white w-full"
        >
          <option value="">All Projects Activity</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Conversation View */}
      <div className="space-y-4">
        {loading && purchases.length === 0 ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No purchase activity yet</p>
          </div>
        ) : (
          purchases.map((purchase) => (
            <div key={purchase.id} className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
              {/* Status Indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                purchase.status === "RECEIVED" ? "bg-green-500" : "bg-amber-500"
              }`} />

              <div className="p-4">
                {/* User & Time */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">
                      {purchase.added_by.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{purchase.added_by}</p>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(purchase.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(purchase.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                      purchase.status === "RECEIVED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {purchase.status}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 print:hidden">
                        <button onClick={() => openModal(purchase)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-slate-900">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(purchase.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                  </div>
                </div>

                {/* Purchase Content */}
                <div className="pl-10 space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap">
                      {purchase.item_name}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/30">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <Building2 className="w-3 h-3 text-orange-500" />
                        {purchase.vendor_name}
                      </div>
                      <div className="text-[10px] text-slate-300">•</div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        <Tag className="w-3 h-3 text-blue-500" />
                        {getProjectName(purchase.project_id)}
                      </div>
                    </div>
                  </div>

                  {/* Image Eye Button / Attachment */}
                  {purchase.image_url && (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedImage(purchase.image_url)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all group/btn"
                      >
                        <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">View Attachment</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <PurchaseModal 
          purchase={selectedPurchase}
          projects={projects}
          onClose={() => setIsModalOpen(false)}
          onUpdate={fetchData}
        />
      )}

      {/* Image Preview Pop-up */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={`${UPLOADS_BASE}${selectedImage}`} 
              alt="Purchase Attachment" 
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10"
              onError={(e) => {
                 e.target.onerror = null;
                 e.target.src = "https://placehold.co/600x400?text=Image+Not+Found";
              }}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/10">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseTracking;
