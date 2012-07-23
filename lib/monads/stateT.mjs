(function () {
    'use strict';

    exports.monad = function () {
        var base = {
            mreturn: function (val) {
                return function (state) {
                    return this.innerMonad.mreturn({val: val, state: state});
                }.bind(this);
            },

            fail: function (msg) {
                return function (state) {
                    return this.innerMonad.fail(msg);
                }.bind(this);
            },

            mbind: function (val, fun) {
                return function (state) {
                    return do this.innerMonad {
                        var vs <- val(state);
                        return ((fun(vs.val))(vs.state));
                    };
                }.bind(this);
            },

            get: function () {
                return function (state) {
                    return this.innerMonad.mreturn({val: state, state: state});
                }.bind(this);
            },

            put: function (newState) {
                return function (state) {
                    return this.innerMonad.mreturn({val: true, state: newState});
                }.bind(this);
            },

            lift: function (innerExpr) {
                return function (state) {
                    return do this.innerMonad {
                        var val <- innerExpr;
                        return {val: val, state: state};
                    };
                }.bind(this);
            },

            modify: function (fun) {
                return function (state) {
                    return this.innerMonad.mreturn({val: true, state: fun(state)});
                }.bind(this);
            },

            modifyAndReturn: function (fun) {
                return function (state) {
                    return this.innerMonad.mreturn(fun(state));
                }.bind(this);
            },

            run: function (monad, initState) {
                return do this.innerMonad {
                    return monad(initState);
                };
            },

            eval: function (monad, initState) {
                return do this.innerMonad {
                    var vs <- monad(initState);
                    return vs.val;
                };
            },

            exec: function (monad, initState) {
                return do this.innerMonad {
                    var vs <- monad(initState);
                    return vs.state;
                };
            }
        };

        return function (innerMonad) {
            var stateT = Object.create(base);
            stateT.innerMonad = innerMonad
            return stateT;
        };
    };

}());
