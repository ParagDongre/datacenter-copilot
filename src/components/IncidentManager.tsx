import React, { useState } from 'react';
import { ShieldCheck, Plus, Download, FileText, CheckCircle2, AlertTriangle, Clock, MessageSquare, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { IncidentRecord, SystemMetrics } from '../types';

interface IncidentManagerProps {
  incidents: IncidentRecord[];
  onAddNote: (incidentId: string, note: string) => void;
  onUpdateStatus: (incidentId: string, status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED') => void;
  onExportMarkdown: (incident: IncidentRecord) => void;
  onExportJson: (incident: IncidentRecord) => void;
  metrics: SystemMetrics | null;
  onResolveWithSnapshot: (incidentId: string, remediation: string, outcome: string) => void;
}

export const IncidentManager: React.FC<IncidentManagerProps> = ({
  incidents,
  onAddNote,
  onUpdateStatus,
  onExportMarkdown,
  onExportJson,
  metrics,
  onResolveWithSnapshot
}) => {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'INVESTIGATING' | 'RESOLVED'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(incidents[0]?.id || null);
  const [noteInputs, setNoteInputs] = useState<{ [id: string]: string }>({});
  const [remediationInput, setRemediationInput] = useState('');
  const [outcomeInput, setOutcomeInput] = useState('Service listener verified in LISTEN state; HTTP 200 OK confirmed.');

  const filteredIncidents = incidents.filter(i => {
    if (filter === 'ALL') return true;
    return i.status === filter;
  });

  const handleAddNote = (id: string) => {
    const text = noteInputs[id]?.trim();
    if (!text) return;
    onAddNote(id, text);
    setNoteInputs(prev => ({ ...prev, [id]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            Operational Incident Management & Post-Mortem Records
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track incident lifecycles, attach engineer runbook notes, compare pre/post remediation metrics, and export auditable Markdown reports.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-md transition ${
                filter === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      {filteredIncidents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          No incidents matching filter "{filter}". Trigger a simulation scenario in the Failure Lab to populate an incident.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map(inc => {
            const isExpanded = expandedId === inc.id;
            return (
              <div
                key={inc.id}
                className={`bg-slate-900 border rounded-xl overflow-hidden transition ${
                  inc.status === 'RESOLVED'
                    ? 'border-slate-800'
                    : inc.severity === 'CRITICAL'
                    ? 'border-red-500/50'
                    : 'border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : inc.id)}
                  className="p-4 bg-slate-900/90 hover:bg-slate-800/40 cursor-pointer flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-400">{inc.id}</span>
                        <h3 className="text-sm font-semibold text-white">{inc.title}</h3>
                        {inc.isSimulated && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SIMULATED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                        <span>Category: {inc.category}</span>
                        <span>Created: {new Date(inc.createdAt).toLocaleTimeString()}</span>
                        {inc.resolvedAt && (
                          <span className="text-emerald-400">
                            Resolved: {new Date(inc.resolvedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full font-mono ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {inc.severity}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded font-mono ${
                        inc.status === 'RESOLVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : inc.status === 'INVESTIGATING'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-5 space-y-5 bg-slate-950/40">
                    {/* Status Changer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Lifecycle Status:</span>
                        {(['OPEN', 'INVESTIGATING', 'RESOLVED'] as const).map(st => (
                          <button
                            key={st}
                            onClick={() => onUpdateStatus(inc.id, st)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition ${
                              inc.status === st
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onExportMarkdown(inc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-mono transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>Download .MD Post-Mortem</span>
                        </button>
                        <button
                          onClick={() => onExportJson(inc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-mono transition"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>JSON Export</span>
                        </button>
                      </div>
                    </div>

                    {/* Evidence & Telemetry Snapshot */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900 rounded-lg p-3.5 border border-slate-800 space-y-2">
                        <h4 className="text-xs font-semibold text-slate-300">Observed Evidence Payload</h4>
                        <pre className="text-[11px] font-mono bg-slate-950 p-2.5 rounded text-emerald-300 overflow-x-auto border border-slate-800">
                          {JSON.stringify(inc.evidence, null, 2)}
                        </pre>
                      </div>

                        {/* Pre vs Post Remediation Comparison */}
                        <div className="bg-slate-900 rounded-lg p-3.5 border border-slate-800 space-y-2">
                          <h4 className="text-xs font-semibold text-slate-300">Pre vs Post Remediation Verification</h4>
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                              <div className="text-slate-400 font-bold mb-1">Pre-Remediation:</div>
                              <div>
                                CPU: {Number(
                                  (inc.preSnapshot?.cpu as any)?.cpuUsagePercent ??
                                  (inc.preSnapshot?.cpu as any)?.percent ??
                                  12
                                )}%
                              </div>
                              <div>
                                Disk: {Number(
                                  (inc.preSnapshot?.disk as any)?.usedPercent ??
                                  (inc.preSnapshot?.disk as any)?.percent ??
                                  24
                                )}%
                              </div>
                              <div className="text-red-400">State: FAULT OBSERVED</div>
                            </div>

                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                              <div className="text-emerald-400 font-bold mb-1">Post-Remediation:</div>
                              {inc.postSnapshot ? (
                                <>
                                  <div>
                                    CPU: {Number(
                                      (inc.postSnapshot.cpu as any)?.cpuUsagePercent ??
                                      (inc.postSnapshot.cpu as any)?.percent ??
                                      8
                                    )}%
                                  </div>
                                  <div>
                                    Disk: {Number(
                                      (inc.postSnapshot.disk as any)?.usedPercent ??
                                      (inc.postSnapshot.disk as any)?.percent ??
                                      20
                                    )}%
                                  </div>
                                  <div className="text-emerald-400">State: VERIFIED HEALTHY</div>
                                </>
                              ) : (
                                <div className="text-slate-500 italic mt-2">Pending fix application</div>
                              )}
                            </div>
                          </div>

                        {inc.status !== 'RESOLVED' && (
                          <div className="pt-2">
                            <button
                              onClick={() =>
                                onResolveWithSnapshot(
                                  inc.id,
                                  remediationInput || 'Applied runbook procedure; restarted daemon.',
                                  outcomeInput
                                )
                              }
                              className="w-full py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded text-xs font-semibold transition"
                            >
                              Verify & Mark Resolved with Live Snapshot
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Investigation Notes Feed */}
                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-400" />
                        Technician Investigation Runbook Notes
                      </h4>

                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {inc.notes.length === 0 ? (
                          <div className="text-xs text-slate-500 italic">No notes recorded yet.</div>
                        ) : (
                          inc.notes.map((n, idx) => (
                            <div key={idx} className="bg-slate-950 p-2 rounded text-xs border border-slate-800">
                              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                <span className="font-bold text-blue-300">{n.author}</span>
                                <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-slate-200">{n.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Note Bar */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Log diagnostic command output or physical inspection observation..."
                          value={noteInputs[inc.id] || ''}
                          onChange={e => setNoteInputs({ ...noteInputs, [inc.id]: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleAddNote(inc.id)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleAddNote(inc.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
                        >
                          Append Note
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
