(function () {
    'use strict';

    exports.sequence = function (monad, input) {
        var acc = [], idx = -1,
            sequence1 = function (push, val) {
                if (push) {
                    acc[idx] = val;
                }
                idx += 1;
                if (idx === input.length) {
                    return do monad {
                        return acc;
                    };
                } else {
                    return do monad {
                        val <- input[idx];
                        sequence1(true, val);
                    }
                }
            };

        return sequence1();
    };
}());
