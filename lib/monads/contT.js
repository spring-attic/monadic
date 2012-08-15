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
                var im = this.innerMonad;
                return function (k) {
                    return im.mbind(m, k);
                };
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
            // - Due to this, in `suspend`, the provided function to
            //   receive the resolution is not a monadic value. Thus
            //   if this function escapes from the arg function,
            //   (e.g. `k2 <- suspend(function (k1) { return k1; });`)
            //   then it must subsequently be treated as a non-monadic
            //   function. E.g. invoke with `return k2(val);` rather
            //   then just `k2(val);`
            // - Both allow the resolution to be made multiple times,
            //   but only suspend, by unwrapping the stack, allows
            //   this to be used to construct infinite loops: callCC
            //   will blow the stack.
            suspend: function (fun) {
                return function (k) {
                    var deferred = when.defer(),
                        resolver = deferred.resolver,
                        result = when.defer(),
                        exception = {},
                        shouldThrow = true,
                        switched = 0, // switched acts as a semaphore
                        resumeCont;
                    try {
                        fun(function (val) {
                            var nextDefer = when.defer(),
                                oldResolver = resolver;
                            resolver = nextDefer.resolver;
                            switched += 1;
                            oldResolver.resolve({value:   val,
                                                 promise: nextDefer.promise});
                            if (shouldThrow) {
                                throw exception;
                            }
                        });
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
                        var iterResult = when.defer();
                        iterResult.promise.then(function (res) {
                            if (0 === switched) {
                                result.resolver.resolve(res);
                            }
                        });
                        switched -= 1;
                        iterResult.resolver.resolve(k(val.value));
                    };
                    deferred.promise.then(resumeCont);
                    return result.promise;
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
