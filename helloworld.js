const http = require('http');
const send = require('send');
const async = require('async');
// 'npm-example' is the logger namespace.
const debug = require('debug')('npm-example:server'); 

const PORT = 3000;

// We use async.series to ensure our boot steps happen in order
async.series([
    // Step 1: Simulate an initialization task
    function(callback) {
        debug('Booting up system...');
        // Simulate a tiny delay (e.g., connecting to a database)
        setTimeout(() => {
            debug('Initialization complete.');
            callback(null); // 'null' means no error
        }, 500);
    },

    // Step 2: Start the HTTP Server
    function(callback) {
        const server = http.createServer(function onRequest(req, res) {
            debug(`Incoming request: ${req.url}`);

            // USAGE OF 'send':
            // We serve the 'package.json' file to anyone who visits the server
            // send(req, filePath, [options]).pipe(res);
            send(req, 'package.json', { root: __dirname })
                .on('error', function(err) {
                    res.statusCode = err.status || 500;
                    res.end(err.message);
                    debug('Error serving file:', err.message);
                })
                .pipe(res);
        });

        server.listen(PORT, function() {
            console.log(`Server is running at http://localhost:${PORT}`);
            callback(null);
        });
    }
], 
// Final callback after all steps are done
function(err) {
    if (err) {
        console.error('Failed to start application:', err);
    } else {
        debug('Application started successfully!');
    }
});
