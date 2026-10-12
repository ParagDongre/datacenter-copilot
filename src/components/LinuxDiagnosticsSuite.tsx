import React, { useState, useEffect } from 'react';
import { 
  Terminal, ShieldCheck, Play, RefreshCw, CheckCircle2, AlertTriangle, 
  Copy, Check, FileText, CornerDownRight, Info, AlertOctagon, HelpCircle
} from 'lucide-react';
import { LinuxCommandResult } from '../types';

export const LinuxDiagnosticsSuite: React.FC = () => {
  const [commands, setCommands] = useState<Array<{ key: string; purpose: string; category: string; description: string; args: string[] }>>([]);
  const [results, setResults] = useState<Record<string, LinuxCommandResult>>({});
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('uname');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  useEffect(() => {
    async function fetchCommands() {
      try {
        const res = await fetch('/api/linux/commands');
        if (res.ok) {
          const list = await res.json();
          setCommands(list);
          if (list.length > 0) setSelectedKey(list[0].key);
        }
      } catch (err) {
        console.error('Failed to fetch command list:', err);
      }
    }
    fetchCommands();
  }, []);

  const handleRunCommand = async (key: string) => {
    setRunningKey(key);
    try {
      const res = await fetch('/api/linux/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandKey: key })
      });
      if (res.ok) {
        const data: LinuxCommandResult = await res.json();
        setResults(prev => ({ ...prev, [key]: data }));
      }
    } catch (err) {
      console.error(`Failed to execute ${key}:`, err);
    } finally {
      setRunningKey(null);
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      const res = await fetch('/api/linux/run-all', { method: 'POST' });
      if (res.ok) {
        const list: LinuxCommandResult[] = await res.json();
        const map: Record<string, LinuxCommandResult> = {};
        list.forEach(item => { map[item.key] = item; });
        setResults(map);
      }
    } catch (err) {
      console.error('Failed to run all commands:', err);
    } finally {
      setRunningAll(false);
    }
  };

  const copyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const categories = ['ALL', 'os_kernel', 'cpu_memory', 'disk_storage', 'network', 'connectivity', 'logs', 'services'];
  const filteredCommands = commands.filter(c => activeCategory === 'ALL' || c.category === activeCategory);
  const activeResult = results[selectedKey];

  return (
    <div className="space-y-6">
      {/* Header & Safety Guard */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-900/40 text-blue-400 border border-blue-700/50">
                Safe Read-Only Subprocess Execution
              </span>
              <span className="text-xs text-slate-400">Strict Command Allowlist • 3.0s Timeout</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" />
              Linux Systems Diagnostic Suite
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Authentic Linux OS diagnostic checks for OCI Data Center Technicians. Queries the actual local Linux environment using parameter-list subprocess execution (no shell interpolation). Never executes arbitrary user strings or destructive commands.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAll}
              disabled={runningAll}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${runningAll ? 'animate-spin' : ''}`} />
              <span>{runningAll ? 'Running Full Diagnostic...' : 'Execute All 15 Checks'}</span>
            </button>
          </div>
        </div>

        {/* Safety & Status Legend */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> SUCCESS: Code 0
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> UNAVAILABLE / PERMISSION DENIED
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <AlertOctagon className="w-3.5 h-3.5" /> TIMEOUT / ERROR
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Output capped at 32KB buffer
          </span>
        </div>
      </div>

      {/* Main Grid: Command Selector & Output Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Command Allowlist List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 p-2 rounded-xl">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[10px] px-2 py-1 rounded font-medium transition ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Commands List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredCommands.map(cmd => {
              const isSelected = selectedKey === cmd.key;
              const result = results[cmd.key];
              const isRunning = runningKey === cmd.key;

              return (
                <div
                  key={cmd.key}
                  onClick={() => setSelectedKey(cmd.key)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition text-left ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-600/80 shadow-md'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {cmd.args.join(' ')}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {result && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          result.status === 'SUCCESS' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' :
                          result.status === 'UNAVAILABLE' ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50' :
                          'bg-rose-900/40 text-rose-300 border border-rose-700/50'
                        }`}>
                          {result.status}
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunCommand(cmd.key);
                        }}
                        disabled={isRunning}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50"
                        title="Execute this command"
                      >
                        <Play className={`w-3 h-3 ${isRunning ? 'animate-spin text-blue-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-snug">
                    {cmd.purpose}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Command Inspector & Output Terminal (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            {/* Command Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-400">
                    $ {commands.find(c => c.key === selectedKey)?.args.join(' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {commands.find(c => c.key === selectedKey)?.purpose}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunCommand(selectedKey)}
                  disabled={runningKey === selectedKey}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Play className={`w-3 h-3 ${runningKey === selectedKey ? 'animate-spin' : ''}`} />
                  <span>Run Command</span>
                </button>

                {activeResult && activeResult.output && (
                  <button
                    onClick={() => copyOutput(activeResult.output)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Execution Result Meta */}
            {activeResult && (
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">EXECUTION STATUS</span>
                  <span className={activeResult.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {activeResult.status}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">EXIT CODE</span>
                  <span className="text-slate-200 font-bold">{activeResult.exitCode}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">CATEGORY</span>
                  <span className="text-slate-200 uppercase">{activeResult.category}</span>
                </div>
              </div>
            )}

            {/* Terminal Window */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-200 overflow-x-auto min-h-[360px] max-h-[500px] overflow-y-auto">
              {activeResult ? (
                <div>
                  <div className="text-slate-500 select-none pb-2 border-b border-slate-900 mb-2">
                    # Linux Host Environment Telemetry Console (Read-Only)
                    <br />$ {activeResult.commandStr}
                  </div>
                  
                  {activeResult.error && (
                    <div className="text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-900/50 mb-3">
                      <strong>Execution Notice:</strong> {activeResult.error}
                    </div>
                  )}

                  <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300">
                    {activeResult.output || '(No standard output generated)'}
                  </pre>
                </div>
              ) : (
                <div className="text-slate-600 text-center py-24 select-none">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Click "Run Command" or select another check to inspect system telemetry.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
