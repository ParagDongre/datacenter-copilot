export interface CpuMetrics {
  cores: number;
  model: string;
  loadAvg1m: number;
  loadAvg5m: number;
  loadAvg15m: number;
  cpuUsagePercent: number;
}

export interface MemoryMetrics {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  buffersBytes: number;
  cachedBytes: number;
  usedPercent: number;
}

export interface DiskMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usedPercent: number;
  isSimulated: boolean;
  thresholdPercent: number;
}

export interface NetworkInterface {
  name: string;
  ip4: string[];
  ip6: string[];
  mac: string;
  internal: boolean;
  status: 'UP' | 'DOWN';
}

export interface ProcessItem {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  user: string;
}

export interface ServiceItem {
  name: string;
  description: string;
  status: 'RUNNING' | 'STOPPED';
  port: number;
  isSimulatedTest: boolean;
}

export interface SystemMetrics {
  timestamp: string;
  hostname: string;
  platform: string;
  release: string;
  arch: string;
  isLinuxContainer: boolean;
  uptimeSeconds: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  interfaces: NetworkInterface[];
  processes: ProcessItem[];
  services: ServiceItem[];
}

export interface NetworkDiagResult {
  type: 'dns' | 'tcp' | 'routing';
  target?: string;
  port?: number;
  success: boolean;
  latencyMs?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  records?: string[];
  dnsServers?: string[];
  output?: string;
  defaultGateway?: string;
  timestamp: string;
  isSimulated?: boolean;
}

export interface SimulationState {
  scenarioA_httpService: { running: boolean; port: number; error: string | null };
  scenarioB_dnsFailure: { active: boolean; targetDomain: string; error: string | null };
  scenarioC_tcpUnreachable: { active: boolean; targetPort: number; error: string | null };
  scenarioD_diskPressure: { active: boolean; simulatedDiskUsedPercent: number; thresholdPercent: number };
}

export interface RcaHypothesis {
  title: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  supportingEvidence: string[];
  contradictingEvidence: string[];
}

export interface DiagnosticCommand {
  command: string;
  purpose: string;
  isSafeReadOnly: boolean;
}

export interface RcaAnalysis {
  source?: string;
  incidentSummary: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confirmedObservations: string[];
  hypotheses: RcaHypothesis[];
  recommendedDiagnosticCommands: DiagnosticCommand[];
  safeRemediationSteps: string[];
  verificationProcedure: string[];
  remainingUncertainty: string;
  escalationCriteria: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string | null;
  isSimulated: boolean;
  evidence: any;
  notes: Array<{ timestamp: string; author: string; text: string }>;
  preSnapshot?: SystemMetrics | null;
  postSnapshot?: SystemMetrics | null;
  analysis?: RcaAnalysis | null;
  remediationApplied?: string | null;
  verifiedOutcome?: string | null;
}
