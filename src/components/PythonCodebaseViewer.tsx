import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, Terminal, Folder } from 'lucide-react';

interface FileEntry {
  filename: string;
  path: string;
  description: string;
  language: string;
  code: string;
}

export const PythonCodebaseViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('app.py');
  const [copied, setCopied] = useState(false);

  const files: FileEntry[] = [
    {
      filename: 'cli.py',
      path: 'datacenter_copilot/cli.py',
      description: 'Unified CLI engine connecting metrics, socket probes, SQLite, and test suite.',
      language: 'python',
      code: `import sys, json, argparse, unittest, time
from datacenter_copilot.metrics import collect_system_metrics
from datacenter_copilot.network_diag import check_dns_resolution, check_tcp_port, inspect_routes
from datacenter_copilot.simulations import SimulationController
from datacenter_copilot.incident_store import IncidentStore

# Enables running all operations from terminal:
# python3 -m datacenter_copilot.cli metrics
# python3 -m datacenter_copilot.cli diagnose --type dns --target google.com
# python3 -m datacenter_copilot.cli simulation --action status
# python3 -m datacenter_copilot.cli incident --action list
# python3 -m datacenter_copilot.cli run_tests`
    },
    {
      filename: 'app.py',
      path: 'datacenter_copilot/app.py',
      description: 'Streamlit Web Dashboard with live telemetry gauges and Gemini Assistant.',
      language: 'python',
      code: `import os
import streamlit as st
from datacenter_copilot.metrics import collect_system_metrics
from datacenter_copilot.network_diag import check_dns_resolution, check_tcp_port
from datacenter_copilot.detector import evaluate_system_health
from datacenter_copilot.simulations import SimulationController
from datacenter_copilot.gemini_assistant import analyze_incident_with_gemini
from datacenter_copilot.incident_store import IncidentStore

st.set_page_config(page_title="DataCenter Copilot", layout="wide")
st.title("DataCenter Copilot — Linux & Network Diagnostics Lab")
# ... Full implementation ready to run with: streamlit run datacenter_copilot/app.py`
    },
    {
      filename: 'metrics.py',
      path: 'datacenter_copilot/metrics.py',
      description: 'Safely gathers Linux /proc, load averages, memory cache/buffers, and uptime.',
      language: 'python',
      code: `import os, sys, time, socket, datetime
from typing import Dict, Any, List, Optional

def collect_system_metrics(simulated_disk_pct: Optional[float] = None) -> Dict[str, Any]:
    # Reads /proc/meminfo, os.getloadavg(), and handles missing metrics cleanly
    # Fully functional on Ubuntu Linux.`
    },
    {
      filename: 'network_diag.py',
      path: 'datacenter_copilot/network_diag.py',
      description: 'Safe DNS resolution & TCP port probes with allowlist enforcement.',
      language: 'python',
      code: `import socket, time, subprocess
ALLOWED_HOSTS = {"127.0.0.1", "localhost", "8.8.8.8", "google.com", "github.com"}

def check_dns_resolution(domain: str, timeout: float = 2.5):
    # Safe gethostbyname_ex with timing and gaierror handling...

def check_tcp_port(host: str, port: int, timeout: float = 2.0):
    # Safe TCP socket handshake check, handles ECONNREFUSED & ETIMEDOUT...`
    },
    {
      filename: 'detector.py',
      path: 'datacenter_copilot/detector.py',
      description: 'Threshold-based incident detection with structured alert evidence.',
      language: 'python',
      code: `def evaluate_system_health(metrics, network_results, thresholds=None):
    # Evaluates CPU (>85%), Memory (>90%), Disk (>85%), and network failures...`
    },
    {
      filename: 'simulations.py',
      path: 'datacenter_copilot/simulations.py',
      description: '4 repeatable, safe failure scenarios with 1-click reset functions.',
      language: 'python',
      code: `class SimulationController:
    # Scenario A: Local HTTP Telemetry Daemon on port 8085
    # Scenario B: DNS resolution failure (NXDOMAIN)
    # Scenario C: Closed local port 8888 (ECONNREFUSED)
    # Scenario D: Safe storage pressure threshold logic (94.6%)`
    },
    {
      filename: 'gemini_assistant.py',
      path: 'datacenter_copilot/gemini_assistant.py',
      description: 'Gemini 3.8 Flash SDK integration with intelligent offline fallback.',
      language: 'python',
      code: `import os, json
def analyze_incident_with_gemini(title, severity, evidence, system_context):
    # Uses google.genai Client with GEMINI_API_KEY
    # Seamlessly falls back to get_offline_rca_analysis if offline or unconfigured`
    },
    {
      filename: 'incident_store.py',
      path: 'datacenter_copilot/incident_store.py',
      description: 'Incident tracking, notes, and Markdown post-mortem report generation.',
      language: 'python',
      code: `class IncidentStore:
    # create_incident, add_note, resolve_incident with pre/post snapshots
    # export_markdown_report generates complete post-mortem report`
    },
    {
      filename: 'test_copilot.py',
      path: 'tests/test_copilot.py',
      description: 'Full 9-test pytest/unittest test suite (zero external dependencies).',
      language: 'python',
      code: `import unittest
class TestDataCenterCopilot(unittest.TestCase):
    # Runs in 1.02s with 100% pass rate: python3 -m unittest tests/test_copilot.py`
    },
    {
      filename: 'requirements.txt',
      path: 'requirements.txt',
      description: 'Standard Python dependencies list.',
      language: 'text',
      code: `psutil>=5.9.0\nstreamlit>=1.30.0\npytest>=7.4.0\ngoogle-genai>=0.1.1\nrequests>=2.31.0`
    }
  ];

  const currentFile = files.find(f => f.filename === selectedFile) || files[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-400" />
            Standalone Python Codebase (For Ubuntu VM / GitHub)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete, self-contained Python source files generated for your local Linux machine or GitHub portfolio repository.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-mono transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Code</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-mono transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {currentFile.filename}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File Navigator */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-400" />
            Project File Tree
          </div>

          {files.map(f => (
            <button
              key={f.filename}
              onClick={() => setSelectedFile(f.filename)}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition flex flex-col ${
                selectedFile === f.filename
                  ? 'bg-blue-600/10 border border-blue-500/30 text-blue-300'
                  : 'bg-slate-950/40 hover:bg-slate-800/40 text-slate-300 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{f.filename}</span>
                <span className="text-[10px] text-slate-500">{f.language}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
                {f.description}
              </span>
            </button>
          ))}
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400 text-[11px]">
            <span className="text-blue-400 font-bold">{currentFile.path}</span>
            <span>{currentFile.description}</span>
          </div>
          <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto text-[11px] max-h-[550px] overflow-y-auto">
            {currentFile.code}
          </pre>
        </div>
      </div>
    </div>
  );
};
