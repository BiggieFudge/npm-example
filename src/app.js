// SAFE: No path.evaluate() or path.evaluateTruthy() - CVE-2023-45133 not applicable
// CVE-2025-27152: No axios with user-controlled URLs - use Node fetch instead
// CVE-2024-37890: ws server with maxHeadersCount mitigation
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const wordWrap = require('word-wrap');
const WebSocket = require('ws');
const http = require('http');

const MAX_INPUT_LENGTH = 10000; // Mitigate word-wrap ReDoS (CVE-2023-26115)
const ALLOWED_FETCH_ORIGINS = ['https://trusted-cdn.example.com'];

async function getCode(input) {
    if (!input) return `function square(n) { return n * n; }`;
    if (input.startsWith('http://') || input.startsWith('https://')) {
        const url = new URL(input);
        if (!ALLOWED_FETCH_ORIGINS.some(origin => url.origin === origin)) {
            throw new Error('URL not in allowlist');
        }
        // CVE-2025-27152: Use Node fetch, not axios - avoids SSRF via absolute URL bypass
        const res = await fetch(input, { redirect: 'manual' });
        if (res.status >= 300 && res.status < 400) throw new Error('Redirects not followed');
        return res.text();
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
        // CVE-2024-37890: Limit header size to prevent DoS (crash when headers exceed maxHeadersCount)
        const server = http.createServer({ maxHeaderSize: 8192 });
        server.maxHeadersCount = 0;  // Disable limit to avoid crash on threshold exceed
        const wss = new WebSocket.Server({ server, maxPayload: 8192 });
        server.listen(8080);
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