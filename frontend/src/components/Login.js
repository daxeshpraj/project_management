import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { getSubdomain, getTenantHeader } from '../utils/tenancy';
import BrandLogo from './BrandLogo';
import { HK_TECH_BRAND } from '@/config/brand';

const Login = ({ onLoginSuccess, onShowSignup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password,
      }, {
        headers: getTenantHeader()
      });

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      onLoginSuccess(user);
    } catch (err) {
      if (!err.response) {
        const hint = getSubdomain()
          ? 'API unreachable or wrong tenant URL. Try http://localhost:8089 without a subdomain.'
          : 'Cannot reach the API. Confirm IIS /api is running and open http://localhost:8089/api/ping';
        setError(hint);
      } else {
        const detail = err.response?.data?.detail;
        setError(
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
              : 'Login failed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo showText={false} size="xl" />
          </div>
          <h1 className="text-2xl font-bold text-hk-gray dark:text-white">{HK_TECH_BRAND.name}</h1>
          <p className="text-hk-gray-light dark:text-gray-400 mt-1 text-sm">{HK_TECH_BRAND.tagline}</p>
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">Sign in to your management portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-black/5 border border-gray-100 dark:border-gray-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center space-x-3 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-hk-teal transition-all outline-none"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-hk-teal transition-all outline-none"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-hk-teal hover:bg-hk-teal-dark disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg shadow-hk-teal/25 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center space-y-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Authorized personnel only. Contact Admin for credentials.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              New business? {' '}
              <button onClick={onShowSignup} className="text-hk-teal dark:text-hk-teal-light font-semibold hover:underline">
                Register Company
              </button>
            </p>
          </div>
        </div>

        <p className="text-center mt-8 text-sm text-gray-400 dark:text-gray-600">
          {HK_TECH_BRAND.copyright}
        </p>
      </div>
    </div>
  );
};

export default Login;
