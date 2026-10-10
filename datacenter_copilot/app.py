"""
DataCenter Copilot - Streamlit Dashboard
Autonomous Linux & Network Diagnostics Dashboard with Safe Failure Simulators and Gemini AI Assistant.
"""

import os
import streamlit as st
from datacenter_copilot.metrics import collect_system_metrics
from datacenter_copilot.network_diag import check_dns_resolution, check_tcp_port, inspect_routes, inspect_interfaces
from datacenter_copilot.detector import evaluate_system_health
from datacenter_copilot.simulations import SimulationController
from datacenter_copilot.gemini_assistant import analyze_incident_with_gemini
from datacenter_copilot.incident_store import IncidentStore

# Page Config
st.set_page_config(
    page_title="DataCenter Copilot - Linux Diagnostics Lab",
    page_icon="🖥️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Session State
if "sim_controller" not in st.session_state:
    st.session_state.sim_controller = SimulationController()
if "incident_store" not in st.session_state:
    st.session_state.incident_store = IncidentStore()

sim: SimulationController = st.session_state.sim_controller
store: IncidentStore = st.session_state.incident_store

st.title("🖥️ DataCenter Copilot — Linux & Network Diagnostics Lab")
st.caption("AI-Assisted Diagnostics, Failure Simulations, and Incident RCA for Aspiring Google Data Center Technicians")

# Sidebar
st.sidebar.header("🕹️ Lab Control Center")
st.sidebar.markdown("**Environment:** Ubuntu Linux / Local Lab")
api_key_configured = bool(os.getenv("GEMINI_API_KEY"))
if api_key_configured:
    st.sidebar.success("🟢 Gemini API: Configured (Online)")
else:
    st.sidebar.warning("🟡 Gemini API: Offline Fallback Engine Active")

tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📊 System Health",
    "🌐 Network Diagnostics",
    "🧪 Safe Simulation Lab",
    "🚨 Incident Management",
    "🤖 AI RCA Assistant"
])

# TAB 1: System Health
with tab1:
    st.subheader("Linux Host Telemetry")
    metrics = collect_system_metrics(sim.simulated_disk_reading)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("CPU Load (1m)", f"{metrics['cpu']['load_1m']:.2f}", f"{metrics['cpu']['percent']}% usage")
    col2.metric("Memory Used", f"{metrics['memory']['percent']}%", metrics['memory']['used_human'])

    disk_label = "Disk Used (Simulated)" if metrics['disk']['is_simulated'] else "Disk Used"
    col3.metric(disk_label, f"{metrics['disk']['percent']}%", metrics['disk']['used_human'])
    col4.metric("System Uptime", metrics['uptime_formatted'], f"{metrics['uptime_seconds']:.0f}s")

    st.markdown("#### Top Active Processes")
    st.table(metrics['processes'])

# TAB 2: Network Diagnostics
with tab2:
    st.subheader("Safe Network Diagnostics")
    colA, colB = st.columns(2)

    with colA:
        st.markdown("##### DNS Resolution Check")
        dns_domain = st.text_input("Test Domain", "google.com")
        if st.button("Run DNS Lookup"):
            result = check_dns_resolution(dns_domain)
            if result['success']:
                st.success(f"Resolved in {result['latency_ms']}ms: {', '.join(result['records'])}")
            else:
                st.error(f"Error ({result['error_code']}): {result['error']}")

    with colB:
        st.markdown("##### Safe TCP Port Connectivity")
        tcp_host = st.selectbox("Target Host (Allowlisted)", ["127.0.0.1", "localhost", "google.com", "8.8.8.8"])
        tcp_port = st.number_input("Target Port", value=8085, min_value=1, max_value=65535)
        if st.button("Probe TCP Port"):
            tcp_res = check_tcp_port(tcp_host, int(tcp_port))
            if tcp_res['success']:
                st.success(f"Connection OK (Latency: {tcp_res['latency_ms']}ms)")
            else:
                st.error(f"Failed ({tcp_res['error_code']}): {tcp_res['error']}")

# TAB 3: Safe Failure Simulation Lab
with tab3:
    st.subheader("Safe Failure Demonstration Scenarios")
    st.info("Demonstrate real incident detection and recovery without harming your real system.")

    status = sim.get_status()

    # Scenario 1
    sc1 = status["scenario_1_http_service"]
    st.markdown("#### Scenario A: Local HTTP Telemetry Daemon (Port 8085)")
    st.write(f"Status: **{'RUNNING' if sc1['running'] else 'STOPPED (Simulated Outage)'}**")
    c1, c2 = st.columns(2)
    if c1.button("💥 Simulate Service Crash"):
        sim.trigger_scenario_1_http_failure()
        st.rerun()
    if c2.button("🛠️ Remediate (Restart Service)"):
        sim.reset_scenario_1()
        st.rerun()

    # Scenario 4
    sc4 = status["scenario_4_disk"]
    st.markdown("#### Scenario D: Storage Pressure Threshold Alert")
    st.write(f"Status: **{'TRIGGERED (94.6% Simulated)' if sc4['active'] else 'NORMAL (Real Disk)'}**")
    c3, c4 = st.columns(2)
    if c3.button("⚠️ Trigger Storage Alert (Safe Mock)"):
        sim.trigger_scenario_4_disk_pressure(94.6)
        st.rerun()
    if c4.button("🧹 Reset Storage Threshold"):
        sim.reset_scenario_4()
        st.rerun()

# TAB 4: Incident Management
with tab4:
    st.subheader("Incident Post-Mortems & Investigation Records")
    if not store.incidents:
        st.write("No incidents currently open. Run health checks or trigger a simulation to generate one.")
        if st.button("Generate Sample Incident from Simulation"):
            store.create_incident(
                title="Telemetry Daemon Unresponsive on Port 8085",
                severity="HIGH",
                category="NETWORK_TCP",
                evidence={"error": "ECONNREFUSED", "port": 8085, "host": "127.0.0.1"},
                pre_metrics=metrics,
                is_simulated=True
            )
            st.rerun()
    else:
        for inc in store.incidents:
            with st.expander(f"[{inc['severity']}] {inc['title']} ({inc['status']}) - ID: {inc['id']}"):
                st.json(inc['evidence'])
                note = st.text_input(f"Add Note to {inc['id']}")
                if st.button(f"Save Note {inc['id']}"):
                    store.add_note(inc['id'], note)
                    st.rerun()
                report_md = store.export_markdown_report(inc['id'])
                st.download_button(
                    label="📥 Download Markdown Post-Mortem",
                    data=report_md,
                    file_name=f"{inc['id']}_report.md",
                    mime="text/markdown"
                )

# TAB 5: AI RCA Assistant
with tab5:
    st.subheader("Gemini Root Cause Analysis (RCA)")
    st.write("Submit technical evidence to Gemini to rank root cause hypotheses and receive verification runbooks.")
    if st.button("Run AI RCA on Latest Incident"):
        if store.incidents:
            latest = store.incidents[0]
            with st.spinner("Analyzing incident evidence..."):
                analysis = analyze_incident_with_gemini(latest['title'], latest['severity'], latest['evidence'], metrics)
                st.json(analysis)
        else:
            st.warning("Create or trigger an incident first.")
