const socket = io();
let projects = [];
let currentProject = null;

// DOM Elements
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const projectList = document.getElementById('projects-ul');
const termOutput = document.getElementById('term-output');

// --- Navigation ---
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        if (target === 'project-view' && !currentProject) return;

        views.forEach(v => v.classList.remove('active'));
        navBtns.forEach(b => b.classList.remove('active'));

        document.getElementById(target).classList.add('active');
        btn.classList.add('active');
    });
});

// Subtabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.subtab).classList.add('active');
    });
});

// --- Logic ---

function log(msg) {
    termOutput.innerText += msg + '\n';
    termOutput.scrollTop = termOutput.scrollHeight;
}

async function loadProjects() {
    const res = await fetch('/api/projects');
    projects = await res.json();

    document.getElementById('total-projects').innerText = projects.length;

    projectList.innerHTML = '';
    projects.forEach(p => {
        const li = document.createElement('li');
        li.innerText = `${p.name} (Rel: ${p.relevant})`;
        li.onclick = () => openProject(p);
        projectList.appendChild(li);
    });
}

function openProject(project) {
    currentProject = project;

    // Switch View
    document.getElementById('btn-project-view').disabled = false;
    document.getElementById('btn-project-view').click();

    // Update Header
    document.getElementById('current-project-title').innerText = project.name;
    document.getElementById('count-total').innerText = project.unscreened;
    document.getElementById('count-screened').innerText = parseInt(project.unscreened) - parseInt(project.relevant) - parseInt(project.irrelevant); // approx
    document.getElementById('count-relevant').innerText = project.relevant;
}

// --- Actions (AI Wizard) ---

document.getElementById('btn-wizard-send').addEventListener('click', async () => {
    const text = document.getElementById('wizard-input').value;
    if (!text) return;

    // Show loading...
    const chatBox = document.getElementById('wizard-chat');
    chatBox.innerHTML += `<div class="user-msg" style="text-align:right; margin:10px;">${text}</div>`;
    chatBox.innerHTML += `<div class="ai-msg">Analyzing protocol... 🧠</div>`;

    try {
        const res = await fetch('/api/interpret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const textResp = await res.text();
        let data;
        try {
            data = JSON.parse(textResp);
        } catch (err) {
            throw new Error(`Server returned non-JSON: ${textResp.substring(0, 100)}...`);
        }

        if (data.error) throw new Error(data.error);

        // Fill Preview
        document.getElementById('protocol-preview').style.display = 'block';

        document.getElementById('proto-title').value = data.title || '';
        document.getElementById('proto-question').value = data.research_question || '';
        document.getElementById('proto-string').value = data.search_string || '';

        if (data.picos) {
            document.getElementById('proto-p').value = data.picos.population || '';
            document.getElementById('proto-i').value = data.picos.intervention || '';
            document.getElementById('proto-c').value = data.picos.comparison || '';
            document.getElementById('proto-o').value = data.picos.outcome || '';
            document.getElementById('proto-s').value = data.picos.study_design || '';
        }

        // Update Chat
        chatBox.innerHTML += `<div class="ai-msg">${data.confirmation_message || 'Protocol generated. Please review.'}</div>`;

        // Store full config for submission
        window.draftProtocol = data;
    } catch (e) {
        chatBox.innerHTML += `<div class="ai-msg" style="color:red;">Error: ${e.message}</div>`;
    }
});

document.getElementById('btn-confirm-project').addEventListener('click', async () => {
    if (!window.draftProtocol) return;

    // Allow user edits to override
    const finalConfig = {
        name: document.getElementById('proto-title').value,
        topic: document.getElementById('proto-question').value,
        criteria: JSON.stringify(window.draftProtocol.inclusion_criteria),
        protocol: window.draftProtocol // Save full structured data
    };

    const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalConfig)
    });

    if (res.ok) {
        alert('Project Created with PRISMA Protocol!');
        loadProjects();
        // Reset
        document.getElementById('wizard-input').value = '';
        document.getElementById('protocol-preview').style.display = 'none';
        window.draftProtocol = null;
    }
});

// MCP Search
document.getElementById('btn-run-mcp').addEventListener('click', () => {
    if (!currentProject) return;
    const query = document.getElementById('search-query-mcp').value;
    if (!query) return alert("Enter a query");
    runTask('mcp_search', { query, max: 50 });
});

// Legacy Actions
document.getElementById('btn-run-screening').addEventListener('click', () => {
    if (!currentProject) return;
    runTask('screening', { topic: document.getElementById('new-topic')?.value || currentProject.name });
});

document.getElementById('btn-generate-seeds').addEventListener('click', () => {
    if (!currentProject) return;
    const count = document.getElementById('seed-count').value;
    runTask('seeds', { top: count });
});

document.getElementById('btn-run-snowball').addEventListener('click', () => {
    if (!currentProject) return;
    runTask('snowball', {});
});

document.getElementById('btn-run-download').addEventListener('click', () => {
    if (!currentProject) return;
    runTask('download', {});
});

async function runTask(task, params) {
    log(`--- Starting ${task} ---`);
    await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            task,
            project: currentProject.name,
            params
        })
    });
}

// --- Socket Logs ---
socket.on('log', (data) => {
    if (currentProject && data.project === currentProject.name) {
        log(data.message);
    }
});

// Init
loadProjects();
