(function () {
    'use strict';

    exports.monad = function () {
        var maybe = {
            mreturn: function (val) { return { just: val }; },
            fail: function (msg) { return undefined; },
            mbind: function (val, fun) {
                if ('just' in val) {
                    return fun(val.just);
                } else {
                    return val;
                }
            }
        };
        return function () { return maybe; };
    };

}());
