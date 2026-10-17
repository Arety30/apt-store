"use client";

import React, { useState, useEffect } from 'react';
import { Search, Package, Download, Trash2, CheckCircle, ExternalLink, Filter, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AptPackage {
  name: string;
  version: string;
  description: string;
  size: string;
  installed: boolean;
  section: string;
}

export default function AptStore() {
  const [query, setQuery] = useState('');
  const [packages, setPackages] = useState<AptPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Editors', 'Graphics', 'Utilities', 'Development', 'Video'];

  const [processing, setProcessing] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const fetchDefaults = async () => {
      setLoading(true);
      try {
        const defaults = ['firefox', 'vlc', 'gimp', 'code', 'nodejs'];
        
        let results = [];
        if (typeof window !== 'undefined' && (window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          results = await Promise.all(
            defaults.map(async (name) => {
              const data = await ipcRenderer.invoke('search-packages', name);
              return data[0];
            })
          );
        } else {
          results = await Promise.all(
            defaults.map(async (name) => {
              const res = await fetch(`/api/search?q=${name}`);
              const data = await res.json();
              return data[0];
            })
          );
        }
        setPackages(results.filter(p => p !== undefined));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };
    fetchDefaults();
  }, []);

  const handleAction = async (pkg: AptPackage) => {
    setProcessing(pkg.name);
    
    try {
      const { ipcRenderer } = window.require('electron');
      const method = pkg.installed ? 'uninstall-package' : 'install-package';
      const result = await ipcRenderer.invoke(method, pkg.name);
      
      if (result.success) {
        // Refresh package state
        const updatedPackages = packages.map(p => 
          p.name === pkg.name ? { ...p, installed: !pkg.installed } : p
        );
        setPackages(updatedPackages);
      } else {
        alert(result.error || 'Action failed');
      }
    } catch (err) {
      console.error(err);
      alert('This feature requires running inside the Abrar Apt Store app.');
    } finally {
      setProcessing(null);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query) return;

    setLoading(true);
    try {
      if (typeof window !== 'undefined' && (window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        const data = await ipcRenderer.invoke('search-packages', query);
        setPackages(data);
      } else {
        // Fallback for web view (if any)
        const res = await fetch(`/api/search?q=${query}`);
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#333] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 overflow-hidden rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center bg-white border border-gray-100">
            <img src="/logo.png" alt="Abrar Apt Store Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Abrar Apt Store</h1>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search for apps (e.g. vlc, gimp, nodejs)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-sm"
            />
            {query && (
              <button 
                type="button"
                onClick={() => { setQuery(''); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <RefreshCw size={20} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Filter size={20} className="text-gray-600" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500" />
        </div>
      </header>

      <main className="flex">
        {/* Sidebar */}
        <aside className="w-64 h-[calc(100vh-73px)] border-r border-gray-200 p-6 flex flex-col gap-2 overflow-y-auto">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">Categories</p>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === cat 
                  ? 'bg-blue-50 text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </aside>

        {/* Content */}
        <section className="flex-1 p-8 overflow-y-auto h-[calc(100vh-73px)]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {loading ? 'Searching...' : query ? `Results for "${query}"` : 'Discover Featured Apps'}
                </h2>
                <p className="text-sm text-gray-500">
                  {query ? `Found ${packages.length} packages in the repositories.` : 'Handpicked recommendations for your Ubuntu system.'}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : packages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {packages.map((pkg) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={pkg.name}
                      className="group bg-white border border-gray-200 p-6 rounded-[2rem] hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-500">
                          <Package size={32} />
                        </div>
                        {pkg.installed ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle size={12} />
                            Installed
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-1 rounded-full">
                            {pkg.size}
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg font-bold mb-1 group-hover:text-blue-600 transition-colors">{pkg.name}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-6 leading-relaxed">
                        {pkg.description || "No description available for this package."}
                      </p>

                      <div className="flex items-center gap-3">
                        <button 
                          disabled={processing === pkg.name}
                          onClick={() => handleAction(pkg)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          pkg.installed 
                          ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600' 
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                        }`}>
                          {processing === pkg.name ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            pkg.installed ? <Trash2 size={16} /> : <Download size={16} />
                          )}
                          {processing === pkg.name ? 'Processing...' : (pkg.installed ? 'Uninstall' : 'Install')}
                        </button>
                        <button className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
                          <ExternalLink size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search size={40} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Search for something to see results</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
