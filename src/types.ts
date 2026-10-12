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

export interface LinuxCommandResult {
  key: string;
  purpose: string;
  category: string;
  description: string;
  args: string[];
  commandStr: string;
  success: boolean;
  status: 'SUCCESS' | 'COMMAND_FAILED' | 'UNAVAILABLE' | 'TIMEOUT' | 'PERMISSION_DENIED' | 'ERROR';
  exitCode: number;
  output: string;
  error?: string | null;
}

export interface OciFacilityData {
  site: {
    region: string;
    ad: string;
    facility_code: string;
    building: string;
    hall: string;
    status: string;
    total_racks: number;
    active_servers: number;
    degraded_servers: number;
    offline_servers: number;
    network_switches: number;
    switches_alarm: number;
  };
  environmental: {
    supply_air_temp_c: number;
    supply_air_status: string;
    return_air_temp_c: number;
    cold_aisle_humidity_rh: number;
    crac_units_online: number;
    crac_units_total: number;
    crac_redundancy: string;
    hot_spots_detected: number;
    hot_spot_location: string;
    pue_current: number;
    target_pue: number;
  };
  power: {
    utility_feed_a_kw: number;
    utility_feed_b_kw: number;
    ups_load_percent_a: number;
    ups_load_percent_b: number;
    generator_status: string;
    total_active_load_mw: number;
    total_facility_capacity_mw: number;
    redundancy_level: string;
    alerts: string[];
  };
  slas: Array<{
    tier: string;
    sla_minutes: number;
    target: string;
    active_count: number;
    breach_risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  }>;
  shift_handover: {
    current_shift: string;
    outgoing_lead: string;
    incoming_lead: string;
    handover_timestamp: string;
    pending_critical_tasks: string[];
    safety_reminders: string[];
  };
}

export interface HardwareScenario {
  id: string;
  title: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  asset_tag: string;
  rack_location: string;
  chassis_model: string;
  initial_symptoms: string;
  observable_evidence: string[];
  diagnostic_steps: Array<{ step: number; action: string; finding: string }>;
  confirmed_findings: string;
  hypotheses: Array<{ title: string; verdict: 'CONFIRMED' | 'RULED_OUT'; reason: string }>;
  safe_sop_remediation: string[];
  post_verification: string[];
  escalation_conditions: string;
  ticket_resolution_note: string;
}

export interface NetworkWorkflow {
  id: string;
  title: string;
  description: string;
  steps: Array<{ step: number; command: string; expected: string; if_failed: string }>;
}

export interface RackElevationData {
  rack_id: string;
  total_u: number;
  pdu_a_circuit: string;
  pdu_b_circuit: string;
  current_load_kw: number;
  max_rated_kw: number;
  inlet_temp_c: number;
  exhaust_temp_c: number;
  units: Array<{ u: number; asset: string; type: string; status: 'OK' | 'DEGRADED' | 'WARNING' | 'FAULT' }>;
}

