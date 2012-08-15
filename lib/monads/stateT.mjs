(function () {
    'use strict';

    var when = require('when');

    exports.monad = function () {
        var base = {
            mreturn: function (val) {
                var im = this.innerMonad;
                return function (state) {
                    return im.mreturn({val: val, state: state});
                };
            },

            fail: function (msg) {
                var im = this.innerMonad;
                return function (state) {
                    return im.fail(msg);
                };
            },

            mbind: function (val, fun) {
                var im = this.innerMonad;
                return function (state) {
                    return do im {
                        vs <- val(state);
                        (fun(vs.val))(vs.state);
                    };
                };
            },

            get: function () {
                var im = this.innerMonad;
                return function (state) {
                    return im.mreturn({val: state, state: state});
                };
            },

            put: function (newState) {
                var im = this.innerMonad;
                return function (state) {
                    return im.mreturn({val: true, state: newState});
                };
            },

            lift: function (innerExpr) {
                var im = this.innerMonad;
                return function (state) {
                    return do im {
                        val <- innerExpr;
                        return {val: val, state: state};
                    };
                };
            },

            modify: function (fun) {
                var im = this.innerMonad;
                return function (state) {
                    return im.mreturn({val: true, state: fun(state)});
                };
            },

            modifyAndReturn: function (fun) {
                var im = this.innerMonad;
                return function (state) {
                    return im.mreturn(fun(state));
                };
            },

            run: function (monad, initState) {
                return do this.innerMonad {
                    monad(initState);
                };
            },

            eval: function (monad, initState) {
                return do this.innerMonad {
                    vs <- monad(initState);
                    return vs.val;
                };
            },

            exec: function (monad, initState) {
                return do this.innerMonad {
                    vs <- monad(initState);
                    return vs.state;
                };
            }
        };

        return function (innerMonad) {
            var stateT = Object.create(base), callCCOrig, suspendOrig;
            stateT.innerMonad = innerMonad;
            if ('callCC' in innerMonad) {
                // If the inner monad is ContT then we need to modify
                // it's callCC slightly.
                callCCOrig = innerMonad.callCC.bind(stateT);
                stateT.callCC = function (fun) {
                    return function (state) {
                        return callCCOrig(function (k) {
                            return (fun(function (val) {
                                // val here is the val coming back
                                // from the user - the new result to
                                // be passed to the continuation.
                                return function (state1) {
                                    return k({val: val, state: state1});
                                };
                            })(state)); // feed in the state, this
                                        // will then pass our newly
                                        // constructed val-state obj
                                        // through to the original k,
                                        // and we'll continue.
                        });
                    };
                };
                suspendOrig = innerMonad.suspend.bind(stateT);
                stateT.suspend = function (fun) {
                    return function (state) {
                        // The result of suspendOrig is a fed a
                        // continuation. The result of suspendOrig
                        // feeds to that continuation the val provided
                        // by the user.
                        var cont = suspendOrig(function (k) {
                            return fun(function (val, maybeState) {
                                if (arguments.length < 2) {
                                    k({val: val});
                                } else {
                                    k({val: val, state: maybeState});
                                }
                            });
                        });
                        var kontDefer = when.defer(),
                            resultDefer = when.defer();
                        kontDefer.promise.then(function (k) {
                            // we have the rest of the comptutation in
                            // k
                            cont(function (v) {
                                // v is the value provided by the user
                                if (! ('state' in v)) {
                                    v.state = state;
                                }
                                // feed the value/state to the rest of the computation
                                return k(v);
                            }).then(function (res) {
                                // cont, when invoked, will return a
                                // promise which is only resolved when
                                // the rest of the computation
                                // completes without reinvoking the
                                // fun arg to fun (above).
                                resultDefer.resolver.resolve(res);
                            });;
                        });
                        return function (k) { // k is the rest of the computation
                            kontDefer.resolver.resolve(k); // store the k
                            return resultDefer.promise; // return a promise
                        };
                    };
                };
            }
            return stateT;
        };
    };

}());
