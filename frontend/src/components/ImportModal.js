import React, { useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Upload, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Download
} from "lucide-react";

const ImportModal = ({ isOpen, onClose, entityType, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);

  const entityConfig = {
    vendors: {
      title: "Import Vendors",
      columns: ["name", "vendor_type", "contact_number", "email", "address"],
      example: "name, vendor_type (e.g. Electric Work Provider), contact_number, etc.",
      template: "/templates/vendors_template.xlsx"
    },
    expenses: {
      title: "Import General Expenses",
      columns: ["title", "amount", "category", "date", "description", "payment_mode"],
      example: "title, amount, category (e.g. Office Supplies), date (YYYY-MM-DD), etc.",
      template: "/templates/expenses_template.xlsx"
    },
    staff: {
      title: "Import Staff",
      columns: ["name", "staff_type", "designation", "contact_number", "email", "address", "monthly_salary", "join_date"],
      example: "name, staff_type (Employee/Partner), designation, join_date (YYYY-MM-DD), etc.",
      template: "/templates/staff_template.xlsx"
    },
  };

  const config = entityConfig[entityType] || { title: "Import Data", columns: [] };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls"))) {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast.error("Please select a valid Excel file (.xlsx or .xls)");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`/api/import/${entityType}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(response.data);
      toast.success(response.data.message);
      if (onImportSuccess) onImportSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error.response?.data?.detail || "Failed to import data");
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setResult(null);
    setIsUploading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-slate-900" />
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Required Columns:
            </h4>
            <p className="text-xs text-slate-950 dark:text-slate-500 leading-relaxed">
              {config.columns.join(", ")}
            </p>
            <div className="mt-2">
              <a 
                href={config.template} 
                download 
                className="text-xs font-medium text-slate-900 dark:text-slate-500 underline flex items-center gap-1 hover:text-slate-800"
              >
                <Download className="w-3 h-3" />
                Download Sample Template
              </a>
            </div>
          </div>

          {!result ? (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="excel-file">Select Excel File</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file ? "border-green-400 bg-green-50 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-800 hover:border-slate-500"
                }`}
              >
                <input
                  type="file"
                  id="excel-file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="excel-file" className="cursor-pointer space-y-2">
                  <div className="flex justify-center">
                    {file ? (
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    ) : (
                      <Upload className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <div className="text-sm font-medium">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </div>
                  <p className="text-xs text-gray-500">Excel files only (.xlsx, .xls)</p>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                {result.message}
              </div>
              
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Errors ({result.errors.length}):
                  </h4>
                  <div className="max-h-[150px] overflow-y-auto text-xs text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-800 space-y-1">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="flex gap-1">
                        <span>•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!result ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Start Import"
                )}
              </Button>
            </>
          ) : (
            <Button onClick={resetModal}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportModal;
