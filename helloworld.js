const http = require('http');
const async = require('async');
const debug = require('debug')('npm-example:server');

// ==========================================================
// 🚨 XRAY TEST ZONE: SECRETS DETECTION
// The following variables contain patterns that Xray should flag 
// as "Hardcoded Secrets" or "Leaked Credentials".
// ==========================================================

// 1. AWS Access Key Pattern (starts with AKIA + 16 chars)
const AWS_ACCESS_KEY = "AKIAIMW655555EXAMPLE"; 

// 2. Generic API Token Pattern (high entropy string assigned to sensitive variable)
const STRIPE_SECRET_KEY = "sk_live_51Mz93L2e4x0Kj8yT7q1A2b3C4d5E6f7G8h9";

// ==========================================================

const PORT = 3000;

// CVE-2024-39249 TRIGGER (ReDoS in async.autoInject)
// This remains from the previous step to test Contextual Analysis
const messyTask = {
    get_data: function(callback) {
        debug('Fetching data...');
        setTimeout(() => callback(null, 'data', 'converted-to-array'), 100);
    },
    make_folder: function(callback) {
        debug('Creating folder...');
        setTimeout(() => callback(null, 'folder'), 100);
    },
    write_file: function(get_data, make_folder, callback) {
        debug('Writing file with:', get_data, make_folder);
        callback(null, 'filename');
    }
};

const server = http.createServer((req, res) => {
    debug(`Request received: ${req.url}`);

    // Vulnerable function usage
    async.autoInject(messyTask, function(err, results) {
        if (err) {
            res.writeHead(500);
            res.end('Error occurred');
            return;
        }
        res.writeHead(200);
        // We "leak" the secret in the response just to be extra visible (not required for detection)
        res.end(`App running with AWS Key: ${AWS_ACCESS_KEY.substring(0, 4)}... \nFile created: ${results.write_file}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Secrets injected for Xray detection.');
});
