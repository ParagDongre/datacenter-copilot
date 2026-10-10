import React from 'react';
import { Cpu, HardDrive, Database, Clock, Server, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { SystemMetrics } from '../types';

interface HealthDashboardProps {
  metrics: SystemMetrics | null;
  loading: boolean;
  onTriggerSimulation: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(1)} ${units[i]}`;
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ metrics, loading, onTriggerSimulation }) => {
  if (!metrics && loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono">Gathering Linux system metrics from host subsystem...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center text-red-400 bg-red-950/20 border border-red-800 rounded-xl">
        Failed to poll host telemetry. Verify backend server is running.
      </div>
    );
  }

  const cpuPct = typeof metrics.cpu?.cpuUsagePercent === 'number' ? metrics.cpu.cpuUsagePercent : 0;
  const memPct = typeof metrics.memory?.usedPercent === 'number' ? metrics.memory.usedPercent : 0;
  const diskPct = typeof metrics.disk?.usedPercent === 'number' ? metrics.disk.usedPercent : 0;
  const isDiskAlert = diskPct > (metrics.disk?.thresholdPercent || 85.0);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-slate-300">CPU Compute</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{metrics.cpu.cores} Cores</span>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold font-mono text-white">{cpuPct.toFixed(1)}%</span>
            <span className="text-xs text-slate-400 font-mono">
              Load: {metrics.cpu.loadAvg1m.toFixed(2)} / {metrics.cpu.loadAvg5m.toFixed(2)} / {metrics.cpu.loadAvg15m.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                cpuPct > 85 ? 'bg-red-500' : cpuPct > 65 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, cpuPct))}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400 font-mono truncate">{metrics.cpu.model}</p>
        </div>

        {/* Memory Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-slate-300">Memory (RAM)</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{formatBytes(metrics.memory.totalBytes)}</span>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-bold font-mono text-white">{memPct.toFixed(1)}%</span>
            <span className="text-xs text-slate-400 font-mono">
              Used: {formatBytes(metrics.memory.usedBytes)}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                memPct > 85 ? 'bg-red-500' : memPct > 70 ? 'bg-purple-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, memPct))}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Free: {formatBytes(metrics.memory.freeBytes)}</span>
            <span>Buff/Cache: {formatBytes(metrics.memory.buffersBytes + metrics.memory.cachedBytes)}</span>
          </div>
        </div>

        {/* Disk Card */}
        <div className={`bg-slate-900 border rounded-xl p-5 shadow-sm transition ${
          isDiskAlert ? 'border-red-500/50 bg-red-950/10' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isDiskAlert ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-slate-300">Root Storage (/)</h3>
            </div>
            {metrics.disk.isSimulated ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SIMULATED PRESSURE
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                REAL FILESYSTEM
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className={`text-2xl font-bold font-mono ${isDiskAlert ? 'text-red-400' : 'text-white'}`}>
              {diskPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Free: {formatBytes(metrics.disk.freeBytes)}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isDiskAlert ? 'bg-red-500 animate-pulse' : diskPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, diskPct))}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Threshold: {metrics.disk.thresholdPercent}%</span>
            <span>Total: {formatBytes(metrics.disk.totalBytes)}</span>
          </div>
        </div>

        {/* Uptime & Health Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-slate-300">System Uptime</h3>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              HEALTHY
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white mb-2 truncate">
            {Math.floor(metrics.uptimeSeconds / 86400)}d {Math.floor((metrics.uptimeSeconds % 86400) / 3600)}h {Math.floor((metrics.uptimeSeconds % 3600) / 60)}m
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Last Poll: {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
          <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center justify-between">
            <span>Container: {metrics.isLinuxContainer ? 'Linux Host' : 'Emulated Host'}</span>
            <button
              onClick={onTriggerSimulation}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Simulate Failure
            </button>
          </div>
        </div>
      </div>

      {/* Linux Kernel Memory Concept Callout for DCT candidates */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-300">Data Center Technician Knowledge Note — Memory Page Cache:</span>
          <p className="mt-1 text-slate-400 leading-relaxed">
            In Linux, "used" memory often appears high because the kernel aggressively allocates idle RAM to filesystem disk caches (<code className="text-purple-300">Cached</code>) and block I/O buffers (<code className="text-purple-300">Buffers</code>). When applications request RAM, the kernel reclaims cache pages instantaneously. A server is only truly under memory pressure when <code className="text-slate-200">available</code> memory approaches 0 and the kernel triggers swap thrashing or the OOM Killer.
          </p>
        </div>
      </div>

      {/* Services & Network Interfaces Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Daemons / Services */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              Critical Services & Telemetry Daemons
            </h3>
            <span className="text-xs text-slate-400 font-mono">systemd monitor</span>
          </div>

          <div className="space-y-3">
            {(metrics.services || []).map((svc) => {
              const isRunning = svc.status === 'RUNNING';
              return (
                <div
                  key={svc.name}
                  className={`flex items-center justify-between p-3 rounded-lg border transition ${
                    isRunning
                      ? 'bg-slate-800/40 border-slate-700/60'
                      : 'bg-red-950/20 border-red-800/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isRunning ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-100">{svc.name}</span>
                        {svc.isSimulatedTest && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Lab Target
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-400">Port {svc.port}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{svc.description}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      isRunning
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                    }`}
                  >
                    {svc.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Network Interfaces */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Network Interfaces & Hardware Addresses (MAC)
            </h3>
            <span className="text-xs text-slate-400 font-mono">ip addr show</span>
          </div>

          <div className="space-y-3">
            {metrics.interfaces.map((iface) => (
              <div
                key={iface.name}
                className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60 font-mono text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-400">{iface.name}</span>
                    {iface.internal && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                        loopback
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {iface.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-500">IPv4: </span>
                    <span className="text-slate-200">{iface.ip4.length > 0 ? iface.ip4.join(', ') : 'none'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">MAC (L2): </span>
                    <span className="text-amber-300/80">{iface.mac}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Processes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Active Linux Process Consumption</h3>
            <p className="text-xs text-slate-400">Equivalent to <code className="text-blue-300 font-mono">ps -eo pid,pcpu,pmem,user,comm --sort=-pcpu</code></p>
          </div>
          <span className="text-xs font-mono text-slate-400">Top 10 Processes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">PID</th>
                <th className="py-2.5 px-3">Process Command</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">% CPU</th>
                <th className="py-2.5 px-3">% MEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {metrics.processes.map((proc) => (
                <tr key={proc.pid} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-slate-400">{proc.pid}</td>
                  <td className="py-2 px-3 font-semibold text-slate-200">{proc.name}</td>
                  <td className="py-2 px-3 text-slate-400">{proc.user}</td>
                  <td className="py-2 px-3">
                    <span className={proc.cpu > 50 ? 'text-red-400 font-bold' : proc.cpu > 10 ? 'text-amber-400' : 'text-slate-300'}>
                      {proc.cpu.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300">{proc.mem.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
