var fs = require('fs');
var debug = require('debug')('instrument:clone');
var git_log = require('debug')('instrument:clone:git');
var spawn = require('child_process').spawn;

// clone repo source
function clone_repo(git_url, target_dir, cb) {
    if (fs.existsSync(target_dir)) {
        debug('target dir exists %s', target_dir);
        return cb();
    }

    debug('cloning repo %s -> %s', git_url, target_dir);

    // get project from github
    var repo_url = git_url;
    var args = ['clone', repo_url, target_dir];

    var child = spawn('git', args);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(chunk) {
        git_log(chunk);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(chunk) {
        git_log(chunk);
    });

    child.on('exit', function(code) {
        if (code !== 0) {
            return cb(new Error('git clone failed [code: ' + code + ']'));
        }
        cb();
    });
};

module.exports = clone_repo;

