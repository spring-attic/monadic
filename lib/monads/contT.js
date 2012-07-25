(function () {
    'use strict';

    var when = require('when');

    exports.monad = function () {
        var base = {
            mreturn: function (val) {
                return function (k) {
                    return k(val);
                };
            },

            mbind: function (m, fun) {
                return function (k) {
                    return m(function (val) {
                        return (fun(val))(k);
                    });
                };
            },

            lift: function (m) {
                return function (k) {
                    return this.innerMonad.mbind(m, k);
                }.bind(this);
            },

            run: function (monad, cont) {
                cont = cont || base.id;
                return monad(cont);
            },

            // callCC f = ContT $ \c -> runContT (f (\a -> ContT $ \_ -> c a)) c
            callCC: function (fun) {
                return function (k) {
                    var kontinue = function (val) {
                        return function (otherCont) {
                            return k(val);
                        };
                    };
                    var m = fun(kontinue);
                    return m(k);
                };
            },

            // The differences between `callCC` and `suspend` are:
            // - `callCC` can't cope with the stack unwinding.
            // - `suspend` can cope with the stack unwinding.
            // - inside the `callCC` arg function, you can `return` the
            //   resolution, or invoke the supplied fun to specify the
            //   resolution. Obviously, returning will only work on
            //   the nearest parent-scoped `callCC`.
            // - inside the `suspend` arg function, `return` will not
            //   work to specify the resolution: this is deliberate as
            //   it is assumed that the stack will unwind (as it would
            //   with returning a value) before the resolution is
            //   known.
            // - `callCC` assumes that value returned by the arg
            //   function is already monadic, and will invoke it
            //   automatically. Thus you do not need to use
            //   `cont.run`.
            // - `suspend` does not make this assumption - it allows
            //   the arg function to be any raw function as it does
            //   not inspect or care about the result (see
            //   above). Thus if you want to write monadically within
            //   the arg function, you must remember to call
            //   `cont.run` explicitly.
            // - Both allow the resolution to be made multiple times,
            //   but only suspend, by unwrapping the stack, allows
            //   this to be used to construct infinite loops: callCC
            //   will blow the stack.
            suspend: function (fun) {
                return function (k) {
                    var deferred = when.defer(),
                        resolver = deferred.resolver,
                        exception = {},
                        shouldThrow = true,
                        resumeCont;
                    try {
                        (function () {
                            fun(function (val) {
                                var nextDefer = when.defer(),
                                    oldResolver = resolver;
                                resolver = nextDefer.resolver;
                                // Force the stack to unwind
                                process.nextTick(function () {
                                    oldResolver.resolve({value: val,
                                                         promise: nextDefer.promise});
                                });
                                if (shouldThrow) {
                                    throw exception;
                                }
                            });
                        }());
                    } catch (e) {
                        if (e !== exception) {
                            throw e;
                        }
                    } finally {
                        shouldThrow = false;
                    }
                    resumeCont = function(val) {
                        // Ensure we process the current invocation
                        // before any future invocation!
                        process.nextTick(function () { val.promise.then(resumeCont); });
                        return k(val.value);
                    };
                    return deferred.promise.then(resumeCont);
                };
            },

            id: function (x) {
                return x;
            },

            errorSuccessCallback: function (errBack, sucBack) {
                return function (err, res) {
                    if (err) {
                        return errBack(err);
                    } else {
                        return sucBack(res);
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
