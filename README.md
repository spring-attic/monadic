# Monadic


## Introduction

Monadic:

* adds Haskell-style *do-notation* to JavaScript;
* provides a simple means to add custom monad implementations;
* provides several monads implementations itself, including
  `identity`, `maybe`, `list`, `stateT` and `contT`;
* through use of the `list` monad, you get list comprehensions in
  JavaScript!
* through use of the `contT` monad transformer (which supports
  `call/cc`) offers a means of escape from the JavaScript
  *Continuation Passing Style* code spaghetti.


## Do-notation

Write JavaScript files as normal, but use the extension `.mjs` rather
than `.js`. In NodeJS, ensure you require `monadic` first, and NodeJS
will then be able to load `.mjs` files.

In `.mjs` files you have everything you have in `.js` files, plus a
`do`-block that looks like:

    do monadObj {
        // ... do-notation expressions in here
    };

* where the `monadObj` is any object that supports `mreturn` and
  `mbind` methods.

* Inside the `do`-block:
  * You have binding expressions such as `a <- foo()`;
  * `return` invokes `monadObj.mreturn`;
  * You have an *expression* language which supports `if` (which must
    include an `else` branch) and function calls;
  * Using the `var` keyword is illegal;
  * Using `while`, `for`, `for-in` and `do-while` constructs are
    illegal: use recursion for looping within a monad, or exit the
    monad.

* It is common practice to use `return` to lift any function call to
  any side-effecting operation.


### Monads

    var monadic = require('monadic');
    var identityM = monadic.identity();
    var maybeM = monadic.maybe();
    var listM = monadic.list();
    var stateTM = monadic.stateT(identityM);
    var contTM = monadic.contT(identityM);

Obviously, for the transformers, the underlying monad need not be
`identity`.

Some monads have additional methods. I recommend you check their
source, but essentially all are modelled on their Haskell brethren
with very minor adjustments. `contT` is likely to be the most
interesting given its support for `call/cc`.


### Utilities

    var monadic = require('monadic');
    var resultM = monadic.sequence(listOfMonads); // :: (Monad m) => [m a] -> m [a]


### ContT and call/cc

NodeJS suffers from horrible CPS spaghetti. This can be solved using
the `contT` monad transformer and `call/cc`. For example, inserting
into *mongodb*:

    function insertIntoCollection(collection, myObject) {
        var monadic = require('monadic');
        var when = require('when');
        var cont = monadic.contT(monadic.identity());
        var deferred = when.defer();
        cont.run(
            do cont {
                error <- cont.suspend(function (errK) {
                    cont.run(do cont {
                        inserted <- cont.suspend(function (succK) {
                            collection.insert(myObject, {safe: true},
                                cont.errorSuccessCallback(errK, succK));
                        });
                        // Normally, the following would run before
                        // the insertion had finished, but not here!
                        return console.log('The insert succeeded:', inserted);
                        return deferred.resolver.resolve(inserted);
                    });
                });
                // These are only run if errK is invoked.
                return console.log('The insert failed:', error);
                return deferred.resolver.reject(error);
            });
        return deferred.promise;
    }

Despite some I/O going on, the expressions actually do get evaluated
in the order you would expect if there was blocking I/O
available. However, the I/O is still truly async which is why the
function returns a promise (the function will complete before the
insertion completes as normal for NodeJS). This promise will be
resolved or rejected as appropriate on the result of the insertion to
the collection.

Note the use of `return` to lift side-effecting operations into the
monad.


### Debugging

To see the transformed result when loading a `.mjs` module, do:

    require.extensions['.mjs'].debugging = true;

The result of the transformation will be dumped via `console.info` as
the module is loaded.


## Browser Use

This is perfectly possible, but you must do the syntactic
transformation yourself. The transformer can be used as:

    var monadic = require('monadic');
    var plainJSText = monadic.transform('/path/to/myModule.mjs');

Thus you can either build a server-side compile step, or a dynamic
on-demand transformation if your server is NodeJS, or you can attempt
to do the transformation in the browser and then `eval` the result.
