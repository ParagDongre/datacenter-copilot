"""
Safe Failure Simulation Lab
Provides 4 repeatable, zero-risk demonstrations:
1. Local Test HTTP Service Stops / Restarts (persistent background daemon on port 8085)
2. DNS Lookup Fails on deliberately invalid test domain (NXDOMAIN)
3. Local permitted TCP Port is unreachable (closed port 8888)
4. Disk space alert logic triggered via configurable simulated threshold (never writes to actual disk)

Safety Guarantees:
- Never executes destructive commands (no rm -rf, no iptables changes, no fork bombs).
- Never terminates external system processes or fills real disks.
- HTTP test daemon is isolated with dedicated PID file tracking.
- Provides immediate, safe 1-click reset procedures.
"""

import os
import sys
import json
import time
import signal
import socket
import subprocess
from typing import Dict, Any, Optional

TEST_PORT = 8085
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STATE_FILE = os.environ.get("COPILOT_SIM_STATE_PATH", os.path.join(BASE_DIR, "simulation_state.json"))
PID_FILE = os.environ.get("COPILOT_SIM_PID_PATH", os.path.join(BASE_DIR, "copilot_test_daemon.pid"))


def is_port_listening(host: str, port: int, timeout: float = 0.4) -> bool:
    """Checks if a TCP port is actively listening and accepting connections."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.settimeout(timeout)
        s.connect((host, port))
        return True
    except Exception:
        return False
    finally:
        try:
            s.close()
        except Exception:
            pass


class SimulationController:
    """Manages the state of all 4 safe failure demonstrations with persistent daemon lifecycle."""
    def __init__(self, port: int = TEST_PORT, state_file: str = STATE_FILE, pid_file: str = PID_FILE):
        self.port = port
        self.state_file = os.path.abspath(state_file)
        self.pid_file = os.path.abspath(pid_file)

        # Load persisted simulation state
        state = self._load_state()
        self.scenario_dns_active: bool = state.get("scenario_dns_active", False)
        self.scenario_tcp_active: bool = state.get("scenario_tcp_active", False)
        self.simulated_disk_reading: Optional[float] = state.get("simulated_disk_reading", None)
        http_desired_running: bool = state.get("scenario_http_running", True)

        # Synchronize physical daemon state with desired state
        if http_desired_running and not self.is_http_service_running():
            self.start_test_http_service()
        elif not http_desired_running and self.is_http_service_running():
            self.stop_test_http_service()

    def _load_state(self) -> Dict[str, Any]:
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "scenario_http_running": True,
            "scenario_dns_active": False,
            "scenario_tcp_active": False,
            "simulated_disk_reading": None
        }

    def _save_state(self):
        state = {
            "scenario_http_running": self.is_http_service_running(),
            "scenario_dns_active": self.scenario_dns_active,
            "scenario_tcp_active": self.scenario_tcp_active,
            "simulated_disk_reading": self.simulated_disk_reading
        }
        try:
            with open(self.state_file, "w") as f:
                json.dump(state, f)
        except Exception:
            pass

    def get_daemon_pid(self) -> Optional[int]:
        """Returns the process ID of the running daemon if valid and confirmed to be our daemon."""
        if not os.path.exists(self.pid_file):
            return None
        try:
            with open(self.pid_file, "r") as f:
                content = f.read().strip()
                if content.isdigit():
                    pid = int(content)
                    # Check if process is alive
                    try:
                        os.kill(pid, 0)
                        # Verify it is genuinely our service_daemon process to prevent accidental signals
                        cmdline_path = f"/proc/{pid}/cmdline"
                        if os.path.exists(cmdline_path):
                            try:
                                with open(cmdline_path, "rb") as cf:
                                    cmdline = cf.read().decode("utf-8", errors="ignore")
                                    if "service_daemon" not in cmdline and "datacenter_copilot" not in cmdline:
                                        # Stale PID file referring to an unrelated reused PID
                                        try:
                                            os.remove(self.pid_file)
                                        except Exception:
                                            pass
                                        return None
                            except Exception:
                                pass
                        return pid
                    except OSError:
                        # Process died; clean up stale PID file
                        try:
                            os.remove(self.pid_file)
                        except Exception:
                            pass
                        return None
        except Exception:
            pass
        return None

    def is_http_service_running(self) -> bool:
        """Verifies both that the daemon process exists and the port is listening and serving telemetry."""
        pid = self.get_daemon_pid()
        listening = is_port_listening("127.0.0.1", self.port)

        # If port is listening but PID file was missing/stale, verify /health endpoint and adopt PID
        if listening and pid is None:
            try:
                import urllib.request
                with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/health", timeout=0.5) as resp:
                    if resp.status == 200:
                        payload = json.loads(resp.read().decode("utf-8"))
                        if payload.get("service") == "dc-telemetry-agent":
                            reported_pid = payload.get("pid")
                            if reported_pid:
                                try:
                                    with open(self.pid_file, "w") as pf:
                                        pf.write(str(reported_pid))
                                    return True
                                except Exception:
                                    pass
                            return True
            except Exception:
                pass

        return (pid is not None) and listening

    def start_test_http_service(self) -> bool:
        """Starts the persistent background daemon process."""
        if self.is_http_service_running():
            self._save_state()
            return True

        # Clean up any stale process or PID file
        self.stop_test_http_service()

        try:
            # Spawn independent background process detached from parent CLI
            daemon_cmd = [
                sys.executable,
                "-m",
                "datacenter_copilot.service_daemon",
                "--port",
                str(self.port),
                "--pid-file",
                self.pid_file
            ]
            subprocess.Popen(
                daemon_cmd,
                cwd=BASE_DIR,
                start_new_session=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

            # Wait for socket to become ready (max 3 seconds)
            deadline = time.time() + 3.0
            while time.time() < deadline:
                if is_port_listening("127.0.0.1", self.port):
                    self._save_state()
                    return True
                time.sleep(0.1)

            # Fallback check
            ready = is_port_listening("127.0.0.1", self.port)
            self._save_state()
            return ready
        except Exception as e:
            return False

    def stop_test_http_service(self) -> bool:
        """Safely terminates the persistent background daemon."""
        pid = self.get_daemon_pid()
        if pid:
            try:
                os.kill(pid, signal.SIGTERM)
                # Wait up to 2 seconds for graceful exit
                deadline = time.time() + 2.0
                while time.time() < deadline:
                    try:
                        os.kill(pid, 0)
                        time.sleep(0.1)
                    except OSError:
                        break
                # If still alive, send SIGKILL
                try:
                    os.kill(pid, signal.SIGKILL)
                except OSError:
                    pass
            except OSError:
                pass

        if os.path.exists(self.pid_file):
            try:
                os.remove(self.pid_file)
            except Exception:
                pass

        self._save_state()
        return not self.is_http_service_running()

    def trigger_scenario_1_http_failure(self):
        """Scenario 1: Local HTTP service becomes unavailable."""
        self.stop_test_http_service()

    def reset_scenario_1(self):
        """Scenario 1 Reset: Restarts the service."""
        self.start_test_http_service()

    def trigger_scenario_2_dns_failure(self):
        """Scenario 2: Set target to invalid domain to demonstrate NXDOMAIN error."""
        self.scenario_dns_active = True
        self._save_state()

    def reset_scenario_2(self):
        """Scenario 2 Reset: Return to standard valid domain."""
        self.scenario_dns_active = False
        self._save_state()

    def trigger_scenario_3_tcp_failure(self):
        """Scenario 3: Probe unlistened port 8888 to demonstrate ECONNREFUSED."""
        self.scenario_tcp_active = True
        self._save_state()

    def reset_scenario_3(self):
        """Scenario 3 Reset: Return to standard reachable port."""
        self.scenario_tcp_active = False
        self._save_state()

    def trigger_scenario_4_disk_pressure(self, simulated_pct: float = 94.6):
        """Scenario 4: Safely triggers alert threshold using simulated metric reading."""
        self.simulated_disk_reading = simulated_pct
        self._save_state()

    def reset_scenario_4(self):
        """Scenario 4 Reset: Restore real system disk readings."""
        self.simulated_disk_reading = None
        self._save_state()

    def reset_all(self):
        """Resets all 4 scenarios to healthy state."""
        self.reset_scenario_1()
        self.reset_scenario_2()
        self.reset_scenario_3()
        self.reset_scenario_4()

    def get_status(self) -> Dict[str, Any]:
        """Returns the current state of each scenario."""
        running = self.is_http_service_running()
        pid = self.get_daemon_pid()
        return {
            "scenario_1_http_service": {
                "running": running,
                "port": self.port,
                "pid": pid,
                "label": "Scenario A: Local HTTP Service Outage",
                "error": None if running else f"Connection refused on 127.0.0.1:{self.port} (Daemon stopped/unregistered)"
            },
            "scenario_2_dns": {
                "active": self.scenario_dns_active,
                "test_domain": "internal-db-node-99.invalid-datacenter.local" if self.scenario_dns_active else "google.com",
                "label": "Scenario B: DNS Resolution Failure",
                "error": "ENOTFOUND / NXDOMAIN" if self.scenario_dns_active else None
            },
            "scenario_3_tcp": {
                "active": self.scenario_tcp_active,
                "target_port": 8888 if self.scenario_tcp_active else self.port,
                "label": "Scenario C: Unreachable Local TCP Port",
                "error": "ECONNREFUSED on port 8888" if self.scenario_tcp_active else None
            },
            "scenario_4_disk": {
                "active": self.simulated_disk_reading is not None,
                "simulated_pct": self.simulated_disk_reading,
                "threshold_percent": 85.0,
                "label": "Scenario D: Safe Storage Pressure Logic"
            }
        }
