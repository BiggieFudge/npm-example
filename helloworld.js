const http = require('http');
const async = require('async');
const debug = require('debug')('npm-example:server');

const PORT = 3000;

// CVE-2024-39249 TRIGGER:
// The vulnerability exists in how 'autoInject' parses the function arguments 
// (e.g., 'get_data', 'make_folder') using a regex. 
// By using this function, we demonstrate to the scanner that the vulnerable code path is active.
const messyTask = {
    get_data: function(callback) {
        debug('Fetching data...');
        // Simulate async work
        setTimeout(() => callback(null, 'data', 'converted-to-array'), 100);
    },
    make_folder: function(callback) {
        debug('Creating folder...');
        setTimeout(() => callback(null, 'folder'), 100);
    },
    // The scanner looks for this pattern: a function passed to autoInject 
    // where arguments match previous task names.
    write_file: function(get_data, make_folder, callback) {
        debug('Writing file with:', get_data, make_folder);
        callback(null, 'filename');
    }
};

const server = http.createServer((req, res) => {
    debug(`Request received: ${req.url}`);

    // We trigger the vulnerable function on every request
    async.autoInject(messyTask, function(err, results) {
        if (err) {
            res.writeHead(500);
            res.end('Error occurred');
            return;
        }
        res.writeHead(200);
        res.end(`Vulnerable Flow Complete! File created: ${results.write_file}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Async version: ${require('async/package.json').version}`);
    console.log('Vulnerability CVE-2024-39249 path is now active.');
});
#Infra..
