import React, { useState, useEffect } from 'react';
import { 
  Wrench, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, Server, 
  Search, Check, Zap, Eye, RefreshCw, FileText, ArrowRight, CornerDownRight, HelpCircle
} from 'lucide-react';
import { HardwareScenario } from '../types';

interface HardwareBreakFixLabProps {
  onCreateIncidentFromScenario?: (scenario: HardwareScenario) => void;
}

export const HardwareBreakFixLab: React.FC<HardwareBreakFixLabProps> = ({ onCreateIncidentFromScenario }) => {
  const [scenarios, setScenarios] = useState<HardwareScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<HardwareScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Interactive troubleshooting states
  const [revealedSteps, setRevealedSteps] = useState<number[]>([]);
  const [userSelectedHypothesis, setUserSelectedHypothesis] = useState<string | null>(null);
  const [showResolution, setShowResolution] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  useEffect(() => {
    async function loadScenarios() {
      try {
        const res = await fetch('/api/oci/scenarios');
        if (res.ok) {
          const data: HardwareScenario[] = await res.json();
          setScenarios(data);
          if (data.length > 0) {
            setSelectedScenario(data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load hardware scenarios:', err);
      } finally {
        setLoading(false);
      }
    }
    loadScenarios();
  }, []);

  // Reset interactive workflow when switching scenario
  useEffect(() => {
    setRevealedSteps([1]); // Step 1 revealed by default
    setUserSelectedHypothesis(null);
    setShowResolution(false);
    setCopiedNote(false);
  }, [selectedScenario]);

  const handleRevealNextStep = () => {
    if (!selectedScenario) return;
    const nextStep = revealedSteps.length + 1;
    if (nextStep <= selectedScenario.diagnostic_steps.length) {
      setRevealedSteps(prev => [...prev, nextStep]);
    }
  };

  const categories = ['ALL', 'HARDWARE_POWER', 'HARDWARE_NETWORK', 'HARDWARE_STORAGE', 'HARDWARE_MEMORY', 'HARDWARE_THERMAL', 'HARDWARE_COOLING', 'POST_MAINTENANCE'];

  const filtered = scenarios.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.asset_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.initial_symptoms.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCopyNote = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-red-500" />
        <p className="text-sm">Loading 11 OCI Hardware Break-Fix Lab Scenarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-900/40 text-red-400 border border-red-700/50">
                OCI Technician SOP Standard
              </span>
              <span className="text-xs text-slate-400">11 Known Server & Network Failure Modes</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-500" />
              Hardware Diagnostics and Break-Fix Lab
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Guided troubleshooting simulator for data center technicians. Investigate observable evidence, step through ordered diagnostic SOP procedures, test root-cause hypotheses, and apply safe physical FRU remediations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded text-xs font-mono bg-blue-950/60 text-blue-300 border border-blue-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              SOP Adherence Enforced
            </span>
          </div>
        </div>

        {/* Safety & Realism Disclaimer */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-amber-900/30 text-amber-300 rounded border border-amber-800 font-mono text-[10px]">
            PHYSICAL BOUNDARY NOTICE
          </span>
          <span>
            This application simulates server break-fix workflows and demonstrates technician diagnostic reasoning. It does not remotely alter physical server hardware or bypass data center safety lockouts.
          </span>
        </div>
      </div>

      {/* Main Layout: Scenario Browser (Left) & Guided Lab (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scenario Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search & Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search faults, symptoms, or assets..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] px-2 py-1 rounded font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {cat.replace('HARDWARE_', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filtered.map(scen => {
              const isSelected = selectedScenario?.id === scen.id;
              return (
                <div
                  key={scen.id}
                  onClick={() => setSelectedScenario(scen)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition text-left ${
                    isSelected
                      ? 'bg-red-950/30 border-red-600/80 shadow-md'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      {scen.id}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      scen.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      scen.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {scen.severity}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-100 leading-snug mb-1">
                    {scen.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/80">
                    <span>{scen.asset_tag}</span>
                    <span className="text-slate-500">{scen.rack_location}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Diagnostic Workflow (8 cols) */}
        <div className="lg:col-span-8">
          {selectedScenario ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              {/* Header: Title, Asset & Location */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-700/50">
                      {selectedScenario.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Asset: <strong className="text-slate-200">{selectedScenario.asset_tag}</strong>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Location: <strong className="text-slate-200">{selectedScenario.rack_location}</strong>
                    </span>
                  </div>

                  <span className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                    selectedScenario.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    selectedScenario.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {selectedScenario.severity} SEVERITY
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight">
                  {selectedScenario.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Chassis Model: {selectedScenario.chassis_model}
                </p>
              </div>

              {/* Section 1: Initial Symptoms & Observable Evidence */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  1. Initial Symptoms & Observable Evidence
                </h4>
                
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-amber-400">Dispatch Report: </span>
                  {selectedScenario.initial_symptoms}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Observable Hardware & Telemetry Evidence:
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {selectedScenario.observable_evidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-400 font-bold shrink-0">•</span>
                        <span className="font-mono text-slate-200">{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 2: Ordered Diagnostic Steps (Progressive Disclosure) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-400" />
                    2. Ordered Technician Diagnostic Steps ({revealedSteps.length}/{selectedScenario.diagnostic_steps.length} Investigated)
                  </h4>

                  {revealedSteps.length < selectedScenario.diagnostic_steps.length && (
                    <button
                      onClick={handleRevealNextStep}
                      className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Execute Next Step #{revealedSteps.length + 1}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {selectedScenario.diagnostic_steps.map((st) => {
                    const isRevealed = revealedSteps.includes(st.step);
                    return (
                      <div
                        key={st.step}
                        className={`p-3 rounded-lg border text-xs transition ${
                          isRevealed
                            ? 'bg-slate-950 border-slate-800 text-slate-200'
                            : 'bg-slate-950/40 border-slate-800/40 text-slate-600 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold mb-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isRevealed ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {st.step}
                          </span>
                          <span className={isRevealed ? 'text-slate-200' : 'text-slate-600'}>
                            {st.action}
                          </span>
                        </div>

                        {isRevealed ? (
                          <div className="mt-2 pl-7 text-xs text-emerald-400 flex items-start gap-1.5 bg-emerald-950/20 p-2 rounded border border-emerald-900/40 font-mono">
                            <CornerDownRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span><strong>Observable Finding:</strong> {st.finding}</span>
                          </div>
                        ) : (
                          <div className="pl-7 text-[11px] text-slate-600 italic">
                            (Step locked — click 'Execute Next Step' above after reviewing previous evidence)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Root Cause Hypothesis Evaluation */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  3. Technician Hypothesis Evaluation (Choose Your Diagnosis)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedScenario.hypotheses.map((hyp, i) => {
                    const isSelected = userSelectedHypothesis === hyp.title;
                    const isCorrect = hyp.verdict === 'CONFIRMED';
                    return (
                      <button
                        key={i}
                        onClick={() => setUserSelectedHypothesis(hyp.title)}
                        className={`p-3 rounded-lg border text-left text-xs transition relative ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                              : 'bg-rose-950/40 border-rose-500 text-rose-200'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="font-semibold mb-1 text-slate-100">{hyp.title}</div>
                        {userSelectedHypothesis && (
                          <div className="mt-2 text-[11px] font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isCorrect ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                            }`}>
                              {hyp.verdict}
                            </span>
                            <p className="mt-1 text-slate-400">{hyp.reason}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Safe SOP Remediation & Post-Verification */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-slate-300 tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    4. Safe SOP Remediation & Post-Verification
                  </h4>
                  
                  {!showResolution && (
                    <button
                      onClick={() => setShowResolution(true)}
                      className="text-xs px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-1.5 transition"
                    >
                      <span>Show Approved SOP Remediation</span>
                    </button>
                  )}
                </div>

                {showResolution && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Confirmed Findings */}
                    <div className="bg-emerald-950/20 border border-emerald-800/60 rounded-lg p-3 text-xs text-emerald-300">
                      <strong>Confirmed Findings: </strong>
                      {selectedScenario.confirmed_findings}
                    </div>

                    {/* SOP Steps */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Approved Break-Fix SOP Steps:
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                        {selectedScenario.safe_sop_remediation.map((step, i) => (
                          <li key={i} className="leading-relaxed">{step}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Post-Verification Checklist */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Post-Remediation Verification Protocol:</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {selectedScenario.post_verification.map((v, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Escalation Conditions */}
                    <div className="bg-amber-950/20 border border-amber-800/60 rounded-lg p-3 text-xs text-amber-300">
                      <strong>Escalation Criteria: </strong>
                      {selectedScenario.escalation_conditions}
                    </div>

                    {/* Ticket Resolution Note */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Concise Ticket Resolution Note (Ready for Handover)
                        </span>
                        <button
                          onClick={() => handleCopyNote(selectedScenario.ticket_resolution_note)}
                          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition"
                        >
                          {copiedNote ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
                          <span>{copiedNote ? 'Copied' : 'Copy Note'}</span>
                        </button>
                      </div>
                      <p className="font-mono text-xs text-slate-400 bg-slate-900 p-3 rounded border border-slate-800/80 leading-relaxed">
                        {selectedScenario.ticket_resolution_note}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900">
              Select a hardware break-fix scenario from the left column to begin guided diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
