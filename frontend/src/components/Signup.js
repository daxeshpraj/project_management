import React, { useState } from 'react';
import axios from 'axios';
import { Building2, User, Lock, ArrowRight, Loader2, CheckCircle2, Globe } from 'lucide-react';
import { toast } from 'sonner';

const Signup = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    subdomain: '',
    admin_username: '',
    admin_full_name: '',
    admin_password: '',
    confirm_password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'subdomain') {
      // Only allow lowercase alphanumeric and hyphens
      const cleanValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setFormData(prev => ({ ...prev, [name]: cleanValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.admin_password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/signup', {
        company_name: formData.company_name,
        subdomain: formData.subdomain,
        admin_username: formData.admin_username,
        admin_full_name: formData.admin_full_name,
        admin_password: formData.admin_password
      });
      
      toast.success("Company registered successfully!");
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Join the Platform</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Scale your interior business with ease</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-slate-700 outline-none"
                    placeholder="e.g. Dream Interiors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subdomain</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="subdomain"
                      value={formData.subdomain}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 pr-32 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-slate-700 outline-none"
                      placeholder="dream-interiors"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                      .interior.com
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    This will be your personalized URL
                  </p>
                </div>
              </div>
              <button
                onClick={() => formData.company_name && formData.subdomain ? setStep(2) : toast.error("Please fill all fields")}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-950 flex items-center justify-center gap-2"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSignup} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="admin_full_name"
                    value={formData.admin_full_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-slate-700 outline-none"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    name="admin_username"
                    value={formData.admin_username}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-slate-700 outline-none"
                    placeholder="Choose a username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <input
                    type="password"
                    name="admin_password"
                    value={formData.admin_password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-slate-700 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-slate-700 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 font-semibold py-3 rounded-xl hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-950 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Set!</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Your business portal is ready at:
                </p>
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100">
                  {formData.subdomain}.interiorapp.com
                </div>
              </div>
              <button
                onClick={() => window.location.href = `http://${formData.subdomain}.lvh.me:3000`}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-950"
              >
                Go to My Portal
              </button>
            </div>
          )}
        </div>

        {step !== 3 && (
          <p className="text-center mt-8 text-sm text-gray-500">
            Already have an account?{' '}
            <button onClick={onBack} className="text-slate-900 font-semibold hover:underline">
              Log in
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Signup;
