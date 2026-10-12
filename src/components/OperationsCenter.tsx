import React, { useState, useEffect } from 'react';
import { 
  Building2, Server, AlertTriangle, ShieldCheck, Zap, Thermometer, Wind,
  Clock, ArrowRight, CheckCircle2, ChevronRight, Activity, Users, FileText
} from 'lucide-react';
import { OciFacilityData, IncidentRecord, RackElevationData } from '../types';

interface OperationsCenterProps {
  incidents: IncidentRecord[];
  onNavigateToBreakFix: () => void;
  onNavigateToLinux: () => void;
}

export const OperationsCenter: React.FC<OperationsCenterProps> = ({
  incidents,
  onNavigateToBreakFix,
  onNavigateToLinux
}) => {
  const [facility, setFacility] = useState<OciFacilityData | null>(null);
  const [rack, setRack] = useState<RackElevationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedShiftTab, setSelectedShiftTab] = useState<'tasks' | 'safety'>('tasks');

  useEffect(() => {
    async function loadData() {
      try {
        const [facRes, rackRes] = await Promise.all([
          fetch('/api/oci/facility'),
          fetch('/api/oci/rack')
        ]);
        if (facRes.ok) setFacility(await facRes.json());
        if (rackRes.ok) setRack(await rackRes.json());
      } catch (err) {
        console.error('Failed to load OCI operational data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !facility) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Activity className="w-8 h-8 animate-spin mx-auto mb-3 text-red-500" />
        <p className="text-sm">Connecting to OCI Data Center Facility Telemetry (us-ashburn-1 AD-1)...</p>
      </div>
    );
  }

  const openIncidents = incidents.filter(i => i.status !== 'RESOLVED');
  const criticalCount = openIncidents.filter(i => i.severity === 'CRITICAL').length;
  const highCount = openIncidents.filter(i => i.severity === 'HIGH').length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Facility Identity & Simulation Clarification */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-red-950/20 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-900/40 text-red-400 border border-red-700/50">
                OCI Fleet Operations
              </span>
              <span className="text-xs text-slate-400">Region: <strong className="text-slate-200">{facility.site.region}</strong> ({facility.site.ad})</span>
              <span className="text-xs text-slate-400">• Facility: <strong className="text-slate-200">{facility.site.facility_code}</strong></span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-500" />
              Data Center Operations Control Center
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Real-time operational dashboard for 24x7 data center shift technicians. Tracks site capacity, power feed redundancy, hot-aisle/cold-aisle thermal profiles, CRAC units, and ticket queue SLA priorities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SITE STATUS: {facility.site.status}
            </span>
          </div>
        </div>

        {/* Data Origin Disclaimer Badge */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <span className="px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded border border-blue-800 font-mono text-[10px]">
            TELEMETRY NOTICE
          </span>
          <span>
            Facility environmental, PDU, and rack elevation readings below represent simulated OCI production telemetry for portfolio demonstration. Local OS metrics are gathered live from the host Linux environment.
          </span>
        </div>
      </div>

      {/* Grid: 4 Core Vital Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Server & Network Assets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Fleet Servers</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{facility.site.active_servers.toLocaleString()}</div>
          <div className="mt-2 text-xs flex items-center justify-between text-slate-400">
            <span className="text-amber-400">{facility.site.degraded_servers} Degraded</span>
            <span className="text-rose-400">{facility.site.offline_servers} Offline</span>
            <span>{facility.site.total_racks} Racks</span>
          </div>
        </div>

        {/* Card 2: Power Redundancy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Facility Power (2N)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{facility.power.total_active_load_mw} MW</div>
          <div className="mt-2 text-xs flex items-center justify-between text-slate-400">
            <span>Feed A: {facility.power.ups_load_percent_a}%</span>
            <span>Feed B: {facility.power.ups_load_percent_b}%</span>
            <span className="text-emerald-400">2N Verified</span>
          </div>
        </div>

        {/* Card 3: Cooling & PUE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Thermal & Airflow</span>
            <Thermometer className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{facility.environmental.supply_air_temp_c}°C</div>
          <div className="mt-2 text-xs flex items-center justify-between text-slate-400">
            <span>PUE: {facility.environmental.pue_current}</span>
            <span>Return: {facility.environmental.return_air_temp_c}°C</span>
            <span className="text-emerald-400">{facility.environmental.crac_redundancy}</span>
          </div>
        </div>

        {/* Card 4: Ticket SLA Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Break-Fix Queue</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{openIncidents.length} Tickets</div>
          <div className="mt-2 text-xs flex items-center justify-between text-slate-400">
            <span className="text-rose-400 font-semibold">{criticalCount} SEV-1</span>
            <span className="text-amber-400 font-semibold">{highCount} SEV-2</span>
            <span className="text-blue-400">{openIncidents.length - criticalCount - highCount} SEV-3/4</span>
          </div>
        </div>
      </div>

      {/* Main Grid: SLA Matrix & Shift Handover */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: SLA Deadlines & Queue Prioritization */}
        <div className="lg:col-span-2 space-y-6">
          {/* SLA Deadlines */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Ticket Queue Prioritization & SLA Targets
              </h3>
              <button 
                onClick={onNavigateToBreakFix}
                className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 transition"
              >
                <span>Open Break-Fix Lab</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {facility.slas.map((sla, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200">{sla.tier}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                      sla.breach_risk === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      sla.breach_risk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      Risk: {sla.breach_risk}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">{sla.target}</div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 font-mono">
                    <span className="text-slate-500">SLA Window: {sla.sla_minutes}m</span>
                    <span className="text-slate-300 font-semibold">{sla.active_count} In Queue</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 42U Physical Rack Elevation Preview */}
          {rack && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Physical Rack Elevation: {rack.rack_id} (Data Hall 02)
                  </h3>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Load: {rack.current_load_kw}kW / {rack.max_rated_kw}kW • Inlet: {rack.inlet_temp_c}°C
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-72 overflow-y-auto space-y-1.5 font-mono text-xs">
                {rack.units.map((u, i) => (
                  <div 
                    key={i}
                    className={`flex items-center justify-between px-3 py-1.5 rounded border ${
                      u.status === 'FAULT' ? 'bg-rose-950/40 border-rose-800/80 text-rose-200' :
                      u.status === 'DEGRADED' || u.status === 'WARNING' ? 'bg-amber-950/40 border-amber-800/80 text-amber-200' :
                      u.type === 'AIRFLOW' ? 'bg-slate-900/40 border-slate-800 text-slate-500' :
                      'bg-slate-900 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-400 w-8">U{u.u.toString().padStart(2, '0')}</span>
                      <span>{u.asset}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                        {u.type}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        u.status === 'OK' ? 'text-emerald-400' :
                        u.status === 'DEGRADED' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {u.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Shift Handover & Safety Protocol */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                24x7 Shift Handover Log
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-800">
                Shift: Day
              </span>
            </div>

            <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between text-slate-400">
                <span>Outgoing Lead:</span>
                <strong className="text-slate-200">{facility.shift_handover.outgoing_lead}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Incoming Lead:</span>
                <strong className="text-slate-200">{facility.shift_handover.incoming_lead}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Handover Time:</span>
                <span className="font-mono text-slate-300">07:00 UTC</span>
              </div>
            </div>

            {/* Toggle Shift Tabs */}
            <div className="flex border-b border-slate-800 mb-3">
              <button
                onClick={() => setSelectedShiftTab('tasks')}
                className={`flex-1 pb-2 text-xs font-medium border-b-2 transition ${
                  selectedShiftTab === 'tasks'
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending Tasks ({facility.shift_handover.pending_critical_tasks.length})
              </button>
              <button
                onClick={() => setSelectedShiftTab('safety')}
                className={`flex-1 pb-2 text-xs font-medium border-b-2 transition ${
                  selectedShiftTab === 'safety'
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Safety & SOPs
              </button>
            </div>

            {selectedShiftTab === 'tasks' ? (
              <ul className="space-y-2 text-xs text-slate-300">
                {facility.shift_handover.pending_critical_tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                    <span className="text-red-400 font-bold shrink-0">#{i + 1}</span>
                    <span className="leading-relaxed">{task}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2 text-xs text-slate-300">
                {facility.shift_handover.safety_reminders.map((reminder, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{reminder}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Technician Dispatch Workflows</h4>
            
            <button
              onClick={onNavigateToBreakFix}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-800/50 text-red-200 text-xs font-medium transition"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Launch Hardware Break-Fix Lab (11 Scenarios)</span>
              </div>
              <ArrowRight className="w-4 h-4 text-red-400" />
            </button>

            <button
              onClick={onNavigateToLinux}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Safe Linux Diagnostics CLI Suite</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
