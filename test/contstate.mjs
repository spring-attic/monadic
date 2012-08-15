(function () {
    'use strict';

    var monadic = require('../index');

    exports.test = function () {
        var monad = monadic.stateT(monadic.contT(monadic.identity()));
        var start;
        var scm = do monad {
            return '1';
            return (function () { console.log('2'); return '2'; }());
            return (function () { console.log('3'); return '3'; }());
            x <- monad.get();
            monad.put(x+1);
            /*y <- monad.callCC(function (k) {
                return do monad {
                    x <- monad.get();
                    return console.log('here',x);
                    monad.put(x+2);
                    return start = k;
                    //k(k);
                    return 3;
                };
            });*/
            z <- monad.suspend(function (k) {
                console.log('HERE');
                start = k;
                k(1);
                //setTimeout(function () {k(8);}, 2000);
            });
            y <- monad.suspend(function (k) {
                start = k;
                k(1);
            });
            x <- monad.get();
            monad.put(x+'.');
            return console.log('and finally,', x,y);
            if ('function' === typeof y) {
                return console.log('found function...',y);
                y(78);
            } else if (y < 10) {
                return console.log('going around again I hope');
                s <- monad.get();
                return start(y+1, s);
            } else {
                return console.log('exiting');
                return 'the exit value';//start(y+1);
            }
        };
        console.log('scm:', scm);
        var cm  = monad.run(scm, 'initstate');
        console.log('cm:', cm);
        var r = monad.innerMonad.run(cm);
        //console.log('r:', r);
        return r;
    };

}());
