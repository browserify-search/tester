var fs = require('fs');
var path = require('path');
var debug = require('debug')('instrument');
var Zuul = require('zuul');
var browserify = require('browserify');

var clone_repo = require('./clone');
var prepare_project = require('./prepare');
var identify = require('./identify');

function lifecycle(repo, target_dir, cb) {
    var status = {};

    var done = function(err) {
        return cb(err, status);
    };

    clone_repo(repo, target_dir, function(err) {
        if (err) {
            return cb(err);
        }

        prepare_project(target_dir, function(err) {
            if (err) {
                return cb(err);
            }

            var pkg = JSON.parse(fs.readFileSync(path.join(target_dir, 'package.json')));
            status.name = pkg.name;
            status.version = pkg.version;
            status.repo = repo;

            check_browserify(target_dir, function(err) {
                if (err) {
                    status.browserify = false;
                    return done(err);
                }

                status.browserify = true;

                identify(target_dir, function(err, info) {
                    if (err) {
                        return done(err);
                    }

                    if (!info) {
                        return done();
                    }

                    status.framework = info;

                    run_tests(info, repo, target_dir, function(err, passed) {
                        status.passed = passed;
                        done(err);
                    });
                });
            });

        });
    });
}

module.exports = lifecycle;

// see if browserify can bundle the module
function check_browserify(target_dir, cb) {
    var opt = {
        basedir: target_dir
    };

    var bndl = browserify(opt);
    bndl.add(target_dir);

    bndl.bundle(function(err, src) {
        if (err) {
            return cb(err);
        }

        return cb();
    });
};

// run tests in target_dir
// callback(error, pass/fail)
function run_tests(info, repo, target_dir, cb) {

    debug('run tests %s - %j', target_dir, info);

    var files = info.files.map(function(file) {
        return path.join(target_dir, file);
    });

    var config = {
        name: repo,
        ui: info.harness,
        prj_dir: target_dir,
        concurrency: 1,
        files: files
    };

    if (info.server) {
        config.server = path.join(target_dir, info.server)
    }

    var zuul = Zuul(config);

    zuul.browser({
        name: 'Chrome',
        version: 33,
        platform: 'ANY'
    });

    zuul.run(function(passed) {
        debug('done %s (%s)', target_dir, (passed) ? 'passed' : 'failed');
        cb(null, passed);
    });
};
