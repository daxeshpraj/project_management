import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectModal = ({ project, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    project_type: "Turnkey Project",
    contract_amount: "",
    status: "Active",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    description: "",
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        client_name: project.client_name,
        project_type: project.project_type,
        contract_amount: project.contract_amount || "",
        status: project.status,
        start_date: new Date(project.start_date).toISOString().split("T")[0],
        end_date: project.end_date ? new Date(project.end_date).toISOString().split("T")[0] : "",
        description: project.description || "",
      });
    }
  }, [project]);

  const handleStatusChange = (newStatus) => {
    let newEndDate = formData.end_date;
    if (newStatus === "Completed" && !formData.end_date) {
      newEndDate = new Date().toISOString().split("T")[0];
    }
    setFormData({ ...formData, status: newStatus, end_date: newEndDate });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
        toast.error("End date cannot be before start date");
        return;
      }

      const payload = {
        ...formData,
        contract_amount: formData.contract_amount ? parseFloat(formData.contract_amount) : null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      };
      if (project) {
        await axios.put(`${API}/projects/${project.id}`, payload);
        toast.success("Project updated");
      } else {
        await axios.post(`${API}/projects`, payload);
        toast.success("Project created");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save project");
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{project ? "Edit Project" : "Add Project"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input type="text" required value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Type *</label>
              <select value={formData.project_type} onChange={(e) => setFormData({ ...formData, project_type: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option>Turnkey Project</option>
                <option>Consultation-based Project</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option>Active</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Amount (₹)</label>
            <input type="number" step="0.01" value={formData.contract_amount} onChange={(e) => setFormData({ ...formData, contract_amount: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows="2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950">
              {project ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
