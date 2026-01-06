const async = require('async');

console.log("Starting Application...");

// async.waterfall allows each function to pass results to the next one
async.waterfall([
    // Step 1: Generate the first part of the message
    function(callback) {
        setTimeout(function() {
            // First argument is 'error' (null), second is the result
            callback(null, 'Hello');
        }, 1000);
    },

    // Step 2: Receive 'Hello', add 'World', and print it
    function(greeting, callback) {
        setTimeout(function() {
            const fullMessage = greeting + " World"; 
            console.log(fullMessage);
            callback(null, 'Success');
        }, 500);
    }
], 
// Final Callback: Runs after all steps are complete or if an error occurs
function(err, result) {
    if (err) {
        console.error("An error occurred:", err);
    } else {
        console.log("Async flow finished with status:", result);
    }
});
