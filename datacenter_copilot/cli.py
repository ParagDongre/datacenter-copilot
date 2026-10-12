"""
Unified CLI & Automation Bridge for DataCenter Copilot
Connects Python's native telemetry, network diagnostics, safe simulation lab,
persistent SQLite incident store, and dynamic test runner.
"""

import sys
import json
import argparse
import unittest
import io
import time
import re
from typing import Dict, Any, List

from datacenter_copilot.metrics import collect_system_metrics
from datacenter_copilot.network_diag import check_dns_resolution, check_tcp_port, inspect_routes, inspect_interfaces, is_host_allowed
from datacenter_copilot.simulations import SimulationController
from datacenter_copilot.incident_store import IncidentStore
from datacenter_copilot.gemini_assistant import get_offline_rca_analysis
from datacenter_copilot.linux_ops import run_safe_linux_command, run_all_safe_linux_commands, SAFE_COMMAND_ALLOWLIST
from datacenter_copilot.oci_operations import (
    OCI_FACILITY_DATA, HARDWARE_SCENARIOS, NETWORK_TROUBLESHOOTING_WORKFLOWS,
    RACK_ELEVATION_DATA, OCI_INTERVIEW_PREP_DATA
)


def handle_linux_ops(args):
    action = args.action
    if action == "list_commands":
        items = [{"key": k, "purpose": v["purpose"], "category": v["category"], "description": v["description"], "args": v["args"]} for k, v in SAFE_COMMAND_ALLOWLIST.items()]
        print(json.dumps(items))
    elif action == "run":
        cmd_key = args.cmd_key
        print(json.dumps(run_safe_linux_command(cmd_key)))
    elif action == "run_all":
        print(json.dumps(run_all_safe_linux_commands()))
    else:
        print(json.dumps({"error": f"Unknown linux_ops action: {action}"}))


def handle_oci_ops(args):
    action = args.action
    if action == "facility":
        print(json.dumps(OCI_FACILITY_DATA))
    elif action == "scenarios":
        print(json.dumps(HARDWARE_SCENARIOS))
    elif action == "workflows":
        print(json.dumps(NETWORK_TROUBLESHOOTING_WORKFLOWS))
    elif action == "rack":
        print(json.dumps(RACK_ELEVATION_DATA))
    elif action == "interview_prep":
        print(json.dumps(OCI_INTERVIEW_PREP_DATA))
    else:
        print(json.dumps({"error": f"Unknown oci_ops action: {action}"}))



def handle_metrics(args):
    sim = SimulationController()
    sim_status = sim.get_status()
    sim_disk_pct = sim_status.get("scenario_4_disk", {}).get("simulated_pct")
    metrics = collect_system_metrics(simulated_disk_pct=sim_disk_pct)
    metrics["simulation_status"] = sim_status
    print(json.dumps(metrics))


def handle_diagnose(args):
    diag_type = args.type
    target = (args.target or "127.0.0.1").strip()
    port = args.port or 8085
    timeout = max(0.1, min(args.timeout or 2.5, 10.0))

    # Basic syntax check to prevent command injection characters
    if diag_type in ("dns", "tcp") and not re.match(r'^[a-zA-Z0-9.-]+$', target):
        print(json.dumps({
            "type": diag_type,
            "target": target,
            "success": False,
            "error": "Prohibited characters in diagnostic target",
            "errorCode": "INVALID_SYNTAX",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }))
        return

    sim = SimulationController()
    sim_status = sim.get_status()

    if diag_type == "dns":
        # Check if DNS failure simulation is active
        if sim_status.get("scenario_2_dns", {}).get("active") and target == sim_status.get("scenario_2_dns", {}).get("test_domain"):
            result = {
                "type": "dns",
                "target": target,
                "success": False,
                "latencyMs": 145.0,
                "errorCode": "ENOTFOUND",
                "errorMessage": f"getaddrinfo ENOTFOUND {target} (Simulated lab failure: NXDOMAIN from upstream)",
                "records": [],
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "isSimulated": True
            }
            print(json.dumps(result))
            return

        res = check_dns_resolution(target, timeout=timeout)
        result = {
            "type": "dns",
            "target": target,
            "success": res["success"],
            "latencyMs": res["latency_ms"],
            "errorCode": res["error_code"],
            "errorMessage": res["error"],
            "records": res["records"],
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "isSimulated": False
        }
        print(json.dumps(result))
        return

    if diag_type == "tcp":
        res = check_tcp_port(target, port, timeout=timeout)
        result = {
            "type": "tcp",
            "target": target,
            "port": port,
            "success": res["success"],
            "latencyMs": res["latency_ms"],
            "errorCode": res["error_code"],
            "errorMessage": res["error"],
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "isSimulated": False
        }
        print(json.dumps(result))
        return

    if diag_type == "routing":
        res = inspect_routes()
        print(json.dumps({
            "type": "routing",
            "success": res.get("success", True),
            "output": res.get("raw", ""),
            "routes": res.get("routes", []),
            "defaultGateway": res.get("default_gateway", "Unknown"),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }))
        return

    print(json.dumps({"error": f"Unknown diagnostic type: {diag_type}"}))


def handle_simulation(args):
    sim = SimulationController()
    action = args.action

    if action == "status":
        print(json.dumps(sim.get_status()))
        return

    if action == "fail_http":
        sim.trigger_scenario_1_http_failure()
    elif action == "reset_http":
        sim.reset_scenario_1()
    elif action == "fail_dns":
        sim.trigger_scenario_2_dns_failure()
    elif action == "reset_dns":
        sim.reset_scenario_2()
    elif action == "fail_tcp":
        sim.trigger_scenario_3_tcp_failure()
    elif action == "reset_tcp":
        sim.reset_scenario_3()
    elif action == "fail_disk":
        sim.trigger_scenario_4_disk_pressure(args.sim_disk or 94.6)
    elif action == "reset_disk":
        sim.reset_scenario_4()
    elif action == "reset_all":
        sim.reset_all()

    print(json.dumps(sim.get_status()))


def handle_incident(args):
    store = IncidentStore()
    action = args.action

    if action == "list":
        incidents = store.list_incidents()
        print(json.dumps(incidents))
        return

    if action == "create":
        evidence = json.loads(args.evidence or "{}")
        pre_metrics = json.loads(args.pre_metrics or "{}") if args.pre_metrics else None
        inc = store.create_incident(
            title=args.title or "System Incident",
            severity=args.severity or "HIGH",
            category=args.category or "SYSTEM",
            evidence=evidence,
            pre_metrics=pre_metrics,
            is_simulated=bool(args.is_simulated),
            incident_id=args.incident_id
        )
        print(json.dumps(inc))
        return

    if action == "update_status":
        success = store.update_status(args.incident_id, args.status)
        print(json.dumps({"success": success, "incident": store.get_incident(args.incident_id)}))
        return

    if action == "add_note":
        success = store.add_note(args.incident_id, args.text, author=args.author or "Data Center Tech")
        print(json.dumps({"success": success, "incident": store.get_incident(args.incident_id)}))
        return

    if action == "attach_analysis":
        analysis_data = json.loads(args.analysis or "{}")
        success = store.attach_ai_analysis(args.incident_id, analysis_data)
        print(json.dumps({"success": success, "incident": store.get_incident(args.incident_id)}))
        return

    if action == "resolve":
        post_metrics = json.loads(args.post_metrics or "{}") if args.post_metrics else None
        success = store.resolve_incident(
            args.incident_id,
            remediation=args.remediation or "Remediated according to runbook",
            post_metrics=post_metrics,
            outcome=args.outcome or "Verified healthy"
        )
        print(json.dumps({"success": success, "incident": store.get_incident(args.incident_id)}))
        return

    if action == "export_md":
        md = store.export_markdown_report(args.incident_id)
        print(md)
        return

    print(json.dumps({"error": f"Unknown incident action: {action}"}))


class DynamicTestResultCollector(unittest.TextTestResult):
    """Dynamically collects exact test results as they execute."""
    def __init__(self, stream, descriptions, verbosity):
        super().__init__(stream, descriptions, verbosity)
        self.collected_tests = []

    def addSuccess(self, test):
        super().addSuccess(test)
        desc = test.shortDescription() or getattr(test, "_testMethodName", str(test))
        self.collected_tests.append({
            "name": test._testMethodName,
            "description": desc,
            "passed": True,
            "status": "PASSED",
            "error_detail": None
        })

    def addFailure(self, test, err):
        super().addFailure(test, err)
        desc = test.shortDescription() or getattr(test, "_testMethodName", str(test))
        self.collected_tests.append({
            "name": test._testMethodName,
            "description": desc,
            "passed": False,
            "status": "FAILED",
            "error_detail": self._exc_info_to_string(err, test)
        })

    def addError(self, test, err):
        super().addError(test, err)
        desc = test.shortDescription() or getattr(test, "_testMethodName", str(test))
        self.collected_tests.append({
            "name": test._testMethodName,
            "description": desc,
            "passed": False,
            "status": "ERROR",
            "error_detail": self._exc_info_to_string(err, test)
        })


def handle_run_tests(args):
    start_time = time.time()
    stream = io.StringIO()
    runner = unittest.TextTestRunner(stream=stream, resultclass=DynamicTestResultCollector, verbosity=2)
    loader = unittest.TestLoader()
    suite = loader.discover("tests", pattern="test_*.py")
    result = runner.run(suite)
    duration = time.time() - start_time

    output_text = stream.getvalue()
    collected = getattr(result, "collected_tests", [])

    response = {
        "command": "python3 -m unittest tests/test_copilot.py -v",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalRun": result.testsRun,
        "totalPassed": result.testsRun - len(result.failures) - len(result.errors),
        "totalFailed": len(result.failures) + len(result.errors),
        "wasSuccessful": result.wasSuccessful(),
        "durationSeconds": round(duration, 3),
        "rawOutput": output_text,
        "tests": collected
    }
    print(json.dumps(response))


def main():
    parser = argparse.ArgumentParser(description="DataCenter Copilot Python CLI")
    subparsers = parser.add_subparsers(dest="command")

    # metrics
    subparsers.add_parser("metrics")

    # diagnose
    diag_p = subparsers.add_parser("diagnose")
    diag_p.add_argument("--type", choices=["dns", "tcp", "routing"], required=True)
    diag_p.add_argument("--target", default="127.0.0.1")
    diag_p.add_argument("--port", type=int, default=8085)
    diag_p.add_argument("--timeout", type=float, default=2.5)

    # simulation
    sim_p = subparsers.add_parser("simulation")
    sim_p.add_argument("--action", required=True)
    sim_p.add_argument("--sim-disk", type=float, default=94.6)

    # incident
    inc_p = subparsers.add_parser("incident")
    inc_p.add_argument("--action", required=True)
    inc_p.add_argument("--incident-id")
    inc_p.add_argument("--title")
    inc_p.add_argument("--severity")
    inc_p.add_argument("--category")
    inc_p.add_argument("--evidence")
    inc_p.add_argument("--pre-metrics")
    inc_p.add_argument("--post-metrics")
    inc_p.add_argument("--is-simulated", type=int, default=0)
    inc_p.add_argument("--status")
    inc_p.add_argument("--text")
    inc_p.add_argument("--author")
    inc_p.add_argument("--remediation")
    inc_p.add_argument("--outcome")
    inc_p.add_argument("--analysis")

    # tests
    subparsers.add_parser("run_tests")

    # linux_ops
    linux_p = subparsers.add_parser("linux_ops")
    linux_p.add_argument("--action", required=True)
    linux_p.add_argument("--cmd-key", default="uname")

    # oci_ops
    oci_p = subparsers.add_parser("oci_ops")
    oci_p.add_argument("--action", required=True)

    args = parser.parse_args()

    if args.command == "metrics":
        handle_metrics(args)
    elif args.command == "diagnose":
        handle_diagnose(args)
    elif args.command == "simulation":
        handle_simulation(args)
    elif args.command == "incident":
        handle_incident(args)
    elif args.command == "run_tests":
        handle_run_tests(args)
    elif args.command == "linux_ops":
        handle_linux_ops(args)
    elif args.command == "oci_ops":
        handle_oci_ops(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

