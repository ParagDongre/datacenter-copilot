import React from 'react';
import { Server, Activity, ShieldCheck, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import { SystemMetrics } from '../types';

interface HeaderProps {
  metrics: SystemMetrics | null;
  loading: boolean;
  onRefresh: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openIncidentsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  loading,
  onRefresh,
  activeTab,
  setActiveTab,
  openIncidentsCount
}) => {
  const tabs = [
    { id: 'health', label: 'Linux Health', icon: Activity },
    { id: 'network', label: 'Network Diag', icon: Server },
    { id: 'simulations', label: 'Failure Lab', icon: HardDrive, badge: '4 Scenarios' },
    { id: 'incidents', label: 'Incidents & Reports', icon: ShieldCheck, badgeCount: openIncidentsCount },
    { id: 'ai-rca', label: 'AI Copilot (Gemini)', icon: Cpu, highlight: true },
    { id: 'tests', label: 'Automated Tests', icon: RefreshCw },
    { id: 'python-code', label: 'Python Lab Code', icon: Server },
    { id: 'interview-prep', label: 'Phase 1 & Interview Prep', icon: ShieldCheck, accent: true },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">DataCenter Copilot</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                v1.0 Operational Lab
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Google DCT Candidate Standard
              </span>
            </div>
            <p className="text-xs text-slate-400">
              AI-Assisted Linux & Network Diagnostics • Safe Incident Simulation • Root Cause Analysis
            </p>
          </div>
        </div>

        {/* System Node Telemetry Snippet */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden md:flex flex-col items-end text-right">
            <div className="text-slate-300 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Node: <span className="text-white font-semibold">{metrics?.hostname || 'dc-node-01'}</span> ({metrics?.platform || 'linux'} / {metrics?.arch || 'x64'})
            </div>
            <div className="text-slate-400">
              Kernel: {metrics?.release ? metrics.release.substring(0, 18) : '6.6.x-generic'} • Uptime: {metrics ? `${Math.floor(metrics.uptimeSeconds / 3600)}h ${Math.floor((metrics.uptimeSeconds % 3600) / 60)}m` : '0h 0m'}
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition disabled:opacity-50"
            title="Refresh system metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Poll</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto border-t border-slate-800/80 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              } ${tab.highlight ? 'text-amber-400/90' : ''} ${tab.accent ? 'text-emerald-400/90' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {tab.badge}
                </span>
              )}
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
