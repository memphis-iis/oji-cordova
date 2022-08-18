(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;

/* Package-scope variables */
var exports, Promise;

var require = meteorInstall({"node_modules":{"meteor":{"promise":{"server.js":["meteor-promise","fibers",function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/promise/server.js                                                                                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
exports.Promise = require("meteor-promise");

// Define MeteorPromise.Fiber so that every Promise callback can run in a
// Fiber drawn from a pool of reusable Fibers.
exports.Promise.Fiber = require("fibers");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"node_modules":{"meteor-promise":{"package.json":function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// .npm/package/node_modules/meteor-promise/package.json                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
exports.name = "meteor-promise";
exports.version = "0.6.3";
exports.main = "promise_server.js";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"promise_server.js":["assert","./fiber_pool.js","./promise.js",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/promise_server.js                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var assert = require("assert");
var fiberPool = require("./fiber_pool.js").makePool();
var MeteorPromise = require("./promise.js");

// Replace MeteorPromise.prototype.then with a wrapper that ensures the
// onResolved and onRejected callbacks always run in a Fiber.
var es6PromiseThen = MeteorPromise.prototype.then;
MeteorPromise.prototype.then = function (onResolved, onRejected) {
  var Promise = this.constructor;

  if (typeof Promise.Fiber === "function") {
    var fiber = Promise.Fiber.current;
    var dynamics = cloneFiberOwnProperties(fiber);

    return es6PromiseThen.call(
      this,
      wrapCallback(onResolved, Promise, dynamics),
      wrapCallback(onRejected, Promise, dynamics)
    );
  }

  return es6PromiseThen.call(this, onResolved, onRejected);
};

function wrapCallback(callback, Promise, dynamics) {
  if (! callback) {
    return callback;
  }

  return function (arg) {
    return fiberPool.run({
      callback: callback,
      args: [arg], // Avoid dealing with arguments objects.
      dynamics: dynamics
    }, Promise);
  };
}

function cloneFiberOwnProperties(fiber) {
  if (fiber) {
    var dynamics = {};

    Object.keys(fiber).forEach(function (key) {
      dynamics[key] = shallowClone(fiber[key]);
    });

    return dynamics;
  }
}

function shallowClone(value) {
  if (Array.isArray(value)) {
    return value.slice(0);
  }

  if (value && typeof value === "object") {
    var copy = Object.create(Object.getPrototypeOf(value));
    var keys = Object.keys(value);
    var keyCount = keys.length;

    for (var i = 0; i < keyCount; ++i) {
      var key = keys[i];
      copy[key] = value[key];
    }

    return copy;
  }

  return value;
}

// Yield the current Fiber until the given Promise has been fulfilled.
function awaitPromise(promise) {
  var Promise = promise.constructor;
  var Fiber = Promise.Fiber;

  assert.strictEqual(
    typeof Fiber, "function",
    "Cannot await unless Promise.Fiber is defined"
  );

  var fiber = Fiber.current;

  assert.ok(
    fiber instanceof Fiber,
    "Cannot await without a Fiber"
  );

  var run = fiber.run;
  var throwInto = fiber.throwInto;

  if (process.domain) {
    run = process.domain.bind(run);
    throwInto = process.domain.bind(throwInto);
  }

  // The overridden es6PromiseThen function is adequate here because these
  // two callbacks do not need to run in a Fiber.
  es6PromiseThen.call(promise, function (result) {
    tryCatchNextTick(fiber, run, [result]);
  }, function (error) {
    tryCatchNextTick(fiber, throwInto, [error]);
  });

  return Fiber.yield();
}

// Invoke method with args against object in a try-catch block,
// re-throwing any exceptions in the next tick of the event loop, so that
// they won't get captured/swallowed by the caller.
function tryCatchNextTick(object, method, args) {
  try {
    return method.apply(object, args);
  } catch (error) {
    process.nextTick(function () {
      throw error;
    });
  }
}

MeteorPromise.awaitAll = function (args) {
  return awaitPromise(this.all(args));
};

MeteorPromise.await = function (arg) {
  return awaitPromise(this.resolve(arg));
};

MeteorPromise.prototype.await = function () {
  return awaitPromise(this);
};

// Return a wrapper function that returns a Promise for the eventual
// result of the original function.
MeteorPromise.async = function (fn, allowReuseOfCurrentFiber) {
  var Promise = this;
  return function () {
    return Promise.asyncApply(
      fn, this, arguments,
      allowReuseOfCurrentFiber
    );
  };
};

MeteorPromise.asyncApply = function (
  fn, context, args, allowReuseOfCurrentFiber
) {
  var Promise = this;
  var Fiber = Promise.Fiber;
  var fiber = Fiber && Fiber.current;

  if (fiber && allowReuseOfCurrentFiber) {
    return this.resolve(fn.apply(context, args));
  }

  return fiberPool.run({
    callback: fn,
    context: context,
    args: args,
    dynamics: cloneFiberOwnProperties(fiber)
  }, Promise);
};

Function.prototype.async = function (allowReuseOfCurrentFiber) {
  return MeteorPromise.async(this, allowReuseOfCurrentFiber);
};

Function.prototype.asyncApply = function (
  context, args, allowReuseOfCurrentFiber
) {
  return MeteorPromise.asyncApply(
    this, context, args, allowReuseOfCurrentFiber
  );
};

module.exports = exports = MeteorPromise;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"fiber_pool.js":["assert",function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/fiber_pool.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var assert = require("assert");
var undefined;

function FiberPool(targetFiberCount) {
  assert.ok(this instanceof FiberPool);
  assert.strictEqual(typeof targetFiberCount, "number");

  var fiberStack = [];

  function makeNewFiber(Fiber) {
    // Just in case someone tampers with Fiber.yield, don't let that interfere
    // with our processing of the callback queue.
    var originalYield = Fiber.yield;

    var fiber = new Fiber(function () {
      while (true) {
        // Call Fiber.yield() to await further instructions.
        var entry = originalYield.call(Fiber);

        // Ensure this Fiber is no longer in the pool once it begins to
        // execute an entry.
        assert.strictEqual(fiberStack.indexOf(fiber), -1);

        if (entry.dynamics) {
          // Restore the dynamic environment of this fiber as if
          // entry.callback had been wrapped by Meteor.bindEnvironment.
          Object.keys(entry.dynamics).forEach(function (key) {
            fiber[key] = entry.dynamics[key];
          });
        }

        try {
          entry.resolve(entry.callback.apply(
            entry.context || null,
            entry.args || []
          ));
        } catch (error) {
          entry.reject(error);
        }

        // Remove all own properties of the fiber before returning it to
        // the pool.
        Object.keys(fiber).forEach(function (key) {
          delete fiber[key];
        });

        if (fiberStack.length < targetFiberCount) {
          fiberStack.push(fiber);
        } else {
          // If the pool has already reached the target maximum number of
          // Fibers, don't bother recycling this Fiber.
          break;
        }
      }
    });

    // Run the new Fiber up to the first yield point, so that it will be
    // ready to receive entries.
    fiber.run();

    return fiber;
  }

  // Run the entry.callback function in a Fiber either taken from the pool
  // or created anew if the pool is empty. This method returns a Promise
  // for the eventual result of the entry.callback function.
  this.run = function (entry, Promise) {
    assert.strictEqual(typeof entry, "object");
    assert.strictEqual(typeof entry.callback, "function");

    if (typeof Promise.Fiber !== "function") {
      return new Promise(function (resolve) {
        resolve(entry.callback.apply(
          entry.context || null,
          entry.args
        ));
      });
    }

    var fiber = fiberStack.pop() || makeNewFiber(Promise.Fiber);

    var promise = new Promise(function (resolve, reject) {
      entry.resolve = resolve;
      entry.reject = reject;
    });

    fiber.run(entry);

    return promise;
  };

  // Limit the maximum number of idle Fibers that may be kept in the
  // pool. Note that the run method will never refuse to create a new
  // Fiber if the pool is empty; it's just that excess Fibers might be
  // thrown away upon completion, if the pool is full.
  this.setTargetFiberCount = function (limit) {
    assert.strictEqual(typeof limit, "number");

    targetFiberCount = Math.max(limit, 0);

    if (targetFiberCount < fiberStack.length) {
      // If the requested target count is less than the current length of
      // the stack, truncate the stack and terminate any surplus Fibers.
      fiberStack.splice(targetFiberCount).forEach(function (fiber) {
        fiber.reset();
      });
    }

    return this;
  };
}

// Call pool.drain() to terminate all Fibers waiting in the pool and
// signal to any outstanding Fibers that they should exit upon completion,
// instead of reinserting themselves into the pool.
FiberPool.prototype.drain = function () {
  return this.setTargetFiberCount(0);
};

exports.makePool = function (targetFiberCount) {
  return new FiberPool(targetFiberCount || 20);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"promise.js":["promise",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/promise.js                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var hasOwn = Object.prototype.hasOwnProperty;

var g =
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this;

var GlobalPromise = g.Promise;
var NpmPromise = require("promise");

function copyMethods(target, source) {
  Object.keys(source).forEach(function (key) {
    var value = source[key];
    if (typeof value === "function" &&
        ! hasOwn.call(target, key)) {
      target[key] = value;
    }
  });
}

if (typeof GlobalPromise === "function") {
  copyMethods(GlobalPromise, NpmPromise);
  copyMethods(GlobalPromise.prototype, NpmPromise.prototype);
  module.exports = GlobalPromise;
} else {
  module.exports = NpmPromise;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"node_modules":{"promise":{"package.json":function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// .npm/package/node_modules/meteor-promise/node_modules/promise/package.json                                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
exports.name = "promise";
exports.version = "7.1.1";
exports.main = "index.js";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":["./lib",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/index.js                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
'use strict';

module.exports = require('./lib')

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"lib":{"index.js":["./core.js","./done.js","./finally.js","./es6-extensions.js","./node-extensions.js","./synchronous.js",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/lib/index.js                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
'use strict';

module.exports = require('./core.js');
require('./done.js');
require('./finally.js');
require('./es6-extensions.js');
require('./node-extensions.js');
require('./synchronous.js');

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"core.js":["asap/raw",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/lib/core.js                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
'use strict';

var asap = require('asap/raw');

function noop() {}

// States:
//
// 0 - pending
// 1 - fulfilled with _value
// 2 - rejected with _value
// 3 - adopted the state of another promise, _value
//
// once the state is no longer pending (0) it is immutable

// All `_` prefixed properties will be reduced to `_{random number}`
// at build time to obfuscate them and discourage their use.
// We don't use symbols or Object.defineProperty to fully hide them
// because the performance isn't good enough.


// to avoid using try/catch inside critical functions, we
// extract them to here.
var LAST_ERROR = null;
var IS_ERROR = {};
function getThen(obj) {
  try {
    return obj.then;
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}
function tryCallTwo(fn, a, b) {
  try {
    fn(a, b);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

module.exports = Promise;

function Promise(fn) {
  if (typeof this !== 'object') {
    throw new TypeError('Promises must be constructed via new');
  }
  if (typeof fn !== 'function') {
    throw new TypeError('not a function');
  }
  this._45 = 0;
  this._81 = 0;
  this._65 = null;
  this._54 = null;
  if (fn === noop) return;
  doResolve(fn, this);
}
Promise._10 = null;
Promise._97 = null;
Promise._61 = noop;

Promise.prototype.then = function(onFulfilled, onRejected) {
  if (this.constructor !== Promise) {
    return safeThen(this, onFulfilled, onRejected);
  }
  var res = new Promise(noop);
  handle(this, new Handler(onFulfilled, onRejected, res));
  return res;
};

function safeThen(self, onFulfilled, onRejected) {
  return new self.constructor(function (resolve, reject) {
    var res = new Promise(noop);
    res.then(resolve, reject);
    handle(self, new Handler(onFulfilled, onRejected, res));
  });
};
function handle(self, deferred) {
  while (self._81 === 3) {
    self = self._65;
  }
  if (Promise._10) {
    Promise._10(self);
  }
  if (self._81 === 0) {
    if (self._45 === 0) {
      self._45 = 1;
      self._54 = deferred;
      return;
    }
    if (self._45 === 1) {
      self._45 = 2;
      self._54 = [self._54, deferred];
      return;
    }
    self._54.push(deferred);
    return;
  }
  handleResolved(self, deferred);
}

function handleResolved(self, deferred) {
  asap(function() {
    var cb = self._81 === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      if (self._81 === 1) {
        resolve(deferred.promise, self._65);
      } else {
        reject(deferred.promise, self._65);
      }
      return;
    }
    var ret = tryCallOne(cb, self._65);
    if (ret === IS_ERROR) {
      reject(deferred.promise, LAST_ERROR);
    } else {
      resolve(deferred.promise, ret);
    }
  });
}
function resolve(self, newValue) {
  // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
  if (newValue === self) {
    return reject(
      self,
      new TypeError('A promise cannot be resolved with itself.')
    );
  }
  if (
    newValue &&
    (typeof newValue === 'object' || typeof newValue === 'function')
  ) {
    var then = getThen(newValue);
    if (then === IS_ERROR) {
      return reject(self, LAST_ERROR);
    }
    if (
      then === self.then &&
      newValue instanceof Promise
    ) {
      self._81 = 3;
      self._65 = newValue;
      finale(self);
      return;
    } else if (typeof then === 'function') {
      doResolve(then.bind(newValue), self);
      return;
    }
  }
  self._81 = 1;
  self._65 = newValue;
  finale(self);
}

function reject(self, newValue) {
  self._81 = 2;
  self._65 = newValue;
  if (Promise._97) {
    Promise._97(self, newValue);
  }
  finale(self);
}
function finale(self) {
  if (self._45 === 1) {
    handle(self, self._54);
    self._54 = null;
  }
  if (self._45 === 2) {
    for (var i = 0; i < self._54.length; i++) {
      handle(self, self._54[i]);
    }
    self._54 = null;
  }
}

function Handler(onFulfilled, onRejected, promise){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, promise) {
  var done = false;
  var res = tryCallTwo(fn, function (value) {
    if (done) return;
    done = true;
    resolve(promise, value);
  }, function (reason) {
    if (done) return;
    done = true;
    reject(promise, reason);
  })
  if (!done && res === IS_ERROR) {
    done = true;
    reject(promise, LAST_ERROR);
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"done.js":["./core.js",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/lib/done.js                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this;
  self.then(null, function (err) {
    setTimeout(function () {
      throw err;
    }, 0);
  });
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"finally.js":["./core.js",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/lib/finally.js                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.prototype['finally'] = function (f) {
  return this.then(function (value) {
    return Promise.resolve(f()).then(function () {
      return value;
    });
  }, function (err) {
    return Promise.resolve(f()).then(function () {
      throw err;
    });
  });
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"es6-extensions.js":["./core.js",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/lib/es6-extensions.js               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js');

module.exports = Promise;

/* Static Functions */

var TRUE = valuePromise(true);
var FALSE = valuePromise(false);
var NULL = valuePromise(null);
var UNDEFINED = valuePromise(undefined);
var ZERO = valuePromise(0);
var EMPTYSTRING = valuePromise('');

function valuePromise(value) {
  var p = new Promise(Promise._61);
  p._81 = 1;
  p._65 = value;
  return p;
}
Promise.resolve = function (value) {
  if (value instanceof Promise) return value;

  if (value === null) return NULL;
  if (value === undefined) return UNDEFINED;
  if (value === true) return TRUE;
  if (value === false) return FALSE;
  if (value === 0) return ZERO;
  if (value === '') return EMPTYSTRING;

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then;
      if (typeof then === 'function') {
        return new Promise(then.bind(value));
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex);
      });
    }
  }
  return valuePromise(value);
};

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr);

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([]);
    var remaining = args.length;
    function res(i, val) {
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        if (val instanceof Promise && val.then === Promise.prototype.then) {
          while (val._81 === 3) {
            val = val._65;
          }
          if (val._81 === 1) return res(i, val._65);
          if (val._81 === 2) reject(val._65);
          val.then(function (val) {
            res(i, val);
          }, reject);
          return;
        } else {
          var then = val.then;
          if (typeof then === 'function') {
            var p = new Promise(then.bind(val));
            p.then(function (val) {
              res(i, val);
            }, reject);
            return;
          }
        }
      }
      args[i] = val;
      if (--remaining === 0) {
        resolve(args);
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) {
    reject(value);
  });
};

Promise.race = function (values) {
  return new Promise(function (resolve, reject) {
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    });
  });
};

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"node-extensions.js":["./core.js","asap",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/lib/node-extensions.js              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
'use strict';

// This file contains then/promise specific extensions that are only useful
// for node.js interop

var Promise = require('./core.js');
var asap = require('asap');

module.exports = Promise;

/* Static Functions */

Promise.denodeify = function (fn, argumentCount) {
  if (
    typeof argumentCount === 'number' && argumentCount !== Infinity
  ) {
    return denodeifyWithCount(fn, argumentCount);
  } else {
    return denodeifyWithoutCount(fn);
  }
}

var callbackFn = (
  'function (err, res) {' +
  'if (err) { rj(err); } else { rs(res); }' +
  '}'
);
function denodeifyWithCount(fn, argumentCount) {
  var args = [];
  for (var i = 0; i < argumentCount; i++) {
    args.push('a' + i);
  }
  var body = [
    'return function (' + args.join(',') + ') {',
    'var self = this;',
    'return new Promise(function (rs, rj) {',
    'var res = fn.call(',
    ['self'].concat(args).concat([callbackFn]).join(','),
    ');',
    'if (res &&',
    '(typeof res === "object" || typeof res === "function") &&',
    'typeof res.then === "function"',
    ') {rs(res);}',
    '});',
    '};'
  ].join('');
  return Function(['Promise', 'fn'], body)(Promise, fn);
}
function denodeifyWithoutCount(fn) {
  var fnLength = Math.max(fn.length - 1, 3);
  var args = [];
  for (var i = 0; i < fnLength; i++) {
    args.push('a' + i);
  }
  var body = [
    'return function (' + args.join(',') + ') {',
    'var self = this;',
    'var args;',
    'var argLength = arguments.length;',
    'if (arguments.length > ' + fnLength + ') {',
    'args = new Array(arguments.length + 1);',
    'for (var i = 0; i < arguments.length; i++) {',
    'args[i] = arguments[i];',
    '}',
    '}',
    'return new Promise(function (rs, rj) {',
    'var cb = ' + callbackFn + ';',
    'var res;',
    'switch (argLength) {',
    args.concat(['extra']).map(function (_, index) {
      return (
        'case ' + (index) + ':' +
        'res = fn.call(' + ['self'].concat(args.slice(0, index)).concat('cb').join(',') + ');' +
        'break;'
      );
    }).join(''),
    'default:',
    'args[argLength] = cb;',
    'res = fn.apply(self, args);',
    '}',
    
    'if (res &&',
    '(typeof res === "object" || typeof res === "function") &&',
    'typeof res.then === "function"',
    ') {rs(res);}',
    '});',
    '};'
  ].join('');

  return Function(
    ['Promise', 'fn'],
    body
  )(Promise, fn);
}

Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    var callback =
      typeof args[args.length - 1] === 'function' ? args.pop() : null;
    var ctx = this;
    try {
      return fn.apply(this, arguments).nodeify(callback, ctx);
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) {
          reject(ex);
        });
      } else {
        asap(function () {
          callback.call(ctx, ex);
        })
      }
    }
  }
}

Promise.prototype.nodeify = function (callback, ctx) {
  if (typeof callback != 'function') return this;

  this.then(function (value) {
    asap(function () {
      callback.call(ctx, null, value);
    });
  }, function (err) {
    asap(function () {
      callback.call(ctx, err);
    });
  });
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"synchronous.js":["./core.js",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/lib/synchronous.js                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
'use strict';

var Promise = require('./core.js');

module.exports = Promise;
Promise.enableSynchronous = function () {
  Promise.prototype.isPending = function() {
    return this.getState() == 0;
  };

  Promise.prototype.isFulfilled = function() {
    return this.getState() == 1;
  };

  Promise.prototype.isRejected = function() {
    return this.getState() == 2;
  };

  Promise.prototype.getValue = function () {
    if (this._81 === 3) {
      return this._65.getValue();
    }

    if (!this.isFulfilled()) {
      throw new Error('Cannot get a value of an unfulfilled promise.');
    }

    return this._65;
  };

  Promise.prototype.getReason = function () {
    if (this._81 === 3) {
      return this._65.getReason();
    }

    if (!this.isRejected()) {
      throw new Error('Cannot get a rejection reason of a non-rejected promise.');
    }

    return this._65;
  };

  Promise.prototype.getState = function () {
    if (this._81 === 3) {
      return this._65.getState();
    }
    if (this._81 === -1 || this._81 === -2) {
      return 0;
    }

    return this._81;
  };
};

Promise.disableSynchronous = function() {
  Promise.prototype.isPending = undefined;
  Promise.prototype.isFulfilled = undefined;
  Promise.prototype.isRejected = undefined;
  Promise.prototype.getValue = undefined;
  Promise.prototype.getReason = undefined;
  Promise.prototype.getState = undefined;
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]},"node_modules":{"asap":{"raw.js":["domain",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/node_modules/asap/raw.js            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";

var domain; // The domain module is executed on demand
var hasSetImmediate = typeof setImmediate === "function";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including network IO events in Node.js.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Avoids a function call
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory excaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

rawAsap.requestFlush = requestFlush;
function requestFlush() {
    // Ensure flushing is not bound to any domain.
    // It is not sufficient to exit the domain, because domains exist on a stack.
    // To execute code outside of any domain, the following dance is necessary.
    var parentDomain = process.domain;
    if (parentDomain) {
        if (!domain) {
            // Lazy execute the domain module.
            // Only employed if the user elects to use domains.
            domain = require("domain");
        }
        domain.active = process.domain = null;
    }

    // `setImmediate` is slower that `process.nextTick`, but `process.nextTick`
    // cannot handle recursion.
    // `requestFlush` will only be called recursively from `asap.js`, to resume
    // flushing after an error is thrown into a domain.
    // Conveniently, `setImmediate` was introduced in the same version
    // `process.nextTick` started throwing recursion errors.
    if (flushing && hasSetImmediate) {
        setImmediate(flush);
    } else {
        process.nextTick(flush);
    }

    if (parentDomain) {
        domain.active = process.domain = parentDomain;
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"package.json":function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// .npm/package/node_modules/meteor-promise/node_modules/promise/node_modules/asap/package.json                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
exports.name = "asap";
exports.version = "2.0.3";
exports.main = "./asap.js";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"asap.js":["./raw",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/promise/node_modules/meteor-promise/node_modules/promise/node_modules/asap/asap.js           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";

var rawAsap = require("./raw");
var freeTasks = [];

/**
 * Calls a task as soon as possible after returning, in its own event, with
 * priority over IO events. An exception thrown in a task can be handled by
 * `process.on("uncaughtException") or `domain.on("error")`, but will otherwise
 * crash the process. If the error is handled, all subsequent tasks will
 * resume.
 *
 * @param {{call}} task A callable object, typically a function that takes no
 * arguments.
 */
module.exports = asap;
function asap(task) {
    var rawTask;
    if (freeTasks.length) {
        rawTask = freeTasks.pop();
    } else {
        rawTask = new RawTask();
    }
    rawTask.task = task;
    rawTask.domain = process.domain;
    rawAsap(rawTask);
}

function RawTask() {
    this.task = null;
    this.domain = null;
}

RawTask.prototype.call = function () {
    if (this.domain) {
        this.domain.enter();
    }
    var threw = true;
    try {
        this.task.call();
        threw = false;
        // If the task throws an exception (presumably) Node.js restores the
        // domain stack for the next event.
        if (this.domain) {
            this.domain.exit();
        }
    } finally {
        // We use try/finally and a threw flag to avoid messing up stack traces
        // when we catch and release errors.
        if (threw) {
            // In Node.js, uncaught exceptions are considered fatal errors.
            // Re-throw them to interrupt flushing!
            // Ensure that flushing continues if an uncaught exception is
            // suppressed listening process.on("uncaughtException") or
            // domain.on("error").
            rawAsap.requestFlush();
        }
        // If the task threw an error, we do not want to exit the domain here.
        // Exiting the domain would prevent the domain from catching the error.
        this.task = null;
        this.domain = null;
        freeTasks.push(this);
    }
};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}}}}}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/promise/server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.promise = exports, {
  Promise: Promise
});

})();



//# sourceURL=meteor://💻app/packages/promise.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcHJvbWlzZS9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwLy5ucG0vcGFja2FnZS9ub2RlX21vZHVsZXMvbWV0ZW9yLXByb21pc2UvcGFja2FnZS5qc29uIiwibWV0ZW9yOi8v8J+Su2FwcC9ub2RlX21vZHVsZXMvbWV0ZW9yL3Byb21pc2Uvbm9kZV9tb2R1bGVzL21ldGVvci1wcm9taXNlL3Byb21pc2Vfc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9ub2RlX21vZHVsZXMvbWV0ZW9yL3Byb21pc2Uvbm9kZV9tb2R1bGVzL21ldGVvci1wcm9taXNlL2ZpYmVyX3Bvb2wuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL25vZGVfbW9kdWxlcy9tZXRlb3IvcHJvbWlzZS9ub2RlX21vZHVsZXMvbWV0ZW9yLXByb21pc2UvcHJvbWlzZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvLm5wbS9wYWNrYWdlL25vZGVfbW9kdWxlcy9tZXRlb3ItcHJvbWlzZS9ub2RlX21vZHVsZXMvcHJvbWlzZS9wYWNrYWdlLmpzb24iLCJtZXRlb3I6Ly/wn5K7YXBwL25vZGVfbW9kdWxlcy9tZXRlb3IvcHJvbWlzZS9ub2RlX21vZHVsZXMvbWV0ZW9yLXByb21pc2Uvbm9kZV9tb2R1bGVzL3Byb21pc2UvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL25vZGVfbW9kdWxlcy9tZXRlb3IvcHJvbWlzZS9ub2RlX21vZHVsZXMvbWV0ZW9yLXByb21pc2Uvbm9kZV9tb2R1bGVzL3Byb21pc2UvbGliL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9ub2RlX21vZHVsZXMvbWV0ZW9yL3Byb21pc2Uvbm9kZV9tb2R1bGVzL21ldGVvci1wcm9taXNlL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9jb3JlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9ub2RlX21vZHVsZXMvbWV0ZW9yL3Byb21pc2Uvbm9kZV9tb2R1bGVzL21ldGVvci1wcm9taXNlL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9kb25lLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9ub2RlX21vZHVsZXMvbWV0ZW9yL3Byb21pc2Uvbm9kZV9tb2R1bGVzL21ldGVvci1wcm9taXNlL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9maW5hbGx5LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9ub2RlX21vZHVsZXMvbWV0ZW9yL3Byb21pc2Uvbm9kZV9tb2R1bGVzL21ldGVvci1wcm9taXNlL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9lczYtZXh0ZW5zaW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvbm9kZV9tb2R1bGVzL21ldGVvci9wcm9taXNlL25vZGVfbW9kdWxlcy9tZXRlb3ItcHJvbWlzZS9ub2RlX21vZHVsZXMvcHJvbWlzZS9saWIvbm9kZS1leHRlbnNpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9ub2RlX21vZHVsZXMvbWV0ZW9yL3Byb21pc2Uvbm9kZV9tb2R1bGVzL21ldGVvci1wcm9taXNlL25vZGVfbW9kdWxlcy9wcm9taXNlL2xpYi9zeW5jaHJvbm91cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvbm9kZV9tb2R1bGVzL21ldGVvci9wcm9taXNlL25vZGVfbW9kdWxlcy9tZXRlb3ItcHJvbWlzZS9ub2RlX21vZHVsZXMvcHJvbWlzZS9ub2RlX21vZHVsZXMvYXNhcC9yYXcuanMiLCJtZXRlb3I6Ly/wn5K7YXBwLy5ucG0vcGFja2FnZS9ub2RlX21vZHVsZXMvbWV0ZW9yLXByb21pc2Uvbm9kZV9tb2R1bGVzL3Byb21pc2Uvbm9kZV9tb2R1bGVzL2FzYXAvcGFja2FnZS5qc29uIiwibWV0ZW9yOi8v8J+Su2FwcC9ub2RlX21vZHVsZXMvbWV0ZW9yL3Byb21pc2Uvbm9kZV9tb2R1bGVzL21ldGVvci1wcm9taXNlL25vZGVfbW9kdWxlcy9wcm9taXNlL25vZGVfbW9kdWxlcy9hc2FwL2FzYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDSkE7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDMUJBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDRkE7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7OztBQ3BOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7OztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7OztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNwR0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Ii9wYWNrYWdlcy9wcm9taXNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0cy5Qcm9taXNlID0gcmVxdWlyZShcIm1ldGVvci1wcm9taXNlXCIpO1xuXG4vLyBEZWZpbmUgTWV0ZW9yUHJvbWlzZS5GaWJlciBzbyB0aGF0IGV2ZXJ5IFByb21pc2UgY2FsbGJhY2sgY2FuIHJ1biBpbiBhXG4vLyBGaWJlciBkcmF3biBmcm9tIGEgcG9vbCBvZiByZXVzYWJsZSBGaWJlcnMuXG5leHBvcnRzLlByb21pc2UuRmliZXIgPSByZXF1aXJlKFwiZmliZXJzXCIpO1xuIiwiZXhwb3J0cy5uYW1lID0gXCJtZXRlb3ItcHJvbWlzZVwiO1xuZXhwb3J0cy52ZXJzaW9uID0gXCIwLjYuM1wiO1xuZXhwb3J0cy5tYWluID0gXCJwcm9taXNlX3NlcnZlci5qc1wiO1xuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIik7XG52YXIgZmliZXJQb29sID0gcmVxdWlyZShcIi4vZmliZXJfcG9vbC5qc1wiKS5tYWtlUG9vbCgpO1xudmFyIE1ldGVvclByb21pc2UgPSByZXF1aXJlKFwiLi9wcm9taXNlLmpzXCIpO1xuXG4vLyBSZXBsYWNlIE1ldGVvclByb21pc2UucHJvdG90eXBlLnRoZW4gd2l0aCBhIHdyYXBwZXIgdGhhdCBlbnN1cmVzIHRoZVxuLy8gb25SZXNvbHZlZCBhbmQgb25SZWplY3RlZCBjYWxsYmFja3MgYWx3YXlzIHJ1biBpbiBhIEZpYmVyLlxudmFyIGVzNlByb21pc2VUaGVuID0gTWV0ZW9yUHJvbWlzZS5wcm90b3R5cGUudGhlbjtcbk1ldGVvclByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbiAob25SZXNvbHZlZCwgb25SZWplY3RlZCkge1xuICB2YXIgUHJvbWlzZSA9IHRoaXMuY29uc3RydWN0b3I7XG5cbiAgaWYgKHR5cGVvZiBQcm9taXNlLkZpYmVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB2YXIgZmliZXIgPSBQcm9taXNlLkZpYmVyLmN1cnJlbnQ7XG4gICAgdmFyIGR5bmFtaWNzID0gY2xvbmVGaWJlck93blByb3BlcnRpZXMoZmliZXIpO1xuXG4gICAgcmV0dXJuIGVzNlByb21pc2VUaGVuLmNhbGwoXG4gICAgICB0aGlzLFxuICAgICAgd3JhcENhbGxiYWNrKG9uUmVzb2x2ZWQsIFByb21pc2UsIGR5bmFtaWNzKSxcbiAgICAgIHdyYXBDYWxsYmFjayhvblJlamVjdGVkLCBQcm9taXNlLCBkeW5hbWljcylcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGVzNlByb21pc2VUaGVuLmNhbGwodGhpcywgb25SZXNvbHZlZCwgb25SZWplY3RlZCk7XG59O1xuXG5mdW5jdGlvbiB3cmFwQ2FsbGJhY2soY2FsbGJhY2ssIFByb21pc2UsIGR5bmFtaWNzKSB7XG4gIGlmICghIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChhcmcpIHtcbiAgICByZXR1cm4gZmliZXJQb29sLnJ1bih7XG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBhcmdzOiBbYXJnXSwgLy8gQXZvaWQgZGVhbGluZyB3aXRoIGFyZ3VtZW50cyBvYmplY3RzLlxuICAgICAgZHluYW1pY3M6IGR5bmFtaWNzXG4gICAgfSwgUHJvbWlzZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsb25lRmliZXJPd25Qcm9wZXJ0aWVzKGZpYmVyKSB7XG4gIGlmIChmaWJlcikge1xuICAgIHZhciBkeW5hbWljcyA9IHt9O1xuXG4gICAgT2JqZWN0LmtleXMoZmliZXIpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgZHluYW1pY3Nba2V5XSA9IHNoYWxsb3dDbG9uZShmaWJlcltrZXldKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBkeW5hbWljcztcbiAgfVxufVxuXG5mdW5jdGlvbiBzaGFsbG93Q2xvbmUodmFsdWUpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnNsaWNlKDApO1xuICB9XG5cbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuICAgIHZhciBjb3B5ID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpKTtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgICB2YXIga2V5Q291bnQgPSBrZXlzLmxlbmd0aDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q291bnQ7ICsraSkge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICBjb3B5W2tleV0gPSB2YWx1ZVtrZXldO1xuICAgIH1cblxuICAgIHJldHVybiBjb3B5O1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vLyBZaWVsZCB0aGUgY3VycmVudCBGaWJlciB1bnRpbCB0aGUgZ2l2ZW4gUHJvbWlzZSBoYXMgYmVlbiBmdWxmaWxsZWQuXG5mdW5jdGlvbiBhd2FpdFByb21pc2UocHJvbWlzZSkge1xuICB2YXIgUHJvbWlzZSA9IHByb21pc2UuY29uc3RydWN0b3I7XG4gIHZhciBGaWJlciA9IFByb21pc2UuRmliZXI7XG5cbiAgYXNzZXJ0LnN0cmljdEVxdWFsKFxuICAgIHR5cGVvZiBGaWJlciwgXCJmdW5jdGlvblwiLFxuICAgIFwiQ2Fubm90IGF3YWl0IHVubGVzcyBQcm9taXNlLkZpYmVyIGlzIGRlZmluZWRcIlxuICApO1xuXG4gIHZhciBmaWJlciA9IEZpYmVyLmN1cnJlbnQ7XG5cbiAgYXNzZXJ0Lm9rKFxuICAgIGZpYmVyIGluc3RhbmNlb2YgRmliZXIsXG4gICAgXCJDYW5ub3QgYXdhaXQgd2l0aG91dCBhIEZpYmVyXCJcbiAgKTtcblxuICB2YXIgcnVuID0gZmliZXIucnVuO1xuICB2YXIgdGhyb3dJbnRvID0gZmliZXIudGhyb3dJbnRvO1xuXG4gIGlmIChwcm9jZXNzLmRvbWFpbikge1xuICAgIHJ1biA9IHByb2Nlc3MuZG9tYWluLmJpbmQocnVuKTtcbiAgICB0aHJvd0ludG8gPSBwcm9jZXNzLmRvbWFpbi5iaW5kKHRocm93SW50byk7XG4gIH1cblxuICAvLyBUaGUgb3ZlcnJpZGRlbiBlczZQcm9taXNlVGhlbiBmdW5jdGlvbiBpcyBhZGVxdWF0ZSBoZXJlIGJlY2F1c2UgdGhlc2VcbiAgLy8gdHdvIGNhbGxiYWNrcyBkbyBub3QgbmVlZCB0byBydW4gaW4gYSBGaWJlci5cbiAgZXM2UHJvbWlzZVRoZW4uY2FsbChwcm9taXNlLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgdHJ5Q2F0Y2hOZXh0VGljayhmaWJlciwgcnVuLCBbcmVzdWx0XSk7XG4gIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgIHRyeUNhdGNoTmV4dFRpY2soZmliZXIsIHRocm93SW50bywgW2Vycm9yXSk7XG4gIH0pO1xuXG4gIHJldHVybiBGaWJlci55aWVsZCgpO1xufVxuXG4vLyBJbnZva2UgbWV0aG9kIHdpdGggYXJncyBhZ2FpbnN0IG9iamVjdCBpbiBhIHRyeS1jYXRjaCBibG9jayxcbi8vIHJlLXRocm93aW5nIGFueSBleGNlcHRpb25zIGluIHRoZSBuZXh0IHRpY2sgb2YgdGhlIGV2ZW50IGxvb3AsIHNvIHRoYXRcbi8vIHRoZXkgd29uJ3QgZ2V0IGNhcHR1cmVkL3N3YWxsb3dlZCBieSB0aGUgY2FsbGVyLlxuZnVuY3Rpb24gdHJ5Q2F0Y2hOZXh0VGljayhvYmplY3QsIG1ldGhvZCwgYXJncykge1xuICB0cnkge1xuICAgIHJldHVybiBtZXRob2QuYXBwbHkob2JqZWN0LCBhcmdzKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH0pO1xuICB9XG59XG5cbk1ldGVvclByb21pc2UuYXdhaXRBbGwgPSBmdW5jdGlvbiAoYXJncykge1xuICByZXR1cm4gYXdhaXRQcm9taXNlKHRoaXMuYWxsKGFyZ3MpKTtcbn07XG5cbk1ldGVvclByb21pc2UuYXdhaXQgPSBmdW5jdGlvbiAoYXJnKSB7XG4gIHJldHVybiBhd2FpdFByb21pc2UodGhpcy5yZXNvbHZlKGFyZykpO1xufTtcblxuTWV0ZW9yUHJvbWlzZS5wcm90b3R5cGUuYXdhaXQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBhd2FpdFByb21pc2UodGhpcyk7XG59O1xuXG4vLyBSZXR1cm4gYSB3cmFwcGVyIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIFByb21pc2UgZm9yIHRoZSBldmVudHVhbFxuLy8gcmVzdWx0IG9mIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbk1ldGVvclByb21pc2UuYXN5bmMgPSBmdW5jdGlvbiAoZm4sIGFsbG93UmV1c2VPZkN1cnJlbnRGaWJlcikge1xuICB2YXIgUHJvbWlzZSA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYXN5bmNBcHBseShcbiAgICAgIGZuLCB0aGlzLCBhcmd1bWVudHMsXG4gICAgICBhbGxvd1JldXNlT2ZDdXJyZW50RmliZXJcbiAgICApO1xuICB9O1xufTtcblxuTWV0ZW9yUHJvbWlzZS5hc3luY0FwcGx5ID0gZnVuY3Rpb24gKFxuICBmbiwgY29udGV4dCwgYXJncywgYWxsb3dSZXVzZU9mQ3VycmVudEZpYmVyXG4pIHtcbiAgdmFyIFByb21pc2UgPSB0aGlzO1xuICB2YXIgRmliZXIgPSBQcm9taXNlLkZpYmVyO1xuICB2YXIgZmliZXIgPSBGaWJlciAmJiBGaWJlci5jdXJyZW50O1xuXG4gIGlmIChmaWJlciAmJiBhbGxvd1JldXNlT2ZDdXJyZW50RmliZXIpIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlKGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MpKTtcbiAgfVxuXG4gIHJldHVybiBmaWJlclBvb2wucnVuKHtcbiAgICBjYWxsYmFjazogZm4sXG4gICAgY29udGV4dDogY29udGV4dCxcbiAgICBhcmdzOiBhcmdzLFxuICAgIGR5bmFtaWNzOiBjbG9uZUZpYmVyT3duUHJvcGVydGllcyhmaWJlcilcbiAgfSwgUHJvbWlzZSk7XG59O1xuXG5GdW5jdGlvbi5wcm90b3R5cGUuYXN5bmMgPSBmdW5jdGlvbiAoYWxsb3dSZXVzZU9mQ3VycmVudEZpYmVyKSB7XG4gIHJldHVybiBNZXRlb3JQcm9taXNlLmFzeW5jKHRoaXMsIGFsbG93UmV1c2VPZkN1cnJlbnRGaWJlcik7XG59O1xuXG5GdW5jdGlvbi5wcm90b3R5cGUuYXN5bmNBcHBseSA9IGZ1bmN0aW9uIChcbiAgY29udGV4dCwgYXJncywgYWxsb3dSZXVzZU9mQ3VycmVudEZpYmVyXG4pIHtcbiAgcmV0dXJuIE1ldGVvclByb21pc2UuYXN5bmNBcHBseShcbiAgICB0aGlzLCBjb250ZXh0LCBhcmdzLCBhbGxvd1JldXNlT2ZDdXJyZW50RmliZXJcbiAgKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IE1ldGVvclByb21pc2U7XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZShcImFzc2VydFwiKTtcbnZhciB1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIEZpYmVyUG9vbCh0YXJnZXRGaWJlckNvdW50KSB7XG4gIGFzc2VydC5vayh0aGlzIGluc3RhbmNlb2YgRmliZXJQb29sKTtcbiAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiB0YXJnZXRGaWJlckNvdW50LCBcIm51bWJlclwiKTtcblxuICB2YXIgZmliZXJTdGFjayA9IFtdO1xuXG4gIGZ1bmN0aW9uIG1ha2VOZXdGaWJlcihGaWJlcikge1xuICAgIC8vIEp1c3QgaW4gY2FzZSBzb21lb25lIHRhbXBlcnMgd2l0aCBGaWJlci55aWVsZCwgZG9uJ3QgbGV0IHRoYXQgaW50ZXJmZXJlXG4gICAgLy8gd2l0aCBvdXIgcHJvY2Vzc2luZyBvZiB0aGUgY2FsbGJhY2sgcXVldWUuXG4gICAgdmFyIG9yaWdpbmFsWWllbGQgPSBGaWJlci55aWVsZDtcblxuICAgIHZhciBmaWJlciA9IG5ldyBGaWJlcihmdW5jdGlvbiAoKSB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAvLyBDYWxsIEZpYmVyLnlpZWxkKCkgdG8gYXdhaXQgZnVydGhlciBpbnN0cnVjdGlvbnMuXG4gICAgICAgIHZhciBlbnRyeSA9IG9yaWdpbmFsWWllbGQuY2FsbChGaWJlcik7XG5cbiAgICAgICAgLy8gRW5zdXJlIHRoaXMgRmliZXIgaXMgbm8gbG9uZ2VyIGluIHRoZSBwb29sIG9uY2UgaXQgYmVnaW5zIHRvXG4gICAgICAgIC8vIGV4ZWN1dGUgYW4gZW50cnkuXG4gICAgICAgIGFzc2VydC5zdHJpY3RFcXVhbChmaWJlclN0YWNrLmluZGV4T2YoZmliZXIpLCAtMSk7XG5cbiAgICAgICAgaWYgKGVudHJ5LmR5bmFtaWNzKSB7XG4gICAgICAgICAgLy8gUmVzdG9yZSB0aGUgZHluYW1pYyBlbnZpcm9ubWVudCBvZiB0aGlzIGZpYmVyIGFzIGlmXG4gICAgICAgICAgLy8gZW50cnkuY2FsbGJhY2sgaGFkIGJlZW4gd3JhcHBlZCBieSBNZXRlb3IuYmluZEVudmlyb25tZW50LlxuICAgICAgICAgIE9iamVjdC5rZXlzKGVudHJ5LmR5bmFtaWNzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGZpYmVyW2tleV0gPSBlbnRyeS5keW5hbWljc1trZXldO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBlbnRyeS5yZXNvbHZlKGVudHJ5LmNhbGxiYWNrLmFwcGx5KFxuICAgICAgICAgICAgZW50cnkuY29udGV4dCB8fCBudWxsLFxuICAgICAgICAgICAgZW50cnkuYXJncyB8fCBbXVxuICAgICAgICAgICkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGVudHJ5LnJlamVjdChlcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgYWxsIG93biBwcm9wZXJ0aWVzIG9mIHRoZSBmaWJlciBiZWZvcmUgcmV0dXJuaW5nIGl0IHRvXG4gICAgICAgIC8vIHRoZSBwb29sLlxuICAgICAgICBPYmplY3Qua2V5cyhmaWJlcikuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgZGVsZXRlIGZpYmVyW2tleV07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChmaWJlclN0YWNrLmxlbmd0aCA8IHRhcmdldEZpYmVyQ291bnQpIHtcbiAgICAgICAgICBmaWJlclN0YWNrLnB1c2goZmliZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIElmIHRoZSBwb29sIGhhcyBhbHJlYWR5IHJlYWNoZWQgdGhlIHRhcmdldCBtYXhpbXVtIG51bWJlciBvZlxuICAgICAgICAgIC8vIEZpYmVycywgZG9uJ3QgYm90aGVyIHJlY3ljbGluZyB0aGlzIEZpYmVyLlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBSdW4gdGhlIG5ldyBGaWJlciB1cCB0byB0aGUgZmlyc3QgeWllbGQgcG9pbnQsIHNvIHRoYXQgaXQgd2lsbCBiZVxuICAgIC8vIHJlYWR5IHRvIHJlY2VpdmUgZW50cmllcy5cbiAgICBmaWJlci5ydW4oKTtcblxuICAgIHJldHVybiBmaWJlcjtcbiAgfVxuXG4gIC8vIFJ1biB0aGUgZW50cnkuY2FsbGJhY2sgZnVuY3Rpb24gaW4gYSBGaWJlciBlaXRoZXIgdGFrZW4gZnJvbSB0aGUgcG9vbFxuICAvLyBvciBjcmVhdGVkIGFuZXcgaWYgdGhlIHBvb2wgaXMgZW1wdHkuIFRoaXMgbWV0aG9kIHJldHVybnMgYSBQcm9taXNlXG4gIC8vIGZvciB0aGUgZXZlbnR1YWwgcmVzdWx0IG9mIHRoZSBlbnRyeS5jYWxsYmFjayBmdW5jdGlvbi5cbiAgdGhpcy5ydW4gPSBmdW5jdGlvbiAoZW50cnksIFByb21pc2UpIHtcbiAgICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIGVudHJ5LCBcIm9iamVjdFwiKTtcbiAgICBhc3NlcnQuc3RyaWN0RXF1YWwodHlwZW9mIGVudHJ5LmNhbGxiYWNrLCBcImZ1bmN0aW9uXCIpO1xuXG4gICAgaWYgKHR5cGVvZiBQcm9taXNlLkZpYmVyICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgICAgICByZXNvbHZlKGVudHJ5LmNhbGxiYWNrLmFwcGx5KFxuICAgICAgICAgIGVudHJ5LmNvbnRleHQgfHwgbnVsbCxcbiAgICAgICAgICBlbnRyeS5hcmdzXG4gICAgICAgICkpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIGZpYmVyID0gZmliZXJTdGFjay5wb3AoKSB8fCBtYWtlTmV3RmliZXIoUHJvbWlzZS5GaWJlcik7XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGVudHJ5LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgZW50cnkucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuXG4gICAgZmliZXIucnVuKGVudHJ5KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xuICB9O1xuXG4gIC8vIExpbWl0IHRoZSBtYXhpbXVtIG51bWJlciBvZiBpZGxlIEZpYmVycyB0aGF0IG1heSBiZSBrZXB0IGluIHRoZVxuICAvLyBwb29sLiBOb3RlIHRoYXQgdGhlIHJ1biBtZXRob2Qgd2lsbCBuZXZlciByZWZ1c2UgdG8gY3JlYXRlIGEgbmV3XG4gIC8vIEZpYmVyIGlmIHRoZSBwb29sIGlzIGVtcHR5OyBpdCdzIGp1c3QgdGhhdCBleGNlc3MgRmliZXJzIG1pZ2h0IGJlXG4gIC8vIHRocm93biBhd2F5IHVwb24gY29tcGxldGlvbiwgaWYgdGhlIHBvb2wgaXMgZnVsbC5cbiAgdGhpcy5zZXRUYXJnZXRGaWJlckNvdW50ID0gZnVuY3Rpb24gKGxpbWl0KSB7XG4gICAgYXNzZXJ0LnN0cmljdEVxdWFsKHR5cGVvZiBsaW1pdCwgXCJudW1iZXJcIik7XG5cbiAgICB0YXJnZXRGaWJlckNvdW50ID0gTWF0aC5tYXgobGltaXQsIDApO1xuXG4gICAgaWYgKHRhcmdldEZpYmVyQ291bnQgPCBmaWJlclN0YWNrLmxlbmd0aCkge1xuICAgICAgLy8gSWYgdGhlIHJlcXVlc3RlZCB0YXJnZXQgY291bnQgaXMgbGVzcyB0aGFuIHRoZSBjdXJyZW50IGxlbmd0aCBvZlxuICAgICAgLy8gdGhlIHN0YWNrLCB0cnVuY2F0ZSB0aGUgc3RhY2sgYW5kIHRlcm1pbmF0ZSBhbnkgc3VycGx1cyBGaWJlcnMuXG4gICAgICBmaWJlclN0YWNrLnNwbGljZSh0YXJnZXRGaWJlckNvdW50KS5mb3JFYWNoKGZ1bmN0aW9uIChmaWJlcikge1xuICAgICAgICBmaWJlci5yZXNldCgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG59XG5cbi8vIENhbGwgcG9vbC5kcmFpbigpIHRvIHRlcm1pbmF0ZSBhbGwgRmliZXJzIHdhaXRpbmcgaW4gdGhlIHBvb2wgYW5kXG4vLyBzaWduYWwgdG8gYW55IG91dHN0YW5kaW5nIEZpYmVycyB0aGF0IHRoZXkgc2hvdWxkIGV4aXQgdXBvbiBjb21wbGV0aW9uLFxuLy8gaW5zdGVhZCBvZiByZWluc2VydGluZyB0aGVtc2VsdmVzIGludG8gdGhlIHBvb2wuXG5GaWJlclBvb2wucHJvdG90eXBlLmRyYWluID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5zZXRUYXJnZXRGaWJlckNvdW50KDApO1xufTtcblxuZXhwb3J0cy5tYWtlUG9vbCA9IGZ1bmN0aW9uICh0YXJnZXRGaWJlckNvdW50KSB7XG4gIHJldHVybiBuZXcgRmliZXJQb29sKHRhcmdldEZpYmVyQ291bnQgfHwgMjApO1xufTtcbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgZyA9XG4gIHR5cGVvZiBnbG9iYWwgPT09IFwib2JqZWN0XCIgPyBnbG9iYWwgOlxuICB0eXBlb2Ygd2luZG93ID09PSBcIm9iamVjdFwiID8gd2luZG93IDpcbiAgdHlwZW9mIHNlbGYgPT09IFwib2JqZWN0XCIgPyBzZWxmIDogdGhpcztcblxudmFyIEdsb2JhbFByb21pc2UgPSBnLlByb21pc2U7XG52YXIgTnBtUHJvbWlzZSA9IHJlcXVpcmUoXCJwcm9taXNlXCIpO1xuXG5mdW5jdGlvbiBjb3B5TWV0aG9kcyh0YXJnZXQsIHNvdXJjZSkge1xuICBPYmplY3Qua2V5cyhzb3VyY2UpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciB2YWx1ZSA9IHNvdXJjZVtrZXldO1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAhIGhhc093bi5jYWxsKHRhcmdldCwga2V5KSkge1xuICAgICAgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH0pO1xufVxuXG5pZiAodHlwZW9mIEdsb2JhbFByb21pc2UgPT09IFwiZnVuY3Rpb25cIikge1xuICBjb3B5TWV0aG9kcyhHbG9iYWxQcm9taXNlLCBOcG1Qcm9taXNlKTtcbiAgY29weU1ldGhvZHMoR2xvYmFsUHJvbWlzZS5wcm90b3R5cGUsIE5wbVByb21pc2UucHJvdG90eXBlKTtcbiAgbW9kdWxlLmV4cG9ydHMgPSBHbG9iYWxQcm9taXNlO1xufSBlbHNlIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBOcG1Qcm9taXNlO1xufVxuIiwiZXhwb3J0cy5uYW1lID0gXCJwcm9taXNlXCI7XG5leHBvcnRzLnZlcnNpb24gPSBcIjcuMS4xXCI7XG5leHBvcnRzLm1haW4gPSBcImluZGV4LmpzXCI7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWInKVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vY29yZS5qcycpO1xucmVxdWlyZSgnLi9kb25lLmpzJyk7XG5yZXF1aXJlKCcuL2ZpbmFsbHkuanMnKTtcbnJlcXVpcmUoJy4vZXM2LWV4dGVuc2lvbnMuanMnKTtcbnJlcXVpcmUoJy4vbm9kZS1leHRlbnNpb25zLmpzJyk7XG5yZXF1aXJlKCcuL3N5bmNocm9ub3VzLmpzJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcC9yYXcnKTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbi8vIFN0YXRlczpcbi8vXG4vLyAwIC0gcGVuZGluZ1xuLy8gMSAtIGZ1bGZpbGxlZCB3aXRoIF92YWx1ZVxuLy8gMiAtIHJlamVjdGVkIHdpdGggX3ZhbHVlXG4vLyAzIC0gYWRvcHRlZCB0aGUgc3RhdGUgb2YgYW5vdGhlciBwcm9taXNlLCBfdmFsdWVcbi8vXG4vLyBvbmNlIHRoZSBzdGF0ZSBpcyBubyBsb25nZXIgcGVuZGluZyAoMCkgaXQgaXMgaW1tdXRhYmxlXG5cbi8vIEFsbCBgX2AgcHJlZml4ZWQgcHJvcGVydGllcyB3aWxsIGJlIHJlZHVjZWQgdG8gYF97cmFuZG9tIG51bWJlcn1gXG4vLyBhdCBidWlsZCB0aW1lIHRvIG9iZnVzY2F0ZSB0aGVtIGFuZCBkaXNjb3VyYWdlIHRoZWlyIHVzZS5cbi8vIFdlIGRvbid0IHVzZSBzeW1ib2xzIG9yIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSB0byBmdWxseSBoaWRlIHRoZW1cbi8vIGJlY2F1c2UgdGhlIHBlcmZvcm1hbmNlIGlzbid0IGdvb2QgZW5vdWdoLlxuXG5cbi8vIHRvIGF2b2lkIHVzaW5nIHRyeS9jYXRjaCBpbnNpZGUgY3JpdGljYWwgZnVuY3Rpb25zLCB3ZVxuLy8gZXh0cmFjdCB0aGVtIHRvIGhlcmUuXG52YXIgTEFTVF9FUlJPUiA9IG51bGw7XG52YXIgSVNfRVJST1IgPSB7fTtcbmZ1bmN0aW9uIGdldFRoZW4ob2JqKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIG9iai50aGVuO1xuICB9IGNhdGNoIChleCkge1xuICAgIExBU1RfRVJST1IgPSBleDtcbiAgICByZXR1cm4gSVNfRVJST1I7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJ5Q2FsbE9uZShmbiwgYSkge1xuICB0cnkge1xuICAgIHJldHVybiBmbihhKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBMQVNUX0VSUk9SID0gZXg7XG4gICAgcmV0dXJuIElTX0VSUk9SO1xuICB9XG59XG5mdW5jdGlvbiB0cnlDYWxsVHdvKGZuLCBhLCBiKSB7XG4gIHRyeSB7XG4gICAgZm4oYSwgYik7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgTEFTVF9FUlJPUiA9IGV4O1xuICAgIHJldHVybiBJU19FUlJPUjtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbiAgaWYgKHR5cGVvZiB0aGlzICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Byb21pc2VzIG11c3QgYmUgY29uc3RydWN0ZWQgdmlhIG5ldycpO1xuICB9XG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdub3QgYSBmdW5jdGlvbicpO1xuICB9XG4gIHRoaXMuXzQ1ID0gMDtcbiAgdGhpcy5fODEgPSAwO1xuICB0aGlzLl82NSA9IG51bGw7XG4gIHRoaXMuXzU0ID0gbnVsbDtcbiAgaWYgKGZuID09PSBub29wKSByZXR1cm47XG4gIGRvUmVzb2x2ZShmbiwgdGhpcyk7XG59XG5Qcm9taXNlLl8xMCA9IG51bGw7XG5Qcm9taXNlLl85NyA9IG51bGw7XG5Qcm9taXNlLl82MSA9IG5vb3A7XG5cblByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gUHJvbWlzZSkge1xuICAgIHJldHVybiBzYWZlVGhlbih0aGlzLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCk7XG4gIH1cbiAgdmFyIHJlcyA9IG5ldyBQcm9taXNlKG5vb3ApO1xuICBoYW5kbGUodGhpcywgbmV3IEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlcykpO1xuICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gc2FmZVRoZW4oc2VsZiwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgcmV0dXJuIG5ldyBzZWxmLmNvbnN0cnVjdG9yKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcmVzID0gbmV3IFByb21pc2Uobm9vcCk7XG4gICAgcmVzLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICBoYW5kbGUoc2VsZiwgbmV3IEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlcykpO1xuICB9KTtcbn07XG5mdW5jdGlvbiBoYW5kbGUoc2VsZiwgZGVmZXJyZWQpIHtcbiAgd2hpbGUgKHNlbGYuXzgxID09PSAzKSB7XG4gICAgc2VsZiA9IHNlbGYuXzY1O1xuICB9XG4gIGlmIChQcm9taXNlLl8xMCkge1xuICAgIFByb21pc2UuXzEwKHNlbGYpO1xuICB9XG4gIGlmIChzZWxmLl84MSA9PT0gMCkge1xuICAgIGlmIChzZWxmLl80NSA9PT0gMCkge1xuICAgICAgc2VsZi5fNDUgPSAxO1xuICAgICAgc2VsZi5fNTQgPSBkZWZlcnJlZDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNlbGYuXzQ1ID09PSAxKSB7XG4gICAgICBzZWxmLl80NSA9IDI7XG4gICAgICBzZWxmLl81NCA9IFtzZWxmLl81NCwgZGVmZXJyZWRdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZWxmLl81NC5wdXNoKGRlZmVycmVkKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaGFuZGxlUmVzb2x2ZWQoc2VsZiwgZGVmZXJyZWQpO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVSZXNvbHZlZChzZWxmLCBkZWZlcnJlZCkge1xuICBhc2FwKGZ1bmN0aW9uKCkge1xuICAgIHZhciBjYiA9IHNlbGYuXzgxID09PSAxID8gZGVmZXJyZWQub25GdWxmaWxsZWQgOiBkZWZlcnJlZC5vblJlamVjdGVkO1xuICAgIGlmIChjYiA9PT0gbnVsbCkge1xuICAgICAgaWYgKHNlbGYuXzgxID09PSAxKSB7XG4gICAgICAgIHJlc29sdmUoZGVmZXJyZWQucHJvbWlzZSwgc2VsZi5fNjUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KGRlZmVycmVkLnByb21pc2UsIHNlbGYuXzY1KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHJldCA9IHRyeUNhbGxPbmUoY2IsIHNlbGYuXzY1KTtcbiAgICBpZiAocmV0ID09PSBJU19FUlJPUikge1xuICAgICAgcmVqZWN0KGRlZmVycmVkLnByb21pc2UsIExBU1RfRVJST1IpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlKGRlZmVycmVkLnByb21pc2UsIHJldCk7XG4gICAgfVxuICB9KTtcbn1cbmZ1bmN0aW9uIHJlc29sdmUoc2VsZiwgbmV3VmFsdWUpIHtcbiAgLy8gUHJvbWlzZSBSZXNvbHV0aW9uIFByb2NlZHVyZTogaHR0cHM6Ly9naXRodWIuY29tL3Byb21pc2VzLWFwbHVzL3Byb21pc2VzLXNwZWMjdGhlLXByb21pc2UtcmVzb2x1dGlvbi1wcm9jZWR1cmVcbiAgaWYgKG5ld1ZhbHVlID09PSBzZWxmKSB7XG4gICAgcmV0dXJuIHJlamVjdChcbiAgICAgIHNlbGYsXG4gICAgICBuZXcgVHlwZUVycm9yKCdBIHByb21pc2UgY2Fubm90IGJlIHJlc29sdmVkIHdpdGggaXRzZWxmLicpXG4gICAgKTtcbiAgfVxuICBpZiAoXG4gICAgbmV3VmFsdWUgJiZcbiAgICAodHlwZW9mIG5ld1ZhbHVlID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgbmV3VmFsdWUgPT09ICdmdW5jdGlvbicpXG4gICkge1xuICAgIHZhciB0aGVuID0gZ2V0VGhlbihuZXdWYWx1ZSk7XG4gICAgaWYgKHRoZW4gPT09IElTX0VSUk9SKSB7XG4gICAgICByZXR1cm4gcmVqZWN0KHNlbGYsIExBU1RfRVJST1IpO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICB0aGVuID09PSBzZWxmLnRoZW4gJiZcbiAgICAgIG5ld1ZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZVxuICAgICkge1xuICAgICAgc2VsZi5fODEgPSAzO1xuICAgICAgc2VsZi5fNjUgPSBuZXdWYWx1ZTtcbiAgICAgIGZpbmFsZShzZWxmKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkb1Jlc29sdmUodGhlbi5iaW5kKG5ld1ZhbHVlKSwgc2VsZik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHNlbGYuXzgxID0gMTtcbiAgc2VsZi5fNjUgPSBuZXdWYWx1ZTtcbiAgZmluYWxlKHNlbGYpO1xufVxuXG5mdW5jdGlvbiByZWplY3Qoc2VsZiwgbmV3VmFsdWUpIHtcbiAgc2VsZi5fODEgPSAyO1xuICBzZWxmLl82NSA9IG5ld1ZhbHVlO1xuICBpZiAoUHJvbWlzZS5fOTcpIHtcbiAgICBQcm9taXNlLl85NyhzZWxmLCBuZXdWYWx1ZSk7XG4gIH1cbiAgZmluYWxlKHNlbGYpO1xufVxuZnVuY3Rpb24gZmluYWxlKHNlbGYpIHtcbiAgaWYgKHNlbGYuXzQ1ID09PSAxKSB7XG4gICAgaGFuZGxlKHNlbGYsIHNlbGYuXzU0KTtcbiAgICBzZWxmLl81NCA9IG51bGw7XG4gIH1cbiAgaWYgKHNlbGYuXzQ1ID09PSAyKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLl81NC5sZW5ndGg7IGkrKykge1xuICAgICAgaGFuZGxlKHNlbGYsIHNlbGYuXzU0W2ldKTtcbiAgICB9XG4gICAgc2VsZi5fNTQgPSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHByb21pc2Upe1xuICB0aGlzLm9uRnVsZmlsbGVkID0gdHlwZW9mIG9uRnVsZmlsbGVkID09PSAnZnVuY3Rpb24nID8gb25GdWxmaWxsZWQgOiBudWxsO1xuICB0aGlzLm9uUmVqZWN0ZWQgPSB0eXBlb2Ygb25SZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uUmVqZWN0ZWQgOiBudWxsO1xuICB0aGlzLnByb21pc2UgPSBwcm9taXNlO1xufVxuXG4vKipcbiAqIFRha2UgYSBwb3RlbnRpYWxseSBtaXNiZWhhdmluZyByZXNvbHZlciBmdW5jdGlvbiBhbmQgbWFrZSBzdXJlXG4gKiBvbkZ1bGZpbGxlZCBhbmQgb25SZWplY3RlZCBhcmUgb25seSBjYWxsZWQgb25jZS5cbiAqXG4gKiBNYWtlcyBubyBndWFyYW50ZWVzIGFib3V0IGFzeW5jaHJvbnkuXG4gKi9cbmZ1bmN0aW9uIGRvUmVzb2x2ZShmbiwgcHJvbWlzZSkge1xuICB2YXIgZG9uZSA9IGZhbHNlO1xuICB2YXIgcmVzID0gdHJ5Q2FsbFR3byhmbiwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgaWYgKGRvbmUpIHJldHVybjtcbiAgICBkb25lID0gdHJ1ZTtcbiAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIGlmIChkb25lKSByZXR1cm47XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gIH0pXG4gIGlmICghZG9uZSAmJiByZXMgPT09IElTX0VSUk9SKSB7XG4gICAgZG9uZSA9IHRydWU7XG4gICAgcmVqZWN0KHByb21pc2UsIExBU1RfRVJST1IpO1xuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9jb3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcblByb21pc2UucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgdmFyIHNlbGYgPSBhcmd1bWVudHMubGVuZ3RoID8gdGhpcy50aGVuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiB0aGlzO1xuICBzZWxmLnRoZW4obnVsbCwgZnVuY3Rpb24gKGVycikge1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH0sIDApO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9jb3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcblByb21pc2UucHJvdG90eXBlWydmaW5hbGx5J10gPSBmdW5jdGlvbiAoZikge1xuICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZigpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KTtcbiAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoZigpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9KTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vL1RoaXMgZmlsZSBjb250YWlucyB0aGUgRVM2IGV4dGVuc2lvbnMgdG8gdGhlIGNvcmUgUHJvbWlzZXMvQSsgQVBJXG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9jb3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcblxuLyogU3RhdGljIEZ1bmN0aW9ucyAqL1xuXG52YXIgVFJVRSA9IHZhbHVlUHJvbWlzZSh0cnVlKTtcbnZhciBGQUxTRSA9IHZhbHVlUHJvbWlzZShmYWxzZSk7XG52YXIgTlVMTCA9IHZhbHVlUHJvbWlzZShudWxsKTtcbnZhciBVTkRFRklORUQgPSB2YWx1ZVByb21pc2UodW5kZWZpbmVkKTtcbnZhciBaRVJPID0gdmFsdWVQcm9taXNlKDApO1xudmFyIEVNUFRZU1RSSU5HID0gdmFsdWVQcm9taXNlKCcnKTtcblxuZnVuY3Rpb24gdmFsdWVQcm9taXNlKHZhbHVlKSB7XG4gIHZhciBwID0gbmV3IFByb21pc2UoUHJvbWlzZS5fNjEpO1xuICBwLl84MSA9IDE7XG4gIHAuXzY1ID0gdmFsdWU7XG4gIHJldHVybiBwO1xufVxuUHJvbWlzZS5yZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHJldHVybiB2YWx1ZTtcblxuICBpZiAodmFsdWUgPT09IG51bGwpIHJldHVybiBOVUxMO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIFVOREVGSU5FRDtcbiAgaWYgKHZhbHVlID09PSB0cnVlKSByZXR1cm4gVFJVRTtcbiAgaWYgKHZhbHVlID09PSBmYWxzZSkgcmV0dXJuIEZBTFNFO1xuICBpZiAodmFsdWUgPT09IDApIHJldHVybiBaRVJPO1xuICBpZiAodmFsdWUgPT09ICcnKSByZXR1cm4gRU1QVFlTVFJJTkc7XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB0aGVuID0gdmFsdWUudGhlbjtcbiAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UodGhlbi5iaW5kKHZhbHVlKSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJlamVjdChleCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHZhbHVlUHJvbWlzZSh2YWx1ZSk7XG59O1xuXG5Qcm9taXNlLmFsbCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcnIpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gcmVzb2x2ZShbXSk7XG4gICAgdmFyIHJlbWFpbmluZyA9IGFyZ3MubGVuZ3RoO1xuICAgIGZ1bmN0aW9uIHJlcyhpLCB2YWwpIHtcbiAgICAgIGlmICh2YWwgJiYgKHR5cGVvZiB2YWwgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBQcm9taXNlICYmIHZhbC50aGVuID09PSBQcm9taXNlLnByb3RvdHlwZS50aGVuKSB7XG4gICAgICAgICAgd2hpbGUgKHZhbC5fODEgPT09IDMpIHtcbiAgICAgICAgICAgIHZhbCA9IHZhbC5fNjU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2YWwuXzgxID09PSAxKSByZXR1cm4gcmVzKGksIHZhbC5fNjUpO1xuICAgICAgICAgIGlmICh2YWwuXzgxID09PSAyKSByZWplY3QodmFsLl82NSk7XG4gICAgICAgICAgdmFsLnRoZW4oZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmVzKGksIHZhbCk7XG4gICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIHRoZW4gPSB2YWwudGhlbjtcbiAgICAgICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHZhciBwID0gbmV3IFByb21pc2UodGhlbi5iaW5kKHZhbCkpO1xuICAgICAgICAgICAgcC50aGVuKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgcmVzKGksIHZhbCk7XG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXJnc1tpXSA9IHZhbDtcbiAgICAgIGlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICByZXNvbHZlKGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlcyhpLCBhcmdzW2ldKTtcbiAgICB9XG4gIH0pO1xufTtcblxuUHJvbWlzZS5yZWplY3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICByZWplY3QodmFsdWUpO1xuICB9KTtcbn07XG5cblByb21pc2UucmFjZSA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSl7XG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vKiBQcm90b3R5cGUgTWV0aG9kcyAqL1xuXG5Qcm9taXNlLnByb3RvdHlwZVsnY2F0Y2gnXSA9IGZ1bmN0aW9uIChvblJlamVjdGVkKSB7XG4gIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3RlZCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBUaGlzIGZpbGUgY29udGFpbnMgdGhlbi9wcm9taXNlIHNwZWNpZmljIGV4dGVuc2lvbnMgdGhhdCBhcmUgb25seSB1c2VmdWxcbi8vIGZvciBub2RlLmpzIGludGVyb3BcblxudmFyIFByb21pc2UgPSByZXF1aXJlKCcuL2NvcmUuanMnKTtcbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2U7XG5cbi8qIFN0YXRpYyBGdW5jdGlvbnMgKi9cblxuUHJvbWlzZS5kZW5vZGVpZnkgPSBmdW5jdGlvbiAoZm4sIGFyZ3VtZW50Q291bnQpIHtcbiAgaWYgKFxuICAgIHR5cGVvZiBhcmd1bWVudENvdW50ID09PSAnbnVtYmVyJyAmJiBhcmd1bWVudENvdW50ICE9PSBJbmZpbml0eVxuICApIHtcbiAgICByZXR1cm4gZGVub2RlaWZ5V2l0aENvdW50KGZuLCBhcmd1bWVudENvdW50KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZGVub2RlaWZ5V2l0aG91dENvdW50KGZuKTtcbiAgfVxufVxuXG52YXIgY2FsbGJhY2tGbiA9IChcbiAgJ2Z1bmN0aW9uIChlcnIsIHJlcykgeycgK1xuICAnaWYgKGVycikgeyByaihlcnIpOyB9IGVsc2UgeyBycyhyZXMpOyB9JyArXG4gICd9J1xuKTtcbmZ1bmN0aW9uIGRlbm9kZWlmeVdpdGhDb3VudChmbiwgYXJndW1lbnRDb3VudCkge1xuICB2YXIgYXJncyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50Q291bnQ7IGkrKykge1xuICAgIGFyZ3MucHVzaCgnYScgKyBpKTtcbiAgfVxuICB2YXIgYm9keSA9IFtcbiAgICAncmV0dXJuIGZ1bmN0aW9uICgnICsgYXJncy5qb2luKCcsJykgKyAnKSB7JyxcbiAgICAndmFyIHNlbGYgPSB0aGlzOycsXG4gICAgJ3JldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocnMsIHJqKSB7JyxcbiAgICAndmFyIHJlcyA9IGZuLmNhbGwoJyxcbiAgICBbJ3NlbGYnXS5jb25jYXQoYXJncykuY29uY2F0KFtjYWxsYmFja0ZuXSkuam9pbignLCcpLFxuICAgICcpOycsXG4gICAgJ2lmIChyZXMgJiYnLFxuICAgICcodHlwZW9mIHJlcyA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgcmVzID09PSBcImZ1bmN0aW9uXCIpICYmJyxcbiAgICAndHlwZW9mIHJlcy50aGVuID09PSBcImZ1bmN0aW9uXCInLFxuICAgICcpIHtycyhyZXMpO30nLFxuICAgICd9KTsnLFxuICAgICd9OydcbiAgXS5qb2luKCcnKTtcbiAgcmV0dXJuIEZ1bmN0aW9uKFsnUHJvbWlzZScsICdmbiddLCBib2R5KShQcm9taXNlLCBmbik7XG59XG5mdW5jdGlvbiBkZW5vZGVpZnlXaXRob3V0Q291bnQoZm4pIHtcbiAgdmFyIGZuTGVuZ3RoID0gTWF0aC5tYXgoZm4ubGVuZ3RoIC0gMSwgMyk7XG4gIHZhciBhcmdzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZm5MZW5ndGg7IGkrKykge1xuICAgIGFyZ3MucHVzaCgnYScgKyBpKTtcbiAgfVxuICB2YXIgYm9keSA9IFtcbiAgICAncmV0dXJuIGZ1bmN0aW9uICgnICsgYXJncy5qb2luKCcsJykgKyAnKSB7JyxcbiAgICAndmFyIHNlbGYgPSB0aGlzOycsXG4gICAgJ3ZhciBhcmdzOycsXG4gICAgJ3ZhciBhcmdMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOycsXG4gICAgJ2lmIChhcmd1bWVudHMubGVuZ3RoID4gJyArIGZuTGVuZ3RoICsgJykgeycsXG4gICAgJ2FyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCArIDEpOycsXG4gICAgJ2ZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7JyxcbiAgICAnYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTsnLFxuICAgICd9JyxcbiAgICAnfScsXG4gICAgJ3JldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocnMsIHJqKSB7JyxcbiAgICAndmFyIGNiID0gJyArIGNhbGxiYWNrRm4gKyAnOycsXG4gICAgJ3ZhciByZXM7JyxcbiAgICAnc3dpdGNoIChhcmdMZW5ndGgpIHsnLFxuICAgIGFyZ3MuY29uY2F0KFsnZXh0cmEnXSkubWFwKGZ1bmN0aW9uIChfLCBpbmRleCkge1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgJ2Nhc2UgJyArIChpbmRleCkgKyAnOicgK1xuICAgICAgICAncmVzID0gZm4uY2FsbCgnICsgWydzZWxmJ10uY29uY2F0KGFyZ3Muc2xpY2UoMCwgaW5kZXgpKS5jb25jYXQoJ2NiJykuam9pbignLCcpICsgJyk7JyArXG4gICAgICAgICdicmVhazsnXG4gICAgICApO1xuICAgIH0pLmpvaW4oJycpLFxuICAgICdkZWZhdWx0OicsXG4gICAgJ2FyZ3NbYXJnTGVuZ3RoXSA9IGNiOycsXG4gICAgJ3JlcyA9IGZuLmFwcGx5KHNlbGYsIGFyZ3MpOycsXG4gICAgJ30nLFxuICAgIFxuICAgICdpZiAocmVzICYmJyxcbiAgICAnKHR5cGVvZiByZXMgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIHJlcyA9PT0gXCJmdW5jdGlvblwiKSAmJicsXG4gICAgJ3R5cGVvZiByZXMudGhlbiA9PT0gXCJmdW5jdGlvblwiJyxcbiAgICAnKSB7cnMocmVzKTt9JyxcbiAgICAnfSk7JyxcbiAgICAnfTsnXG4gIF0uam9pbignJyk7XG5cbiAgcmV0dXJuIEZ1bmN0aW9uKFxuICAgIFsnUHJvbWlzZScsICdmbiddLFxuICAgIGJvZHlcbiAgKShQcm9taXNlLCBmbik7XG59XG5cblByb21pc2Uubm9kZWlmeSA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB2YXIgY2FsbGJhY2sgPVxuICAgICAgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gJ2Z1bmN0aW9uJyA/IGFyZ3MucG9wKCkgOiBudWxsO1xuICAgIHZhciBjdHggPSB0aGlzO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKS5ub2RlaWZ5KGNhbGxiYWNrLCBjdHgpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBpZiAoY2FsbGJhY2sgPT09IG51bGwgfHwgdHlwZW9mIGNhbGxiYWNrID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgcmVqZWN0KGV4KTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjYWxsYmFjay5jYWxsKGN0eCwgZXgpO1xuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5Qcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBjdHgpIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPSAnZnVuY3Rpb24nKSByZXR1cm4gdGhpcztcblxuICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICBjYWxsYmFjay5jYWxsKGN0eCwgbnVsbCwgdmFsdWUpO1xuICAgIH0pO1xuICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICBjYWxsYmFjay5jYWxsKGN0eCwgZXJyKTtcbiAgICB9KTtcbiAgfSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnLi9jb3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZTtcblByb21pc2UuZW5hYmxlU3luY2hyb25vdXMgPSBmdW5jdGlvbiAoKSB7XG4gIFByb21pc2UucHJvdG90eXBlLmlzUGVuZGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlKCkgPT0gMDtcbiAgfTtcblxuICBQcm9taXNlLnByb3RvdHlwZS5pc0Z1bGZpbGxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlKCkgPT0gMTtcbiAgfTtcblxuICBQcm9taXNlLnByb3RvdHlwZS5pc1JlamVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKSA9PSAyO1xuICB9O1xuXG4gIFByb21pc2UucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl84MSA9PT0gMykge1xuICAgICAgcmV0dXJuIHRoaXMuXzY1LmdldFZhbHVlKCk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmlzRnVsZmlsbGVkKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGdldCBhIHZhbHVlIG9mIGFuIHVuZnVsZmlsbGVkIHByb21pc2UuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuXzY1O1xuICB9O1xuXG4gIFByb21pc2UucHJvdG90eXBlLmdldFJlYXNvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fODEgPT09IDMpIHtcbiAgICAgIHJldHVybiB0aGlzLl82NS5nZXRSZWFzb24oKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaXNSZWplY3RlZCgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBnZXQgYSByZWplY3Rpb24gcmVhc29uIG9mIGEgbm9uLXJlamVjdGVkIHByb21pc2UuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuXzY1O1xuICB9O1xuXG4gIFByb21pc2UucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl84MSA9PT0gMykge1xuICAgICAgcmV0dXJuIHRoaXMuXzY1LmdldFN0YXRlKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLl84MSA9PT0gLTEgfHwgdGhpcy5fODEgPT09IC0yKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fODE7XG4gIH07XG59O1xuXG5Qcm9taXNlLmRpc2FibGVTeW5jaHJvbm91cyA9IGZ1bmN0aW9uKCkge1xuICBQcm9taXNlLnByb3RvdHlwZS5pc1BlbmRpbmcgPSB1bmRlZmluZWQ7XG4gIFByb21pc2UucHJvdG90eXBlLmlzRnVsZmlsbGVkID0gdW5kZWZpbmVkO1xuICBQcm9taXNlLnByb3RvdHlwZS5pc1JlamVjdGVkID0gdW5kZWZpbmVkO1xuICBQcm9taXNlLnByb3RvdHlwZS5nZXRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgUHJvbWlzZS5wcm90b3R5cGUuZ2V0UmVhc29uID0gdW5kZWZpbmVkO1xuICBQcm9taXNlLnByb3RvdHlwZS5nZXRTdGF0ZSA9IHVuZGVmaW5lZDtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGRvbWFpbjsgLy8gVGhlIGRvbWFpbiBtb2R1bGUgaXMgZXhlY3V0ZWQgb24gZGVtYW5kXG52YXIgaGFzU2V0SW1tZWRpYXRlID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiO1xuXG4vLyBVc2UgdGhlIGZhc3Rlc3QgbWVhbnMgcG9zc2libGUgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gaXRzIG93biB0dXJuLCB3aXRoXG4vLyBwcmlvcml0eSBvdmVyIG90aGVyIGV2ZW50cyBpbmNsdWRpbmcgbmV0d29yayBJTyBldmVudHMgaW4gTm9kZS5qcy5cbi8vXG4vLyBBbiBleGNlcHRpb24gdGhyb3duIGJ5IGEgdGFzayB3aWxsIHBlcm1hbmVudGx5IGludGVycnVwdCB0aGUgcHJvY2Vzc2luZyBvZlxuLy8gc3Vic2VxdWVudCB0YXNrcy4gVGhlIGhpZ2hlciBsZXZlbCBgYXNhcGAgZnVuY3Rpb24gZW5zdXJlcyB0aGF0IGlmIGFuXG4vLyBleGNlcHRpb24gaXMgdGhyb3duIGJ5IGEgdGFzaywgdGhhdCB0aGUgdGFzayBxdWV1ZSB3aWxsIGNvbnRpbnVlIGZsdXNoaW5nIGFzXG4vLyBzb29uIGFzIHBvc3NpYmxlLCBidXQgaWYgeW91IHVzZSBgcmF3QXNhcGAgZGlyZWN0bHksIHlvdSBhcmUgcmVzcG9uc2libGUgdG9cbi8vIGVpdGhlciBlbnN1cmUgdGhhdCBubyBleGNlcHRpb25zIGFyZSB0aHJvd24gZnJvbSB5b3VyIHRhc2ssIG9yIHRvIG1hbnVhbGx5XG4vLyBjYWxsIGByYXdBc2FwLnJlcXVlc3RGbHVzaGAgaWYgYW4gZXhjZXB0aW9uIGlzIHRocm93bi5cbm1vZHVsZS5leHBvcnRzID0gcmF3QXNhcDtcbmZ1bmN0aW9uIHJhd0FzYXAodGFzaykge1xuICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHJlcXVlc3RGbHVzaCgpO1xuICAgICAgICBmbHVzaGluZyA9IHRydWU7XG4gICAgfVxuICAgIC8vIEF2b2lkcyBhIGZ1bmN0aW9uIGNhbGxcbiAgICBxdWV1ZVtxdWV1ZS5sZW5ndGhdID0gdGFzaztcbn1cblxudmFyIHF1ZXVlID0gW107XG4vLyBPbmNlIGEgZmx1c2ggaGFzIGJlZW4gcmVxdWVzdGVkLCBubyBmdXJ0aGVyIGNhbGxzIHRvIGByZXF1ZXN0Rmx1c2hgIGFyZVxuLy8gbmVjZXNzYXJ5IHVudGlsIHRoZSBuZXh0IGBmbHVzaGAgY29tcGxldGVzLlxudmFyIGZsdXNoaW5nID0gZmFsc2U7XG4vLyBUaGUgcG9zaXRpb24gb2YgdGhlIG5leHQgdGFzayB0byBleGVjdXRlIGluIHRoZSB0YXNrIHF1ZXVlLiBUaGlzIGlzXG4vLyBwcmVzZXJ2ZWQgYmV0d2VlbiBjYWxscyB0byBgZmx1c2hgIHNvIHRoYXQgaXQgY2FuIGJlIHJlc3VtZWQgaWZcbi8vIGEgdGFzayB0aHJvd3MgYW4gZXhjZXB0aW9uLlxudmFyIGluZGV4ID0gMDtcbi8vIElmIGEgdGFzayBzY2hlZHVsZXMgYWRkaXRpb25hbCB0YXNrcyByZWN1cnNpdmVseSwgdGhlIHRhc2sgcXVldWUgY2FuIGdyb3dcbi8vIHVuYm91bmRlZC4gVG8gcHJldmVudCBtZW1vcnkgZXhjYXVzdGlvbiwgdGhlIHRhc2sgcXVldWUgd2lsbCBwZXJpb2RpY2FsbHlcbi8vIHRydW5jYXRlIGFscmVhZHktY29tcGxldGVkIHRhc2tzLlxudmFyIGNhcGFjaXR5ID0gMTAyNDtcblxuLy8gVGhlIGZsdXNoIGZ1bmN0aW9uIHByb2Nlc3NlcyBhbGwgdGFza3MgdGhhdCBoYXZlIGJlZW4gc2NoZWR1bGVkIHdpdGhcbi8vIGByYXdBc2FwYCB1bmxlc3MgYW5kIHVudGlsIG9uZSBvZiB0aG9zZSB0YXNrcyB0aHJvd3MgYW4gZXhjZXB0aW9uLlxuLy8gSWYgYSB0YXNrIHRocm93cyBhbiBleGNlcHRpb24sIGBmbHVzaGAgZW5zdXJlcyB0aGF0IGl0cyBzdGF0ZSB3aWxsIHJlbWFpblxuLy8gY29uc2lzdGVudCBhbmQgd2lsbCByZXN1bWUgd2hlcmUgaXQgbGVmdCBvZmYgd2hlbiBjYWxsZWQgYWdhaW4uXG4vLyBIb3dldmVyLCBgZmx1c2hgIGRvZXMgbm90IG1ha2UgYW55IGFycmFuZ2VtZW50cyB0byBiZSBjYWxsZWQgYWdhaW4gaWYgYW5cbi8vIGV4Y2VwdGlvbiBpcyB0aHJvd24uXG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgICB3aGlsZSAoaW5kZXggPCBxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGN1cnJlbnRJbmRleCA9IGluZGV4O1xuICAgICAgICAvLyBBZHZhbmNlIHRoZSBpbmRleCBiZWZvcmUgY2FsbGluZyB0aGUgdGFzay4gVGhpcyBlbnN1cmVzIHRoYXQgd2Ugd2lsbFxuICAgICAgICAvLyBiZWdpbiBmbHVzaGluZyBvbiB0aGUgbmV4dCB0YXNrIHRoZSB0YXNrIHRocm93cyBhbiBlcnJvci5cbiAgICAgICAgaW5kZXggPSBpbmRleCArIDE7XG4gICAgICAgIHF1ZXVlW2N1cnJlbnRJbmRleF0uY2FsbCgpO1xuICAgICAgICAvLyBQcmV2ZW50IGxlYWtpbmcgbWVtb3J5IGZvciBsb25nIGNoYWlucyBvZiByZWN1cnNpdmUgY2FsbHMgdG8gYGFzYXBgLlxuICAgICAgICAvLyBJZiB3ZSBjYWxsIGBhc2FwYCB3aXRoaW4gdGFza3Mgc2NoZWR1bGVkIGJ5IGBhc2FwYCwgdGhlIHF1ZXVlIHdpbGxcbiAgICAgICAgLy8gZ3JvdywgYnV0IHRvIGF2b2lkIGFuIE8obikgd2FsayBmb3IgZXZlcnkgdGFzayB3ZSBleGVjdXRlLCB3ZSBkb24ndFxuICAgICAgICAvLyBzaGlmdCB0YXNrcyBvZmYgdGhlIHF1ZXVlIGFmdGVyIHRoZXkgaGF2ZSBiZWVuIGV4ZWN1dGVkLlxuICAgICAgICAvLyBJbnN0ZWFkLCB3ZSBwZXJpb2RpY2FsbHkgc2hpZnQgMTAyNCB0YXNrcyBvZmYgdGhlIHF1ZXVlLlxuICAgICAgICBpZiAoaW5kZXggPiBjYXBhY2l0eSkge1xuICAgICAgICAgICAgLy8gTWFudWFsbHkgc2hpZnQgYWxsIHZhbHVlcyBzdGFydGluZyBhdCB0aGUgaW5kZXggYmFjayB0byB0aGVcbiAgICAgICAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgcXVldWUuXG4gICAgICAgICAgICBmb3IgKHZhciBzY2FuID0gMCwgbmV3TGVuZ3RoID0gcXVldWUubGVuZ3RoIC0gaW5kZXg7IHNjYW4gPCBuZXdMZW5ndGg7IHNjYW4rKykge1xuICAgICAgICAgICAgICAgIHF1ZXVlW3NjYW5dID0gcXVldWVbc2NhbiArIGluZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCAtPSBpbmRleDtcbiAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgIGluZGV4ID0gMDtcbiAgICBmbHVzaGluZyA9IGZhbHNlO1xufVxuXG5yYXdBc2FwLnJlcXVlc3RGbHVzaCA9IHJlcXVlc3RGbHVzaDtcbmZ1bmN0aW9uIHJlcXVlc3RGbHVzaCgpIHtcbiAgICAvLyBFbnN1cmUgZmx1c2hpbmcgaXMgbm90IGJvdW5kIHRvIGFueSBkb21haW4uXG4gICAgLy8gSXQgaXMgbm90IHN1ZmZpY2llbnQgdG8gZXhpdCB0aGUgZG9tYWluLCBiZWNhdXNlIGRvbWFpbnMgZXhpc3Qgb24gYSBzdGFjay5cbiAgICAvLyBUbyBleGVjdXRlIGNvZGUgb3V0c2lkZSBvZiBhbnkgZG9tYWluLCB0aGUgZm9sbG93aW5nIGRhbmNlIGlzIG5lY2Vzc2FyeS5cbiAgICB2YXIgcGFyZW50RG9tYWluID0gcHJvY2Vzcy5kb21haW47XG4gICAgaWYgKHBhcmVudERvbWFpbikge1xuICAgICAgICBpZiAoIWRvbWFpbikge1xuICAgICAgICAgICAgLy8gTGF6eSBleGVjdXRlIHRoZSBkb21haW4gbW9kdWxlLlxuICAgICAgICAgICAgLy8gT25seSBlbXBsb3llZCBpZiB0aGUgdXNlciBlbGVjdHMgdG8gdXNlIGRvbWFpbnMuXG4gICAgICAgICAgICBkb21haW4gPSByZXF1aXJlKFwiZG9tYWluXCIpO1xuICAgICAgICB9XG4gICAgICAgIGRvbWFpbi5hY3RpdmUgPSBwcm9jZXNzLmRvbWFpbiA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gYHNldEltbWVkaWF0ZWAgaXMgc2xvd2VyIHRoYXQgYHByb2Nlc3MubmV4dFRpY2tgLCBidXQgYHByb2Nlc3MubmV4dFRpY2tgXG4gICAgLy8gY2Fubm90IGhhbmRsZSByZWN1cnNpb24uXG4gICAgLy8gYHJlcXVlc3RGbHVzaGAgd2lsbCBvbmx5IGJlIGNhbGxlZCByZWN1cnNpdmVseSBmcm9tIGBhc2FwLmpzYCwgdG8gcmVzdW1lXG4gICAgLy8gZmx1c2hpbmcgYWZ0ZXIgYW4gZXJyb3IgaXMgdGhyb3duIGludG8gYSBkb21haW4uXG4gICAgLy8gQ29udmVuaWVudGx5LCBgc2V0SW1tZWRpYXRlYCB3YXMgaW50cm9kdWNlZCBpbiB0aGUgc2FtZSB2ZXJzaW9uXG4gICAgLy8gYHByb2Nlc3MubmV4dFRpY2tgIHN0YXJ0ZWQgdGhyb3dpbmcgcmVjdXJzaW9uIGVycm9ycy5cbiAgICBpZiAoZmx1c2hpbmcgJiYgaGFzU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHNldEltbWVkaWF0ZShmbHVzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgfVxuXG4gICAgaWYgKHBhcmVudERvbWFpbikge1xuICAgICAgICBkb21haW4uYWN0aXZlID0gcHJvY2Vzcy5kb21haW4gPSBwYXJlbnREb21haW47XG4gICAgfVxufVxuIiwiZXhwb3J0cy5uYW1lID0gXCJhc2FwXCI7XG5leHBvcnRzLnZlcnNpb24gPSBcIjIuMC4zXCI7XG5leHBvcnRzLm1haW4gPSBcIi4vYXNhcC5qc1wiO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciByYXdBc2FwID0gcmVxdWlyZShcIi4vcmF3XCIpO1xudmFyIGZyZWVUYXNrcyA9IFtdO1xuXG4vKipcbiAqIENhbGxzIGEgdGFzayBhcyBzb29uIGFzIHBvc3NpYmxlIGFmdGVyIHJldHVybmluZywgaW4gaXRzIG93biBldmVudCwgd2l0aFxuICogcHJpb3JpdHkgb3ZlciBJTyBldmVudHMuIEFuIGV4Y2VwdGlvbiB0aHJvd24gaW4gYSB0YXNrIGNhbiBiZSBoYW5kbGVkIGJ5XG4gKiBgcHJvY2Vzcy5vbihcInVuY2F1Z2h0RXhjZXB0aW9uXCIpIG9yIGBkb21haW4ub24oXCJlcnJvclwiKWAsIGJ1dCB3aWxsIG90aGVyd2lzZVxuICogY3Jhc2ggdGhlIHByb2Nlc3MuIElmIHRoZSBlcnJvciBpcyBoYW5kbGVkLCBhbGwgc3Vic2VxdWVudCB0YXNrcyB3aWxsXG4gKiByZXN1bWUuXG4gKlxuICogQHBhcmFtIHt7Y2FsbH19IHRhc2sgQSBjYWxsYWJsZSBvYmplY3QsIHR5cGljYWxseSBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgbm9cbiAqIGFyZ3VtZW50cy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBhc2FwO1xuZnVuY3Rpb24gYXNhcCh0YXNrKSB7XG4gICAgdmFyIHJhd1Rhc2s7XG4gICAgaWYgKGZyZWVUYXNrcy5sZW5ndGgpIHtcbiAgICAgICAgcmF3VGFzayA9IGZyZWVUYXNrcy5wb3AoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByYXdUYXNrID0gbmV3IFJhd1Rhc2soKTtcbiAgICB9XG4gICAgcmF3VGFzay50YXNrID0gdGFzaztcbiAgICByYXdUYXNrLmRvbWFpbiA9IHByb2Nlc3MuZG9tYWluO1xuICAgIHJhd0FzYXAocmF3VGFzayk7XG59XG5cbmZ1bmN0aW9uIFJhd1Rhc2soKSB7XG4gICAgdGhpcy50YXNrID0gbnVsbDtcbiAgICB0aGlzLmRvbWFpbiA9IG51bGw7XG59XG5cblJhd1Rhc2sucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZG9tYWluKSB7XG4gICAgICAgIHRoaXMuZG9tYWluLmVudGVyKCk7XG4gICAgfVxuICAgIHZhciB0aHJldyA9IHRydWU7XG4gICAgdHJ5IHtcbiAgICAgICAgdGhpcy50YXNrLmNhbGwoKTtcbiAgICAgICAgdGhyZXcgPSBmYWxzZTtcbiAgICAgICAgLy8gSWYgdGhlIHRhc2sgdGhyb3dzIGFuIGV4Y2VwdGlvbiAocHJlc3VtYWJseSkgTm9kZS5qcyByZXN0b3JlcyB0aGVcbiAgICAgICAgLy8gZG9tYWluIHN0YWNrIGZvciB0aGUgbmV4dCBldmVudC5cbiAgICAgICAgaWYgKHRoaXMuZG9tYWluKSB7XG4gICAgICAgICAgICB0aGlzLmRvbWFpbi5leGl0KCk7XG4gICAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgICAvLyBXZSB1c2UgdHJ5L2ZpbmFsbHkgYW5kIGEgdGhyZXcgZmxhZyB0byBhdm9pZCBtZXNzaW5nIHVwIHN0YWNrIHRyYWNlc1xuICAgICAgICAvLyB3aGVuIHdlIGNhdGNoIGFuZCByZWxlYXNlIGVycm9ycy5cbiAgICAgICAgaWYgKHRocmV3KSB7XG4gICAgICAgICAgICAvLyBJbiBOb2RlLmpzLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBjb25zaWRlcmVkIGZhdGFsIGVycm9ycy5cbiAgICAgICAgICAgIC8vIFJlLXRocm93IHRoZW0gdG8gaW50ZXJydXB0IGZsdXNoaW5nIVxuICAgICAgICAgICAgLy8gRW5zdXJlIHRoYXQgZmx1c2hpbmcgY29udGludWVzIGlmIGFuIHVuY2F1Z2h0IGV4Y2VwdGlvbiBpc1xuICAgICAgICAgICAgLy8gc3VwcHJlc3NlZCBsaXN0ZW5pbmcgcHJvY2Vzcy5vbihcInVuY2F1Z2h0RXhjZXB0aW9uXCIpIG9yXG4gICAgICAgICAgICAvLyBkb21haW4ub24oXCJlcnJvclwiKS5cbiAgICAgICAgICAgIHJhd0FzYXAucmVxdWVzdEZsdXNoKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlIHRhc2sgdGhyZXcgYW4gZXJyb3IsIHdlIGRvIG5vdCB3YW50IHRvIGV4aXQgdGhlIGRvbWFpbiBoZXJlLlxuICAgICAgICAvLyBFeGl0aW5nIHRoZSBkb21haW4gd291bGQgcHJldmVudCB0aGUgZG9tYWluIGZyb20gY2F0Y2hpbmcgdGhlIGVycm9yLlxuICAgICAgICB0aGlzLnRhc2sgPSBudWxsO1xuICAgICAgICB0aGlzLmRvbWFpbiA9IG51bGw7XG4gICAgICAgIGZyZWVUYXNrcy5wdXNoKHRoaXMpO1xuICAgIH1cbn07XG5cbiJdfQ==
