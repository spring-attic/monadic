var monad = require('../lib/monad');

function foo () {
    var a = do monad.list() {
        var g = 3;
        x <- ['a', 'b', 'c', 'd'];
        y <- [1, 2];
        return [x, y, g];
    };
    return a;
}

function fibMonadic(n) {
    var ary = [], stateMonad, i, result;
    stateMonad = monad.stateT(monad.identity());
    for (i = 0; i < n; i += 1) {
        ary.push(fibMonadicStep(stateMonad));
    }
    result = stateMonad.exec(monad.sequence(stateMonad, ary), [0,1]);
    return result[1];
}

function fibMonadicStep(stateMonad) {
    return stateMonad.modify(
        function (xy) { var x = xy[0], y = xy[1]; return [y, x+y]; });
}

function contTest(x, y, k) {
    var cont = monad.contT(monad.identity());
    var square = function (x) {
        return do cont {
            return x * x;
        };
    };
    var add = function (x, y) {
        return do cont {
            return x + y;
        };
    };
    return cont.run(do cont {
        var xx <- square(x);
        var yy <- square(y);
        var sum <- add(xx, yy);
        var sum2 <- add(xx, yy);
        var sum3 <- add(sum, sum2);
        return sum3;
    }, k);
}

function callCCTest(x, y) {
    var cont = monad.contT(monad.identity());
    var add = function (x, y) {
        return do cont {
            return x + y;
        };
    };
    var g = 0;
    return do cont {
        var sum <- add(x,y);
        var msg <- cont.callCC(function (k) {
            return do cont {
                if (x === y) {
                    return setTimeout(function () {k('They are equal');}, 1000);
                } else if (x > y) {
                    k('x > y');
                } else {
                    k('x < y');
                }
            };
        });
        var len <- cont.mreturn(msg.length);
        return [msg, sum, len, g++];
    };
}

exports.foo = foo;
exports.fibMonadic = fibMonadic;
exports.contTest = contTest;
exports.callCCTest = callCCTest;