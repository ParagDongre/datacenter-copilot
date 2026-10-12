import React, { useState } from 'react';
import { Wifi, Globe, Terminal, Shield, CheckCircle2, XCircle, ArrowRight, Clock, HelpCircle } from 'lucide-react';
import { NetworkDiagResult } from '../types';

interface NetworkDiagnosticsProps {
  onRunDiagnosis: (type: 'dns' | 'tcp' | 'routing', target?: string, port?: number) => Promise<NetworkDiagResult>;
}

export const NetworkDiagnostics: React.FC<NetworkDiagnosticsProps> = ({ onRunDiagnosis }) => {
  // DNS State
  const [dnsDomain, setDnsDomain] = useState('google.com');
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<NetworkDiagResult | null>(null);

  // TCP State
  const [tcpHost, setTcpHost] = useState('127.0.0.1');
  const [tcpPort, setTcpPort] = useState(8085);
  const [tcpLoading, setTcpLoading] = useState(false);
  const [tcpResult, setTcpResult] = useState<NetworkDiagResult | null>(null);

  // Routing State
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingResult, setRoutingResult] = useState<NetworkDiagResult | null>(null);

  const handleRunDns = async (domainOverride?: string) => {
    const domain = domainOverride || dnsDomain;
    setDnsLoading(true);
    try {
      const res = await onRunDiagnosis('dns', domain);
      setDnsResult(res);
    } finally {
      setDnsLoading(false);
    }
  };

  const handleRunTcp = async (hostOverride?: string, portOverride?: number) => {
    const host = hostOverride || tcpHost;
    const port = portOverride !== undefined ? portOverride : tcpPort;
    setTcpLoading(true);
    try {
      const res = await onRunDiagnosis('tcp', host, port);
      setTcpResult(res);
    } finally {
      setTcpLoading(false);
    }
  };

  const handleRunRouting = async () => {
    setRoutingLoading(true);
    try {
      const res = await onRunDiagnosis('routing');
      setRoutingResult(res);
    } finally {
      setRoutingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Safety Guard Banner */}
      <div className="bg-blue-950/20 border border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-blue-300">Data Center Network Safety Standards Active:</span>
          <p className="mt-1 text-slate-400 leading-relaxed">
            All diagnostics execute in read-only mode against an explicit allowlist (Loopback <code className="text-blue-300">127.0.0.1</code>, <code className="text-blue-300">8.8.8.8</code>, <code className="text-blue-300">google.com</code>, <code className="text-blue-300">github.com</code>). Port scanning, subnet sweeps, and raw socket spoofing are strictly prohibited to maintain compliance with production data center operational hygiene.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. DNS Resolution Probe */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">DNS Resolution Diagnostics</h3>
                <p className="text-xs text-slate-400">Equivalent to <code className="text-blue-300 font-mono">dig +short &lt;domain&gt;</code> or <code className="text-blue-300 font-mono">nslookup</code></p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Target Domain Name (FQDN)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dnsDomain}
                  onChange={(e) => setDnsDomain(e.target.value)}
                  placeholder="google.com"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleRunDns()}
                  disabled={dnsLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                >
                  {dnsLoading ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="text-slate-500 self-center">Presets:</span>
              <button
                onClick={() => {
                  setDnsDomain('google.com');
                  handleRunDns('google.com');
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
              >
                google.com (Valid)
              </button>
              <button
                onClick={() => {
                  setDnsDomain('internal-db-node-99.invalid-datacenter.local');
                  handleRunDns('internal-db-node-99.invalid-datacenter.local');
                }}
                className="px-2 py-1 rounded bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-800/40 font-mono text-[10px]"
              >
                invalid-dc.local (Simulated Failure)
              </button>
            </div>

            {/* Result Box */}
            {dnsResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono transition ${
                  dnsResult.success
                    ? 'bg-slate-800/40 border-emerald-500/30'
                    : 'bg-red-950/20 border-red-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {dnsResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-bold text-white">
                      {dnsResult.success ? 'NOERROR (Resolved)' : `FAILED: ${dnsResult.errorCode || 'ENOTFOUND'}`}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {dnsResult.latencyMs}ms
                  </span>
                </div>

                {dnsResult.success ? (
                  <div className="space-y-1 text-[11px]">
                    <div className="text-slate-400">A Records Returned:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {dnsResult.records?.map((ip, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-red-300 text-[11px] leading-relaxed">
                    {dnsResult.errorMessage || 'Host name lookup failed. No DNS mapping found.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. TCP Port Connectivity Probe */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">TCP Port Connectivity (Socket Probe)</h3>
                <p className="text-xs text-slate-400">Equivalent to <code className="text-emerald-300 font-mono">nc -zv &lt;host&gt; &lt;port&gt;</code> or <code className="text-emerald-300 font-mono">curl -v telnet://</code></p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Host (Allowlisted)
                </label>
                <select
                  value={tcpHost}
                  onChange={(e) => setTcpHost(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="127.0.0.1">127.0.0.1 (Local Node)</option>
                  <option value="localhost">localhost</option>
                  <option value="google.com">google.com (External L3/L4)</option>
                  <option value="8.8.8.8">8.8.8.8 (Google Public DNS)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={tcpPort}
                  onChange={(e) => setTcpPort(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <button
                  onClick={() => {
                    setTcpHost('127.0.0.1');
                    setTcpPort(8085);
                    handleRunTcp('127.0.0.1', 8085);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                >
                  :8085 (Telemetry Daemon)
                </button>
                <button
                  onClick={() => {
                    setTcpHost('127.0.0.1');
                    setTcpPort(8888);
                    handleRunTcp('127.0.0.1', 8888);
                  }}
                  className="px-2 py-0.5 rounded bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-800/40 font-mono"
                >
                  :8888 (Closed Port)
                </button>
                <button
                  onClick={() => {
                    setTcpHost('google.com');
                    setTcpPort(443);
                    handleRunTcp('google.com', 443);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                >
                  google.com:443 (HTTPS)
                </button>
              </div>

              <button
                onClick={() => handleRunTcp()}
                disabled={tcpLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
              >
                {tcpLoading ? 'Probing...' : 'Probe Socket'}
              </button>
            </div>

            {/* TCP Result Box */}
            {tcpResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono transition ${
                  tcpResult.success
                    ? 'bg-slate-800/40 border-emerald-500/30'
                    : 'bg-red-950/20 border-red-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {tcpResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="font-bold text-white">
                      {tcpResult.success
                        ? `TCP Handshake Successful (SYN-ACK received)`
                        : `Connection Failed: ${tcpResult.errorCode || 'ECONNREFUSED'}`}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{tcpResult.latencyMs}ms</span>
                </div>
                <div className={`text-[11px] ${tcpResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                  {tcpResult.success
                    ? `Connected to ${tcpResult.target}:${tcpResult.port} over IPv4 TCP stack.`
                    : `${tcpResult.errorMessage || 'Connection rejected or dropped by destination listener.'}`}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Routing Table Inspection */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              Linux Kernel Routing Table Inspection
            </h3>
            <p className="text-xs text-slate-400">Equivalent to <code className="text-amber-300 font-mono">ip route show</code></p>
          </div>
          <button
            onClick={handleRunRouting}
            disabled={routingLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
          >
            {routingLoading ? 'Inspecting...' : 'Inspect Routes'}
          </button>
        </div>

        {routingResult ? (
          <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-slate-200 border border-slate-800 overflow-x-auto space-y-2">
            <div className="text-slate-400 border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Default Gateway: <span className="text-emerald-400 font-bold">{routingResult.defaultGateway}</span></span>
              <span>Timestamp: {new Date(routingResult.timestamp).toLocaleTimeString()}</span>
            </div>
            <pre className="text-slate-300 whitespace-pre-wrap">{routingResult.output || 'No routing entries returned.'}</pre>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-lg">
            Click "Inspect Routes" to execute read-only route table query.
          </div>
        )}
      </div>

      {/* 4. Interactive Guided Network Troubleshooting Workflows */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Interactive Guided Network Troubleshooting Workflows (SOP Guided)
              </h3>
              <p className="text-xs text-slate-400">
                Ordered diagnostic sequences for Link Down, Subnet/Routing, and Transport/DNS faults
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-900/60 flex items-center justify-center text-[10px]">1</span>
              <span>Layer 1 & 2: Link / PHY State</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Verify carrier flag, auto-negotiation, RX optical power (-2 to -12 dBm), and CRC error counters.
            </p>
            <div className="font-mono text-[11px] bg-slate-900 p-2.5 rounded border border-slate-800 text-slate-300 space-y-1">
              <div>$ ip link show</div>
              <div>$ ethtool ens3f0</div>
              <div>$ ethtool -m ens3f0 (Optics)</div>
              <div>$ ethtool -S ens3f0 | grep crc</div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-900/60 flex items-center justify-center text-[10px]">2</span>
              <span>Layer 3: IP, Subnet & Gateway</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Verify IP assignment, routing table default route, ARP gateway resolution, and ICMP ping latency.
            </p>
            <div className="font-mono text-[11px] bg-slate-900 p-2.5 rounded border border-slate-800 text-slate-300 space-y-1">
              <div>$ ip addr show dev ens3f0</div>
              <div>$ ip route show default</div>
              <div>$ ping -c 3 -W 1 10.240.0.1</div>
              <div>$ ip neigh show (ARP cache)</div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-amber-900/60 flex items-center justify-center text-[10px]">3</span>
              <span>Layer 4 & 7: Transport & DNS</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Verify resolv.conf upstream nameservers, FQDN lookup, listening TCP/UDP sockets, and SYN port probe.
            </p>
            <div className="font-mono text-[11px] bg-slate-900 p-2.5 rounded border border-slate-800 text-slate-300 space-y-1">
              <div>$ cat /etc/resolv.conf</div>
              <div>$ getent hosts &lt;target&gt;</div>
              <div>$ ss -tuln (Port Listeners)</div>
              <div>$ nc -zv -w 2 &lt;ip&gt; &lt;port&gt;</div>
            </div>
          </div>
        </div>
      </div>


      {/* Interview Pedagogical Guide: The 4-Layer Network Mental Model */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          Data Center Technician Core Concept: The 4-Layer Troubleshooting Stack
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700">
            <div className="font-bold text-blue-400 mb-1">Layer 1 & 2 (Link/MAC)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Physical fiber/copper, SFP+ optics, link lights. Tested via <code className="text-slate-200">ip link</code>, <code className="text-slate-200">ethtool eth0</code>, and <code className="text-slate-200">ip neigh (ARP)</code>.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700">
            <div className="font-bold text-emerald-400 mb-1">Layer 3 (Network/IP)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              IP addressing, subnet masks, default gateway hops. Tested via <code className="text-slate-200">ping -c 4 &lt;gw&gt;</code> and <code className="text-slate-200">ip route</code>.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700">
            <div className="font-bold text-amber-400 mb-1">Layer 4 (Transport/TCP)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Port listeners, SYN/ACK handshakes, firewalls. Tested via <code className="text-slate-200">ss -tuln</code>, <code className="text-slate-200">nc -zv</code>, or <code className="text-slate-200">telnet</code>.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700">
            <div className="font-bold text-purple-400 mb-1">Layer 7 (Application/DNS)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              DNS resolution, HTTP response codes, SSL certificates. Tested via <code className="text-slate-200">dig</code>, <code className="text-slate-200">curl -Iv</code>, and application logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
