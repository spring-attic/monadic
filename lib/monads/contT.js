(function () {
    'use strict';

    var when = require('when');

    exports.monad = function () {
        var base = {
            mreturn: function (val) {
                return function (cont) {
                    return cont(val);
                };
            },

            mbind: function (val, fun) {
                return function (cont) {
                    return val(function (a) {
                        return (fun(a))(cont);
                    });
                };
            },

            lift: function (val) {
                return function (fun) {
                    return base.mbind(val, fun);
                };
            },

            run: function (monad, cont) {
                return monad(function (val) { return cont(val); });
            },

            callCC: function (fun) {
                return function (cont) {
                    var invoked = false, deferred;
                    var k = function (a) {
                        if (deferred) {
                            deferred.resolver.resolve(
                                function (otherCont) {
                                    return cont(a);
                                });
                        } else {
                            invoked = true;
                            return function (otherCont) {
                                return cont(a);
                            };
                        }
                    };
                    var result = fun(k);
                    if (invoked) {
                        return result(cont);
                    } else {
                        deferred = when.defer();
                        deferred.promise.then(function (result) {
                            return result(cont);
                        });
                        return deferred.promise;
                    }
                };
            }
        };

        return function (innerMonad) {
            var contT = Object.create(base);
            contT.innerMonad = innerMonad;
            return contT;
        };
    };
}());
