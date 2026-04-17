// ---------------- STATE ----------------
const state = {
    location: { lat: 19.0760, lng: 72.8777 }
};

// ---------------- ROUTER ----------------
const app = document.getElementById("app");

function renderHome() {
    app.innerHTML = `
        <div class="card">
            <h2>Emergency Healthcare</h2>
            <button onclick="triggerSOS()" class="sos">SOS</button>
        </div>

        <div class="card">
            <button onclick="renderDoctors()">Find Doctors</button>
        </div>
    `;
}

function renderDoctors() {
    app.innerHTML = `
        <h2>Doctors</h2>
        <div class="card">Dr. Priya Sharma - Cardiologist</div>
        <div class="card">Dr. Arun Patel - Physician</div>
    `;
}

// ---------------- SOS ----------------
function triggerSOS() {
    alert("🚨 Emergency triggered!");
    renderTriage();
}

// ---------------- TRIAGE ----------------
function renderTriage() {
    app.innerHTML = `
        <h2>Describe your symptoms</h2>
        <textarea id="symptoms"></textarea>
        <button onclick="analyze()">Analyze</button>
        <div id="result"></div>
    `;
}

function analyze() {
    const text = document.getElementById("symptoms").value;

    let result = "NON-URGENT";
    if (text.includes("chest")) result = "CRITICAL";

    document.getElementById("result").innerHTML =
        `<div class="card">${result}</div>`;
}

// ---------------- MAP ----------------
function initMap() {
    const map = L.map('map-container')
        .setView([state.location.lat, state.location.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        .addTo(map);

    L.marker([state.location.lat, state.location.lng])
        .addTo(map);
}

// ---------------- INIT ----------------
window.onload = renderHome;