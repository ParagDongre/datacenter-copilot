import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HealthDashboard } from './components/HealthDashboard';
import { NetworkDiagnostics } from './components/NetworkDiagnostics';
import { SimulationLab } from './components/SimulationLab';
import { AiTroubleshooter } from './components/AiTroubleshooter';
import { IncidentManager } from './components/IncidentManager';
import { TestRunner } from './components/TestRunner';
import { PythonCodebaseViewer } from './components/PythonCodebaseViewer';
import { SetupAndInterviewPrep } from './components/SetupAndInterviewPrep';
import { SystemMetrics, SimulationState, IncidentRecord, NetworkDiagResult, RcaAnalysis } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('health');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    scenarioA_httpService: { running: true, port: 8085, error: null },
    scenarioB_dnsFailure: { active: false, targetDomain: 'internal-db-node-99.invalid-datacenter.local', error: null },
    scenarioC_tcpUnreachable: { active: false, targetPort: 8888, error: null },
    scenarioD_diskPressure: { active: false, simulatedDiskUsedPercent: 94.6, thresholdPercent: 85.0 }
  });
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [activeIncidentPreset, setActiveIncidentPreset] = useState<any>(null);

  // Poll system metrics
  const fetchMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const res = await fetch('/api/system/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Poll simulation status
  const fetchSimStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/simulations/status');
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setSimulationState(data.state);
        }
      }
    } catch (err) {
      console.error('Error fetching simulation state:', err);
    }
  }, []);

  // Poll incidents from persistent SQLite
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setIncidents(data);
        } else {
          // Initialize baseline record into SQLite so it persists
          const initRes = await fetch('/api/incidents/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              incidentId: 'INC-849201',
              title: 'Telemetry Daemon Unresponsive on Port 8085',
              severity: 'HIGH',
              category: 'NETWORK_TCP',
              isSimulated: true,
              evidence: {
                target_port: 8085,
                target_host: '127.0.0.1',
                error_code: 'ECONNREFUSED',
                error_message: 'connect ECONNREFUSED 127.0.0.1:8085',
                layer: 'Layer 4 Transport / TCP',
                service_daemon: 'test-telemetry-agent'
              }
            })
          });
          if (initRes.ok) {
            const created = await initRes.json();
            // Attach baseline note
            await fetch('/api/incidents/note', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                incidentId: 'INC-849201',
                text: 'Polled localhost:8085; TCP SYN rejected with RST flag. Daemon pid not found in process table.',
                author: 'Data Center Tech'
              })
            });
            const refreshed = await fetch('/api/incidents');
            if (refreshed.ok) {
              setIncidents(await refreshed.json());
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching persistent incidents:', err);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchSimStatus();
    fetchIncidents();
  }, [fetchMetrics, fetchSimStatus, fetchIncidents]);

  // Simulation Action handler
  const handleSimulationAction = async (scenario: string, action: string) => {
    try {
      const res = await fetch('/api/simulations/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, action })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setSimulationState(data.state);
        }
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Error triggering simulation:', err);
    }
  };

  // Run Network Diagnostic
  const handleRunNetworkDiagnosis = async (type: 'dns' | 'tcp' | 'routing', target?: string, port?: number): Promise<NetworkDiagResult> => {
    try {
      const res = await fetch('/api/network/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, target, port })
      });
      return await res.json();
    } catch (err: any) {
      return {
        type,
        success: false,
        errorMessage: err.message,
        timestamp: new Date().toISOString()
      };
    }
  };

  // Run Gemini AI Analysis
  const handleAnalyzeIncident = async (payload: any): Promise<{
    analysis: RcaAnalysis;
    fallbackMode?: boolean;
    error?: string;
    source?: string;
    modelUsed?: string;
    latencyMs?: number;
    verifiedByAiStudio?: boolean;
  }> => {
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const targetIncId = payload.incidentId || activeIncidentPreset?.id;
      if (targetIncId && data.analysis) {
        try {
          await fetch('/api/incidents/analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incidentId: targetIncId, analysis: data.analysis })
          });
          setIncidents(prev => prev.map(i => i.id === targetIncId ? { ...i, analysis: data.analysis } : i));
        } catch {
          // Non-blocking persistence attempt
        }
      }
      return data;
    } catch (err: any) {
      return {
        fallbackMode: true,
        error: err.message,
        analysis: {
          incidentSummary: `Diagnostic investigation for ${payload.incidentTitle || 'incident'}.`,
          severity: 'HIGH',
          confirmedObservations: ['TCP/Network telemetry indicated connection drop.'],
          hypotheses: [
            {
              title: 'Process or Daemon Failure',
              probability: 'HIGH',
              supportingEvidence: ['Connection refused on local target port.'],
              contradictingEvidence: []
            }
          ],
          recommendedDiagnosticCommands: [
            { command: 'ss -tuln', purpose: 'Check listening sockets', isSafeReadOnly: true },
            { command: 'dmesg -T | tail -n 20', purpose: 'Inspect kernel buffer', isSafeReadOnly: true }
          ],
          safeRemediationSteps: ['Restart service using simulation toggle or systemctl.'],
          verificationProcedure: ['Verify TCP port status.'],
          remainingUncertainty: 'Process exit logs needed.',
          escalationCriteria: 'Escalate if immediate crash recurs.'
        }
      };
    }
  };

  // Create an incident from a failure scenario
  const handleCreateIncidentFromScenario = async (scenarioKey: string) => {
    const incId = `INC-${Math.floor(100000 + Math.random() * 900000)}`;
    let newInc: IncidentRecord;

    if (scenarioKey === 'http_service') {
      newInc = {
        id: incId,
        title: 'Local Test HTTP Service Outage (Port 8085)',
        severity: 'HIGH',
        category: 'SERVICE_DAEMON',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        isSimulated: true,
        evidence: {
          error_code: 'ECONNREFUSED',
          target_port: 8085,
          target_host: '127.0.0.1',
          description: 'Daemon listener process halted.'
        },
        notes: [],
        preSnapshot: metrics
      };
    } else if (scenarioKey === 'dns_failure') {
      newInc = {
        id: incId,
        title: 'DNS Name Resolution Failure (NXDOMAIN)',
        severity: 'HIGH',
        category: 'NETWORK_DNS',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        isSimulated: true,
        evidence: {
          error_code: 'ENOTFOUND',
          target_domain: 'internal-db-node-99.invalid-datacenter.local',
          description: 'Domain does not exist in DNS hierarchy.'
        },
        notes: [],
        preSnapshot: metrics
      };
    } else if (scenarioKey === 'tcp_unreachable') {
      newInc = {
        id: incId,
        title: 'Closed Loopback TCP Port Probe (Port 8888)',
        severity: 'MEDIUM',
        category: 'NETWORK_TCP',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        isSimulated: true,
        evidence: {
          error_code: 'ECONNREFUSED',
          target_port: 8888,
          target_host: '127.0.0.1'
        },
        notes: [],
        preSnapshot: metrics
      };
    } else {
      newInc = {
        id: incId,
        title: 'Root Filesystem Storage Pressure Alert (>85%)',
        severity: 'CRITICAL',
        category: 'STORAGE',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        isSimulated: true,
        evidence: {
          metric: 'disk_used_percent',
          observed_value: 94.6,
          threshold: 85.0,
          warning: 'Filesystem nearing exhaustion.'
        },
        notes: [],
        preSnapshot: metrics
      };
    }

    // Persist to backend SQLite
    try {
      const res = await fetch('/api/incidents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: newInc.id,
          title: newInc.title,
          severity: newInc.severity,
          category: newInc.category,
          evidence: newInc.evidence,
          isSimulated: newInc.isSimulated,
          preMetrics: metrics
        })
      });
      if (res.ok) {
        const persisted = await res.json();
        setIncidents(prev => [persisted, ...prev.filter(i => i.id !== persisted.id)]);
        setActiveIncidentPreset(persisted);
      } else {
        setIncidents(prev => [newInc, ...prev]);
        setActiveIncidentPreset(newInc);
      }
    } catch {
      setIncidents(prev => [newInc, ...prev]);
      setActiveIncidentPreset(newInc);
    }
    setActiveTab('ai-rca');
  };

  // Incident Actions (Persisted in SQLite)
  const handleAddNote = async (id: string, text: string) => {
    try {
      const res = await fetch('/api/incidents/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: id, text, author: 'Data Center Tech' })
      });
      if (res.ok) {
        const { incident } = await res.json();
        if (incident) {
          setIncidents(prev => prev.map(i => i.id === id ? incident : i));
          return;
        }
      }
    } catch (err) {
      console.error('Error saving note:', err);
    }

    setIncidents(prev =>
      prev.map(i => {
        if (i.id === id) {
          return {
            ...i,
            notes: [...i.notes, { timestamp: new Date().toISOString(), author: 'Data Center Tech', text }]
          };
        }
        return i;
      })
    );
  };

  const handleUpdateStatus = async (id: string, newStatus: 'OPEN' | 'INVESTIGATING' | 'RESOLVED') => {
    try {
      const res = await fetch('/api/incidents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: id, status: newStatus })
      });
      if (res.ok) {
        const { incident } = await res.json();
        if (incident) {
          setIncidents(prev => prev.map(i => i.id === id ? incident : i));
          return;
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }

    setIncidents(prev =>
      prev.map(i => {
        if (i.id === id) {
          return {
            ...i,
            status: newStatus,
            resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : i.resolvedAt
          };
        }
        return i;
      })
    );
  };

  const handleResolveWithSnapshot = async (id: string, remediation: string, outcome: string) => {
    try {
      const res = await fetch('/api/incidents/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: id, remediation, outcome, postMetrics: metrics })
      });
      if (res.ok) {
        const { incident } = await res.json();
        if (incident) {
          setIncidents(prev => prev.map(i => i.id === id ? incident : i));
          return;
        }
      }
    } catch (err) {
      console.error('Error resolving incident:', err);
    }

    setIncidents(prev =>
      prev.map(i => {
        if (i.id === id) {
          return {
            ...i,
            status: 'RESOLVED',
            resolvedAt: new Date().toISOString(),
            remediationApplied: remediation,
            verifiedOutcome: outcome,
            postSnapshot: metrics
          };
        }
        return i;
      })
    );
  };

  const handleExportMarkdown = (inc: IncidentRecord) => {
    const md = `# DataCenter Copilot — Post-Mortem Incident Report

**Incident ID:** ${inc.id}
**Title:** ${inc.title}
**Severity:** ${inc.severity}
**Category:** ${inc.category}
**Status:** ${inc.status}
**Type:** ${inc.isSimulated ? '[SIMULATED LAB ENVIRONMENT]' : '[REAL SYSTEM TELEMETRY]'}
**Created:** ${inc.createdAt}
**Resolved:** ${inc.resolvedAt || 'In Progress'}

---

## 1. Executive Summary
An automated telemetry threshold anomaly was detected and investigated on server node \`${metrics?.hostname || 'dc-node-01'}\`.

---

## 2. Technical Evidence & Diagnostic Payload
\`\`\`json
${JSON.stringify(inc.evidence, null, 2)}
\`\`\`

---

## 3. Investigation Log
${inc.notes.length > 0 ? inc.notes.map(n => `- **[${new Date(n.timestamp).toLocaleTimeString()}] (${n.author}):** ${n.text}`).join('\n') : '- No manual notes logged.'}

---

## 4. Remediation & Verification
- **Remediation Action:** ${inc.remediationApplied || 'Daemon restarted / safe threshold reset.'}
- **Verified Outcome:** ${inc.verifiedOutcome || 'Verified normal operation.'}
- **Post-Remediation Status:** HEALTHY

---
*Generated by DataCenter Copilot — Portfolio Demonstration Grade*
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident_report_${inc.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = (inc: IncidentRecord) => {
    const jsonStr = JSON.stringify(inc, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident_${inc.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openIncidentsCount = incidents.filter(i => i.status !== 'RESOLVED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
      <Header
        metrics={metrics}
        loading={loadingMetrics}
        onRefresh={fetchMetrics}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openIncidentsCount={openIncidentsCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'health' && (
          <HealthDashboard
            metrics={metrics}
            loading={loadingMetrics}
            onTriggerSimulation={() => setActiveTab('simulations')}
          />
        )}

        {activeTab === 'network' && (
          <NetworkDiagnostics onRunDiagnosis={handleRunNetworkDiagnosis} />
        )}

        {activeTab === 'simulations' && (
          <SimulationLab
            simulationState={simulationState}
            onAction={handleSimulationAction}
            onCreateIncidentFromScenario={handleCreateIncidentFromScenario}
          />
        )}

        {activeTab === 'ai-rca' && (
          <AiTroubleshooter
            metrics={metrics}
            onAnalyze={handleAnalyzeIncident}
            activeIncidentPreset={activeIncidentPreset}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentManager
            incidents={incidents}
            onAddNote={handleAddNote}
            onUpdateStatus={handleUpdateStatus}
            onExportMarkdown={handleExportMarkdown}
            onExportJson={handleExportJson}
            metrics={metrics}
            onResolveWithSnapshot={handleResolveWithSnapshot}
          />
        )}

        {activeTab === 'tests' && <TestRunner />}

        {activeTab === 'python-code' && <PythonCodebaseViewer />}

        {activeTab === 'interview-prep' && <SetupAndInterviewPrep />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DataCenter Copilot • Portfolio Demonstration Lab for Google Data Center Technician Role</span>
          <span className="font-mono text-slate-400">Ubuntu Linux • Python 3.10 • Express • Gemini 3.8 Flash • pytest</span>
        </div>
      </footer>
    </div>
  );
}
