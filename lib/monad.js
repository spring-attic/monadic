(function () {
    'use strict';

    var walker = require('./walker'),
        fs = require('fs'),
        path = require('path'),
        monadsDir = path.join(__dirname, 'monads'),
        loader, utils, keys, key, len, idx;

    loader = function (module, filename) {
        var content, ds;
        content = require('fs').readFileSync(filename, 'utf8');
        ds = new walker.DoSyntax(walker.parseDo(content));
        ds.transform();
        content = new walker.PrettyPrinter(ds.ast).print();
        if (loader.debugging) {
            console.info('Translation yielded:', content);
        }
        module._compile(content, filename);
    };

    loader.debugging = false;

    require.extensions['.mjs'] = loader;

    fs.readdirSync(monadsDir).forEach(function (filename) {
        var ext = path.extname(filename);
        if (ext in require.extensions) {
            filename = path.basename(filename, ext);
            exports[filename] = require(path.join(monadsDir, filename)).monad();
        }
    });

    utils = require('./utils');
    keys = Object.keys(utils);
    len = keys.length;
    for (idx = 0; idx < len; idx += 1) {
        key = keys[idx];
        exports[key] = utils[key];
    }
}());
