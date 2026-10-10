import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, RefreshCw, Terminal, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

interface GenuineTestItem {
  name: string;
  description: string;
  passed: boolean;
  status: 'PASSED' | 'FAILED' | 'ERROR';
  error_detail?: string | null;
}

interface TestRunResult {
  command: string;
  timestamp: string;
  totalRun: number;
  totalPassed: number;
  totalFailed: number;
  wasSuccessful: boolean;
  durationSeconds: number;
  rawOutput: string;
  tests: GenuineTestItem[];
}

export const TestRunner: React.FC = () => {
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunRealTests = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tests/run', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to execute test suite`);
      }
      const data: TestRunResult = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to communicate with test runner');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Runner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Genuine Test Execution & Verification</h2>
            {testResult ? (
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                  testResult.wasSuccessful
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {testResult.totalPassed}/{testResult.totalRun} Passed ({testResult.durationSeconds}s)
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                Awaiting Execution
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Executes genuine <code className="text-blue-300">python3 -m unittest tests/test_copilot.py -v</code> directly inside the host Linux process. Results are never fabricated or marked as passed without live execution.
          </p>
        </div>

        <button
          onClick={handleRunRealTests}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing Genuine Test Process...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>{testResult ? 'Re-run Real Tests' : 'Execute Test Suite Now'}</span>
            </>
          )}
        </button>
      </div>

      {/* Verification Integrity Notice */}
      <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300">Engineering Standard — Distinguishing Tests from Demonstrations:</span>
          <p className="mt-0.5 text-slate-400 leading-relaxed">
            <strong>Automated Unit Tests</strong> (below) test the code's metric parsing, safety boundaries, and error handlers in an isolated process. <strong>Safe Demonstrations</strong> (in the Failure Lab tab) are interactive manual simulations of live operational failures. Test results displayed here reflect only actual runs triggered during this session.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/30 border border-red-800 rounded-xl text-xs text-red-300">
          Execution Error: {errorMsg}
        </div>
      )}

      {/* Real Live Terminal Output */}
      {testResult ? (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
            <span className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Host Process Output: <code className="text-slate-200">{testResult.command}</code></span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Ran at: {new Date(testResult.timestamp).toLocaleTimeString()} ({testResult.durationSeconds}s)</span>
            </span>
          </div>

          <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto text-[11px] max-h-60 overflow-y-auto">
            {testResult.rawOutput}
          </pre>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400 space-y-2">
          <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">Tests Not Yet Executed In This Session</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            To ensure zero overstatement, click "Execute Test Suite Now" to spawn a real Python subprocess and inspect the genuine test results.
          </p>
        </div>
      )}

      {/* Test Breakdown Table */}
      {testResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Live Execution Test Breakdown</h3>
          <div className="space-y-3">
            {testResult.tests.map((tc, idx) => (
              <div
                key={tc.name}
                className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  {tc.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                      <span className="font-mono font-semibold text-slate-200">{tc.name}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">{tc.description}</p>
                    {!tc.passed && tc.error_detail && (
                      <pre className="mt-2 p-2 rounded bg-red-950/40 border border-red-800/60 text-[10px] text-red-300 font-mono whitespace-pre-wrap overflow-x-auto">
                        {tc.error_detail}
                      </pre>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                      tc.passed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {tc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
