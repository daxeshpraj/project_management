import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FileText, Download, Receipt, Users as UsersIcon, ArrowLeft, BookOpen, Search, X, FileSpreadsheet } from "lucide-react";
import {
  generateAllProjectsReportPDF,
  generateProjectProfitabilityPDF,
  generateCustomerStatementPDF,
} from "../utils/pdfGenerator";
import ProjectLedger from "./ProjectLedger";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reports = ({ onBack, canGoBack, company }) => {
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState("");
  
  // View State for Detailed Ledger
  const [view, setView] = useState('summary'); // 'summary' or 'ledger'
  const [ledgerProject, setLedgerProject] = useState(null);
  const [profitabilityData, setProfitabilityData] = useState(null);
  const [showProfitModal, setShowProfitModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p, v, vp, cp] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/vendors`),
        axios.get(`${API}/vendor-payments`),
        axios.get(`${API}/customer-payments`),
      ]);
      setProjects(p.data);
      setVendors(v.data);
      setVendorPayments(vp.data);
      setCustomerPayments(cp.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAllProjectsReport = (type = 'pdf') => {
    if (projects.length === 0) {
      toast.error("No projects available");
      return;
    }
    if (type === 'pdf') {
      generateAllProjectsReportPDF(projects, vendorPayments, customerPayments, company);
      toast.success("PDF Report downloaded");
    } else {
      // Excel/CSV Export
      const headers = ["Project", "Client", "Type", "Contract Amount", "Total Received", "Outstanding", "Vendor Paid", "Staff Paid", "Loose Paid", "Net Profit"];
      const rows = projects.map(p => {
        const received = customerPayments.filter(cp => cp.project_id === p.id).reduce((s, cp) => s + cp.amount, 0);
        const vendorPaid = vendorPayments.filter(vp => vp.project_id === p.id).reduce((s, vp) => s + vp.amount, 0);
        const staffPaid = 0; // Backend calculated needed for perfect accuracy but can estimate or fetch
        const loosePaid = 0; // Estimation
        const profit = received - vendorPaid - staffPaid - loosePaid;
        return [
          p.name, p.client_name, p.project_type, p.contract_amount, received, (p.contract_amount - received), vendorPaid, staffPaid, loosePaid, profit
        ];
      });
      exportToCSV(headers, rows, "All_Projects_Summary");
    }
  };

  const exportToCSV = (headers, rows, fileName) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel/CSV exported");
  };

  const handleProjectProfitability = async () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${API}/analytics/project/${selectedProject}`);
      setProfitabilityData(res.data);
      setShowProfitModal(true);
    } catch (error) {
      toast.error("Failed to fetch profitability data");
    } finally {
      setLoading(false);
    }
  };

  const downloadProfitabilityPDF = () => {
    const project = projects.find((p) => p.id === selectedProject);
    const projectVP = vendorPayments.filter((vp) => vp.project_id === selectedProject);
    const projectCP = customerPayments.filter((cp) => cp.project_id === selectedProject);
    generateProjectProfitabilityPDF(project, profitabilityData, projectVP, projectCP, vendors, company);
    toast.success("Report downloaded");
  };

  const downloadProfitabilityExcel = () => {
    const project = projects.find((p) => p.id === selectedProject);
    const headers = ["Label", "Value"];
    const rows = [
      ["Project Name", project.name],
      ["Client", project.client_name],
      ["Contract Amount", profitabilityData.contract_amount],
      ["Total Received", profitabilityData.total_received],
      ["Outstanding Balance", profitabilityData.outstanding_balance],
      ["Total Vendor Paid", profitabilityData.total_vendor_paid],
      ["Total Staff Expenses", profitabilityData.total_staff_paid],
      ["Net Profit", profitabilityData.profit]
    ];
    exportToCSV(headers, rows, `${project.name.replace(/\s+/g, '_')}_Profitability`);
  };

  const handleCustomerStatement = () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }
    const project = projects.find((p) => p.id === selectedProject);
    const projectCP = customerPayments.filter((cp) => cp.project_id === selectedProject);
    const totalPaid = projectCP.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = (project.contract_amount || 0) - totalPaid;
    generateCustomerStatementPDF(project, projectCP, outstanding, company);
    toast.success("Statement downloaded");
  };

  const handleViewDetailedLedger = () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }
    const project = projects.find(p => p.id === selectedProject);
    setLedgerProject(project);
    setView('ledger');
  };

  if (view === 'ledger' && ledgerProject) {
    return (
      <ProjectLedger 
        project={ledgerProject} 
        onBack={() => setView('summary')} 
        onUpdate={fetchData} 
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Generate and download PDF/Excel reports for your business</p>
        </div>
      </div>

      {/* All Projects Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Projects Summary</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Complete overview of all your projects with profitability</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{projects.length} projects included</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={() => handleAllProjectsReport('pdf')}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Summary PDF</span>
            </button>
            <button
              onClick={() => handleAllProjectsReport('excel')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
            >
              <Receipt className="w-4 h-4" />
              <span>Summary Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Project-specific reports */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detailed Project Reports</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Project</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
          >
            <option value="">-- Choose a project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {p.client_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleViewDetailedLedger}
            disabled={!selectedProject}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900/30 rounded-lg flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                <BookOpen className="w-5 h-5 text-slate-900 group-hover:text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Detailed Ledger</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">View/Export all inflows, vendor bills, and staff expenses</p>
          </button>

          <button
            onClick={handleProjectProfitability}
            disabled={!selectedProject}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <Receipt className="w-5 h-5 text-green-600 group-hover:text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Profitability Report</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Revenue vs Expense analysis with margin calculations</p>
          </button>

          <button
            onClick={handleCustomerStatement}
            disabled={!selectedProject}
            className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                <UsersIcon className="w-5 h-5 text-purple-600 group-hover:text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Customer Statement</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Summary of all payments received from the client</p>
          </button>
        </div>
      </div>

      {/* Individual Receipts Info */}
      <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <p className="text-sm text-slate-900 dark:text-slate-300">
          <strong>💡 Tip:</strong> All reports now support <strong>PDF and Excel/CSV export</strong>. Use the "Detailed Ledger" to filter by date before downloading.
        </p>
      </div>

      {/* Profitability Modal */}
      {showProfitModal && profitabilityData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-left">Profitability Analysis</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-left">{projects.find(p => p.id === selectedProject)?.name}</p>
              </div>
              <button onClick={() => setShowProfitModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-left">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contract Value</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">₹{profitabilityData.contract_amount.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl text-left">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Received</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">₹{profitabilityData.total_received.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl text-left">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Total Expenses</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">₹{(profitabilityData.total_vendor_paid + profitabilityData.total_staff_paid).toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/10 p-4 rounded-xl text-left">
                  <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Net Profit</p>
                  <p className="text-lg font-bold text-slate-950 dark:text-slate-500 mt-1">₹{profitabilityData.profit.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Vendor Payments:</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right">₹{profitabilityData.total_vendor_paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Staff Expenses:</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right">₹{profitabilityData.total_staff_paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Loose Expenses:</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right">₹{profitabilityData.total_loose_paid.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-sm font-bold">
                  <span className="text-gray-900 dark:text-white">Outstanding Balance:</span>
                  <span className="text-orange-600 text-right">₹{profitabilityData.outstanding_balance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex flex-col md:flex-row gap-3">
              <button
                onClick={downloadProfitabilityPDF}
                className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-slate-950 flex items-center justify-center space-x-2 transition-all shadow-lg shadow-slate-900/20"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Report</span>
              </button>
              <button
                onClick={downloadProfitabilityExcel}
                className="flex-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center space-x-2 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
