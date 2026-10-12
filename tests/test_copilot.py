"""
Automated Test Suite for DataCenter Copilot
Tests all core functions: metric parsing, thresholds, network error traps,
simulation lifecycle, persistent SQLite storage, report exports, and offline AI fallback.
Requires NO internet connectivity and NO paid API keys.
"""

import os
import unittest
import socket
from datacenter_copilot.metrics import (
    collect_system_metrics, format_bytes, format_uptime,
    get_relevant_services, get_real_linux_processes, get_network_interfaces
)
from datacenter_copilot.network_diag import is_host_allowed, check_dns_resolution, check_tcp_port, inspect_routes, inspect_interfaces
from datacenter_copilot.detector import evaluate_system_health
from datacenter_copilot.simulations import SimulationController
from datacenter_copilot.gemini_assistant import get_offline_rca_analysis
from datacenter_copilot.incident_store import IncidentStore


class TestDataCenterCopilot(unittest.TestCase):

    def test_01_metrics_collection_and_formatting(self):
        """Verify metric collection returns valid keys and handles unavailable values safely."""
        metrics = collect_system_metrics()
        self.assertIn("cpu", metrics)
        self.assertIn("memory", metrics)
        self.assertIn("disk", metrics)
        self.assertIn("uptime_seconds", metrics)
        self.assertIsInstance(metrics["cpu"]["percent"], (int, float))
        self.assertIsInstance(metrics["memory"]["percent"], (int, float))
        self.assertFalse(metrics["disk"]["is_simulated"])

        # Test byte formatting helper
        self.assertEqual(format_bytes(1024), "1.0 KB")
        self.assertEqual(format_bytes(1048576), "1.0 MB")
        self.assertEqual(format_uptime(3665), "1h 1m 5s")

    def test_02_simulated_disk_metric(self):
        """Verify that simulated disk utilization safely overrides real metrics without disk writes."""
        sim_metrics = collect_system_metrics(simulated_disk_pct=92.5)
        self.assertTrue(sim_metrics["disk"]["is_simulated"])
        self.assertEqual(sim_metrics["disk"]["percent"], 92.5)

    def test_03_network_allowlist_enforcement(self):
        """Verify allowlist blocks unauthorized host scanning."""
        self.assertTrue(is_host_allowed("127.0.0.1"))
        self.assertTrue(is_host_allowed("localhost"))
        self.assertTrue(is_host_allowed("google.com"))
        # Disallowed arbitrary host
        self.assertFalse(is_host_allowed("192.168.1.200"))
        res = check_tcp_port("192.168.1.200", 22)
        self.assertFalse(res["success"])
        self.assertEqual(res["error_code"], "DISALLOWED_TARGET")

    def test_04_dns_error_handling(self):
        """Verify DNS resolver handles invalid domains gracefully without throwing uncaught exceptions."""
        res = check_dns_resolution("invalid-datacenter-test-domain-999xyz.internal", timeout=1.0)
        self.assertFalse(res["success"])
        self.assertIsNotNone(res["error"])
        self.assertEqual(res["records"], [])

    def test_05_tcp_closed_port_handling(self):
        """Verify TCP checker identifies closed ports (ECONNREFUSED) properly."""
        # Port 59999 is typically unused on loopback
        res = check_tcp_port("127.0.0.1", 59999, timeout=0.5)
        self.assertFalse(res["success"])
        self.assertIn(res["error_code"], ["ECONNREFUSED", "ETIMEDOUT"])

    def test_06_threshold_based_alert_generation(self):
        """Verify incident detector triggers alerts when thresholds are breached."""
        fake_metrics = {
            "cpu": {"percent": 95.0, "load_1m": 4.5},
            "memory": {"percent": 96.0, "used_human": "15 GB"},
            "disk": {"percent": 92.0, "free_human": "5 GB", "is_simulated": True}
        }
        alerts = evaluate_system_health(fake_metrics, network_results=[])
        self.assertGreaterEqual(len(alerts), 3)
        categories = [a["category"] for a in alerts]
        self.assertIn("COMPUTE", categories)
        self.assertIn("MEMORY", categories)
        self.assertIn("STORAGE", categories)

    def test_07_safe_simulation_lifecycle(self):
        """Verify full lifecycle of safe simulation controller: trigger and reset."""
        temp_state = "/tmp/test_sim_state_lifecycle.json"
        temp_pid = "/tmp/test_sim_pid_lifecycle.pid"
        if os.path.exists(temp_state):
            os.remove(temp_state)
        if os.path.exists(temp_pid):
            os.remove(temp_pid)

        sim = SimulationController(port=8096, state_file=temp_state, pid_file=temp_pid)
        # Verify initial healthy state
        status = sim.get_status()
        self.assertTrue(status["scenario_1_http_service"]["running"])

        # Trigger HTTP failure
        sim.trigger_scenario_1_http_failure()
        status_after_fail = sim.get_status()
        self.assertFalse(status_after_fail["scenario_1_http_service"]["running"])

        # Reset HTTP service
        sim.reset_scenario_1()
        status_after_reset = sim.get_status()
        self.assertTrue(status_after_reset["scenario_1_http_service"]["running"])
        sim.stop_test_http_service()

    def test_08_incident_store_and_report_export(self):
        """Verify incident creation, status transition, notes, and Markdown report export."""
        test_db = "/tmp/test_incidents_crud.db"
        if os.path.exists(test_db):
            os.remove(test_db)

        store = IncidentStore(db_path=test_db)
        inc = store.create_incident(
            title="Database Connection Timeout",
            severity="HIGH",
            category="NETWORK_TCP",
            evidence={"port": 5432, "error": "ECONNREFUSED"},
            pre_metrics={"cpu": {"percent": 12.0}},
            is_simulated=True
        )
        self.assertEqual(inc["status"], "OPEN")
        inc_id = inc["id"]

        # Add investigation note
        store.add_note(inc_id, "Verified local firewall rules; no packet drops.", author="DataCenter Tech")
        store.update_status(inc_id, "INVESTIGATING")

        # Resolve incident
        store.resolve_incident(
            inc_id,
            remediation="Restarted mock listener daemon",
            post_metrics={"cpu": {"percent": 8.0}},
            outcome="Listener back in LISTEN state; HTTP 200 returned"
        )
        self.assertEqual(store.incidents[0]["status"], "RESOLVED")

        # Export Markdown report
        md = store.export_markdown_report(inc_id)
        self.assertIn("# DataCenter Copilot — Post-Mortem Incident Report", md)
        self.assertIn(inc_id, md)
        self.assertIn("[SIMULATED LAB ENVIRONMENT]", md)
        self.assertIn("Verified local firewall rules", md)

    def test_09_offline_ai_rca_fallback(self):
        """Verify offline heuristic RCA engine returns structured schema when Gemini is offline."""
        analysis = get_offline_rca_analysis("HTTP Service Down", {"port": 8085, "error": "ECONNREFUSED"})
        self.assertEqual(analysis["source"], "offline_heuristic_fallback")
        self.assertEqual(analysis["severity"], "HIGH")
        self.assertIn("hypotheses", analysis)
        self.assertGreater(len(analysis["hypotheses"]), 0)
        self.assertIn("recommended_diagnostic_commands", analysis)
        self.assertTrue(analysis["recommended_diagnostic_commands"][0]["is_safe_read_only"])

    def test_10_security_target_sanitization(self):
        """Verify that shell injection characters in target domains and ports are strictly rejected."""
        # Shell injection attempt in domain
        res_injection = check_dns_resolution("google.com; cat /etc/passwd")
        self.assertFalse(res_injection["success"])
        self.assertEqual(res_injection["error_code"], "INVALID_SYNTAX")

        # Port out of bounds
        res_bad_port = check_tcp_port("127.0.0.1", 99999)
        self.assertFalse(res_bad_port["success"])
        self.assertEqual(res_bad_port["error_code"], "INVALID_PORT")

    def test_11_sqlite_incident_persistence_across_instances(self):
        """Verify that incidents created in one IncidentStore instance persist into a new instance."""
        test_db = "/tmp/test_persistence_sync.db"
        if os.path.exists(test_db):
            os.remove(test_db)

        # Instance 1: write
        store1 = IncidentStore(db_path=test_db)
        store1.create_incident(
            title="Persistent Test Incident",
            severity="CRITICAL",
            category="STORAGE",
            evidence={"disk_percent": 98.2},
            incident_id="INC-PERSIST-99"
        )
        store1.add_note("INC-PERSIST-99", "Added note from session 1")

        # Instance 2: read independently
        store2 = IncidentStore(db_path=test_db)
        retrieved = store2.get_incident("INC-PERSIST-99")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["severity"], "CRITICAL")
        self.assertEqual(len(retrieved["notes"]), 1)
        self.assertEqual(retrieved["notes"][0]["text"], "Added note from session 1")

    def test_12_relevant_services_monitoring(self):
        """Verify that relevant data center services and telemetry daemons are accurately monitored."""
        services = get_relevant_services()
        self.assertIsInstance(services, list)
        self.assertGreaterEqual(len(services), 3)
        svc_names = [s["name"] for s in services]
        self.assertIn("dc-telemetry-agent", svc_names)
        self.assertIn("datacenter-copilot", svc_names)
        for s in services:
            self.assertIn(s["status"], ["RUNNING", "STOPPED"])
            self.assertIsInstance(s["port"], int)

    def test_13_route_and_interface_diagnostics(self):
        """Verify safe execution of network routing table inspection and interface collection."""
        routes_res = inspect_routes()
        self.assertIn("routes", routes_res)
        self.assertIn("default_gateway", routes_res)

        ifaces = inspect_interfaces()
        self.assertIsInstance(ifaces, list)
        if len(ifaces) > 0:
            first = ifaces[0]
            self.assertIn("name", first)
            self.assertIn("status", first)

    def test_14_process_inspection(self):
        """Verify genuine Linux process gathering without mock values."""
        procs = get_real_linux_processes()
        self.assertIn("items", procs)
        items = procs["items"]
        self.assertIsInstance(items, list)
        if len(items) > 0:
            proc = items[0]
            self.assertIn("pid", proc)
            self.assertIn("name", proc)
            self.assertIn("cpu", proc)
            self.assertIn("mem", proc)

    def test_15_incident_ai_analysis_persistence(self):
        """Verify attaching AI RCA analysis to an incident persists in SQLite."""
        test_db = "/tmp/test_ai_rca_persistence.db"
        if os.path.exists(test_db):
            os.remove(test_db)

        store = IncidentStore(db_path=test_db)
        inc = store.create_incident(
            title="AI RCA Test Incident",
            severity="HIGH",
            category="NETWORK_TCP",
            evidence={"error": "ECONNREFUSED"},
            incident_id="INC-AI-TEST-1"
        )
        sample_rca = {
            "incidentSummary": "AI RCA Test",
            "hypotheses": [{"title": "Daemon down", "probability": "HIGH"}]
        }
        success = store.attach_ai_analysis("INC-AI-TEST-1", sample_rca)
        self.assertTrue(success)

        reloaded = store.get_incident("INC-AI-TEST-1")
        self.assertIsNotNone(reloaded["ai_analysis"])
        self.assertEqual(reloaded["ai_analysis"]["incidentSummary"], "AI RCA Test")

    def test_16_safe_linux_ops_allowlist_and_execution(self):
        """Verify safe Linux diagnostics engine adheres to allowlist and safely executes read-only checks."""
        from datacenter_copilot.linux_ops import run_safe_linux_command, SAFE_COMMAND_ALLOWLIST
        # Verify allowlist contains core checks
        self.assertIn("uname", SAFE_COMMAND_ALLOWLIST)
        self.assertIn("df", SAFE_COMMAND_ALLOWLIST)
        self.assertIn("free", SAFE_COMMAND_ALLOWLIST)
        self.assertIn("uptime", SAFE_COMMAND_ALLOWLIST)
        self.assertIn("ip_link", SAFE_COMMAND_ALLOWLIST)
        self.assertIn("ss_sockets", SAFE_COMMAND_ALLOWLIST)

        # Execute safe uname check
        res = run_safe_linux_command("uname")
        self.assertTrue(res["success"])
        self.assertEqual(res["exitCode"], 0)
        self.assertIn("Linux", res["output"])

        # Execute arbitrary prohibited command key
        bad_res = run_safe_linux_command("rm_rf_slash")
        self.assertFalse(bad_res["success"])
        self.assertEqual(bad_res["status"], "PROHIBITED")

    def test_17_oci_operations_and_break_fix_scenarios(self):
        """Verify OCI operational data, 11 break-fix scenarios, rack elevations, and SLA targets."""
        from datacenter_copilot.oci_operations import (
            OCI_FACILITY_DATA, HARDWARE_SCENARIOS, RACK_ELEVATION_DATA
        )
        # Check facility metrics
        self.assertEqual(OCI_FACILITY_DATA["site"]["region"], "us-ashburn-1")
        self.assertEqual(OCI_FACILITY_DATA["site"]["status"], "OPERATIONAL")
        self.assertGreaterEqual(len(OCI_FACILITY_DATA["slas"]), 4)

        # Check 11 hardware break-fix scenarios
        self.assertEqual(len(HARDWARE_SCENARIOS), 11)
        for s in HARDWARE_SCENARIOS:
            self.assertIn("id", s)
            self.assertIn("title", s)
            self.assertIn("diagnostic_steps", s)
            self.assertIn("safe_sop_remediation", s)
            self.assertIn("post_verification", s)
            self.assertIn("ticket_resolution_note", s)
            self.assertGreaterEqual(len(s["diagnostic_steps"]), 2)

        # Check 42U rack elevation
        self.assertEqual(RACK_ELEVATION_DATA["total_u"], 42)
        self.assertGreaterEqual(len(RACK_ELEVATION_DATA["units"]), 10)


if __name__ == "__main__":
    unittest.main()

