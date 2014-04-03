var fs = require('fs');
var debug = require('debug')('instrument:install');
var log = require('debug')('instrument:install:npm');
var spawn = require('child_process').spawn;

// install dependencies for project
function prepare_project(target_dir, cb) {
    debug('run npm install in (%s)', target_dir);

    var args = ['install'];

    var child = spawn('npm', args, {
        cwd: target_dir
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(chunk) {
        log(chunk);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(chunk) {
        log(chunk);
    });

    child.on('exit', function(code) {
        if (code !== 0) {
            return cb(new Error('npm install failed [code: ' + code + ']'));
        }
        cb();
    });
};

module.exports = prepare_project;
