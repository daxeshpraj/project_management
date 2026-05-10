import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Eye, DollarSign, TrendingUp, ArrowLeft, Search, Filter, X, BookOpen, RefreshCcw } from "lucide-react";
import ProjectModal from "./ProjectModal";
import ProjectDetailsModal from "./ProjectDetailsModal";
import ProjectLedger from "./ProjectLedger";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Projects = ({ onUpdate, onBack, canGoBack, company }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // View State
  const [view, setView] = useState('list'); // 'list' or 'ledger'
  const [ledgerProject, setLedgerProject] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project? This will also delete all related payments and expenses.")) return;

    try {
      await axios.delete(`${API}/projects/${id}`);
      toast.success("Project deleted successfully");
      fetchProjects();
      onUpdate();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    fetchProjects();
    onUpdate();
  };

  const handleViewDetails = (project) => {
    setSelectedProject(project);
  };

  const handleViewLedger = (project) => {
    setLedgerProject(project);
    setView('ledger');
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: company?.currency || 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Completed":
        return "bg-slate-100 text-slate-800";
      case "On Hold":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProjectTypeColor = (type) => {
    return type === "Turnkey Project"
      ? "bg-purple-100 text-purple-800"
      : "bg-indigo-100 text-indigo-800";
  };

  const isOverdue = (project) => {
    if (project.status !== "Active" || !project.end_date) return false;
    return new Date(project.end_date) < new Date();
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesType = typeFilter === "all" || p.project_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  if (view === 'ledger' && ledgerProject) {
    return <ProjectLedger project={ledgerProject} onBack={() => setView('list')} onUpdate={fetchProjects} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="projects-page">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Projects</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{projects.length} total projects</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchProjects}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleAdd}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 transition-colors flex items-center space-x-2"
            data-testid="add-project-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
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
              placeholder="Search project or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-slate-700 focus:border-transparent text-sm text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700 min-w-[140px]"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-700 min-w-[140px]"
          >
            <option value="all">All Types</option>
            <option value="Turnkey Project">Turnkey</option>
            <option value="Consultation Project">Consultation</option>
          </select>
          {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
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

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{project.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{project.client_name}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  {isOverdue(project) && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 animate-pulse">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getProjectTypeColor(project.project_type)}`}>
                  {project.project_type}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {project.contract_amount && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Contract Amount:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(project.contract_amount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(project.start_date)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => handleViewLedger(project)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900/20 text-slate-900 dark:text-slate-500 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  View Ledger
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleViewDetails(project)}
                    className="p-2 text-gray-500 hover:text-slate-900 dark:hover:text-slate-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Quick Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(project)}
                    className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Edit Project"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Delete Project"
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
            {projects.length === 0 ? "No projects yet" : "No projects match your filters"}
          </p>
          {projects.length === 0 ? (
            <button
              onClick={handleAdd}
              className="text-slate-900 hover:text-slate-950 font-medium"
            >
              Create your first project
            </button>
          ) : (
            <button
              onClick={clearFilters}
              className="text-slate-900 hover:text-slate-950 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {isModalOpen && (
        <ProjectModal
          project={editingProject}
          onClose={handleModalClose}
        />
      )}

      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default Projects;