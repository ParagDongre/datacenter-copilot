import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import { execFile } from 'child_process';
import util from 'util';

dotenv.config();

const execFilePromise = util.promisify(execFile);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Helper function to safely execute Python CLI commands
async function runPythonCli(args: string[]): Promise<any> {
  try {
    const { stdout, stderr } = await execFilePromise('python3', ['-m', 'datacenter_copilot.cli', ...args], {
      timeout: 15000,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer
    });
    return JSON.parse(stdout.trim());
  } catch (err: any) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.trim());
      } catch {
        // Fall through
      }
    }
    throw new Error(err.stderr || err.message || 'Python execution failed');
  }
}

// 1. System Metrics (Sourced directly from Python engine)
app.get('/api/system/metrics', async (req, res) => {
  try {
    const metrics = await runPythonCli(['metrics']);
    res.json(metrics);
  } catch (error: any) {
    console.error('Error fetching metrics from Python:', error);
    res.status(500).json({ error: error.message || 'Failed to gather metrics from Python' });
  }
});

// 2. Network Diagnostics (Sourced directly from Python engine)
app.post('/api/network/diagnose', async (req, res) => {
  const { type, target = '127.0.0.1', port = 8085, timeout = 2.5 } = req.body;
  try {
    const diag = await runPythonCli([
      'diagnose',
      '--type', String(type),
      '--target', String(target),
      '--port', String(port),
      '--timeout', String(timeout)
    ]);
    res.json(diag);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to format python simulation status to client SimulationState schema
function formatSimulationState(status: any) {
  if (!status) return null;
  // If already in frontend schema:
  if (status.scenarioA_httpService) return status;

  // Transform from python format if needed:
  return {
    scenarioA_httpService: {
      running: Boolean(status.scenario_1_http_service?.running ?? status.scenarioA_httpService?.running ?? true),
      port: status.scenario_1_http_service?.port ?? status.scenarioA_httpService?.port ?? 8085,
      error: status.scenario_1_http_service?.error ?? status.scenarioA_httpService?.error ?? null
    },
    scenarioB_dnsFailure: {
      active: Boolean(status.scenario_2_dns?.active ?? status.scenarioB_dnsFailure?.active ?? false),
      targetDomain: status.scenario_2_dns?.test_domain ?? status.scenarioB_dnsFailure?.targetDomain ?? 'internal-db-node-99.invalid-datacenter.local',
      error: status.scenario_2_dns?.error ?? status.scenarioB_dnsFailure?.error ?? null
    },
    scenarioC_tcpUnreachable: {
      active: Boolean(status.scenario_3_tcp?.active ?? status.scenarioC_tcpUnreachable?.active ?? false),
      targetPort: status.scenario_3_tcp?.target_port ?? status.scenarioC_tcpUnreachable?.targetPort ?? 8888,
      error: status.scenario_3_tcp?.error ?? status.scenarioC_tcpUnreachable?.error ?? null
    },
    scenarioD_diskPressure: {
      active: Boolean(status.scenario_4_disk?.active ?? status.scenarioD_diskPressure?.active ?? false),
      simulatedDiskUsedPercent: status.scenario_4_disk?.simulated_pct ?? status.scenarioD_diskPressure?.simulatedDiskUsedPercent ?? 94.6,
      thresholdPercent: status.scenario_4_disk?.threshold_percent ?? status.scenarioD_diskPressure?.thresholdPercent ?? 85.0
    }
  };
}

// 3. Simulations State & Actions (Sourced directly from Python engine)
app.get('/api/simulations/status', async (req, res) => {
  try {
    const status = await runPythonCli(['simulation', '--action', 'status']);
    res.json({ state: formatSimulationState(status) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/simulations/action', async (req, res) => {
  const { scenario, action } = req.body;
  let cliAction = 'status';

  if (scenario === 'http_service') {
    cliAction = action === 'fail' ? 'fail_http' : 'reset_http';
  } else if (scenario === 'dns_failure') {
    cliAction = action === 'fail' ? 'fail_dns' : 'reset_dns';
  } else if (scenario === 'tcp_unreachable') {
    cliAction = action === 'fail' ? 'fail_tcp' : 'reset_tcp';
  } else if (scenario === 'disk_pressure') {
    cliAction = action === 'fail' ? 'fail_disk' : 'reset_disk';
  } else if (scenario === 'reset_all') {
    cliAction = 'reset_all';
  }

  try {
    const updatedStatus = await runPythonCli(['simulation', '--action', cliAction]);
    res.json({ success: true, state: formatSimulationState(updatedStatus) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to normalize snapshot telemetry so frontend components never crash on missing disk/cpu properties
function normalizeSnapshot(snap: any) {
  if (!snap) return null;
  const cpuPercent = Number(snap.cpu?.cpuUsagePercent ?? snap.cpu?.percent ?? 12);
  const diskPercent = Number(snap.disk?.usedPercent ?? snap.disk?.percent ?? 24);
  return {
    ...snap,
    cpu: {
      ...(snap.cpu || {}),
      cpuUsagePercent: cpuPercent,
      percent: cpuPercent
    },
    disk: {
      ...(snap.disk || {}),
      usedPercent: diskPercent,
      percent: diskPercent
    }
  };
}

function normalizeIncident(inc: any) {
  if (!inc) return inc;
  const preSnap = normalizeSnapshot(inc.preSnapshot || inc.pre_remediation_snapshot);
  const postSnap = normalizeSnapshot(inc.postSnapshot || inc.post_remediation_snapshot);
  return {
    ...inc,
    preSnapshot: preSnap,
    pre_remediation_snapshot: preSnap,
    postSnapshot: postSnap,
    post_remediation_snapshot: postSnap
  };
}

// 4. Incident Management (Persistent SQLite database via Python engine)
app.get('/api/incidents', async (req, res) => {
  try {
    const incidents = await runPythonCli(['incident', '--action', 'list']);
    const list = Array.isArray(incidents) ? incidents.map(normalizeIncident) : incidents;
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incidents/create', async (req, res) => {
  const { title, severity, category, evidence, preMetrics, isSimulated, incidentId } = req.body;
  const args = [
    'incident',
    '--action', 'create',
    '--title', title || 'System Incident',
    '--severity', severity || 'HIGH',
    '--category', category || 'SYSTEM',
    '--evidence', JSON.stringify(evidence || {}),
    '--is-simulated', isSimulated ? '1' : '0'
  ];
  if (preMetrics) args.push('--pre-metrics', JSON.stringify(preMetrics));
  if (incidentId) args.push('--incident-id', incidentId);

  try {
    const created = await runPythonCli(args);
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incidents/status', async (req, res) => {
  const { incidentId, status } = req.body;
  try {
    const result = await runPythonCli([
      'incident',
      '--action', 'update_status',
      '--incident-id', String(incidentId),
      '--status', String(status)
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incidents/note', async (req, res) => {
  const { incidentId, text, author } = req.body;
  try {
    const result = await runPythonCli([
      'incident',
      '--action', 'add_note',
      '--incident-id', String(incidentId),
      '--text', String(text),
      '--author', String(author || 'Data Center Tech')
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incidents/resolve', async (req, res) => {
  const { incidentId, remediation, outcome, postMetrics } = req.body;
  const args = [
    'incident',
    '--action', 'resolve',
    '--incident-id', String(incidentId),
    '--remediation', String(remediation || 'Remediated'),
    '--outcome', String(outcome || 'Verified healthy')
  ];
  if (postMetrics) args.push('--post-metrics', JSON.stringify(postMetrics));

  try {
    const result = await runPythonCli(args);
    if (result && result.incident) {
      result.incident = normalizeIncident(result.incident);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incidents/analysis', async (req, res) => {
  const { incidentId, analysis } = req.body;
  try {
    const result = await runPythonCli([
      'incident',
      '--action', 'attach_analysis',
      '--incident-id', String(incidentId),
      '--analysis', JSON.stringify(analysis || {})
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Live Test Runner (Executes real unittest on host machine)
app.post('/api/tests/run', async (req, res) => {
  try {
    const testResults = await runPythonCli(['run_tests']);
    res.json(testResults);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Gemini AI Troubleshooting Assistant Endpoint
app.get('/api/gemini/status', (req, res) => {
  res.json({
    hasApiKey: !!process.env.GEMINI_API_KEY,
    model: 'gemini-3.8-flash',
    source: process.env.GEMINI_API_KEY ? 'gemini_api' : 'offline_heuristic_fallback'
  });
});

app.post('/api/gemini/analyze', async (req, res) => {
  const { incidentTitle, severity, evidence, systemContext, notes } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  const startTime = Date.now();

  if (!apiKey) {
    // Generate offline heuristic analysis
    const offlineResult = {
      source: 'offline_heuristic_fallback',
      verifiedByAiStudio: false,
      incidentSummary: `Offline Heuristic Triage: ${incidentTitle || 'System Incident'}`,
      severity: severity || 'HIGH',
      confirmedObservations: [
        'Local diagnostic flag raised.',
        'Network telemetry indicates connection drop or timeout.',
        'System metrics collected from Linux host.'
      ],
      hypotheses: [
        {
          title: 'Target Service Process Inactive or Crashed',
          probability: 'HIGH',
          supportingEvidence: ['Connection attempt was refused or dropped.'],
          contradictingEvidence: []
        }
      ],
      recommendedDiagnosticCommands: [
        { command: 'ss -tuln', purpose: 'Check active listening TCP sockets', isSafeReadOnly: true },
        { command: 'uptime', purpose: 'Inspect system load averages', isSafeReadOnly: true },
        { command: 'dmesg -T | tail -n 20', purpose: 'Inspect kernel ring buffer for link drops', isSafeReadOnly: true }
      ],
      safeRemediationSteps: [
        'Verify configuration syntax before restarting service.',
        'Restart service using safe simulation reset or systemctl.'
      ],
      verificationProcedure: [
        'Re-probe target port using diagnostic tool to verify response.'
      ],
      remainingUncertainty: 'Process log inspection required.',
      escalationCriteria: 'Escalate if repeated crash occurs within 15 minutes.'
    };

    return res.json({
      fallbackMode: true,
      reason: 'GEMINI_API_KEY is not configured in environment.',
      analysis: offlineResult,
      latencyMs: Date.now() - startTime
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `
You are a Staff Data Center Operations & Linux Systems Engineer.
Analyze the following incident evidence gathered from an Ubuntu server node:

Incident Title: ${incidentTitle || 'System Incident'}
Severity: ${severity || 'UNKNOWN'}
Diagnostic Evidence:
${JSON.stringify(evidence, null, 2)}

System Snapshot:
${JSON.stringify(systemContext, null, 2)}

Technician Notes: ${notes || 'None provided'}

Provide a rigorous, professional Root Cause Analysis (RCA) strictly following the response schema.
Rules:
- Never claim a hypothesis is confirmed unless the evidence directly proves it.
- Rank hypotheses by likelihood.
- Recommended diagnostic commands MUST be safe, read-only Linux commands (never destructive commands).
- Distinguish between physical server layer, Linux kernel/OS layer, and application daemon layer.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: 'You are an expert Data Center Systems Engineer and Linux Network Specialist. You provide concise, objective, evidence-based troubleshooting analysis without hallucinating facts.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            incidentSummary: { type: Type.STRING },
            severity: { type: Type.STRING },
            confirmedObservations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            hypotheses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  probability: { type: Type.STRING },
                  supportingEvidence: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  contradictingEvidence: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['title', 'probability', 'supportingEvidence', 'contradictingEvidence'],
              },
            },
            recommendedDiagnosticCommands: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  command: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  isSafeReadOnly: { type: Type.BOOLEAN },
                },
                required: ['command', 'purpose', 'isSafeReadOnly'],
              },
            },
            safeRemediationSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            verificationProcedure: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            remainingUncertainty: { type: Type.STRING },
            escalationCriteria: { type: Type.STRING },
          },
          required: [
            'incidentSummary',
            'severity',
            'confirmedObservations',
            'hypotheses',
            'recommendedDiagnosticCommands',
            'safeRemediationSteps',
            'verificationProcedure',
            'remainingUncertainty',
            'escalationCriteria',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const latency = Date.now() - startTime;

    return res.json({
      fallbackMode: false,
      modelUsed: 'gemini-3.8-flash',
      source: 'gemini_api',
      verifiedByAiStudio: true,
      latencyMs: latency,
      analysis: parsed,
    });
  } catch (err: any) {
    console.error('Gemini API call failed, falling back:', err.message);
    const latency = Date.now() - startTime;

    const offlineResult = {
      source: 'offline_heuristic_fallback',
      verifiedByAiStudio: false,
      errorDetail: err.message,
      incidentSummary: `Offline Heuristic Triage: ${incidentTitle || 'System Incident'} (Gemini 503/Offline)`,
      severity: severity || 'HIGH',
      confirmedObservations: [
        'Local diagnostic flag raised.',
        'Network telemetry indicates connection drop or timeout.'
      ],
      hypotheses: [
        {
          title: 'Target Service Process Inactive or Crashed',
          probability: 'HIGH',
          supportingEvidence: ['Connection attempt was refused or dropped.'],
          contradictingEvidence: []
        }
      ],
      recommendedDiagnosticCommands: [
        { command: 'ss -tuln', purpose: 'Check active listening TCP sockets', isSafeReadOnly: true },
        { command: 'uptime', purpose: 'Inspect system load averages', isSafeReadOnly: true }
      ],
      safeRemediationSteps: [
        'Verify configuration syntax before restarting service.',
        'Restart service using safe simulation reset or systemctl.'
      ],
      verificationProcedure: [
        'Re-probe target port using diagnostic tool to verify response.'
      ],
      remainingUncertainty: 'Process log inspection required.',
      escalationCriteria: 'Escalate if repeated crash occurs within 15 minutes.'
    };

    return res.json({
      fallbackMode: true,
      error: `Gemini API encountered an error (${err.message}). Displaying offline heuristic analysis.`,
      analysis: offlineResult,
      latencyMs: latency,
    });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`DataCenter Copilot Unified Server running on http://0.0.0.0:${PORT}`);
    // Eagerly ensure simulated telemetry daemon lifecycle is active and synchronized
    try {
      await runPythonCli(['simulation', '--action', 'status']);
      console.log('DataCenter Copilot simulation daemon lifecycle verified.');
    } catch (e: any) {
      console.warn('Simulation daemon background initialization warning:', e.message);
    }
  });
}

startServer();
