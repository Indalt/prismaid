const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
const BASE_DIR = path.resolve(__dirname, '../../../'); // prismaid root
const DOWNLOADS_DIR = path.join(BASE_DIR, 'projects/data_mining/downloads');
const SCRIPTS_DIR = path.join(BASE_DIR, 'projects/data_mining/scripts');

// --- Helpers ---

// Get list of projects (folders in downloads)
function getProjects() {
    if (!fs.existsSync(DOWNLOADS_DIR)) return [];
    return fs.readdirSync(DOWNLOADS_DIR)
        .filter(f => fs.statSync(path.join(DOWNLOADS_DIR, f)).isDirectory());
}

// Get stats for a project
function getProjectStats(projectName) {
    const pPath = path.join(DOWNLOADS_DIR, projectName);
    const relevant = path.join(pPath, 'relevant');
    const irrelevant = path.join(pPath, 'irrelevant');
    const report = path.join(pPath, 'screening_report.csv');

    // Count files
    const countFiles = (dir) => {
        if (!fs.existsSync(dir)) return 0;
        return fs.readdirSync(dir).filter(f => f.endsWith('.pdf')).length;
    }

    const total = countFiles(pPath); // unscreened in root?
    const relCount = countFiles(relevant);
    const irrelCount = countFiles(irrelevant);

    // Read report for citations
    let citations = 0;
    if (fs.existsSync(report)) {
        const content = fs.readFileSync(report, 'utf-8');
        citations = content.split('\n').filter(l => l.includes(',relevant,') && l.trim().length > 10).length; // rough heuristic
    }

    return {
        name: projectName,
        unscreened: total,
        relevant: relCount,
        irrelevant: irrelCount,
        citations: citations
    };
}

// --- API Endpoints ---

// 1. List Projects
app.get('/api/projects', (req, res) => {
    const projects = getProjects().map(p => getProjectStats(p));
    res.json(projects);
});

// 2. Create Project (PRISMA Wizard)
app.post('/api/projects', (req, res) => {
    const { name, topic, criteria } = req.body;
    const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const projectPath = path.join(DOWNLOADS_DIR, safeName);

    if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
    }

    // Save Protocol for PRISMA reporting
    if (req.body.protocol) {
        fs.writeFileSync(path.join(projectPath, 'protocol.json'), JSON.stringify(req.body.protocol, null, 2));
    }

    res.json({ success: true, name: safeName });
});

// 2.5 Interpret Protocol (AI)
app.post('/api/interpret', async (req, res) => {
    const { text } = req.body;
    const apiKey = "AIzaSyAyh1CjVrzPLYdv7K6a7l3Z9x1rWNQxqdA"; // Hardcoded for prototype
    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
    You are an expert in Systematic Reviews (PRISMA-S).
    Analyze the following user input describing a research goal:
    "${text}"

    Output STRICT JSON with the following fields:
    - title: A suggested concise academic title.
    - research_question: The formulated question.
    - picos: { population, intervention, comparison, outcome, study_design }.
    - keywords: List of portuguese and english keywords.
    - inclusion_criteria: List of inclusion rules.
    - exclusion_criteria: List of exclusion rules.
    - search_string: A suggested boolean search string (e.g., "Term A" AND "Term B").
    - confirmation_message: (String) Explain to the user what you understood and ask for confirmation.
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            let raw = data.candidates[0].content.parts[0].text;
            // Clean JSON
            raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(raw);
            res.json(json);
        } else {
            res.status(500).json({ error: 'AI Error', details: data });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Run Task (Screening, Snowball, etc)
app.post('/api/run', (req, res) => {
    const { task, project, params } = req.body;
    let cmd, args;

    const projectDir = path.join(DOWNLOADS_DIR, project);

    if (task === 'screening') {
        cmd = 'go';
        args = ['run', path.join(SCRIPTS_DIR, 'screen_generic.go'),
            '-topic', params.topic || project,
            '-input', projectDir];
    } else if (task === 'seeds') {
        cmd = 'node';
        args = [path.join(SCRIPTS_DIR, 'select_seeds.js'),
            '--source', path.join(projectDir, 'screening_report.csv'),
            '--top', params.top || '10',
            '--out', path.join(projectDir, 'snowballing/seeds.json')];
        // Ensure directory
        fs.mkdirSync(path.join(projectDir, 'snowballing'), { recursive: true });

    } else if (task === 'snowball') {
        cmd = 'node';
        args = [path.join(SCRIPTS_DIR, 'snowball.js'),
        path.join(projectDir, 'snowballing/seeds.json'),
        path.join(projectDir, 'snowballing/candidates.json')];

    } else if (task === 'download') {
        cmd = 'node';
        args = [path.join(SCRIPTS_DIR, 'download_snowball.js'),
            '--input', path.join(projectDir, 'snowballing/candidates.json')];

    } else if (task === 'mcp_search') {
        cmd = 'npx';
        // params.query comes from UI
        // Use quotes for query to handle spaces
        args = ['tsx', 'src/scripts/run_search_cli.ts',
            '--query', params.query,
            '--max', params.max || '50'];
    }

    if (!cmd) return res.status(400).json({ error: 'Unknown task' });

    console.log(`🚀 Running: ${cmd} ${args.join(' ')}`);

    // Special CWD for MCP
    const spawnOptions = { cwd: BASE_DIR, shell: true };
    if (task === 'mcp_search') {
        spawnOptions.cwd = path.resolve(BASE_DIR, 'mcp-repos-br');
    }

    const child = spawn(cmd, args, spawnOptions);

    let stdoutBuffer = '';

    child.stdout.on('data', (data) => {
        const str = data.toString();
        // Emit log to UI
        io.emit('log', { task, project, message: str });

        // Capture output for usage
        if (task === 'mcp_search') {
            stdoutBuffer += str;
        }
    });

    child.stderr.on('data', (data) => {
        io.emit('log', { task, project, message: `[ERR] ${data.toString()}` });
    });

    child.on('close', (code) => {
        io.emit('log', { task, project, message: `✅ Task finished with code ${code}` });

        // Save MCP Results
        if (task === 'mcp_search' && code === 0) {
            const projectDir = path.join(DOWNLOADS_DIR, project);
            const outputFile = path.join(projectDir, 'mcp_search_results.json');

            try {
                // Find JSON in stdout (it might have logs before it)
                const jsonStart = stdoutBuffer.lastIndexOf('{');
                if (jsonStart > -1) {
                    const jsonStr = stdoutBuffer.substring(jsonStart);
                    // Validate basic parsing
                    JSON.parse(jsonStr);
                    fs.writeFileSync(outputFile, jsonStr);
                    io.emit('log', { task, project, message: `💾 Saved results to ${outputFile}` });
                }
            } catch (e) {
                io.emit('log', { task, project, message: `❌ Failed to save results: ${e.message}` });
            }
        }
    });

    res.json({ success: true, pid: child.pid });
});

// 4. File Content (Review)
app.get('/api/file/:project/:filename', (req, res) => {
    const { project, filename } = req.params;
    const { folder } = req.query; // 'relevant', 'irrelevant'

    // Safety check needed here in production!
    const filePath = path.join(DOWNLOADS_DIR, project, folder || '', filename);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('File not found');
    }
});


// Start
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
