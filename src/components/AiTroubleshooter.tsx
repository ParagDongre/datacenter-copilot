import React, { useState } from 'react';
import { Cpu, ShieldCheck, AlertCircle, Terminal, Copy, Check, ArrowRight, Zap, RefreshCw, FileText } from 'lucide-react';
import { RcaAnalysis, SystemMetrics } from '../types';

interface AiTroubleshooterProps {
  metrics: SystemMetrics | null;
  onAnalyze: (payload: any) => Promise<{
    analysis: RcaAnalysis;
    fallbackMode?: boolean;
    error?: string;
    source?: string;
    modelUsed?: string;
    latencyMs?: number;
    verifiedByAiStudio?: boolean;
  }>;
  activeIncidentPreset?: any;
}

export const AiTroubleshooter: React.FC<AiTroubleshooterProps> = ({ metrics, onAnalyze, activeIncidentPreset }) => {
  const [incidentTitle, setIncidentTitle] = useState(activeIncidentPreset?.title || 'Telemetry Daemon Unresponsive on Port 8085');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>(activeIncidentPreset?.severity || 'HIGH');
  const [evidenceInput, setEvidenceInput] = useState(
    JSON.stringify(
      activeIncidentPreset?.evidence || {
        target_port: 8085,
        target_host: '127.0.0.1',
        error_code: 'ECONNREFUSED',
        error_message: 'connect ECONNREFUSED 127.0.0.1:8085',
        layer: 'Layer 4 Transport / TCP',
        service_daemon: 'test-telemetry-agent'
      },
      null,
      2
    )
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RcaAnalysis | null>(null);
  const [aiMetadata, setAiMetadata] = useState<{
    source: string;
    modelUsed?: string;
    latencyMs?: number;
    verifiedByAiStudio?: boolean;
    error?: string;
  } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [apiKeyDetected, setApiKeyDetected] = useState<boolean | null>(null);

  React.useEffect(() => {
    fetch('/api/gemini/status')
      .then(res => res.json())
      .then(data => setApiKeyDetected(Boolean(data.hasApiKey)))
      .catch(() => setApiKeyDetected(false));
  }, []);

  const handleRunRca = async () => {
    setLoading(true);
    try {
      let parsedEvidence = {};
      try {
        parsedEvidence = JSON.parse(evidenceInput);
      } catch {
        parsedEvidence = { rawText: evidenceInput };
      }

      const res = await onAnalyze({
        incidentTitle,
        severity,
        evidence: parsedEvidence,
        systemContext: metrics,
        notes
      });

      setAnalysisResult(res.analysis);
      setAiMetadata({
        source: res.source || (res.fallbackMode ? 'offline_heuristic_fallback' : 'gemini_api'),
        modelUsed: res.modelUsed || 'gemini-3.8-flash',
        latencyMs: res.latencyMs,
        verifiedByAiStudio: res.verifiedByAiStudio ?? !res.fallbackMode,
        error: res.error
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* AI Assistant Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">Gemini Data Center Operations Copilot</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
              Model: gemini-3.8-flash
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Synthesizes Linux telemetry, network socket outputs, and system errors into evidence-based Root Cause Analyses. Strictly adheres to safe read-only commands and refuses to fabricate causes without proof.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {apiKeyDetected === true && (
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              GEMINI_API_KEY Active
            </span>
          )}
          {apiKeyDetected === false && (
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Offline Heuristic Mode (No Key Needed)
            </span>
          )}
          {aiMetadata && aiMetadata.source !== 'gemini_api' && (
            <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
              Offline Heuristic Engine Active
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Incident Input Formulation */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Incident Investigation Input</h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Incident Summary / Title
              </label>
              <input
                type="text"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Reported Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="CRITICAL">CRITICAL (P0)</option>
                  <option value="HIGH">HIGH (P1)</option>
                  <option value="MEDIUM">MEDIUM (P2)</option>
                  <option value="LOW">LOW (P3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Lab Preset Loaders
                </label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'http') {
                      setIncidentTitle('Telemetry Daemon Unresponsive on Port 8085');
                      setSeverity('HIGH');
                      setEvidenceInput(JSON.stringify({ target_port: 8085, host: '127.0.0.1', error: 'ECONNREFUSED', state: 'TCP SYN rejected' }, null, 2));
                    } else if (val === 'dns') {
                      setIncidentTitle('DNS Resolution Failure for internal-db-node-99');
                      setSeverity('HIGH');
                      setEvidenceInput(JSON.stringify({ domain: 'internal-db-node-99.invalid-datacenter.local', error: 'ENOTFOUND / NXDOMAIN', nameserver: '127.0.0.53' }, null, 2));
                    } else if (val === 'disk') {
                      setIncidentTitle('Root Filesystem Disk Space Alert (>85%)');
                      setSeverity('HIGH');
                      setEvidenceInput(JSON.stringify({ filesystem: '/', used_pct: 94.6, threshold: 85.0, warning: 'Potential disk fill' }, null, 2));
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">Load Lab Scenario Preset...</option>
                  <option value="http">Scenario A: HTTP Daemon Down</option>
                  <option value="dns">Scenario B: DNS Resolution Failure</option>
                  <option value="disk">Scenario D: Storage Threshold Pressure</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Diagnostic Telemetry & Raw Evidence (JSON)
              </label>
              <textarea
                rows={6}
                value={evidenceInput}
                onChange={(e) => setEvidenceInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Technician Notes / Context (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Occurred immediately following scheduled patch window"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleRunRca}
              disabled={loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow transition"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Root Cause Analysis...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Generate Root Cause Analysis (RCA)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Structured AI Root Cause Analysis Output */}
        <div className="lg:col-span-7 space-y-4">
          {analysisResult ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              {/* AI Source Attestation Banner */}
              {aiMetadata && (
                <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  aiMetadata.source === 'gemini_api'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${aiMetadata.source === 'gemini_api' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    <span className="font-bold">
                      {aiMetadata.source === 'gemini_api' ? 'Verified Gemini 3.8 Flash Inference' : 'Offline Python Heuristic Engine'}
                    </span>
                    {typeof aiMetadata.latencyMs === 'number' && (
                      <span className="text-slate-400 text-[11px]">({aiMetadata.latencyMs}ms latency)</span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">
                    {aiMetadata.source === 'gemini_api' ? 'Model: gemini-3.8-flash' : 'Source: offline fallback'}
                  </span>
                </div>
              )}

              {/* Header Badge */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      RCA Post-Mortem Report
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      analysisResult.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      Severity: {analysisResult.severity}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {analysisResult.incidentSummary}
                  </h3>
                </div>
              </div>

              {/* 1. Confirmed Observations */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  1. Confirmed Observations (Empirical Facts)
                </h4>
                <ul className="space-y-1 text-xs text-slate-300 font-mono">
                  {analysisResult.confirmedObservations.map((obs, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Hypotheses Ranked by Likelihood */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  2. Root Cause Hypotheses (Ranked by Probability)
                </h4>
                <div className="space-y-3">
                  {analysisResult.hypotheses.map((hyp, i) => (
                    <div key={i} className="bg-slate-950/60 rounded-lg p-3.5 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">{i + 1}. {hyp.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          hyp.probability === 'HIGH'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : hyp.probability === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {hyp.probability} PROBABILITY
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-emerald-400 font-semibold">Supporting Evidence:</span>
                          <ul className="mt-0.5 text-slate-400 space-y-0.5">
                            {hyp.supportingEvidence.map((s, idx) => (
                              <li key={idx}>+ {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold">Contradicting Evidence:</span>
                          <ul className="mt-0.5 text-slate-500 space-y-0.5">
                            {hyp.contradictingEvidence.map((c, idx) => (
                              <li key={idx}>- {c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Recommended Read-Only Commands */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                  3. Next Diagnostic Commands (Safe & Read-Only)
                </h4>
                <div className="space-y-2">
                  {analysisResult.recommendedDiagnosticCommands.map((cmd, i) => (
                    <div
                      key={i}
                      className="bg-slate-950 rounded-lg p-2.5 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex-1 truncate">
                        <div className="text-emerald-400 font-bold select-all truncate">{cmd.command}</div>
                        <div className="text-slate-400 text-[11px] font-sans truncate">{cmd.purpose}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(cmd.command)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
                        title="Copy command to clipboard"
                      >
                        {copiedCmd === cmd.command ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Safe Remediation & Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                    4. Safe Remediation Steps
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {analysisResult.safeRemediationSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-blue-400 font-bold">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
                    5. Verification Procedure
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {analysisResult.verificationProcedure.map((ver, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{ver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Escalation & Uncertainty */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
                <div>
                  <span className="text-slate-300 font-semibold">Remaining Uncertainty: </span>
                  {analysisResult.remainingUncertainty}
                </div>
                <div>
                  <span className="text-red-400 font-semibold">L2 Escalation Criteria: </span>
                  {analysisResult.escalationCriteria}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <Cpu className="w-10 h-10 text-slate-600" />
              <h4 className="text-sm font-semibold text-slate-200">Awaiting Diagnostic Evidence</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Select a lab preset or input your incident parameters on the left, then click "Generate Root Cause Analysis" to run the AI Copilot.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
