(function () {
    'use strict';

    exports.monad = function () {
        var list = {
            mreturn: function (val) { return [val]; },
            fail: function (msg) { return []; },
            mbind: function (val, fun) {
                return val.reduceRight(function (acc, elem) {
                    return fun(elem).concat(acc);
                }, []);
            }
        };
        return function () { return list; };
    };

}());
