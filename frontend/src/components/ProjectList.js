import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, Calendar, Eye } from "lucide-react";
import ProjectModal from "./ProjectModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectList = ({ projects, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectAnalytics, setProjectAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project? Associated expenses will not be deleted but will be unlinked.")) return;

    try {
      await axios.delete(`${API}/projects/${id}`);
      toast.success("Project deleted successfully");
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
    onUpdate();
  };

  const handleViewDetails = async (project) => {
    setSelectedProject(project);
    setLoadingAnalytics(true);
    try {
      const response = await axios.get(`${API}/projects/${project.id}/analytics`);
      setProjectAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching project analytics:", error);
      toast.error("Failed to load project details");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  return (
    <div className="space-y-6" data-testid="project-list">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-600 mt-1">
            {projects.length} total projects
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 transition-colors flex items-center space-x-2"
          data-testid="add-project-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                  <p className="text-sm text-gray-600">{project.client_name}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4">
                {project.budget && (
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span>Budget: {formatCurrency(project.budget)}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Started: {formatDate(project.start_date)}</span>
                </div>
                {project.end_date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <span>Ended: {formatDate(project.end_date)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleViewDetails(project)}
                  className="text-slate-900 hover:text-slate-950 text-sm font-medium flex items-center"
                  data-testid={`view-project-${project.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(project)}
                    className="text-gray-600 hover:text-slate-900 p-1"
                    data-testid={`edit-project-${project.id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-gray-600 hover:text-red-600 p-1"
                    data-testid={`delete-project-${project.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No projects yet</p>
          <button
            onClick={handleAdd}
            className="text-slate-900 hover:text-slate-950 font-medium"
          >
            Create your first project
          </button>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedProject.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedProject.client_name}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setProjectAnalytics(null);
                }}
                className="text-gray-400 hover:text-gray-600"
                data-testid="close-project-details"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loadingAnalytics ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading project details...</p>
                </div>
              ) : projectAnalytics ? (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(projectAnalytics.total_spent)}</p>
                    </div>
                    {projectAnalytics.budget && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Remaining Budget</p>
                        <p className={`text-2xl font-bold ${
                          projectAnalytics.remaining_budget >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(projectAnalytics.remaining_budget)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Budget Progress */}
                  {projectAnalytics.budget && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Budget Usage</span>
                        <span>{((projectAnalytics.total_spent / projectAnalytics.budget) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            (projectAnalytics.total_spent / projectAnalytics.budget) > 1 ? 'bg-red-600' : 'bg-slate-900'
                          }`}
                          style={{ width: `${Math.min((projectAnalytics.total_spent / projectAnalytics.budget) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{selectedProject.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expenses:</span>
                      <span className="font-medium">{projectAnalytics.expense_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">{formatDate(selectedProject.start_date)}</span>
                    </div>
                    {selectedProject.end_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span className="font-medium">{formatDate(selectedProject.end_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <ProjectModal
          project={editingProject}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default ProjectList;