import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Play, RotateCcw, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import { SimulationState } from '../types';

interface SimulationLabProps {
  simulationState: SimulationState;
  onAction: (scenario: string, action: string) => Promise<void>;
  onCreateIncidentFromScenario: (scenarioKey: string) => void;
}

export const SimulationLab: React.FC<SimulationLabProps> = ({
  simulationState,
  onAction,
  onCreateIncidentFromScenario,
}) => {
  // Support both frontend camelCase and python snake_case structures defensively
  const safeState = {
    scenarioA_httpService: {
      running: simulationState?.scenarioA_httpService?.running ?? (simulationState as any)?.scenario_1_http_service?.running ?? true,
      port: simulationState?.scenarioA_httpService?.port ?? (simulationState as any)?.scenario_1_http_service?.port ?? 8085,
      error: simulationState?.scenarioA_httpService?.error ?? (simulationState as any)?.scenario_1_http_service?.error ?? null,
    },
    scenarioB_dnsFailure: {
      active: simulationState?.scenarioB_dnsFailure?.active ?? (simulationState as any)?.scenario_2_dns?.active ?? false,
      targetDomain: simulationState?.scenarioB_dnsFailure?.targetDomain ?? (simulationState as any)?.scenario_2_dns?.test_domain ?? 'internal-db-node-99.invalid-datacenter.local',
      error: simulationState?.scenarioB_dnsFailure?.error ?? (simulationState as any)?.scenario_2_dns?.error ?? null,
    },
    scenarioC_tcpUnreachable: {
      active: simulationState?.scenarioC_tcpUnreachable?.active ?? (simulationState as any)?.scenario_3_tcp?.active ?? false,
      targetPort: simulationState?.scenarioC_tcpUnreachable?.targetPort ?? (simulationState as any)?.scenario_3_tcp?.target_port ?? 8888,
      error: simulationState?.scenarioC_tcpUnreachable?.error ?? (simulationState as any)?.scenario_3_tcp?.error ?? null,
    },
    scenarioD_diskPressure: {
      active: simulationState?.scenarioD_diskPressure?.active ?? (simulationState as any)?.scenario_4_disk?.active ?? false,
      simulatedDiskUsedPercent: simulationState?.scenarioD_diskPressure?.simulatedDiskUsedPercent ?? (simulationState as any)?.scenario_4_disk?.simulated_pct ?? 94.6,
      thresholdPercent: simulationState?.scenarioD_diskPressure?.thresholdPercent ?? (simulationState as any)?.scenario_4_disk?.threshold_percent ?? 85.0,
    }
  };

  const isAnyActive =
    !safeState.scenarioA_httpService.running ||
    safeState.scenarioB_dnsFailure.active ||
    safeState.scenarioC_tcpUnreachable.active ||
    safeState.scenarioD_diskPressure.active;

  return (
    <div className="space-y-6">
      {/* Simulation Lab Mission Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Safe Failure Simulation Lab</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Zero Risk Guarantee
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Execute repeatable data center failure scenarios to capture diagnostic evidence, test incident alert thresholds, and practice AI root-cause analysis without ever endangering system disks, processes, or network configurations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAnyActive && (
            <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              Failure Conditions Active
            </span>
          )}
          <button
            onClick={() => onAction('reset_all', 'reset')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All to Healthy</span>
          </button>
        </div>
      </div>

      {/* 4 Repeatable Demonstration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario A: Local HTTP Service Crash */}
        <div className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition ${
          !safeState.scenarioA_httpService.running
            ? 'border-red-500/60 bg-red-950/10'
            : 'border-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                  Scenario A
                </span>
                <h3 className="text-sm font-semibold text-white">Local Test HTTP Service Outage</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Simulates process crash or port listener failure on <code className="text-blue-300">127.0.0.1:8085</code>.
              </p>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                safeState.scenarioA_httpService.running
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
              }`}
            >
              {safeState.scenarioA_httpService.running ? 'HEALTHY' : 'OUTAGE'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
            <div className="text-slate-400 text-[11px]">Observed Diagnostic Evidence:</div>
            <div className="text-slate-200">
              {safeState.scenarioA_httpService.running ? (
                <span className="text-emerald-400">Daemon listening on port 8085 • HTTP 200 OK</span>
              ) : (
                <span className="text-red-400">ECONNREFUSED 127.0.0.1:8085 (SYN packet rejected with RST)</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {safeState.scenarioA_httpService.running ? (
                <button
                  onClick={() => onAction('http_service', 'fail')}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition"
                >
                  Simulate Service Crash
                </button>
              ) : (
                <button
                  onClick={() => onAction('http_service', 'reset')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restart Service (Remediate)
                </button>
              )}
            </div>

            <button
              onClick={() => onCreateIncidentFromScenario('http_service')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 underline"
            >
              <span>Triage in AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scenario B: DNS Resolution Failure */}
        <div className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition ${
          safeState.scenarioB_dnsFailure.active
            ? 'border-red-500/60 bg-red-950/10'
            : 'border-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                  Scenario B
                </span>
                <h3 className="text-sm font-semibold text-white">DNS Resolution Failure (NXDOMAIN)</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Demonstrates query failure against deliberately invalid domain <code className="text-blue-300">internal-db-node-99.invalid-datacenter.local</code>.
              </p>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                !safeState.scenarioB_dnsFailure.active
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
              }`}
            >
              {!safeState.scenarioB_dnsFailure.active ? 'HEALTHY' : 'DNS FAULT'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
            <div className="text-slate-400 text-[11px]">Observed Diagnostic Evidence:</div>
            <div className="text-slate-200">
              {!safeState.scenarioB_dnsFailure.active ? (
                <span className="text-emerald-400">DNS subsystem nominal (Resolving standard hostnames)</span>
              ) : (
                <span className="text-red-400">getaddrinfo ENOTFOUND • NXDOMAIN response code</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {!safeState.scenarioB_dnsFailure.active ? (
                <button
                  onClick={() => onAction('dns_failure', 'fail')}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition"
                >
                  Inject DNS Failure
                </button>
              ) : (
                <button
                  onClick={() => onAction('dns_failure', 'reset')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore DNS Config
                </button>
              )}
            </div>

            <button
              onClick={() => onCreateIncidentFromScenario('dns_failure')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 underline"
            >
              <span>Triage in AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scenario C: Unreachable Local TCP Port */}
        <div className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition ${
          safeState.scenarioC_tcpUnreachable.active
            ? 'border-red-500/60 bg-red-950/10'
            : 'border-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                  Scenario C
                </span>
                <h3 className="text-sm font-semibold text-white">Unreachable Permitted TCP Port</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Demonstrates socket timeout / closed port rejection on loopback <code className="text-blue-300">:8888</code>.
              </p>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                !safeState.scenarioC_tcpUnreachable.active
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
              }`}
            >
              {!safeState.scenarioC_tcpUnreachable.active ? 'HEALTHY' : 'PORT BLOCKED'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
            <div className="text-slate-400 text-[11px]">Observed Diagnostic Evidence:</div>
            <div className="text-slate-200">
              {!safeState.scenarioC_tcpUnreachable.active ? (
                <span className="text-emerald-400">Target loopback ports responding normally</span>
              ) : (
                <span className="text-red-400">ECONNREFUSED on port 8888 (No socket listener registered)</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {!safeState.scenarioC_tcpUnreachable.active ? (
                <button
                  onClick={() => onAction('tcp_unreachable', 'fail')}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition"
                >
                  Simulate Blocked Port
                </button>
              ) : (
                <button
                  onClick={() => onAction('tcp_unreachable', 'reset')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Port Connectivity
                </button>
              )}
            </div>

            <button
              onClick={() => onCreateIncidentFromScenario('tcp_unreachable')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 underline"
            >
              <span>Triage in AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scenario D: Safe Storage Pressure Logic */}
        <div className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition ${
          safeState.scenarioD_diskPressure.active
            ? 'border-red-500/60 bg-red-950/10'
            : 'border-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                  Scenario D
                </span>
                <h3 className="text-sm font-semibold text-white">Safe Storage Pressure Threshold Alert</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Safely feeds simulated 94.6% utilization reading into alerting logic without writing any data to host disk.
              </p>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                !safeState.scenarioD_diskPressure.active
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
              }`}
            >
              {!safeState.scenarioD_diskPressure.active ? 'HEALTHY' : 'THRESHOLD EXCEEDED'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
            <div className="text-slate-400 text-[11px]">Observed Diagnostic Evidence:</div>
            <div className="text-slate-200">
              {!safeState.scenarioD_diskPressure.active ? (
                <span className="text-emerald-400">Root filesystem utilization within normal limits (&lt;85%)</span>
              ) : (
                <span className="text-red-400">Storage utilization at 94.6% [SIMULATED] (Capacity threshold: 85%)</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {!safeState.scenarioD_diskPressure.active ? (
                <button
                  onClick={() => onAction('disk_pressure', 'fail')}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition"
                >
                  Trigger Storage Alert
                </button>
              ) : (
                <button
                  onClick={() => onAction('disk_pressure', 'reset')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Normal Reading
                </button>
              )}
            </div>

            <button
              onClick={() => onCreateIncidentFromScenario('disk_pressure')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 underline"
            >
              <span>Triage in AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
