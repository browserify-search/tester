var fs = require('fs');
var glob = require('glob');
var debug = require('debug')('instrument:identify');
var path = require('path');
var yaml = require('yamljs');

// identify testing framework for target directory
function identify_testing_framework(target_dir, cb) {
    zuul(target_dir, function(err, info) {
        if (info) {
            debug('%j', info);
            return cb(null, info);
        }

        testling(target_dir, function(err, info) {
            if (info) {
                debug('%j', info);
                return cb(null, info);
            }

            mocha(target_dir, function(err, info) {
                if (info) {
                    debug('%j', info);
                    return cb(null, info);
                }

                return cb(new Error('could not identify testing framework: %s', target_dir));
            });
        });
    });
};

module.exports = identify_testing_framework;

function testling(target_dir, cb) {
    var pkg_path = path.join(target_dir, 'package.json');
    fs.readFile(pkg_path, 'utf8', function(err, json) {
        if (err) {
            return cb(err);
        }

        try {
            json = JSON.parse(json);
        } catch (err) {
            return cb(err);
        }

        if (!json.testling) {
            return cb();
        }

        var opt = {
            cwd: target_dir
        };

        glob(json.testling.files, opt, function(err, files) {
            if (err) {
                return cb(err);
            }

            var info = {
                name: 'testling',
                harness: json.testling.harness || 'tape',
                files: files
            };

            // testling treats mocha as mocha-bdd
            if (info.harness === 'mocha') {
                info.harness = 'mocha-bdd';
            }

            return cb(null, info);
        });
    });
};

function zuul(target_dir, cb) {
    var zuul_cfg = path.join(target_dir, '.zuul.yml');
    if (!fs.existsSync(zuul_cfg)) {
        return cb();
    }

    fs.readFile(zuul_cfg, 'utf-8', function(err, data) {
        if (err) {
            return cb(err);
        }

        try {
            var zuulyml = yaml.parse(data);

            var info = {
                name: 'zuul',
                harness: zuulyml.ui || 'mocha-bdd',
                files: [], // need to read package.json for this
                scripts: zuulyml.scripts,
                server: zuulyml.server
            };

            var test_files = [
                'test.js',
                'test/index.js',
                'tests/index.js',
            ];

            test_files = test_files.filter(function(file) {
                return fs.existsSync(path.join(target_dir, file));
            });

            if (test_files.length) {
                info.files = test_files;
                return cb(null, info);
            }

            return cb(null, info);
        } catch (err) {
            return cb();
        }

        return cb();
    });
};

function mocha(target_dir, cb) {
    var pkg_path = path.join(target_dir, 'package.json');
    fs.readFile(pkg_path, 'utf8', function(err, json) {
        if (err) {
            return cb(err);
        }

        try {
            json = JSON.parse(json);
        } catch (err) {
            return cb(err);
        }

        if (!json.devDependencies) {
            return cb();
        }

        if (!json.devDependencies.mocha) {
            return cb();
        }

        var info = {
            name: 'mocha',
            harness: 'mocha-bdd',
            files: undefined
        };

        if (fs.existsSync(path.join(target_dir, 'test.js'))) {
            info.files = path.join(target_dir, 'test.js');
            return cb(null, info);
        }

        var test_dir = undefined;
        if (fs.existsSync(path.join(target_dir, 'tests'))) {
            test_dir = path.join(target_dir, 'tests');
        }
        else if (fs.existsSync(path.join(target_dir, 'test'))) {
            test_dir = path.join(target_dir, 'test');
        }

        if (!test_dir) {
            return cb();
        }

        var opt = {
            cwd: target_dir
        };

        glob('*.js', opt, function(err, files) {
            if (err) {
                return cb(err);
            }

            info.files = files;
            return cb(null, info);
        });
    });
};

