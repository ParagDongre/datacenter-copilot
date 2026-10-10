# DataCenter Copilot — AI-Assisted Linux & Network Diagnostics Lab

**Portfolio-Grade Diagnostic & Incident Simulation Environment for Data Center Operations**
*Tailored for aspiring Google Data Center Technicians (DCT), Linux Systems Engineers, and Network Operations Specialists.*

---

## 1. Overview & Architecture

**DataCenter Copilot** is a functional Linux systems administration, network troubleshooting, and incident response lab. It combines real-time Linux telemetry collection from kernel subsystems, safe Layer 3/Layer 4 network diagnostics, four isolated operational failure simulations, persistent SQLite incident tracking, and Gemini-powered automated Root Cause Analysis (RCA).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DataCenter Copilot Unified Architecture             │
└────────────────────────────────────────────────────────────────────────┘

 [ React / TypeScript UI ] ──── (HTTP / JSON API) ───► [ Node.js Express Gateway ]
   - Mission-Control Dashboard                           - Host Lifecycle Sync
   - Live Health Gauges & Telemetry                      - Gemini GenAI Proxy
   - Interactive Socket Diagnostic Tools                 - Vite Middleware
   - Failure Lab Control Panel                           │
   - SQLite Incident Post-Mortem Feed                    │ (Subprocess CLI)
   - Dynamic Automated Test Runner                       ▼
                                           [ Python Diagnostics Engine ]
                                             - datacenter_copilot.metrics (/proc, ps, ip)
                                             - datacenter_copilot.network_diag (sockets, DNS)
                                             - datacenter_copilot.simulations (port 8085)
                                             - datacenter_copilot.incident_store (incidents.db)
                                             - datacenter_copilot.gemini_assistant
                                                         │
               ┌─────────────────────────────────────────┴────────────────────────────┐
               ▼                                                                      ▼
    [ Real Linux Subsystems ]                                            [ Google Gemini API ]
    - /proc/meminfo & /proc/uptime                                       - Model: gemini-3.8-flash
    - ps -eo (Real process consumption)                                  - Evidence-based RCA
    - ip route & ip addr (L2/L3)                                         - Safe read-only runbooks
    - Port 8085 persistent telemetry daemon                              - Offline heuristic fallback
    - Persistent SQLite database (incidents.db)
```

---

## 2. Key Features

- **Genuine Linux Health Telemetry:** Reads directly from `/proc/meminfo`, `/proc/uptime`, `/proc/cpuinfo`, `ps`, and `iproute2`. Accurately breaks down RAM into Free, Used, Buffers, and Page Cache.
- **Safe Network Diagnostics:** Performs real DNS lookups and TCP three-way handshake probes with strict allowlist enforcement (rejects arbitrary port scanning or unauthorized networks).
- **Safe Failure Simulation Lab:** Four repeatable, zero-risk operational failure scenarios:
  1. *Scenario A:* Local HTTP Telemetry Daemon outage (controlled loopback port 8085).
  2. *Scenario B:* DNS resolution failure on an invalid domain (NXDOMAIN / ENOTFOUND).
  3. *Scenario C:* Unreachable local TCP port probe (closed port 8888 returning ECONNREFUSED).
  4. *Scenario D:* Safe root filesystem storage pressure alert (>85% utilization logic without physical disk filling).
- **Incident Management & SQLite Persistence:** Full incident lifecycle tracking (OPEN → INVESTIGATING → RESOLVED), engineer runbook notes, pre/post remediation telemetry snapshot comparisons, and 1-click Markdown post-mortem exports. All state persists across server and browser restarts in `incidents.db`.
- **Gemini AI Root Cause Analysis:** Uses `gemini-3.8-flash` to synthesize evidence into prioritized hypotheses, confirmed empirical observations, and safe read-only Linux commands. Gracefully degrades to an offline rule-based heuristic engine when an API key is absent.
- **Genuine Test Execution:** 15 automated unit and integration tests executing in real-time via `python3 -m unittest tests/test_copilot.py -v`. Zero fake or hard-coded pass indicators.

---

## 3. Recommended Environment: Ubuntu on Windows (WSL2)

For Windows users targeting Linux administration and Google Data Center Technician roles, **WSL2 (Windows Subsystem for Linux 2)** is the recommended environment:
- **Instant Setup:** 1 command with minimal download overhead.
- **Genuine Linux Kernel:** Full access to `/proc`, `/sys`, `ip`, and standard Linux system calls.
- **Lightweight:** Dynamic memory allocation that does not freeze 4-8 GB of host RAM permanently.

### Step 1: Install WSL2 & Ubuntu on Windows

Open **PowerShell as Administrator** on Windows and run:
```powershell
wsl --install -d Ubuntu
```
After the installation completes, reboot your PC if prompted. When Ubuntu launches, configure your UNIX username and password.

### Step 2: Install Required Linux Packages in Ubuntu

Open your Ubuntu terminal and update system packages:
```bash
sudo apt update && sudo apt install -y python3 python3-pip python3-venv nodejs npm iproute2 procps curl sqlite3
```

Verify your installed versions:
```bash
python3 --version   # Python 3.10+ recommended
node -v             # Node.js v18+ recommended
npm -v              # npm 9+ recommended
```

---

## 4. Installation & Setup

### Step 1: Clone or Navigate to the Project

```bash
git clone <your-repo-url> datacenter-copilot
cd datacenter-copilot
```

### Step 2: Set Up Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Install Node.js Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Copy the example environment configuration:
```bash
cp .env.example .env
```

Edit `.env` (optional for offline testing):
```ini
# Optional: Required for live Gemini AI inference.
# If omitted or left empty, the application automatically runs in Offline Heuristic mode.
GEMINI_API_KEY="your-gemini-api-key-here"

# Web server port (defaults to 3000)
PORT=3000
```

---

## 5. Launching the Application

### Option A: Unified Full-Stack Lab (Recommended)

Starts the Express Node.js gateway with Vite React frontend and the Python diagnostics daemon:
```bash
npm run dev
```
Open your browser and navigate to: **`http://localhost:3000`**

### Option B: Standalone Python CLI

All telemetry, diagnostics, simulations, and tests can be run directly from the command line:

```bash
# Collect genuine Linux system metrics
python3 -m datacenter_copilot.cli metrics

# Test DNS resolution for an allowed domain
python3 -m datacenter_copilot.cli diagnose --type dns --target google.com

# Probe a local TCP port
python3 -m datacenter_copilot.cli diagnose --type tcp --target 127.0.0.1 --port 8085

# Inspect routing table
python3 -m datacenter_copilot.cli diagnose --type routing

# Query simulation lab status
python3 -m datacenter_copilot.cli simulation --action status

# Trigger HTTP service failure
python3 -m datacenter_copilot.cli simulation --action fail_http

# Reset HTTP service
python3 -m datacenter_copilot.cli simulation --action reset_http

# List persisted incidents from SQLite
python3 -m datacenter_copilot.cli incident --action list

# Run the automated test suite
python3 -m datacenter_copilot.cli run_tests
```

### Option C: Standalone Python Streamlit Dashboard

If you prefer to run the pure Python interface:
```bash
streamlit run datacenter_copilot/app.py
```
Open your browser and navigate to: **`http://localhost:8501`**

---

## 6. Automated Testing & Verification

The test suite includes 15 automated test cases testing core functionality, security boundaries, and error traps:

```bash
python3 -m unittest tests/test_copilot.py -v
```

### Test Coverage Summary:
1. `test_01_metrics_collection_and_formatting`: Validates `/proc` parsing, load averages, and byte formatters.
2. `test_02_simulated_disk_metric`: Verifies simulated storage pressure logic without physical disk writes.
3. `test_03_network_allowlist_enforcement`: Confirms rejection of unauthorized IP scanning.
4. `test_04_dns_error_handling`: Confirms NXDOMAIN handling without unhandled exceptions.
5. `test_05_tcp_closed_port_handling`: Verifies ECONNREFUSED detection on closed loopback ports.
6. `test_06_threshold_based_alert_generation`: Tests alert evaluation engine across compute, memory, and storage.
7. `test_07_safe_simulation_lifecycle`: Exercises start, fail, health probe, and reset on port 8085.
8. `test_08_incident_store_and_report_export`: Verifies SQLite lifecycle and Markdown report generation.
9. `test_09_offline_ai_rca_fallback`: Validates structured schema adherence during offline heuristic fallback.
10. `test_10_security_target_sanitization`: Verifies rejection of shell injection syntax and out-of-bounds ports.
11. `test_11_sqlite_incident_persistence_across_instances`: Verifies cross-process SQLite data persistence.
12. `test_12_relevant_services_monitoring`: Confirms real socket checks for daemons on ports 8085, 3000, 22, and 53.
13. `test_13_route_and_interface_diagnostics`: Tests safe read-only `ip route` and network interface inspection.
14. `test_14_process_inspection`: Confirms genuine process telemetry extraction via `ps`.
15. `test_15_incident_ai_analysis_persistence`: Verifies AI RCA results are stored in SQLite records.

---

## 7. Safety & Operational Security Principles

- **No Destructive Operations:** The lab never executes destructive commands (`rm -rf`, disk wipes, fork bombs, or firewall mutations).
- **Process Isolation:** The HTTP telemetry daemon runs exclusively on loopback (`127.0.0.1:8085`). Process termination checks verify `/proc/<pid>/cmdline` before issuing signals, preventing accidental signals to reused PIDs.
- **Target Allowlisting:** Layer 3/Layer 4 network probes strictly enforce an allowlist (`localhost`, `127.0.0.1`, `8.8.8.8`, `1.1.1.1`, `google.com`, `github.com`).
- **Input Sanitization:** Target hostnames and domains are checked against strict regex patterns to prevent command injection.

---

## 8. Troubleshooting & FAQ

### Port 8085 in Use or Conflict
If port 8085 is already occupied by a lingering process:
```bash
# Check what is listening on port 8085
ss -tulpn | grep 8085

# Stop and reset the simulation daemon
python3 -m datacenter_copilot.cli simulation --action reset_http
```

### Missing `/proc` on Non-Linux Hosts
If running on macOS or Windows outside WSL2, `/proc/meminfo` is not natively available. The engine uses `psutil` as a compatibility layer or returns clear error notifications rather than fabricating mock values.

### Running Without a Gemini API Key
The application is fully functional offline without an API key. When `GEMINI_API_KEY` is not present, the AI Troubleshooter uses the built-in Python heuristic engine to generate structured RCA reports and safe read-only command recommendations.
