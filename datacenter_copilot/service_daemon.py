"""
Standalone HTTP Service Daemon for DataCenter Copilot Lab.
Runs as a dedicated background process on loopback (default port 8085).
Serves simulated telemetry endpoints and handles SIGTERM/SIGINT gracefully.
"""

import os
import sys
import json
import time
import signal
import socket
import argparse
import http.server
import socketserver

DEFAULT_PORT = 8085
DEFAULT_PID_FILE = os.path.join(os.path.dirname(__file__), "..", "copilot_test_daemon.pid")


class TelemetryHTTPHandler(http.server.BaseHTTPRequestHandler):
    server_version = "DataCenterCopilot/1.0"

    def do_GET(self):
        if self.path in ("/", "/health", "/telemetry"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-Service-Name", "dc-telemetry-agent")
            self.end_headers()
            payload = {
                "status": "HEALTHY",
                "service": "dc-telemetry-agent",
                "node": socket.gethostname(),
                "pid": os.getpid(),
                "uptimeSeconds": round(time.time() - START_TIME, 2),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        else:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error": "Endpoint not found"}')

    def log_message(self, format, *args):
        # Silent logging for background daemon
        pass


START_TIME = time.time()


def run_daemon(port: int = DEFAULT_PORT, pid_file: str = DEFAULT_PID_FILE):
    pid_file = os.path.abspath(pid_file)
    with open(pid_file, "w") as f:
        f.write(str(os.getpid()))

    def cleanup(signum, frame):
        try:
            if os.path.exists(pid_file):
                os.remove(pid_file)
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("127.0.0.1", port), TelemetryHTTPHandler) as httpd:
            try:
                httpd.serve_forever()
            finally:
                if os.path.exists(pid_file):
                    try:
                        os.remove(pid_file)
                    except Exception:
                        pass
    except Exception as e:
        if os.path.exists(pid_file):
            try:
                os.remove(pid_file)
            except Exception:
                pass
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="DataCenter Copilot HTTP Daemon")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--pid-file", default=DEFAULT_PID_FILE)
    args = parser.parse_args()
    run_daemon(port=args.port, pid_file=args.pid_file)


if __name__ == "__main__":
    main()
