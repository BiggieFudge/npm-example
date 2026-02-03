// SAFE: No path.evaluate() or path.evaluateTruthy() - CVE-2023-45133 not applicable
// We only read path.node, never trigger static evaluation of expressions
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const axios = require('axios');
const wordWrap = require('word-wrap');
const WebSocket = require('ws');

const MAX_INPUT_LENGTH = 10000; // Mitigate word-wrap ReDoS (CVE-2023-26115)
const ALLOWED_FETCH_ORIGINS = ['https://trusted-cdn.example.com']; // Restrict axios SSRF

async function getCode(input) {
    if (!input) return `function square(n) { return n * n; }`;
    if (input.startsWith('http://') || input.startsWith('https://')) {
        const url = new URL(input);
        if (!ALLOWED_FETCH_ORIGINS.some(origin => url.origin === origin)) {
            throw new Error('URL not in allowlist');
        }
        const res = await axios.get(input, { maxRedirects: 0 });
        return res.data;
    }
    return input;
}

// SAFE: Uses path.node only - never path.evaluate() or path.evaluateTruthy()
function analyzeCode(source) {
    if (source.length > MAX_INPUT_LENGTH) throw new Error('Input too long');
    const ast = parser.parse(source);
    const visitor = {
        FunctionDeclaration(path) {
            // Read path.node only - do NOT call path.evaluate() or path.evaluateTruthy()
            if (path.node.id) console.log('Function:', path.node.id.name);
        },
    };
    traverse(ast, visitor);
}

async function main() {
    const useWs = process.argv.includes('--ws');
    const input = process.argv.find((a, i) => i > 0 && !a.startsWith('--'));

    if (useWs) {
        const wss = new WebSocket.Server({ port: 8080, maxPayload: 8192 });
        console.log('WebSocket server on ws://localhost:8080');
        wss.on('connection', (ws) => {
            ws.on('message', (data) => {
                const code = data.toString();
                if (code.length > MAX_INPUT_LENGTH) {
                    ws.send('Input too long');
                    return;
                }
                console.log('Code:\n', wordWrap(code, { width: 80 }));
                analyzeCode(code);
                ws.send('Done.');
            });
        });
        return;
    }

    const code = await getCode(input);
    if (code.length > MAX_INPUT_LENGTH) throw new Error('Input too long');
    console.log('Code to analyze:\n', wordWrap(code, { width: 80 }));
    analyzeCode(code);
    console.log('Analysis done.');
}

main().catch(console.error);