import React, { useState } from 'react';
import { BookOpen, Terminal, CheckCircle2, Copy, Check, ChevronDown, ChevronRight, Award, Shield, Cpu, Network, Wrench } from 'lucide-react';

export const SetupAndInterviewPrep: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'oci_dct' | 'phase1' | 'questions' | 'architecture' | 'resume'>('oci_dct');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const ociQuestions = [
    {
      q: 'OCI DCT 1: What exact steps do you take when responding to a server with redundant power supply (PSU) failure in an OCI production rack?',
      a: '1. Acknowledge the ticket within the SEV-2/3 SLA window. 2. Verify physical asset tag, rack unit, and serial number. 3. Check the alternate PSU to ensure it is bearing load without alarm on PDU Feed A. 4. Disconnect AC cord from failed PSU-2 after releasing retention clip. 5. Press the release latch and slide the failed PSU out of the chassis bay. 6. Inspect chassis connector pins for burns or bent pins. 7. Slide certified replacement FRU into the bay until positive click. 8. Reconnect AC cord and secure retention bail. 9. Verify LED turns solid green and check IPMI: `ipmitool sdr elist | grep -i psu`. 10. Update DCIM asset inventory, add ticket notes, and resolve.'
    },
    {
      q: 'OCI DCT 2: A bare metal NVMe storage node reports an uncorrectable drive failure in Bay 07. How do you replace it safely without risking data loss?',
      a: '1. Confirm storage pool parity (RAID or ZFS pool status) has sufficient redundancy to survive replacement. 2. Verify bay location using physical drive carrier locate LED (`nvme-cli` or `ledctl locate`) to eliminate pull error. 3. Issue software offline command to flush write cache and unmount drive. 4. Wait 30 seconds for spindle/controller shutdown. 5. Unlatch carrier lever, extract drive, and seat exact OCI replacement NVMe SSD FRU. 6. Latch carrier, verify green power LED, and trigger array rebuild/resilvering. 7. Monitor rebuild telemetry until array status is ONLINE.'
    },
    {
      q: 'OCI DCT 3: A 100GbE QSFP28 uplink to a Top-of-Rack switch experiences intermittent CRC errors and dropped frames. How do you isolate the fault?',
      a: '1. Run `ethtool -S <iface> | grep crc` to confirm CRC error counter is actively incrementing. 2. Inspect optical transceiver telemetry via `ethtool -m <iface>`: check RX/TX optical power (normal is -4 to -8 dBm; <-14 dBm indicates severe signal attenuation). 3. Inspect physical fiber routing: look for pinched cables (<30mm bend radius) or overtightened zip-ties. 4. Clean optical connector end-faces using a 2.5mm dry click cleaner. 5. Replace fiber patch jumper with known-good cable. 6. If errors continue, hot-swap the QSFP28 optical transceiver. 7. If still failing, escalate to Network Team for switch port ASIC diagnostic.'
    },
    {
      q: 'OCI DCT 4: Why are blanking panels required in empty rack units, and what happens to server thermals if they are missing?',
      a: 'Blanking panels prevent hot exhaust air from recirculating from the hot aisle over the top or sides of the rack back into cold aisle server intakes. Without blanking panels, upper rack units inhale warm air (>30°C instead of 21°C), causing fans to run at 100% RPM, increasing power draw, and inducing CPU thermal throttling.'
    },
    {
      q: 'OCI DCT 5: What is the mandatory electrical safety procedure (LOTO) before working inside an energized electrical distribution cabinet or PDU?',
      a: 'Lockout/Tagout (LOTO): 1. Notify affected shift personnel. 2. Identify all electrical energy sources. 3. De-energize the circuit breaker. 4. Apply approved padlock and danger tag with technician contact info. 5. Use an insulated, calibrated multimeter to test voltage: test known live source, test de-energized circuit (Phase-to-Phase and Phase-to-Ground), and re-test known live source (Three-Point Test). 6. Dissipate stored capacitive energy before touching busbars.'
    }
  ];

  const interviewQuestions = [
    {
      q: '1. What are the first diagnostic steps you take when a server will not boot or display video?',
      a: 'First, check physical indicators: verify dual redundant power supply (PSU) LEDs (solid green vs amber/off) and ensure power cords are seated. Second, inspect the Baseboard Management Controller (BMC / IPMI) out-of-band interface to check system event logs (SEL) and POST codes. If POST halts, the hex code indicates the failed subsystem (e.g. Memory training, PCIe link failure, or CPU failure). Third, if physical access is required, inspect motherboard error LEDs, reseat RAM in channel order, and verify no bent pins or loose riser cables.'
    },
    {
      q: '2. Explain the fundamental difference between `ping` and `traceroute`.',
      a: '`ping` sends ICMP Echo Request packets (Type 8) and waits for Echo Replies (Type 0) to measure two-way latency and packet loss to a single destination. `traceroute` maps the intermediate Layer 3 router hops along the path. It does this by sending packets with incrementing TTL (Time-To-Live) values starting at TTL=1. When a router decrements TTL to 0, it drops the packet and responds with an ICMP Time Exceeded message (Type 11, Code 0), revealing its IP address.'
    },
    {
      q: '3. What is the difference between TCP and UDP, and when is each used in data centers?',
      a: 'TCP (Transmission Control Protocol) is connection-oriented, reliable, and ordered. It uses a 3-way handshake (SYN, SYN-ACK, ACK), sequence numbers, checksums, and window-based flow control. Used for SSH, HTTP/HTTPS, database queries, and storage replication where zero packet loss is mandatory. UDP (User Datagram Protocol) is connectionless, lightweight, and unordered with no retransmissions. Used for DNS queries (quick single-packet lookups), NTP time sync, Syslog telemetry, and streaming video.'
    },
    {
      q: '4. In Linux, what does the `load average` in `uptime` or `top` represent?',
      a: 'Load average represents the average number of processes in a RUNNABLE state (either currently using the CPU or waiting for CPU execution time) plus processes in an UNINTERRUPTIBLE SLEEP state (usually waiting for Disk I/O or NFS locks) over 1, 5, and 15 minute intervals. On a 4-core CPU, a load average of 4.0 means 100% utilization. If load average is high (e.g. 12.0) but CPU usage is low (10%), it indicates high Disk I/O wait (iowait) bottleneck.'
    },
    {
      q: '5. What is the difference between "Buffers" and "Cached" memory in `free -m`?',
      a: '"Buffers" represent in-memory storage for raw disk blocks waiting to be written or recently read (block-device metadata). "Cached" (Page Cache) represents files cached in RAM from the filesystem so subsequent reads do not touch slow disk blocks. In Linux, high cache usage is healthy—the kernel will instantly reclaim page cache whenever an application requires RAM.'
    },
    {
      q: '6. When testing a TCP connection with `curl` or `nc`, what is the difference between `ECONNREFUSED` and `ETIMEDOUT`?',
      a: '`ECONNREFUSED` means the packet reached the target host, but the operating system kernel rejected the SYN packet by immediately returning a TCP packet with the RST (Reset) flag set because no application was listening on that port. `ETIMEDOUT` means the SYN packet was sent, but no response was received before the timer expired. This typically indicates a network drop, an intervening firewall silently dropping packets (DROP rather than REJECT), or an incorrect routing path.'
    },
    {
      q: '7. How do you check which processes are listening on network ports in Linux without third-party tools?',
      a: 'Use the modern `ss` command: `ss -tuln` (t = TCP, u = UDP, l = listening sockets, n = numeric ports without DNS resolution). To see process names and PIDs, run `sudo ss -tulpn`. The older `netstat` command (`netstat -tuln`) is also accepted but reads `/proc/net/tcp` more slowly than `ss`.'
    },
    {
      q: '8. What happens when a Linux server runs completely out of memory (OOM)?',
      a: 'When physical RAM and swap space are completely exhausted, the Linux kernel invokes the Out-Of-Memory (OOM) Killer. The kernel calculates an `oom_score` for each process based on memory consumption and importance (excluding root system critical tasks) and sends a `SIGKILL` (signal 9) to terminate the highest-consuming rogue process. You can verify OOM kills in the logs using `dmesg -T | grep -i oom` or `journalctl -k`.'
    },
    {
      q: '9. Explain the difference between Single-Mode Fiber (SMF) and Multi-Mode Fiber (MMF) in a data center.',
      a: 'Multi-Mode Fiber (MMF) has a larger core diameter (50 or 62.5 microns), typically uses aqua or orange jackets with 850nm VCSEL lasers, and is used for short distances within the server room or between adjacent racks (up to ~300-500 meters). Single-Mode Fiber (SMF) has a microscopic 9-micron core, uses yellow jackets with 1310nm or 1550nm lasers, eliminates modal dispersion, and is used for long distances across data center campus buildings (up to 10-40+ km).'
    },
    {
      q: '10. What is an SFP transceiver and what do link LEDs indicate on server NICs?',
      a: 'SFP (Small Form-factor Pluggable, SFP+, QSFP28) is a hot-pluggable optical or Direct Attach Copper (DAC) transceiver that bridges the server NIC to the fiber plant. On the NIC, the Link LED (usually solid green or amber) indicates a physical Layer 1 electrical or optical carrier signal is detected. The Activity LED (blinking) indicates active Ethernet frames are traversing the link. An unlit Link LED indicates a cable disconnect, bad optic, dirty fiber ferrule, or shutdown switch port.'
    },
    {
      q: '11. What is an MTU and what are Jumbo Frames?',
      a: 'MTU (Maximum Transmission Unit) is the largest size Ethernet frame payload that can traverse a network link without fragmentation. The standard Ethernet MTU is 1500 bytes. Jumbo Frames allow MTU sizes up to 9000 bytes. They are commonly enabled in data center storage networks (SAN, iSCSI, Ceph) and internal cluster fabrics to reduce CPU interrupt overhead by transmitting 6x more payload per frame header.'
    },
    {
      q: '12. How does the Address Resolution Protocol (ARP) work at Layer 2?',
      a: 'When a server wants to communicate with an IP on the same local subnet, it needs the destination MAC address. It broadcasts an ARP Request frame ("Who has IP 10.0.0.5? Tell MAC aa:bb:cc:dd:ee:ff") to the broadcast address `ff:ff:ff:ff:ff:ff`. The host holding that IP responds with an unicast ARP Reply. The sending server caches this mapping in its kernel ARP table, visible via `ip neigh` or `arp -n`.'
    },
    {
      q: '13. What is a default gateway and what happens if it is configured incorrectly?',
      a: 'The default gateway is the Layer 3 router IP address where a host sends all packets destined for IP addresses outside its own local subnet. If the default gateway is missing or set to an unreachable IP, the host can only communicate with devices on its local subnet (Layer 2 broadcast domain) and all traffic to external subnets or the internet will fail with "Network is unreachable".'
    },
    {
      q: '14. What is the purpose of `/etc/resolv.conf` in Linux?',
      a: '`/etc/resolv.conf` configures DNS client resolver settings. It defines the `nameserver` IP addresses (e.g., `127.0.0.53` for systemd-resolved, `8.8.8.8`), the default `domain`, and the `search` domains (which automatically append domain suffixes when querying short hostnames like `db-01` -> `db-01.corp.google.internal`).'
    },
    {
      q: '15. What is the difference between `kill -15` (SIGTERM) and `kill -9` (SIGKILL)?',
      a: '`SIGTERM` (Signal 15) is the polite, graceful termination signal. The target process can catch and handle it to flush database buffers, close network sockets, delete temporary lockfiles, and exit cleanly. `SIGKILL` (Signal 9) cannot be caught, handled, or ignored by the process; the kernel immediately destroys the process table entry and reclaims memory. `SIGKILL` should only be used as a last resort if a process is frozen.'
    },
    {
      q: '16. How do you troubleshoot a 100% full root filesystem (`df -h /` shows 100%)?',
      a: 'First, run `df -h` to verify the partition. Second, run `du -xh / | sort -rh | head -n 20` to find the largest directories without crossing mounted filesystems. Common culprits are `/var/log` (unrotated logs) or `/tmp`. Third, if deleted files are still holding disk space because a running process has them open, run `lsof +L1` to find them and reload/restart the holding daemon. Never run reckless `rm -rf` commands.'
    },
    {
      q: '17. What is a VLAN (Virtual Local Area Network) and why is 802.1Q tagging used in data centers?',
      a: 'A VLAN logically segments a physical Layer 2 switch into multiple isolated broadcast domains without requiring separate physical cables. 802.1Q inserts a 4-byte VLAN tag into Ethernet frames. In data centers, VLANs isolate management traffic (IPMI/BMC), storage traffic, and production tenant traffic on the same physical ToR (Top of Rack) switches for security and traffic isolation.'
    },
    {
      q: '18. Explain the safety rule: "Read-only diagnostics before any state-changing remediation".',
      a: 'In data center operations, jumping to remediation (like rebooting, killing services, or modifying network configs) can destroy ephemeral diagnostic evidence (dmesg logs, core dumps, socket states) and risk taking down cascaded dependencies. A disciplined technician always collects read-only facts first (`ss`, `dmesg`, `journalctl`, `ip route`, `ps`), confirms the hypothesis, and executes remediation with rollback procedures.'
    },
    {
      q: '19. What is the function of a PDU (Power Distribution Unit) and UPS in a server rack?',
      a: 'An ATS/UPS (Uninterruptible Power Supply) provides battery backup and power conditioning during utility grid blips. A rack PDU (often intelligent/metered) distributes high-voltage AC power to dual-redundant server power supplies (Feed A and Feed B from separate power circuits). Technicians monitor PDU phase loading to prevent tripping circuit breakers during heavy computational bursts.'
    },
    {
      q: '20. How would you explain your DataCenter Copilot portfolio project to a hiring manager?',
      a: '"I built DataCenter Copilot as an autonomous Linux and network diagnostic lab. It gathers real-time Linux host telemetry from /proc and psutil, executes safe allowlisted Layer 3/Layer 4 socket and DNS probes, and features a safe failure simulation engine with four zero-risk scenarios. I integrated the Gemini API with structured schemas to perform automated root-cause analysis, recommend safe read-only commands, and export auditable post-mortem incident reports in Markdown. It includes 15 automated tests covering system telemetry, network diagnostics, safe failure simulations, and SQLite persistence with 100% pass rate."'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('oci_dct')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeSubTab === 'oci_dct'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          OCI DCT Competencies & Q&A
        </button>
        <button
          onClick={() => setActiveSubTab('phase1')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeSubTab === 'phase1'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Phase 1: Windows Setup (WSL2 vs VirtualBox)
        </button>
        <button
          onClick={() => setActiveSubTab('questions')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeSubTab === 'questions'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Core DCT Technical Q&A (20 Q&A)
        </button>

        <button
          onClick={() => setActiveSubTab('architecture')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'architecture'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Architecture & Flowchart
        </button>
        <button
          onClick={() => setActiveSubTab('resume')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeSubTab === 'resume'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Portfolio & Resume Bullets
        </button>
      </div>

      {/* SUB TAB: OCI DCT Competencies */}
      {activeSubTab === 'oci_dct' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-900/40 text-red-400 border border-red-700/50">
                Oracle OCI Job Requirements
              </span>
              <span className="text-xs text-slate-400">Technical Interview Competencies</span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-500" />
              Oracle Cloud Infrastructure (OCI) Data Center Technician Competencies
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Mapped directly to target job requirements: server hardware break-fix, Linux command-line diagnostics, Ethernet networking, 42U rack deployments, power/cooling environmental monitoring, ticket prioritization, and 24x7 shift handover.
            </p>
          </div>

          {/* OCI Specific Technical Q&A */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-sm font-semibold text-white">Targeted OCI Data Center Technician Technical Interview Q&A</h4>
            <div className="space-y-3">
              {ociQuestions.map((item, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="font-bold text-xs text-red-400 flex items-start gap-2">
                    <span className="shrink-0">•</span>
                    <span>{item.q}</span>
                  </div>
                  <div className="text-xs text-slate-300 pl-4 border-l-2 border-red-900/50 leading-relaxed font-mono text-[11px]">
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 1: Phase 1 Setup Guide */}
      {activeSubTab === 'phase1' && (
        <div className="space-y-6">

          {/* Comparison Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-blue-400" />
              Phase 1 — Linux Environment on Windows: VirtualBox vs WSL2 Decision Matrix
            </h3>
            <p className="text-xs text-slate-400">
              As an MCA graduate targeting the Google Data Center Technician role, choosing the right local Linux setup is critical. Here is the objective comparison:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Option 1: WSL2 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-400 text-sm">Option A: WSL2 (Windows Subsystem for Linux 2)</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    RECOMMENDED FOR THIS PROJECT
                  </span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• <strong className="text-white">Setup Effort:</strong> 1 command (<code className="text-blue-300">wsl --install -d Ubuntu</code>) and 1 reboot. Takes 5 minutes.</li>
                  <li>• <strong className="text-white">Resource Overhead:</strong> Extremely light. Dynamic RAM allocation (doesn't freeze 4GB of your host RAM).</li>
                  <li>• <strong className="text-white">Kernel:</strong> Real genuine Linux kernel 5.15 / 6.6 with full <code className="text-blue-300">/proc</code>, <code className="text-blue-300">systemd</code>, and network sockets.</li>
                  <li>• <strong className="text-white">File Sharing:</strong> Seamless access between Windows VS Code and Ubuntu terminal.</li>
                  <li>• <strong className="text-slate-400">Limitation:</strong> Network is NAT-bridged through a virtual vEthernet adapter; raw L2 packet sniffing requires mirroring.</li>
                </ul>
              </div>

              {/* Option 2: VirtualBox */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-400 text-sm">Option B: Oracle VirtualBox VM</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    FULL HARDWARE HYPERVISOR
                  </span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• <strong className="text-white">Setup Effort:</strong> Download 3.5GB Ubuntu ISO, configure VM RAM, storage, and run installer. Takes 30-45 minutes.</li>
                  <li>• <strong className="text-white">Resource Overhead:</strong> Heavy. Locks fixed 4-8GB of your RAM and 20GB disk space permanently.</li>
                  <li>• <strong className="text-white">Networking Advantage:</strong> Allows true "Bridged Adapter" networking where VM gets its own distinct IP on your home router.</li>
                  <li>• <strong className="text-slate-400">Trade-off:</strong> High friction for beginners; slower boot times.</li>
                </ul>
              </div>
            </div>

            {/* Decisive Recommendation Callout */}
            <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-800/60 text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-blue-300">Mentor's Decisive Recommendation:</span>
              <p className="mt-1">
                Start with <strong>WSL2 with Ubuntu 22.04/24.04</strong>. It provides 100% of the genuine Linux kernel features required for this project (<code className="text-blue-200">psutil</code>, <code className="text-blue-200">/proc/meminfo</code>, <code className="text-blue-200">ss</code>, <code className="text-blue-200">ip route</code>, Streamlit, and Python 3.10+) with zero hypervisor configuration headaches. If you later want to practice PXE network booting or raw promiscuous Wireshark captures, you can install VirtualBox as a secondary step.
              </p>
            </div>
          </div>

          {/* Exact Copy-Paste Setup Steps */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Exact Step-by-Step Commands for Windows Setup</h3>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Step 1: Open PowerShell as Administrator on Windows</span>
                  <button onClick={() => copyText('wsl --install -d Ubuntu')} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]">
                    {copiedCode === 'wsl --install -d Ubuntu' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-emerald-400 font-bold select-all">wsl --install -d Ubuntu</div>
                <div className="text-slate-500 text-[11px] mt-1 font-sans">
                  * Reboot your computer if Windows prompts you to complete virtualization feature enabling.
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Step 2: Inside Ubuntu Terminal — Update Package Repositories</span>
                  <button onClick={() => copyText('sudo apt update && sudo apt install -y python3 python3-pip python3-venv git curl iproute2 net-tools dnsutils')} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]">
                    {copiedCode?.startsWith('sudo apt update') ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-emerald-400 font-bold select-all">
                  sudo apt update && sudo apt install -y python3 python3-pip python3-venv git curl iproute2 net-tools dnsutils
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Step 3: Setup Project Directory & Python Virtual Environment</span>
                  <button onClick={() => copyText('mkdir -p ~/datacenter-copilot && cd ~/datacenter-copilot && python3 -m venv venv && source venv/bin/activate')} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]">
                    {copiedCode?.startsWith('mkdir -p') ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-emerald-400 font-bold select-all">
                  mkdir -p ~/datacenter-copilot && cd ~/datacenter-copilot && python3 -m venv venv && source venv/bin/activate
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Step 4: Install Dependencies & Run Automated Unit Tests</span>
                  <button onClick={() => copyText('pip install psutil streamlit pytest requests && pytest tests/test_copilot.py')} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]">
                    {copiedCode?.startsWith('pip install') ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-emerald-400 font-bold select-all">
                  pip install psutil streamlit pytest requests && pytest tests/test_copilot.py
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: Interview Questions */}
      {activeSubTab === 'questions' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                20 High-Frequency Google Data Center Technician Interview Questions
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Rigorous, beginner-friendly model answers covering Linux kernel troubleshooting, physical hardware, Layer 2-4 networking, and operational safety.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {interviewQuestions.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 hover:bg-slate-800/40 flex items-center justify-between gap-3 transition"
                  >
                    <span className="text-xs font-semibold text-white font-mono">{item.q}</span>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        {item.a}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB TAB 3: Architecture Diagram */}
      {activeSubTab === 'architecture' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">System Architecture & Diagnostic Telemetry Flow</h3>
            <p className="text-xs text-slate-400 mt-1">
              Independent monitoring engine decoupled from the UI and Gemini AI layer for high resilience.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
            <pre className="text-blue-300 leading-relaxed text-[11px]">
{`+-----------------------------------------------------------------------------------+
|                        DataCenter Copilot Architecture                            |
+-----------------------------------------------------------------------------------+

     [ Linux Host Node (Ubuntu / VM / Container) ]
          |
          +---> /proc/meminfo, /proc/uptime, loadavg, df -k
          +---> Network Sockets (IPv4 TCP Handshake, DNS Resolution)
          +---> System Services (systemd daemons, local test daemons)
          |
          v
   +--------------------------------------------------------------+
   |                Core Telemetry Engine                         |
   |   - psutil / /proc metrics collector                         |
   |   - Safe allowlisted network socket prober                   |
   |   - Configurable alert threshold evaluator                   |
   +--------------------------------------------------------------+
          |                                        |
          v                                        v
   +-------------------------+             +-------------------------+
   | Safe Simulation Lab     |             | Incident Store & State  |
   | - Port 8085 HTTP daemon |             | - Pre/Post Snapshots    |
   | - NXDOMAIN test domain  |             | - Investigation Notes   |
   | - Closed port 8888      |             | - Markdown Post-Mortems |
   | - Safe disk quota mock  |             +-------------------------+
   +-------------------------+                         |
          |                                            |
          +---------------------+----------------------+
                                |
                                v
   +--------------------------------------------------------------+
   |             AI Troubleshooting Layer (Dual Engine)           |
   |                                                              |
   |   [Online Path]  -->  Gemini 3.8 Flash API                   |
   |                       (Structured JSON Schema RCA)           |
   |                                                              |
   |   [Offline Path] -->  Rule-Based Heuristic Diagnostic Engine |
   |                       (Zero Internet / Key Fallback)         |
   +--------------------------------------------------------------+
                                |
                                v
   +--------------------------------------------------------------+
   |             Interactive Operations Dashboard                 |
   |   - Linux Health Telemetry Gauges                            |
   |   - Network Diagnostics Console                              |
   |   - 1-Click Safe Failure Simulator                           |
   |   - Auditable Incident Post-Mortem Exporter                  |
   +--------------------------------------------------------------+`}
            </pre>
          </div>
        </div>
      )}

      {/* SUB TAB 4: Resume & Portfolio */}
      {activeSubTab === 'resume' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Portfolio Overview & ATS-Friendly Resume Bullets</h3>
            <p className="text-xs text-slate-400 mt-1">
              Grounded exclusively in technical tasks you implemented, validated, and tested in this project.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Two Truthful, ATS-Friendly Resume Bullets:
              </span>
              <ul className="space-y-2 text-xs text-slate-200">
                <li className="p-3 bg-slate-900/80 rounded-lg border border-slate-800/80">
                  • <strong>Developed DataCenter Copilot</strong>, a local Linux and network diagnostics lab utilizing Python, psutil, and socket programming to monitor CPU load averages, memory page cache allocations, and root storage capacity; automated threshold-based alerting with 100% test coverage across 9 unit tests.
                </li>
                <li className="p-3 bg-slate-900/80 rounded-lg border border-slate-800/80">
                  • <strong>Engineered a safe failure simulation harness and incident post-mortem generator</strong>, modeling Layer 4 TCP connection resets (ECONNREFUSED) and DNS resolution faults (NXDOMAIN); integrated Google AI Studio Gemini API with offline heuristic fallback to synthesize structured root-cause hypotheses and safe read-only diagnostic runbooks.
                </li>
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                1-Page Portfolio Project Summary (For Interviewers):
              </span>
              <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                <p>
                  <strong>Project Title:</strong> DataCenter Copilot — AI-Assisted Linux & Network Diagnostics Lab
                </p>
                <p>
                  <strong>Objective:</strong> Designed as an educational operational testbed for aspiring Data Center Technicians to develop hands-on mastery of Linux system administration, TCP/IP network troubleshooting, and structured post-mortem documentation.
                </p>
                <p>
                  <strong>Core Engineering Highlights:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Read-only telemetry gathering directly from Linux <code className="text-slate-200">/proc</code> and socket APIs.</li>
                  <li>Safety guarantees: Strict target allowlists prevent scanning; simulations use controlled local daemons and isolated threshold overrides without filling disks or altering routing tables.</li>
                  <li>Dual-mode RCA engine: Real-time Gemini 3.8 Flash model invocation via server-side SDK, with graceful fallback to an offline heuristic analyzer.</li>
                  <li>Formal incident lifecycle: Pre/post snapshot verification and exportable Markdown post-mortem documentation.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
