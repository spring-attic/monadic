(function () {
    'use strict';

    exports.monad = function () {
        var identity = {
            mreturn: function (val) { return val; },
            fail: function (msg) { throw msg; },
            mbind: function (val, fun) {
                return fun(val);
            }
        };
        return function () { return identity; };
    };
}());
