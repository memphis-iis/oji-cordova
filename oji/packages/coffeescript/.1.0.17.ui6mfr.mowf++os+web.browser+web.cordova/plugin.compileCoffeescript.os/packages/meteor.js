(function () {

/* Imports */
var _ = Package.underscore._;

/* Package-scope variables */
var global, meteorEnv, Meteor;

(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/global.js                                                                                       //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
global = this;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/server_environment.js                                                                           //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
meteorEnv = {
  NODE_ENV: process.env.NODE_ENV || "production",
  TEST_METADATA: process.env.TEST_METADATA || "{}"
};

if (typeof __meteor_runtime_config__ === "object") {
  __meteor_runtime_config__.meteorEnv = meteorEnv;
}

Meteor = {
  isProduction: meteorEnv.NODE_ENV === "production",
  isDevelopment: meteorEnv.NODE_ENV !== "production",
  isClient: false,
  isServer: true,
  isCordova: false
};

Meteor.settings = {};

if (process.env.METEOR_SETTINGS) {
  try {
    Meteor.settings = JSON.parse(process.env.METEOR_SETTINGS);
  } catch (e) {
    throw new Error("METEOR_SETTINGS are not valid JSON: " + process.env.METEOR_SETTINGS);
  }
}

// Make sure that there is always a public attribute
// to enable Meteor.settings.public on client
if (! Meteor.settings.public) {
    Meteor.settings.public = {};
}

// Push a subset of settings to the client.  Note that the way this
// code is written, if the app mutates `Meteor.settings.public` on the
// server, it also mutates
// `__meteor_runtime_config__.PUBLIC_SETTINGS`, and the modified
// settings will be sent to the client.
if (typeof __meteor_runtime_config__ === "object") {
  __meteor_runtime_config__.PUBLIC_SETTINGS = Meteor.settings.public;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/helpers.js                                                                                      //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
if (Meteor.isServer)
  var Future = Npm.require('fibers/future');

if (typeof __meteor_runtime_config__ === 'object' &&
    __meteor_runtime_config__.meteorRelease) {
  /**
   * @summary `Meteor.release` is a string containing the name of the [release](#meteorupdate) with which the project was built (for example, `"1.2.3"`). It is `undefined` if the project was built using a git checkout of Meteor.
   * @locus Anywhere
   * @type {String}
   */
  Meteor.release = __meteor_runtime_config__.meteorRelease;
}

// XXX find a better home for these? Ideally they would be _.get,
// _.ensure, _.delete..

_.extend(Meteor, {
  // _get(a,b,c,d) returns a[b][c][d], or else undefined if a[b] or
  // a[b][c] doesn't exist.
  //
  _get: function (obj /*, arguments */) {
    for (var i = 1; i < arguments.length; i++) {
      if (!(arguments[i] in obj))
        return undefined;
      obj = obj[arguments[i]];
    }
    return obj;
  },

  // _ensure(a,b,c,d) ensures that a[b][c][d] exists. If it does not,
  // it is created and set to {}. Either way, it is returned.
  //
  _ensure: function (obj /*, arguments */) {
    for (var i = 1; i < arguments.length; i++) {
      var key = arguments[i];
      if (!(key in obj))
        obj[key] = {};
      obj = obj[key];
    }

    return obj;
  },

  // _delete(a, b, c, d) deletes a[b][c][d], then a[b][c] unless it
  // isn't empty, then a[b] unless it isn't empty.
  //
  _delete: function (obj /*, arguments */) {
    var stack = [obj];
    var leaf = true;
    for (var i = 1; i < arguments.length - 1; i++) {
      var key = arguments[i];
      if (!(key in obj)) {
        leaf = false;
        break;
      }
      obj = obj[key];
      if (typeof obj !== "object")
        break;
      stack.push(obj);
    }

    for (var i = stack.length - 1; i >= 0; i--) {
      var key = arguments[i+1];

      if (leaf)
        leaf = false;
      else
        for (var other in stack[i][key])
          return; // not empty -- we're done

      delete stack[i][key];
    }
  },

  // wrapAsync can wrap any function that takes some number of arguments that
  // can't be undefined, followed by some optional arguments, where the callback
  // is the last optional argument.
  // e.g. fs.readFile(pathname, [callback]),
  // fs.open(pathname, flags, [mode], [callback])
  // For maximum effectiveness and least confusion, wrapAsync should be used on
  // functions where the callback is the only argument of type Function.

  /**
   * @memberOf Meteor
   * @summary Wrap a function that takes a callback function as its final parameter. The signature of the callback of the wrapped function should be `function(error, result){}`. On the server, the wrapped function can be used either synchronously (without passing a callback) or asynchronously (when a callback is passed). On the client, a callback is always required; errors will be logged if there is no callback. If a callback is provided, the environment captured when the original function was called will be restored in the callback.
   * @locus Anywhere
   * @param {Function} func A function that takes a callback as its final parameter
   * @param {Object} [context] Optional `this` object against which the original function will be invoked
   */
  wrapAsync: function (fn, context) {
    return function (/* arguments */) {
      var self = context || this;
      var newArgs = _.toArray(arguments);
      var callback;

      for (var i = newArgs.length - 1; i >= 0; --i) {
        var arg = newArgs[i];
        var type = typeof arg;
        if (type !== "undefined") {
          if (type === "function") {
            callback = arg;
          }
          break;
        }
      }

      if (! callback) {
        if (Meteor.isClient) {
          callback = logErr;
        } else {
          var fut = new Future();
          callback = fut.resolver();
        }
        ++i; // Insert the callback just after arg.
      }

      newArgs[i] = Meteor.bindEnvironment(callback);
      var result = fn.apply(self, newArgs);
      return fut ? fut.wait() : result;
    };
  },

  // Sets child's prototype to a new object whose prototype is parent's
  // prototype. Used as:
  //   Meteor._inherits(ClassB, ClassA).
  //   _.extend(ClassB.prototype, { ... })
  // Inspired by CoffeeScript's `extend` and Google Closure's `goog.inherits`.
  _inherits: function (Child, Parent) {
    // copy Parent static properties
    for (var key in Parent) {
      // make sure we only copy hasOwnProperty properties vs. prototype
      // properties
      if (_.has(Parent, key))
        Child[key] = Parent[key];
    }

    // a middle member of prototype chain: takes the prototype from the Parent
    var Middle = function () {
      this.constructor = Child;
    };
    Middle.prototype = Parent.prototype;
    Child.prototype = new Middle();
    Child.__super__ = Parent.prototype;
    return Child;
  }
});

var warnedAboutWrapAsync = false;

/**
 * @deprecated in 0.9.3
 */
Meteor._wrapAsync = function(fn, context) {
  if (! warnedAboutWrapAsync) {
    Meteor._debug("Meteor._wrapAsync has been renamed to Meteor.wrapAsync");
    warnedAboutWrapAsync = true;
  }
  return Meteor.wrapAsync.apply(Meteor, arguments);
};

function logErr(err) {
  if (err) {
    return Meteor._debug(
      "Exception in callback of async function",
      err.stack ? err.stack : err
    );
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/setimmediate.js                                                                                 //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
// Chooses one of three setImmediate implementations:
//
// * Native setImmediate (IE 10, Node 0.9+)
//
// * postMessage (many browsers)
//
// * setTimeout  (fallback)
//
// The postMessage implementation is based on
// https://github.com/NobleJS/setImmediate/tree/1.0.1
//
// Don't use `nextTick` for Node since it runs its callbacks before
// I/O, which is stricter than we're looking for.
//
// Not installed as a polyfill, as our public API is `Meteor.defer`.
// Since we're not trying to be a polyfill, we have some
// simplifications:
//
// If one invocation of a setImmediate callback pauses itself by a
// call to alert/prompt/showModelDialog, the NobleJS polyfill
// implementation ensured that no setImmedate callback would run until
// the first invocation completed.  While correct per the spec, what it
// would mean for us in practice is that any reactive updates relying
// on Meteor.defer would be hung in the main window until the modal
// dialog was dismissed.  Thus we only ensure that a setImmediate
// function is called in a later event loop.
//
// We don't need to support using a string to be eval'ed for the
// callback, arguments to the function, or clearImmediate.

"use strict";

var global = this;


// IE 10, Node >= 9.1

function useSetImmediate() {
  if (! global.setImmediate)
    return null;
  else {
    var setImmediate = function (fn) {
      global.setImmediate(fn);
    };
    setImmediate.implementation = 'setImmediate';
    return setImmediate;
  }
}


// Android 2.3.6, Chrome 26, Firefox 20, IE 8-9, iOS 5.1.1 Safari

function usePostMessage() {
  // The test against `importScripts` prevents this implementation
  // from being installed inside a web worker, where
  // `global.postMessage` means something completely different and
  // can't be used for this purpose.

  if (!global.postMessage || global.importScripts) {
    return null;
  }

  // Avoid synchronous post message implementations.

  var postMessageIsAsynchronous = true;
  var oldOnMessage = global.onmessage;
  global.onmessage = function () {
      postMessageIsAsynchronous = false;
  };
  global.postMessage("", "*");
  global.onmessage = oldOnMessage;

  if (! postMessageIsAsynchronous)
    return null;

  var funcIndex = 0;
  var funcs = {};

  // Installs an event handler on `global` for the `message` event: see
  // * https://developer.mozilla.org/en/DOM/window.postMessage
  // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

  // XXX use Random.id() here?
  var MESSAGE_PREFIX = "Meteor._setImmediate." + Math.random() + '.';

  function isStringAndStartsWith(string, putativeStart) {
    return (typeof string === "string" &&
            string.substring(0, putativeStart.length) === putativeStart);
  }

  function onGlobalMessage(event) {
    // This will catch all incoming messages (even from other
    // windows!), so we need to try reasonably hard to avoid letting
    // anyone else trick us into firing off. We test the origin is
    // still this window, and that a (randomly generated)
    // unpredictable identifying prefix is present.
    if (event.source === global &&
        isStringAndStartsWith(event.data, MESSAGE_PREFIX)) {
      var index = event.data.substring(MESSAGE_PREFIX.length);
      try {
        if (funcs[index])
          funcs[index]();
      }
      finally {
        delete funcs[index];
      }
    }
  }

  if (global.addEventListener) {
    global.addEventListener("message", onGlobalMessage, false);
  } else {
    global.attachEvent("onmessage", onGlobalMessage);
  }

  var setImmediate = function (fn) {
    // Make `global` post a message to itself with the handle and
    // identifying prefix, thus asynchronously invoking our
    // onGlobalMessage listener above.
    ++funcIndex;
    funcs[funcIndex] = fn;
    global.postMessage(MESSAGE_PREFIX + funcIndex, "*");
  };
  setImmediate.implementation = 'postMessage';
  return setImmediate;
}


function useTimeout() {
  var setImmediate = function (fn) {
    global.setTimeout(fn, 0);
  };
  setImmediate.implementation = 'setTimeout';
  return setImmediate;
}


Meteor._setImmediate =
  useSetImmediate() ||
  usePostMessage() ||
  useTimeout();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/timers.js                                                                                       //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var withoutInvocation = function (f) {
  if (Package.ddp) {
    var _CurrentInvocation = Package.ddp.DDP._CurrentInvocation;
    if (_CurrentInvocation.get() && _CurrentInvocation.get().isSimulation)
      throw new Error("Can't set timers inside simulations");
    return function () { _CurrentInvocation.withValue(null, f); };
  }
  else
    return f;
};

var bindAndCatch = function (context, f) {
  return Meteor.bindEnvironment(withoutInvocation(f), context);
};

_.extend(Meteor, {
  // Meteor.setTimeout and Meteor.setInterval callbacks scheduled
  // inside a server method are not part of the method invocation and
  // should clear out the CurrentInvocation environment variable.

  /**
   * @memberOf Meteor
   * @summary Call a function in the future after waiting for a specified delay.
   * @locus Anywhere
   * @param {Function} func The function to run
   * @param {Number} delay Number of milliseconds to wait before calling function
   */
  setTimeout: function (f, duration) {
    return setTimeout(bindAndCatch("setTimeout callback", f), duration);
  },

  /**
   * @memberOf Meteor
   * @summary Call a function repeatedly, with a time delay between calls.
   * @locus Anywhere
   * @param {Function} func The function to run
   * @param {Number} delay Number of milliseconds to wait between each function call.
   */
  setInterval: function (f, duration) {
    return setInterval(bindAndCatch("setInterval callback", f), duration);
  },

  /**
   * @memberOf Meteor
   * @summary Cancel a repeating function call scheduled by `Meteor.setInterval`.
   * @locus Anywhere
   * @param {Number} id The handle returned by `Meteor.setInterval`
   */
  clearInterval: function(x) {
    return clearInterval(x);
  },

  /**
   * @memberOf Meteor
   * @summary Cancel a function call scheduled by `Meteor.setTimeout`.
   * @locus Anywhere
   * @param {Number} id The handle returned by `Meteor.setTimeout`
   */
  clearTimeout: function(x) {
    return clearTimeout(x);
  },

  // XXX consider making this guarantee ordering of defer'd callbacks, like
  // Tracker.afterFlush or Node's nextTick (in practice). Then tests can do:
  //    callSomethingThatDefersSomeWork();
  //    Meteor.defer(expect(somethingThatValidatesThatTheWorkHappened));

  /**
   * @memberOf Meteor
   * @summary Defer execution of a function to run asynchronously in the background (similar to `Meteor.setTimeout(func, 0)`.
   * @locus Anywhere
   * @param {Function} func The function to run
   */
  defer: function (f) {
    Meteor._setImmediate(bindAndCatch("defer callback", f));
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/errors.js                                                                                       //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
// Makes an error subclass which properly contains a stack trace in most
// environments. constructor can set fields on `this` (and should probably set
// `message`, which is what gets displayed at the top of a stack trace).
//
Meteor.makeErrorType = function (name, constructor) {
  var errorClass = function (/*arguments*/) {
    // Ensure we get a proper stack trace in most Javascript environments
    if (Error.captureStackTrace) {
      // V8 environments (Chrome and Node.js)
      Error.captureStackTrace(this, errorClass);
    } else {
      // Borrow the .stack property of a native Error object.
      this.stack = new Error().stack;
    }
    // Safari magically works.

    constructor.apply(this, arguments);

    this.errorType = name;
  };

  Meteor._inherits(errorClass, Error);

  return errorClass;
};

// This should probably be in the livedata package, but we don't want
// to require you to use the livedata package to get it. Eventually we
// should probably rename it to DDP.Error and put it back in the
// 'livedata' package (which we should rename to 'ddp' also.)
//
// Note: The DDP server assumes that Meteor.Error EJSON-serializes as an object
// containing 'error' and optionally 'reason' and 'details'.
// The DDP client manually puts these into Meteor.Error objects. (We don't use
// EJSON.addType here because the type is determined by location in the
// protocol, not text on the wire.)

/**
 * @summary This class represents a symbolic error thrown by a method.
 * @locus Anywhere
 * @class
 * @param {String} error A string code uniquely identifying this kind of error.
 * This string should be used by callers of the method to determine the
 * appropriate action to take, instead of attempting to parse the reason
 * or details fields. For example:
 *
 * ```
 * // on the server, pick a code unique to this error
 * // the reason field should be a useful debug message
 * throw new Meteor.Error("logged-out", 
 *   "The user must be logged in to post a comment.");
 *
 * // on the client
 * Meteor.call("methodName", function (error) {
 *   // identify the error
 *   if (error && error.error === "logged-out") {
 *     // show a nice error message
 *     Session.set("errorMessage", "Please log in to post a comment.");
 *   }
 * });
 * ```
 * 
 * For legacy reasons, some built-in Meteor functions such as `check` throw
 * errors with a number in this field.
 * 
 * @param {String} [reason] Optional.  A short human-readable summary of the
 * error, like 'Not Found'.
 * @param {String} [details] Optional.  Additional information about the error,
 * like a textual stack trace.
 */
Meteor.Error = Meteor.makeErrorType(
  "Meteor.Error",
  function (error, reason, details) {
    var self = this;

    // String code uniquely identifying this kind of error.
    self.error = error;

    // Optional: A short human-readable summary of the error. Not
    // intended to be shown to end users, just developers. ("Not Found",
    // "Internal Server Error")
    self.reason = reason;

    // Optional: Additional information about the error, say for
    // debugging. It might be a (textual) stack trace if the server is
    // willing to provide one. The corresponding thing in HTTP would be
    // the body of a 404 or 500 response. (The difference is that we
    // never expect this to be shown to end users, only developers, so
    // it doesn't need to be pretty.)
    self.details = details;

    // This is what gets displayed at the top of a stack trace. Current
    // format is "[404]" (if no reason is set) or "File not found [404]"
    if (self.reason)
      self.message = self.reason + ' [' + self.error + ']';
    else
      self.message = '[' + self.error + ']';
  });

// Meteor.Error is basically data and is sent over DDP, so you should be able to
// properly EJSON-clone it. This is especially important because if a
// Meteor.Error is thrown through a Future, the error, reason, and details
// properties become non-enumerable so a standard Object clone won't preserve
// them and they will be lost from DDP.
Meteor.Error.prototype.clone = function () {
  var self = this;
  return new Meteor.Error(self.error, self.reason, self.details);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/fiber_helpers.js                                                                                //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var path = Npm.require('path');
var Fiber = Npm.require('fibers');
var Future = Npm.require(path.join('fibers', 'future'));

Meteor._noYieldsAllowed = function (f) {
  var savedYield = Fiber.yield;
  Fiber.yield = function () {
    throw new Error("Can't call yield in a noYieldsAllowed block!");
  };
  try {
    return f();
  } finally {
    Fiber.yield = savedYield;
  }
};

Meteor._DoubleEndedQueue = Npm.require('meteor-deque');

// Meteor._SynchronousQueue is a queue which runs task functions serially.
// Tasks are assumed to be synchronous: ie, it's assumed that they are
// done when they return.
//
// It has two methods:
//   - queueTask queues a task to be run, and returns immediately.
//   - runTask queues a task to be run, and then yields. It returns
//     when the task finishes running.
//
// It's safe to call queueTask from within a task, but not runTask (unless
// you're calling runTask from a nested Fiber).
//
// Somewhat inspired by async.queue, but specific to blocking tasks.
// XXX break this out into an NPM module?
// XXX could maybe use the npm 'schlock' module instead, which would
//     also support multiple concurrent "read" tasks
//
Meteor._SynchronousQueue = function () {
  var self = this;
  // List of tasks to run (not including a currently-running task if any). Each
  // is an object with field 'task' (the task function to run) and 'future' (the
  // Future associated with the blocking runTask call that queued it, or null if
  // called from queueTask).
  self._taskHandles = new Meteor._DoubleEndedQueue();
  // This is true if self._run() is either currently executing or scheduled to
  // do so soon.
  self._runningOrRunScheduled = false;
  // During the execution of a task, this is set to the fiber used to execute
  // that task. We use this to throw an error rather than deadlocking if the
  // user calls runTask from within a task on the same fiber.
  self._currentTaskFiber = undefined;
  // This is true if we're currently draining.  While we're draining, a further
  // drain is a noop, to prevent infinite loops.  "drain" is a heuristic type
  // operation, that has a meaning like unto "what a naive person would expect
  // when modifying a table from an observe"
  self._draining = false;
};

_.extend(Meteor._SynchronousQueue.prototype, {
  runTask: function (task) {
    var self = this;

    if (!self.safeToRunTask()) {
      if (Fiber.current)
        throw new Error("Can't runTask from another task in the same fiber");
      else
        throw new Error("Can only call runTask in a Fiber");
    }

    var fut = new Future;
    var handle = {
      task: Meteor.bindEnvironment(task, function (e) {
        Meteor._debug("Exception from task:", e && e.stack || e);
        throw e;
      }),
      future: fut,
      name: task.name
    };
    self._taskHandles.push(handle);
    self._scheduleRun();
    // Yield. We'll get back here after the task is run (and will throw if the
    // task throws).
    fut.wait();
  },
  queueTask: function (task) {
    var self = this;
    self._taskHandles.push({
      task: task,
      name: task.name
    });
    self._scheduleRun();
    // No need to block.
  },

  flush: function () {
    var self = this;
    self.runTask(function () {});
  },

  safeToRunTask: function () {
    var self = this;
    return Fiber.current && self._currentTaskFiber !== Fiber.current;
  },

  drain: function () {
    var self = this;
    if (self._draining)
      return;
    if (!self.safeToRunTask())
      return;
    self._draining = true;
    while (! self._taskHandles.isEmpty()) {
      self.flush();
    }
    self._draining = false;
  },

  _scheduleRun: function () {
    var self = this;
    // Already running or scheduled? Do nothing.
    if (self._runningOrRunScheduled)
      return;

    self._runningOrRunScheduled = true;
    setImmediate(function () {
      Fiber(function () {
        self._run();
      }).run();
    });
  },
  _run: function () {
    var self = this;

    if (!self._runningOrRunScheduled)
      throw new Error("expected to be _runningOrRunScheduled");

    if (self._taskHandles.isEmpty()) {
      // Done running tasks! Don't immediately schedule another run, but
      // allow future tasks to do so.
      self._runningOrRunScheduled = false;
      return;
    }
    var taskHandle = self._taskHandles.shift();

    // Run the task.
    self._currentTaskFiber = Fiber.current;
    var exception = undefined;
    try {
      taskHandle.task();
    } catch (err) {
      if (taskHandle.future) {
        // We'll throw this exception through runTask.
        exception = err;
      } else {
        Meteor._debug("Exception in queued task: " + (err.stack || err));
      }
    }
    self._currentTaskFiber = undefined;

    // Soon, run the next task, if there is any.
    self._runningOrRunScheduled = false;
    self._scheduleRun();

    // If this was queued with runTask, let the runTask call return (throwing if
    // the task threw).
    if (taskHandle.future) {
      if (exception)
        taskHandle.future['throw'](exception);
      else
        taskHandle.future['return']();
    }
  }
});

// Sleep. Mostly used for debugging (eg, inserting latency into server
// methods).
//
Meteor._sleepForMs = function (ms) {
  var fiber = Fiber.current;
  setTimeout(function() {
    fiber.run();
  }, ms);
  Fiber.yield();
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/startup_server.js                                                                               //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
Meteor.startup = function (callback) {
  if (__meteor_bootstrap__.startupHooks) {
    __meteor_bootstrap__.startupHooks.push(callback);
  } else {
    // We already started up. Just call it now.
    callback();
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/debug.js                                                                                        //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var suppress = 0;

// replacement for console.log. This is a temporary API. We should
// provide a real logging API soon (possibly just a polyfill for
// console?)
//
// NOTE: this is used on the server to print the warning about
// having autopublish enabled when you probably meant to turn it
// off. it's not really the proper use of something called
// _debug. the intent is for this message to go to the terminal and
// be very visible. if you change _debug to go someplace else, etc,
// please fix the autopublish code to do something reasonable.
//
Meteor._debug = function (/* arguments */) {
  if (suppress) {
    suppress--;
    return;
  }
  if (typeof console !== 'undefined' &&
      typeof console.log !== 'undefined') {
    if (arguments.length == 0) { // IE Companion breaks otherwise
      // IE10 PP4 requires at least one argument
      console.log('');
    } else {
      // IE doesn't have console.log.apply, it's not a real Object.
      // http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
      // http://patik.com/blog/complete-cross-browser-console-log/
      if (typeof console.log.apply === "function") {
        // Most browsers

        // Chrome and Safari only hyperlink URLs to source files in first argument of
        // console.log, so try to call it with one argument if possible.
        // Approach taken here: If all arguments are strings, join them on space.
        // See https://github.com/meteor/meteor/pull/732#issuecomment-13975991
        var allArgumentsOfTypeString = true;
        for (var i = 0; i < arguments.length; i++)
          if (typeof arguments[i] !== "string")
            allArgumentsOfTypeString = false;

        if (allArgumentsOfTypeString)
          console.log.apply(console, [Array.prototype.join.call(arguments, " ")]);
        else
          console.log.apply(console, arguments);

      } else if (typeof Function.prototype.bind === "function") {
        // IE9
        var log = Function.prototype.bind.call(console.log, console);
        log.apply(console, arguments);
      } else {
        // IE8
        Function.prototype.call.call(console.log, console, Array.prototype.slice.call(arguments));
      }
    }
  }
};

// Suppress the next 'count' Meteor._debug messsages. Use this to
// stop tests from spamming the console.
//
Meteor._suppress_log = function (count) {
  suppress += count;
};

Meteor._suppressed_log_expected = function () {
  return suppress !== 0;
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/string_utils.js                                                                                 //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
// Like Perl's quotemeta: quotes all regexp metacharacters.
// Code taken from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
Meteor._escapeRegExp = function (string) {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/test_environment.js                                                                             //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var TEST_METADATA_STR;
if (Meteor.isClient) {
  TEST_METADATA_STR = meteorEnv.TEST_METADATA;
} else {
  TEST_METADATA_STR = process.env.TEST_METADATA;
}

var TEST_METADATA = JSON.parse(TEST_METADATA_STR || "{}");
var testDriverPackageName = TEST_METADATA.driverPackage;

// Note that if we are in test-packages mode neither of these will be set,
// but we will have a test driver package
Meteor.isTest = !!TEST_METADATA.isTest;
Meteor.isAppTest = !!TEST_METADATA.isAppTest;
Meteor.isPackageTest = !!testDriverPackageName && !Meteor.isTest && !Meteor.isAppTest; 

if (typeof testDriverPackageName === "string") {
  Meteor.startup(function() {
    var testDriverPackage = Package[testDriverPackageName];
    if (! testDriverPackage) {
      throw new Error("Can't find test driver package: " + testDriverPackageName);
    }

    // On the client, the test driver *must* define `runTests`
    if (Meteor.isClient) {
      if (typeof testDriverPackage.runTests !== "function") {
        throw new Error("Test driver package " + testDriverPackageName
          + " missing `runTests` export");
      }
      testDriverPackage.runTests();
    } else {
      // The server can optionally define `start`
      if (typeof testDriverPackage.start === "function") {
        testDriverPackage.start();
      }
    }
  });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/dynamics_nodejs.js                                                                              //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
// Fiber-aware implementation of dynamic scoping, for use on the server

var Fiber = Npm.require('fibers');

var nextSlot = 0;

Meteor._nodeCodeMustBeInFiber = function () {
  if (!Fiber.current) {
    throw new Error("Meteor code must always run within a Fiber. " +
                    "Try wrapping callbacks that you pass to non-Meteor " +
                    "libraries with Meteor.bindEnvironment.");
  }
};

Meteor.EnvironmentVariable = function () {
  this.slot = nextSlot++;
};

_.extend(Meteor.EnvironmentVariable.prototype, {
  get: function () {
    Meteor._nodeCodeMustBeInFiber();

    return Fiber.current._meteor_dynamics &&
      Fiber.current._meteor_dynamics[this.slot];
  },

  // Most Meteor code ought to run inside a fiber, and the
  // _nodeCodeMustBeInFiber assertion helps you remember to include appropriate
  // bindEnvironment calls (which will get you the *right value* for your
  // environment variables, on the server).
  //
  // In some very special cases, it's more important to run Meteor code on the
  // server in non-Fiber contexts rather than to strongly enforce the safeguard
  // against forgetting to use bindEnvironment. For example, using `check` in
  // some top-level constructs like connect handlers without needing unnecessary
  // Fibers on every request is more important that possibly failing to find the
  // correct argumentChecker. So this function is just like get(), but it
  // returns null rather than throwing when called from outside a Fiber. (On the
  // client, it is identical to get().)
  getOrNullIfOutsideFiber: function () {
    if (!Fiber.current)
      return null;
    return this.get();
  },

  withValue: function (value, func) {
    Meteor._nodeCodeMustBeInFiber();

    if (!Fiber.current._meteor_dynamics)
      Fiber.current._meteor_dynamics = [];
    var currentValues = Fiber.current._meteor_dynamics;

    var saved = currentValues[this.slot];
    try {
      currentValues[this.slot] = value;
      var ret = func();
    } finally {
      currentValues[this.slot] = saved;
    }

    return ret;
  }
});

// Meteor application code is always supposed to be run inside a
// fiber. bindEnvironment ensures that the function it wraps is run from
// inside a fiber and ensures it sees the values of Meteor environment
// variables that are set at the time bindEnvironment is called.
//
// If an environment-bound function is called from outside a fiber (eg, from
// an asynchronous callback from a non-Meteor library such as MongoDB), it'll
// kick off a new fiber to execute the function, and returns undefined as soon
// as that fiber returns or yields (and func's return value is ignored).
//
// If it's called inside a fiber, it works normally (the
// return value of the function will be passed through, and no new
// fiber will be created.)
//
// `onException` should be a function or a string.  When it is a
// function, it is called as a callback when the bound function raises
// an exception.  If it is a string, it should be a description of the
// callback, and when an exception is raised a debug message will be
// printed with the description.
Meteor.bindEnvironment = function (func, onException, _this) {
  Meteor._nodeCodeMustBeInFiber();

  var boundValues = _.clone(Fiber.current._meteor_dynamics || []);

  if (!onException || typeof(onException) === 'string') {
    var description = onException || "callback of async function";
    onException = function (error) {
      Meteor._debug(
        "Exception in " + description + ":",
        error && error.stack || error
      );
    };
  } else if (typeof(onException) !== 'function') {
    throw new Error('onException argument must be a function, string or undefined for Meteor.bindEnvironment().');
  }

  return function (/* arguments */) {
    var args = _.toArray(arguments);

    var runWithEnvironment = function () {
      var savedValues = Fiber.current._meteor_dynamics;
      try {
        // Need to clone boundValues in case two fibers invoke this
        // function at the same time
        Fiber.current._meteor_dynamics = _.clone(boundValues);
        var ret = func.apply(_this, args);
      } catch (e) {
        // note: callback-hook currently relies on the fact that if onException
        // throws and you were originally calling the wrapped callback from
        // within a Fiber, the wrapped call throws.
        onException(e);
      } finally {
        Fiber.current._meteor_dynamics = savedValues;
      }
      return ret;
    };

    if (Fiber.current)
      return runWithEnvironment();
    Fiber(runWithEnvironment).run();
  };
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/url_server.js                                                                                   //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
if (process.env.ROOT_URL &&
    typeof __meteor_runtime_config__ === "object") {
  __meteor_runtime_config__.ROOT_URL = process.env.ROOT_URL;
  if (__meteor_runtime_config__.ROOT_URL) {
    var parsedUrl = Npm.require('url').parse(__meteor_runtime_config__.ROOT_URL);
    // Sometimes users try to pass, eg, ROOT_URL=mydomain.com.
    if (!parsedUrl.host) {
      throw Error("$ROOT_URL, if specified, must be an URL");
    }
    var pathPrefix = parsedUrl.pathname;
    if (pathPrefix.slice(-1) === '/') {
      // remove trailing slash (or turn "/" into "")
      pathPrefix = pathPrefix.slice(0, -1);
    }
    __meteor_runtime_config__.ROOT_URL_PATH_PREFIX = pathPrefix;
  } else {
    __meteor_runtime_config__.ROOT_URL_PATH_PREFIX = "";
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/url_common.js                                                                                   //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
/**
 * @summary Generate an absolute URL pointing to the application. The server reads from the `ROOT_URL` environment variable to determine where it is running. This is taken care of automatically for apps deployed to Galaxy, but must be provided when using `meteor build`.
 * @locus Anywhere
 * @param {String} [path] A path to append to the root URL. Do not include a leading "`/`".
 * @param {Object} [options]
 * @param {Boolean} options.secure Create an HTTPS URL.
 * @param {Boolean} options.replaceLocalhost Replace localhost with 127.0.0.1. Useful for services that don't recognize localhost as a domain name.
 * @param {String} options.rootUrl Override the default ROOT_URL from the server environment. For example: "`http://foo.example.com`"
 */
Meteor.absoluteUrl = function (path, options) {
  // path is optional
  if (!options && typeof path === 'object') {
    options = path;
    path = undefined;
  }
  // merge options with defaults
  options = _.extend({}, Meteor.absoluteUrl.defaultOptions, options || {});

  var url = options.rootUrl;
  if (!url)
    throw new Error("Must pass options.rootUrl or set ROOT_URL in the server environment");

  if (!/^http[s]?:\/\//i.test(url)) // url starts with 'http://' or 'https://'
    url = 'http://' + url; // we will later fix to https if options.secure is set

  if (!/\/$/.test(url)) // url ends with '/'
    url += '/';

  if (path)
    url += path;

  // turn http to https if secure option is set, and we're not talking
  // to localhost.
  if (options.secure &&
      /^http:/.test(url) && // url starts with 'http:'
      !/http:\/\/localhost[:\/]/.test(url) && // doesn't match localhost
      !/http:\/\/127\.0\.0\.1[:\/]/.test(url)) // or 127.0.0.1
    url = url.replace(/^http:/, 'https:');

  if (options.replaceLocalhost)
    url = url.replace(/^http:\/\/localhost([:\/].*)/, 'http://127.0.0.1$1');

  return url;
};

// allow later packages to override default options
Meteor.absoluteUrl.defaultOptions = { };
if (typeof __meteor_runtime_config__ === "object" &&
    __meteor_runtime_config__.ROOT_URL)
  Meteor.absoluteUrl.defaultOptions.rootUrl = __meteor_runtime_config__.ROOT_URL;


Meteor._relativeToSiteRootUrl = function (link) {
  if (typeof __meteor_runtime_config__ === "object" &&
      link.substr(0, 1) === "/")
    link = (__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || "") + link;
  return link;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/meteor/flush-buffers-on-exit-in-windows.js                                                             //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
if (process.platform === "win32") {
  /*
   * Based on https://github.com/cowboy/node-exit
   *
   * Copyright (c) 2013 "Cowboy" Ben Alman
   * Licensed under the MIT license.
   */
  var origProcessExit = process.exit.bind(process);
  process.exit = function (exitCode) {
    var streams = [process.stdout, process.stderr];
    var drainCount = 0;
    // Actually exit if all streams are drained.
    function tryToExit() {
      if (drainCount === streams.length) {
        origProcessExit(exitCode);
      }
    }
    streams.forEach(function(stream) {
      // Count drained streams now, but monitor non-drained streams.
      if (stream.bufferSize === 0) {
        drainCount++;
      } else {
        stream.write('', 'utf-8', function() {
          drainCount++;
          tryToExit();
        });
      }
      // Prevent further writing.
      stream.write = function() {};
    });
    // If all streams were already drained, exit now.
    tryToExit();
    // In Windows, when run as a Node.js child process, a script utilizing
    // this library might just exit with a 0 exit code, regardless. This code,
    // despite the fact that it looks a bit crazy, appears to fix that.
    process.on('exit', function() {
      origProcessExit(exitCode);
    });
  };
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.meteor = {}, {
  Meteor: Meteor,
  global: global,
  meteorEnv: meteorEnv
});

})();



//# sourceURL=meteor://💻app/packages/meteor.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWV0ZW9yL2dsb2JhbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWV0ZW9yL3NlcnZlcl9lbnZpcm9ubWVudC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWV0ZW9yL2hlbHBlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21ldGVvci9zZXRpbW1lZGlhdGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21ldGVvci90aW1lcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21ldGVvci9lcnJvcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21ldGVvci9maWJlcl9oZWxwZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZXRlb3Ivc3RhcnR1cF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21ldGVvci9kZWJ1Zy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWV0ZW9yL3N0cmluZ191dGlscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWV0ZW9yL3Rlc3RfZW52aXJvbm1lbnQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21ldGVvci9keW5hbWljc19ub2RlanMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21ldGVvci91cmxfc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tZXRlb3IvdXJsX2NvbW1vbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWV0ZW9yL2ZsdXNoLWJ1ZmZlcnMtb24tZXhpdC1pbi13aW5kb3dzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9tZXRlb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJnbG9iYWwgPSB0aGlzO1xuIiwibWV0ZW9yRW52ID0ge1xuICBOT0RFX0VOVjogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgXCJwcm9kdWN0aW9uXCIsXG4gIFRFU1RfTUVUQURBVEE6IHByb2Nlc3MuZW52LlRFU1RfTUVUQURBVEEgfHwgXCJ7fVwiXG59O1xuXG5pZiAodHlwZW9mIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPT09IFwib2JqZWN0XCIpIHtcbiAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5tZXRlb3JFbnYgPSBtZXRlb3JFbnY7XG59XG5cbk1ldGVvciA9IHtcbiAgaXNQcm9kdWN0aW9uOiBtZXRlb3JFbnYuTk9ERV9FTlYgPT09IFwicHJvZHVjdGlvblwiLFxuICBpc0RldmVsb3BtZW50OiBtZXRlb3JFbnYuTk9ERV9FTlYgIT09IFwicHJvZHVjdGlvblwiLFxuICBpc0NsaWVudDogZmFsc2UsXG4gIGlzU2VydmVyOiB0cnVlLFxuICBpc0NvcmRvdmE6IGZhbHNlXG59O1xuXG5NZXRlb3Iuc2V0dGluZ3MgPSB7fTtcblxuaWYgKHByb2Nlc3MuZW52Lk1FVEVPUl9TRVRUSU5HUykge1xuICB0cnkge1xuICAgIE1ldGVvci5zZXR0aW5ncyA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuTUVURU9SX1NFVFRJTkdTKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1FVEVPUl9TRVRUSU5HUyBhcmUgbm90IHZhbGlkIEpTT046IFwiICsgcHJvY2Vzcy5lbnYuTUVURU9SX1NFVFRJTkdTKTtcbiAgfVxufVxuXG4vLyBNYWtlIHN1cmUgdGhhdCB0aGVyZSBpcyBhbHdheXMgYSBwdWJsaWMgYXR0cmlidXRlXG4vLyB0byBlbmFibGUgTWV0ZW9yLnNldHRpbmdzLnB1YmxpYyBvbiBjbGllbnRcbmlmICghIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMpIHtcbiAgICBNZXRlb3Iuc2V0dGluZ3MucHVibGljID0ge307XG59XG5cbi8vIFB1c2ggYSBzdWJzZXQgb2Ygc2V0dGluZ3MgdG8gdGhlIGNsaWVudC4gIE5vdGUgdGhhdCB0aGUgd2F5IHRoaXNcbi8vIGNvZGUgaXMgd3JpdHRlbiwgaWYgdGhlIGFwcCBtdXRhdGVzIGBNZXRlb3Iuc2V0dGluZ3MucHVibGljYCBvbiB0aGVcbi8vIHNlcnZlciwgaXQgYWxzbyBtdXRhdGVzXG4vLyBgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5QVUJMSUNfU0VUVElOR1NgLCBhbmQgdGhlIG1vZGlmaWVkXG4vLyBzZXR0aW5ncyB3aWxsIGJlIHNlbnQgdG8gdGhlIGNsaWVudC5cbmlmICh0eXBlb2YgX19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9PT0gXCJvYmplY3RcIikge1xuICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlBVQkxJQ19TRVRUSU5HUyA9IE1ldGVvci5zZXR0aW5ncy5wdWJsaWM7XG59XG4iLCJpZiAoTWV0ZW9yLmlzU2VydmVyKVxuICB2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuaWYgKHR5cGVvZiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fID09PSAnb2JqZWN0JyAmJlxuICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18ubWV0ZW9yUmVsZWFzZSkge1xuICAvKipcbiAgICogQHN1bW1hcnkgYE1ldGVvci5yZWxlYXNlYCBpcyBhIHN0cmluZyBjb250YWluaW5nIHRoZSBuYW1lIG9mIHRoZSBbcmVsZWFzZV0oI21ldGVvcnVwZGF0ZSkgd2l0aCB3aGljaCB0aGUgcHJvamVjdCB3YXMgYnVpbHQgKGZvciBleGFtcGxlLCBgXCIxLjIuM1wiYCkuIEl0IGlzIGB1bmRlZmluZWRgIGlmIHRoZSBwcm9qZWN0IHdhcyBidWlsdCB1c2luZyBhIGdpdCBjaGVja291dCBvZiBNZXRlb3IuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cbiAgTWV0ZW9yLnJlbGVhc2UgPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLm1ldGVvclJlbGVhc2U7XG59XG5cbi8vIFhYWCBmaW5kIGEgYmV0dGVyIGhvbWUgZm9yIHRoZXNlPyBJZGVhbGx5IHRoZXkgd291bGQgYmUgXy5nZXQsXG4vLyBfLmVuc3VyZSwgXy5kZWxldGUuLlxuXG5fLmV4dGVuZChNZXRlb3IsIHtcbiAgLy8gX2dldChhLGIsYyxkKSByZXR1cm5zIGFbYl1bY11bZF0sIG9yIGVsc2UgdW5kZWZpbmVkIGlmIGFbYl0gb3JcbiAgLy8gYVtiXVtjXSBkb2Vzbid0IGV4aXN0LlxuICAvL1xuICBfZ2V0OiBmdW5jdGlvbiAob2JqIC8qLCBhcmd1bWVudHMgKi8pIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCEoYXJndW1lbnRzW2ldIGluIG9iaikpXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICBvYmogPSBvYmpbYXJndW1lbnRzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfSxcblxuICAvLyBfZW5zdXJlKGEsYixjLGQpIGVuc3VyZXMgdGhhdCBhW2JdW2NdW2RdIGV4aXN0cy4gSWYgaXQgZG9lcyBub3QsXG4gIC8vIGl0IGlzIGNyZWF0ZWQgYW5kIHNldCB0byB7fS4gRWl0aGVyIHdheSwgaXQgaXMgcmV0dXJuZWQuXG4gIC8vXG4gIF9lbnN1cmU6IGZ1bmN0aW9uIChvYmogLyosIGFyZ3VtZW50cyAqLykge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0gYXJndW1lbnRzW2ldO1xuICAgICAgaWYgKCEoa2V5IGluIG9iaikpXG4gICAgICAgIG9ialtrZXldID0ge307XG4gICAgICBvYmogPSBvYmpba2V5XTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9LFxuXG4gIC8vIF9kZWxldGUoYSwgYiwgYywgZCkgZGVsZXRlcyBhW2JdW2NdW2RdLCB0aGVuIGFbYl1bY10gdW5sZXNzIGl0XG4gIC8vIGlzbid0IGVtcHR5LCB0aGVuIGFbYl0gdW5sZXNzIGl0IGlzbid0IGVtcHR5LlxuICAvL1xuICBfZGVsZXRlOiBmdW5jdGlvbiAob2JqIC8qLCBhcmd1bWVudHMgKi8pIHtcbiAgICB2YXIgc3RhY2sgPSBbb2JqXTtcbiAgICB2YXIgbGVhZiA9IHRydWU7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0gYXJndW1lbnRzW2ldO1xuICAgICAgaWYgKCEoa2V5IGluIG9iaikpIHtcbiAgICAgICAgbGVhZiA9IGZhbHNlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIG9iaiA9IG9ialtrZXldO1xuICAgICAgaWYgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpXG4gICAgICAgIGJyZWFrO1xuICAgICAgc3RhY2sucHVzaChvYmopO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSBzdGFjay5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGtleSA9IGFyZ3VtZW50c1tpKzFdO1xuXG4gICAgICBpZiAobGVhZilcbiAgICAgICAgbGVhZiA9IGZhbHNlO1xuICAgICAgZWxzZVxuICAgICAgICBmb3IgKHZhciBvdGhlciBpbiBzdGFja1tpXVtrZXldKVxuICAgICAgICAgIHJldHVybjsgLy8gbm90IGVtcHR5IC0tIHdlJ3JlIGRvbmVcblxuICAgICAgZGVsZXRlIHN0YWNrW2ldW2tleV07XG4gICAgfVxuICB9LFxuXG4gIC8vIHdyYXBBc3luYyBjYW4gd3JhcCBhbnkgZnVuY3Rpb24gdGhhdCB0YWtlcyBzb21lIG51bWJlciBvZiBhcmd1bWVudHMgdGhhdFxuICAvLyBjYW4ndCBiZSB1bmRlZmluZWQsIGZvbGxvd2VkIGJ5IHNvbWUgb3B0aW9uYWwgYXJndW1lbnRzLCB3aGVyZSB0aGUgY2FsbGJhY2tcbiAgLy8gaXMgdGhlIGxhc3Qgb3B0aW9uYWwgYXJndW1lbnQuXG4gIC8vIGUuZy4gZnMucmVhZEZpbGUocGF0aG5hbWUsIFtjYWxsYmFja10pLFxuICAvLyBmcy5vcGVuKHBhdGhuYW1lLCBmbGFncywgW21vZGVdLCBbY2FsbGJhY2tdKVxuICAvLyBGb3IgbWF4aW11bSBlZmZlY3RpdmVuZXNzIGFuZCBsZWFzdCBjb25mdXNpb24sIHdyYXBBc3luYyBzaG91bGQgYmUgdXNlZCBvblxuICAvLyBmdW5jdGlvbnMgd2hlcmUgdGhlIGNhbGxiYWNrIGlzIHRoZSBvbmx5IGFyZ3VtZW50IG9mIHR5cGUgRnVuY3Rpb24uXG5cbiAgLyoqXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQHN1bW1hcnkgV3JhcCBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBjYWxsYmFjayBmdW5jdGlvbiBhcyBpdHMgZmluYWwgcGFyYW1ldGVyLiBUaGUgc2lnbmF0dXJlIG9mIHRoZSBjYWxsYmFjayBvZiB0aGUgd3JhcHBlZCBmdW5jdGlvbiBzaG91bGQgYmUgYGZ1bmN0aW9uKGVycm9yLCByZXN1bHQpe31gLiBPbiB0aGUgc2VydmVyLCB0aGUgd3JhcHBlZCBmdW5jdGlvbiBjYW4gYmUgdXNlZCBlaXRoZXIgc3luY2hyb25vdXNseSAod2l0aG91dCBwYXNzaW5nIGEgY2FsbGJhY2spIG9yIGFzeW5jaHJvbm91c2x5ICh3aGVuIGEgY2FsbGJhY2sgaXMgcGFzc2VkKS4gT24gdGhlIGNsaWVudCwgYSBjYWxsYmFjayBpcyBhbHdheXMgcmVxdWlyZWQ7IGVycm9ycyB3aWxsIGJlIGxvZ2dlZCBpZiB0aGVyZSBpcyBubyBjYWxsYmFjay4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCwgdGhlIGVudmlyb25tZW50IGNhcHR1cmVkIHdoZW4gdGhlIG9yaWdpbmFsIGZ1bmN0aW9uIHdhcyBjYWxsZWQgd2lsbCBiZSByZXN0b3JlZCBpbiB0aGUgY2FsbGJhY2suXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIGNhbGxiYWNrIGFzIGl0cyBmaW5hbCBwYXJhbWV0ZXJcbiAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XSBPcHRpb25hbCBgdGhpc2Agb2JqZWN0IGFnYWluc3Qgd2hpY2ggdGhlIG9yaWdpbmFsIGZ1bmN0aW9uIHdpbGwgYmUgaW52b2tlZFxuICAgKi9cbiAgd3JhcEFzeW5jOiBmdW5jdGlvbiAoZm4sIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKC8qIGFyZ3VtZW50cyAqLykge1xuICAgICAgdmFyIHNlbGYgPSBjb250ZXh0IHx8IHRoaXM7XG4gICAgICB2YXIgbmV3QXJncyA9IF8udG9BcnJheShhcmd1bWVudHMpO1xuICAgICAgdmFyIGNhbGxiYWNrO1xuXG4gICAgICBmb3IgKHZhciBpID0gbmV3QXJncy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICB2YXIgYXJnID0gbmV3QXJnc1tpXTtcbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgYXJnO1xuICAgICAgICBpZiAodHlwZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgIGlmICh0eXBlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gYXJnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoISBjYWxsYmFjaykge1xuICAgICAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICAgICAgY2FsbGJhY2sgPSBsb2dFcnI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGZ1dCA9IG5ldyBGdXR1cmUoKTtcbiAgICAgICAgICBjYWxsYmFjayA9IGZ1dC5yZXNvbHZlcigpO1xuICAgICAgICB9XG4gICAgICAgICsraTsgLy8gSW5zZXJ0IHRoZSBjYWxsYmFjayBqdXN0IGFmdGVyIGFyZy5cbiAgICAgIH1cblxuICAgICAgbmV3QXJnc1tpXSA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2spO1xuICAgICAgdmFyIHJlc3VsdCA9IGZuLmFwcGx5KHNlbGYsIG5ld0FyZ3MpO1xuICAgICAgcmV0dXJuIGZ1dCA/IGZ1dC53YWl0KCkgOiByZXN1bHQ7XG4gICAgfTtcbiAgfSxcblxuICAvLyBTZXRzIGNoaWxkJ3MgcHJvdG90eXBlIHRvIGEgbmV3IG9iamVjdCB3aG9zZSBwcm90b3R5cGUgaXMgcGFyZW50J3NcbiAgLy8gcHJvdG90eXBlLiBVc2VkIGFzOlxuICAvLyAgIE1ldGVvci5faW5oZXJpdHMoQ2xhc3NCLCBDbGFzc0EpLlxuICAvLyAgIF8uZXh0ZW5kKENsYXNzQi5wcm90b3R5cGUsIHsgLi4uIH0pXG4gIC8vIEluc3BpcmVkIGJ5IENvZmZlZVNjcmlwdCdzIGBleHRlbmRgIGFuZCBHb29nbGUgQ2xvc3VyZSdzIGBnb29nLmluaGVyaXRzYC5cbiAgX2luaGVyaXRzOiBmdW5jdGlvbiAoQ2hpbGQsIFBhcmVudCkge1xuICAgIC8vIGNvcHkgUGFyZW50IHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgZm9yICh2YXIga2V5IGluIFBhcmVudCkge1xuICAgICAgLy8gbWFrZSBzdXJlIHdlIG9ubHkgY29weSBoYXNPd25Qcm9wZXJ0eSBwcm9wZXJ0aWVzIHZzLiBwcm90b3R5cGVcbiAgICAgIC8vIHByb3BlcnRpZXNcbiAgICAgIGlmIChfLmhhcyhQYXJlbnQsIGtleSkpXG4gICAgICAgIENoaWxkW2tleV0gPSBQYXJlbnRba2V5XTtcbiAgICB9XG5cbiAgICAvLyBhIG1pZGRsZSBtZW1iZXIgb2YgcHJvdG90eXBlIGNoYWluOiB0YWtlcyB0aGUgcHJvdG90eXBlIGZyb20gdGhlIFBhcmVudFxuICAgIHZhciBNaWRkbGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLmNvbnN0cnVjdG9yID0gQ2hpbGQ7XG4gICAgfTtcbiAgICBNaWRkbGUucHJvdG90eXBlID0gUGFyZW50LnByb3RvdHlwZTtcbiAgICBDaGlsZC5wcm90b3R5cGUgPSBuZXcgTWlkZGxlKCk7XG4gICAgQ2hpbGQuX19zdXBlcl9fID0gUGFyZW50LnByb3RvdHlwZTtcbiAgICByZXR1cm4gQ2hpbGQ7XG4gIH1cbn0pO1xuXG52YXIgd2FybmVkQWJvdXRXcmFwQXN5bmMgPSBmYWxzZTtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuM1xuICovXG5NZXRlb3IuX3dyYXBBc3luYyA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gIGlmICghIHdhcm5lZEFib3V0V3JhcEFzeW5jKSB7XG4gICAgTWV0ZW9yLl9kZWJ1ZyhcIk1ldGVvci5fd3JhcEFzeW5jIGhhcyBiZWVuIHJlbmFtZWQgdG8gTWV0ZW9yLndyYXBBc3luY1wiKTtcbiAgICB3YXJuZWRBYm91dFdyYXBBc3luYyA9IHRydWU7XG4gIH1cbiAgcmV0dXJuIE1ldGVvci53cmFwQXN5bmMuYXBwbHkoTWV0ZW9yLCBhcmd1bWVudHMpO1xufTtcblxuZnVuY3Rpb24gbG9nRXJyKGVycikge1xuICBpZiAoZXJyKSB7XG4gICAgcmV0dXJuIE1ldGVvci5fZGVidWcoXG4gICAgICBcIkV4Y2VwdGlvbiBpbiBjYWxsYmFjayBvZiBhc3luYyBmdW5jdGlvblwiLFxuICAgICAgZXJyLnN0YWNrID8gZXJyLnN0YWNrIDogZXJyXG4gICAgKTtcbiAgfVxufVxuIiwiLy8gQ2hvb3NlcyBvbmUgb2YgdGhyZWUgc2V0SW1tZWRpYXRlIGltcGxlbWVudGF0aW9uczpcbi8vXG4vLyAqIE5hdGl2ZSBzZXRJbW1lZGlhdGUgKElFIDEwLCBOb2RlIDAuOSspXG4vL1xuLy8gKiBwb3N0TWVzc2FnZSAobWFueSBicm93c2Vycylcbi8vXG4vLyAqIHNldFRpbWVvdXQgIChmYWxsYmFjaylcbi8vXG4vLyBUaGUgcG9zdE1lc3NhZ2UgaW1wbGVtZW50YXRpb24gaXMgYmFzZWQgb25cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9Ob2JsZUpTL3NldEltbWVkaWF0ZS90cmVlLzEuMC4xXG4vL1xuLy8gRG9uJ3QgdXNlIGBuZXh0VGlja2AgZm9yIE5vZGUgc2luY2UgaXQgcnVucyBpdHMgY2FsbGJhY2tzIGJlZm9yZVxuLy8gSS9PLCB3aGljaCBpcyBzdHJpY3RlciB0aGFuIHdlJ3JlIGxvb2tpbmcgZm9yLlxuLy9cbi8vIE5vdCBpbnN0YWxsZWQgYXMgYSBwb2x5ZmlsbCwgYXMgb3VyIHB1YmxpYyBBUEkgaXMgYE1ldGVvci5kZWZlcmAuXG4vLyBTaW5jZSB3ZSdyZSBub3QgdHJ5aW5nIHRvIGJlIGEgcG9seWZpbGwsIHdlIGhhdmUgc29tZVxuLy8gc2ltcGxpZmljYXRpb25zOlxuLy9cbi8vIElmIG9uZSBpbnZvY2F0aW9uIG9mIGEgc2V0SW1tZWRpYXRlIGNhbGxiYWNrIHBhdXNlcyBpdHNlbGYgYnkgYVxuLy8gY2FsbCB0byBhbGVydC9wcm9tcHQvc2hvd01vZGVsRGlhbG9nLCB0aGUgTm9ibGVKUyBwb2x5ZmlsbFxuLy8gaW1wbGVtZW50YXRpb24gZW5zdXJlZCB0aGF0IG5vIHNldEltbWVkYXRlIGNhbGxiYWNrIHdvdWxkIHJ1biB1bnRpbFxuLy8gdGhlIGZpcnN0IGludm9jYXRpb24gY29tcGxldGVkLiAgV2hpbGUgY29ycmVjdCBwZXIgdGhlIHNwZWMsIHdoYXQgaXRcbi8vIHdvdWxkIG1lYW4gZm9yIHVzIGluIHByYWN0aWNlIGlzIHRoYXQgYW55IHJlYWN0aXZlIHVwZGF0ZXMgcmVseWluZ1xuLy8gb24gTWV0ZW9yLmRlZmVyIHdvdWxkIGJlIGh1bmcgaW4gdGhlIG1haW4gd2luZG93IHVudGlsIHRoZSBtb2RhbFxuLy8gZGlhbG9nIHdhcyBkaXNtaXNzZWQuICBUaHVzIHdlIG9ubHkgZW5zdXJlIHRoYXQgYSBzZXRJbW1lZGlhdGVcbi8vIGZ1bmN0aW9uIGlzIGNhbGxlZCBpbiBhIGxhdGVyIGV2ZW50IGxvb3AuXG4vL1xuLy8gV2UgZG9uJ3QgbmVlZCB0byBzdXBwb3J0IHVzaW5nIGEgc3RyaW5nIHRvIGJlIGV2YWwnZWQgZm9yIHRoZVxuLy8gY2FsbGJhY2ssIGFyZ3VtZW50cyB0byB0aGUgZnVuY3Rpb24sIG9yIGNsZWFySW1tZWRpYXRlLlxuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIGdsb2JhbCA9IHRoaXM7XG5cblxuLy8gSUUgMTAsIE5vZGUgPj0gOS4xXG5cbmZ1bmN0aW9uIHVzZVNldEltbWVkaWF0ZSgpIHtcbiAgaWYgKCEgZ2xvYmFsLnNldEltbWVkaWF0ZSlcbiAgICByZXR1cm4gbnVsbDtcbiAgZWxzZSB7XG4gICAgdmFyIHNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgZ2xvYmFsLnNldEltbWVkaWF0ZShmbik7XG4gICAgfTtcbiAgICBzZXRJbW1lZGlhdGUuaW1wbGVtZW50YXRpb24gPSAnc2V0SW1tZWRpYXRlJztcbiAgICByZXR1cm4gc2V0SW1tZWRpYXRlO1xuICB9XG59XG5cblxuLy8gQW5kcm9pZCAyLjMuNiwgQ2hyb21lIDI2LCBGaXJlZm94IDIwLCBJRSA4LTksIGlPUyA1LjEuMSBTYWZhcmlcblxuZnVuY3Rpb24gdXNlUG9zdE1lc3NhZ2UoKSB7XG4gIC8vIFRoZSB0ZXN0IGFnYWluc3QgYGltcG9ydFNjcmlwdHNgIHByZXZlbnRzIHRoaXMgaW1wbGVtZW50YXRpb25cbiAgLy8gZnJvbSBiZWluZyBpbnN0YWxsZWQgaW5zaWRlIGEgd2ViIHdvcmtlciwgd2hlcmVcbiAgLy8gYGdsb2JhbC5wb3N0TWVzc2FnZWAgbWVhbnMgc29tZXRoaW5nIGNvbXBsZXRlbHkgZGlmZmVyZW50IGFuZFxuICAvLyBjYW4ndCBiZSB1c2VkIGZvciB0aGlzIHB1cnBvc2UuXG5cbiAgaWYgKCFnbG9iYWwucG9zdE1lc3NhZ2UgfHwgZ2xvYmFsLmltcG9ydFNjcmlwdHMpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEF2b2lkIHN5bmNocm9ub3VzIHBvc3QgbWVzc2FnZSBpbXBsZW1lbnRhdGlvbnMuXG5cbiAgdmFyIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXMgPSB0cnVlO1xuICB2YXIgb2xkT25NZXNzYWdlID0gZ2xvYmFsLm9ubWVzc2FnZTtcbiAgZ2xvYmFsLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXMgPSBmYWxzZTtcbiAgfTtcbiAgZ2xvYmFsLnBvc3RNZXNzYWdlKFwiXCIsIFwiKlwiKTtcbiAgZ2xvYmFsLm9ubWVzc2FnZSA9IG9sZE9uTWVzc2FnZTtcblxuICBpZiAoISBwb3N0TWVzc2FnZUlzQXN5bmNocm9ub3VzKVxuICAgIHJldHVybiBudWxsO1xuXG4gIHZhciBmdW5jSW5kZXggPSAwO1xuICB2YXIgZnVuY3MgPSB7fTtcblxuICAvLyBJbnN0YWxscyBhbiBldmVudCBoYW5kbGVyIG9uIGBnbG9iYWxgIGZvciB0aGUgYG1lc3NhZ2VgIGV2ZW50OiBzZWVcbiAgLy8gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9ET00vd2luZG93LnBvc3RNZXNzYWdlXG4gIC8vICogaHR0cDovL3d3dy53aGF0d2cub3JnL3NwZWNzL3dlYi1hcHBzL2N1cnJlbnQtd29yay9tdWx0aXBhZ2UvY29tbXMuaHRtbCNjcm9zc0RvY3VtZW50TWVzc2FnZXNcblxuICAvLyBYWFggdXNlIFJhbmRvbS5pZCgpIGhlcmU/XG4gIHZhciBNRVNTQUdFX1BSRUZJWCA9IFwiTWV0ZW9yLl9zZXRJbW1lZGlhdGUuXCIgKyBNYXRoLnJhbmRvbSgpICsgJy4nO1xuXG4gIGZ1bmN0aW9uIGlzU3RyaW5nQW5kU3RhcnRzV2l0aChzdHJpbmcsIHB1dGF0aXZlU3RhcnQpIHtcbiAgICByZXR1cm4gKHR5cGVvZiBzdHJpbmcgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgICAgIHN0cmluZy5zdWJzdHJpbmcoMCwgcHV0YXRpdmVTdGFydC5sZW5ndGgpID09PSBwdXRhdGl2ZVN0YXJ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uR2xvYmFsTWVzc2FnZShldmVudCkge1xuICAgIC8vIFRoaXMgd2lsbCBjYXRjaCBhbGwgaW5jb21pbmcgbWVzc2FnZXMgKGV2ZW4gZnJvbSBvdGhlclxuICAgIC8vIHdpbmRvd3MhKSwgc28gd2UgbmVlZCB0byB0cnkgcmVhc29uYWJseSBoYXJkIHRvIGF2b2lkIGxldHRpbmdcbiAgICAvLyBhbnlvbmUgZWxzZSB0cmljayB1cyBpbnRvIGZpcmluZyBvZmYuIFdlIHRlc3QgdGhlIG9yaWdpbiBpc1xuICAgIC8vIHN0aWxsIHRoaXMgd2luZG93LCBhbmQgdGhhdCBhIChyYW5kb21seSBnZW5lcmF0ZWQpXG4gICAgLy8gdW5wcmVkaWN0YWJsZSBpZGVudGlmeWluZyBwcmVmaXggaXMgcHJlc2VudC5cbiAgICBpZiAoZXZlbnQuc291cmNlID09PSBnbG9iYWwgJiZcbiAgICAgICAgaXNTdHJpbmdBbmRTdGFydHNXaXRoKGV2ZW50LmRhdGEsIE1FU1NBR0VfUFJFRklYKSkge1xuICAgICAgdmFyIGluZGV4ID0gZXZlbnQuZGF0YS5zdWJzdHJpbmcoTUVTU0FHRV9QUkVGSVgubGVuZ3RoKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChmdW5jc1tpbmRleF0pXG4gICAgICAgICAgZnVuY3NbaW5kZXhdKCk7XG4gICAgICB9XG4gICAgICBmaW5hbGx5IHtcbiAgICAgICAgZGVsZXRlIGZ1bmNzW2luZGV4XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICBnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgb25HbG9iYWxNZXNzYWdlLCBmYWxzZSk7XG4gIH0gZWxzZSB7XG4gICAgZ2xvYmFsLmF0dGFjaEV2ZW50KFwib25tZXNzYWdlXCIsIG9uR2xvYmFsTWVzc2FnZSk7XG4gIH1cblxuICB2YXIgc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgLy8gTWFrZSBgZ2xvYmFsYCBwb3N0IGEgbWVzc2FnZSB0byBpdHNlbGYgd2l0aCB0aGUgaGFuZGxlIGFuZFxuICAgIC8vIGlkZW50aWZ5aW5nIHByZWZpeCwgdGh1cyBhc3luY2hyb25vdXNseSBpbnZva2luZyBvdXJcbiAgICAvLyBvbkdsb2JhbE1lc3NhZ2UgbGlzdGVuZXIgYWJvdmUuXG4gICAgKytmdW5jSW5kZXg7XG4gICAgZnVuY3NbZnVuY0luZGV4XSA9IGZuO1xuICAgIGdsb2JhbC5wb3N0TWVzc2FnZShNRVNTQUdFX1BSRUZJWCArIGZ1bmNJbmRleCwgXCIqXCIpO1xuICB9O1xuICBzZXRJbW1lZGlhdGUuaW1wbGVtZW50YXRpb24gPSAncG9zdE1lc3NhZ2UnO1xuICByZXR1cm4gc2V0SW1tZWRpYXRlO1xufVxuXG5cbmZ1bmN0aW9uIHVzZVRpbWVvdXQoKSB7XG4gIHZhciBzZXRJbW1lZGlhdGUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICBnbG9iYWwuc2V0VGltZW91dChmbiwgMCk7XG4gIH07XG4gIHNldEltbWVkaWF0ZS5pbXBsZW1lbnRhdGlvbiA9ICdzZXRUaW1lb3V0JztcbiAgcmV0dXJuIHNldEltbWVkaWF0ZTtcbn1cblxuXG5NZXRlb3IuX3NldEltbWVkaWF0ZSA9XG4gIHVzZVNldEltbWVkaWF0ZSgpIHx8XG4gIHVzZVBvc3RNZXNzYWdlKCkgfHxcbiAgdXNlVGltZW91dCgpO1xuIiwidmFyIHdpdGhvdXRJbnZvY2F0aW9uID0gZnVuY3Rpb24gKGYpIHtcbiAgaWYgKFBhY2thZ2UuZGRwKSB7XG4gICAgdmFyIF9DdXJyZW50SW52b2NhdGlvbiA9IFBhY2thZ2UuZGRwLkREUC5fQ3VycmVudEludm9jYXRpb247XG4gICAgaWYgKF9DdXJyZW50SW52b2NhdGlvbi5nZXQoKSAmJiBfQ3VycmVudEludm9jYXRpb24uZ2V0KCkuaXNTaW11bGF0aW9uKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgc2V0IHRpbWVycyBpbnNpZGUgc2ltdWxhdGlvbnNcIik7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHsgX0N1cnJlbnRJbnZvY2F0aW9uLndpdGhWYWx1ZShudWxsLCBmKTsgfTtcbiAgfVxuICBlbHNlXG4gICAgcmV0dXJuIGY7XG59O1xuXG52YXIgYmluZEFuZENhdGNoID0gZnVuY3Rpb24gKGNvbnRleHQsIGYpIHtcbiAgcmV0dXJuIE1ldGVvci5iaW5kRW52aXJvbm1lbnQod2l0aG91dEludm9jYXRpb24oZiksIGNvbnRleHQpO1xufTtcblxuXy5leHRlbmQoTWV0ZW9yLCB7XG4gIC8vIE1ldGVvci5zZXRUaW1lb3V0IGFuZCBNZXRlb3Iuc2V0SW50ZXJ2YWwgY2FsbGJhY2tzIHNjaGVkdWxlZFxuICAvLyBpbnNpZGUgYSBzZXJ2ZXIgbWV0aG9kIGFyZSBub3QgcGFydCBvZiB0aGUgbWV0aG9kIGludm9jYXRpb24gYW5kXG4gIC8vIHNob3VsZCBjbGVhciBvdXQgdGhlIEN1cnJlbnRJbnZvY2F0aW9uIGVudmlyb25tZW50IHZhcmlhYmxlLlxuXG4gIC8qKlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBzdW1tYXJ5IENhbGwgYSBmdW5jdGlvbiBpbiB0aGUgZnV0dXJlIGFmdGVyIHdhaXRpbmcgZm9yIGEgc3BlY2lmaWVkIGRlbGF5LlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gcnVuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheSBOdW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIHdhaXQgYmVmb3JlIGNhbGxpbmcgZnVuY3Rpb25cbiAgICovXG4gIHNldFRpbWVvdXQ6IGZ1bmN0aW9uIChmLCBkdXJhdGlvbikge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGJpbmRBbmRDYXRjaChcInNldFRpbWVvdXQgY2FsbGJhY2tcIiwgZiksIGR1cmF0aW9uKTtcbiAgfSxcblxuICAvKipcbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAc3VtbWFyeSBDYWxsIGEgZnVuY3Rpb24gcmVwZWF0ZWRseSwgd2l0aCBhIHRpbWUgZGVsYXkgYmV0d2VlbiBjYWxscy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHJ1blxuICAgKiBAcGFyYW0ge051bWJlcn0gZGVsYXkgTnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byB3YWl0IGJldHdlZW4gZWFjaCBmdW5jdGlvbiBjYWxsLlxuICAgKi9cbiAgc2V0SW50ZXJ2YWw6IGZ1bmN0aW9uIChmLCBkdXJhdGlvbikge1xuICAgIHJldHVybiBzZXRJbnRlcnZhbChiaW5kQW5kQ2F0Y2goXCJzZXRJbnRlcnZhbCBjYWxsYmFja1wiLCBmKSwgZHVyYXRpb24pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBzdW1tYXJ5IENhbmNlbCBhIHJlcGVhdGluZyBmdW5jdGlvbiBjYWxsIHNjaGVkdWxlZCBieSBgTWV0ZW9yLnNldEludGVydmFsYC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBUaGUgaGFuZGxlIHJldHVybmVkIGJ5IGBNZXRlb3Iuc2V0SW50ZXJ2YWxgXG4gICAqL1xuICBjbGVhckludGVydmFsOiBmdW5jdGlvbih4KSB7XG4gICAgcmV0dXJuIGNsZWFySW50ZXJ2YWwoeCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBtZW1iZXJPZiBNZXRlb3JcbiAgICogQHN1bW1hcnkgQ2FuY2VsIGEgZnVuY3Rpb24gY2FsbCBzY2hlZHVsZWQgYnkgYE1ldGVvci5zZXRUaW1lb3V0YC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBUaGUgaGFuZGxlIHJldHVybmVkIGJ5IGBNZXRlb3Iuc2V0VGltZW91dGBcbiAgICovXG4gIGNsZWFyVGltZW91dDogZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiBjbGVhclRpbWVvdXQoeCk7XG4gIH0sXG5cbiAgLy8gWFhYIGNvbnNpZGVyIG1ha2luZyB0aGlzIGd1YXJhbnRlZSBvcmRlcmluZyBvZiBkZWZlcidkIGNhbGxiYWNrcywgbGlrZVxuICAvLyBUcmFja2VyLmFmdGVyRmx1c2ggb3IgTm9kZSdzIG5leHRUaWNrIChpbiBwcmFjdGljZSkuIFRoZW4gdGVzdHMgY2FuIGRvOlxuICAvLyAgICBjYWxsU29tZXRoaW5nVGhhdERlZmVyc1NvbWVXb3JrKCk7XG4gIC8vICAgIE1ldGVvci5kZWZlcihleHBlY3Qoc29tZXRoaW5nVGhhdFZhbGlkYXRlc1RoYXRUaGVXb3JrSGFwcGVuZWQpKTtcblxuICAvKipcbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAc3VtbWFyeSBEZWZlciBleGVjdXRpb24gb2YgYSBmdW5jdGlvbiB0byBydW4gYXN5bmNocm9ub3VzbHkgaW4gdGhlIGJhY2tncm91bmQgKHNpbWlsYXIgdG8gYE1ldGVvci5zZXRUaW1lb3V0KGZ1bmMsIDApYC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHJ1blxuICAgKi9cbiAgZGVmZXI6IGZ1bmN0aW9uIChmKSB7XG4gICAgTWV0ZW9yLl9zZXRJbW1lZGlhdGUoYmluZEFuZENhdGNoKFwiZGVmZXIgY2FsbGJhY2tcIiwgZikpO1xuICB9XG59KTtcbiIsIi8vIE1ha2VzIGFuIGVycm9yIHN1YmNsYXNzIHdoaWNoIHByb3Blcmx5IGNvbnRhaW5zIGEgc3RhY2sgdHJhY2UgaW4gbW9zdFxuLy8gZW52aXJvbm1lbnRzLiBjb25zdHJ1Y3RvciBjYW4gc2V0IGZpZWxkcyBvbiBgdGhpc2AgKGFuZCBzaG91bGQgcHJvYmFibHkgc2V0XG4vLyBgbWVzc2FnZWAsIHdoaWNoIGlzIHdoYXQgZ2V0cyBkaXNwbGF5ZWQgYXQgdGhlIHRvcCBvZiBhIHN0YWNrIHRyYWNlKS5cbi8vXG5NZXRlb3IubWFrZUVycm9yVHlwZSA9IGZ1bmN0aW9uIChuYW1lLCBjb25zdHJ1Y3Rvcikge1xuICB2YXIgZXJyb3JDbGFzcyA9IGZ1bmN0aW9uICgvKmFyZ3VtZW50cyovKSB7XG4gICAgLy8gRW5zdXJlIHdlIGdldCBhIHByb3BlciBzdGFjayB0cmFjZSBpbiBtb3N0IEphdmFzY3JpcHQgZW52aXJvbm1lbnRzXG4gICAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgICAvLyBWOCBlbnZpcm9ubWVudHMgKENocm9tZSBhbmQgTm9kZS5qcylcbiAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIGVycm9yQ2xhc3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBCb3Jyb3cgdGhlIC5zdGFjayBwcm9wZXJ0eSBvZiBhIG5hdGl2ZSBFcnJvciBvYmplY3QuXG4gICAgICB0aGlzLnN0YWNrID0gbmV3IEVycm9yKCkuc3RhY2s7XG4gICAgfVxuICAgIC8vIFNhZmFyaSBtYWdpY2FsbHkgd29ya3MuXG5cbiAgICBjb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5lcnJvclR5cGUgPSBuYW1lO1xuICB9O1xuXG4gIE1ldGVvci5faW5oZXJpdHMoZXJyb3JDbGFzcywgRXJyb3IpO1xuXG4gIHJldHVybiBlcnJvckNsYXNzO1xufTtcblxuLy8gVGhpcyBzaG91bGQgcHJvYmFibHkgYmUgaW4gdGhlIGxpdmVkYXRhIHBhY2thZ2UsIGJ1dCB3ZSBkb24ndCB3YW50XG4vLyB0byByZXF1aXJlIHlvdSB0byB1c2UgdGhlIGxpdmVkYXRhIHBhY2thZ2UgdG8gZ2V0IGl0LiBFdmVudHVhbGx5IHdlXG4vLyBzaG91bGQgcHJvYmFibHkgcmVuYW1lIGl0IHRvIEREUC5FcnJvciBhbmQgcHV0IGl0IGJhY2sgaW4gdGhlXG4vLyAnbGl2ZWRhdGEnIHBhY2thZ2UgKHdoaWNoIHdlIHNob3VsZCByZW5hbWUgdG8gJ2RkcCcgYWxzby4pXG4vL1xuLy8gTm90ZTogVGhlIEREUCBzZXJ2ZXIgYXNzdW1lcyB0aGF0IE1ldGVvci5FcnJvciBFSlNPTi1zZXJpYWxpemVzIGFzIGFuIG9iamVjdFxuLy8gY29udGFpbmluZyAnZXJyb3InIGFuZCBvcHRpb25hbGx5ICdyZWFzb24nIGFuZCAnZGV0YWlscycuXG4vLyBUaGUgRERQIGNsaWVudCBtYW51YWxseSBwdXRzIHRoZXNlIGludG8gTWV0ZW9yLkVycm9yIG9iamVjdHMuIChXZSBkb24ndCB1c2Vcbi8vIEVKU09OLmFkZFR5cGUgaGVyZSBiZWNhdXNlIHRoZSB0eXBlIGlzIGRldGVybWluZWQgYnkgbG9jYXRpb24gaW4gdGhlXG4vLyBwcm90b2NvbCwgbm90IHRleHQgb24gdGhlIHdpcmUuKVxuXG4vKipcbiAqIEBzdW1tYXJ5IFRoaXMgY2xhc3MgcmVwcmVzZW50cyBhIHN5bWJvbGljIGVycm9yIHRocm93biBieSBhIG1ldGhvZC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzXG4gKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgQSBzdHJpbmcgY29kZSB1bmlxdWVseSBpZGVudGlmeWluZyB0aGlzIGtpbmQgb2YgZXJyb3IuXG4gKiBUaGlzIHN0cmluZyBzaG91bGQgYmUgdXNlZCBieSBjYWxsZXJzIG9mIHRoZSBtZXRob2QgdG8gZGV0ZXJtaW5lIHRoZVxuICogYXBwcm9wcmlhdGUgYWN0aW9uIHRvIHRha2UsIGluc3RlYWQgb2YgYXR0ZW1wdGluZyB0byBwYXJzZSB0aGUgcmVhc29uXG4gKiBvciBkZXRhaWxzIGZpZWxkcy4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiAvLyBvbiB0aGUgc2VydmVyLCBwaWNrIGEgY29kZSB1bmlxdWUgdG8gdGhpcyBlcnJvclxuICogLy8gdGhlIHJlYXNvbiBmaWVsZCBzaG91bGQgYmUgYSB1c2VmdWwgZGVidWcgbWVzc2FnZVxuICogdGhyb3cgbmV3IE1ldGVvci5FcnJvcihcImxvZ2dlZC1vdXRcIiwgXG4gKiAgIFwiVGhlIHVzZXIgbXVzdCBiZSBsb2dnZWQgaW4gdG8gcG9zdCBhIGNvbW1lbnQuXCIpO1xuICpcbiAqIC8vIG9uIHRoZSBjbGllbnRcbiAqIE1ldGVvci5jYWxsKFwibWV0aG9kTmFtZVwiLCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAqICAgLy8gaWRlbnRpZnkgdGhlIGVycm9yXG4gKiAgIGlmIChlcnJvciAmJiBlcnJvci5lcnJvciA9PT0gXCJsb2dnZWQtb3V0XCIpIHtcbiAqICAgICAvLyBzaG93IGEgbmljZSBlcnJvciBtZXNzYWdlXG4gKiAgICAgU2Vzc2lvbi5zZXQoXCJlcnJvck1lc3NhZ2VcIiwgXCJQbGVhc2UgbG9nIGluIHRvIHBvc3QgYSBjb21tZW50LlwiKTtcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqIFxuICogRm9yIGxlZ2FjeSByZWFzb25zLCBzb21lIGJ1aWx0LWluIE1ldGVvciBmdW5jdGlvbnMgc3VjaCBhcyBgY2hlY2tgIHRocm93XG4gKiBlcnJvcnMgd2l0aCBhIG51bWJlciBpbiB0aGlzIGZpZWxkLlxuICogXG4gKiBAcGFyYW0ge1N0cmluZ30gW3JlYXNvbl0gT3B0aW9uYWwuICBBIHNob3J0IGh1bWFuLXJlYWRhYmxlIHN1bW1hcnkgb2YgdGhlXG4gKiBlcnJvciwgbGlrZSAnTm90IEZvdW5kJy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbZGV0YWlsc10gT3B0aW9uYWwuICBBZGRpdGlvbmFsIGluZm9ybWF0aW9uIGFib3V0IHRoZSBlcnJvcixcbiAqIGxpa2UgYSB0ZXh0dWFsIHN0YWNrIHRyYWNlLlxuICovXG5NZXRlb3IuRXJyb3IgPSBNZXRlb3IubWFrZUVycm9yVHlwZShcbiAgXCJNZXRlb3IuRXJyb3JcIixcbiAgZnVuY3Rpb24gKGVycm9yLCByZWFzb24sIGRldGFpbHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBTdHJpbmcgY29kZSB1bmlxdWVseSBpZGVudGlmeWluZyB0aGlzIGtpbmQgb2YgZXJyb3IuXG4gICAgc2VsZi5lcnJvciA9IGVycm9yO1xuXG4gICAgLy8gT3B0aW9uYWw6IEEgc2hvcnQgaHVtYW4tcmVhZGFibGUgc3VtbWFyeSBvZiB0aGUgZXJyb3IuIE5vdFxuICAgIC8vIGludGVuZGVkIHRvIGJlIHNob3duIHRvIGVuZCB1c2VycywganVzdCBkZXZlbG9wZXJzLiAoXCJOb3QgRm91bmRcIixcbiAgICAvLyBcIkludGVybmFsIFNlcnZlciBFcnJvclwiKVxuICAgIHNlbGYucmVhc29uID0gcmVhc29uO1xuXG4gICAgLy8gT3B0aW9uYWw6IEFkZGl0aW9uYWwgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGVycm9yLCBzYXkgZm9yXG4gICAgLy8gZGVidWdnaW5nLiBJdCBtaWdodCBiZSBhICh0ZXh0dWFsKSBzdGFjayB0cmFjZSBpZiB0aGUgc2VydmVyIGlzXG4gICAgLy8gd2lsbGluZyB0byBwcm92aWRlIG9uZS4gVGhlIGNvcnJlc3BvbmRpbmcgdGhpbmcgaW4gSFRUUCB3b3VsZCBiZVxuICAgIC8vIHRoZSBib2R5IG9mIGEgNDA0IG9yIDUwMCByZXNwb25zZS4gKFRoZSBkaWZmZXJlbmNlIGlzIHRoYXQgd2VcbiAgICAvLyBuZXZlciBleHBlY3QgdGhpcyB0byBiZSBzaG93biB0byBlbmQgdXNlcnMsIG9ubHkgZGV2ZWxvcGVycywgc29cbiAgICAvLyBpdCBkb2Vzbid0IG5lZWQgdG8gYmUgcHJldHR5LilcbiAgICBzZWxmLmRldGFpbHMgPSBkZXRhaWxzO1xuXG4gICAgLy8gVGhpcyBpcyB3aGF0IGdldHMgZGlzcGxheWVkIGF0IHRoZSB0b3Agb2YgYSBzdGFjayB0cmFjZS4gQ3VycmVudFxuICAgIC8vIGZvcm1hdCBpcyBcIls0MDRdXCIgKGlmIG5vIHJlYXNvbiBpcyBzZXQpIG9yIFwiRmlsZSBub3QgZm91bmQgWzQwNF1cIlxuICAgIGlmIChzZWxmLnJlYXNvbilcbiAgICAgIHNlbGYubWVzc2FnZSA9IHNlbGYucmVhc29uICsgJyBbJyArIHNlbGYuZXJyb3IgKyAnXSc7XG4gICAgZWxzZVxuICAgICAgc2VsZi5tZXNzYWdlID0gJ1snICsgc2VsZi5lcnJvciArICddJztcbiAgfSk7XG5cbi8vIE1ldGVvci5FcnJvciBpcyBiYXNpY2FsbHkgZGF0YSBhbmQgaXMgc2VudCBvdmVyIEREUCwgc28geW91IHNob3VsZCBiZSBhYmxlIHRvXG4vLyBwcm9wZXJseSBFSlNPTi1jbG9uZSBpdC4gVGhpcyBpcyBlc3BlY2lhbGx5IGltcG9ydGFudCBiZWNhdXNlIGlmIGFcbi8vIE1ldGVvci5FcnJvciBpcyB0aHJvd24gdGhyb3VnaCBhIEZ1dHVyZSwgdGhlIGVycm9yLCByZWFzb24sIGFuZCBkZXRhaWxzXG4vLyBwcm9wZXJ0aWVzIGJlY29tZSBub24tZW51bWVyYWJsZSBzbyBhIHN0YW5kYXJkIE9iamVjdCBjbG9uZSB3b24ndCBwcmVzZXJ2ZVxuLy8gdGhlbSBhbmQgdGhleSB3aWxsIGJlIGxvc3QgZnJvbSBERFAuXG5NZXRlb3IuRXJyb3IucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBuZXcgTWV0ZW9yLkVycm9yKHNlbGYuZXJyb3IsIHNlbGYucmVhc29uLCBzZWxmLmRldGFpbHMpO1xufTtcbiIsInZhciBwYXRoID0gTnBtLnJlcXVpcmUoJ3BhdGgnKTtcbnZhciBGaWJlciA9IE5wbS5yZXF1aXJlKCdmaWJlcnMnKTtcbnZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZShwYXRoLmpvaW4oJ2ZpYmVycycsICdmdXR1cmUnKSk7XG5cbk1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkID0gZnVuY3Rpb24gKGYpIHtcbiAgdmFyIHNhdmVkWWllbGQgPSBGaWJlci55aWVsZDtcbiAgRmliZXIueWllbGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCB5aWVsZCBpbiBhIG5vWWllbGRzQWxsb3dlZCBibG9jayFcIik7XG4gIH07XG4gIHRyeSB7XG4gICAgcmV0dXJuIGYoKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBGaWJlci55aWVsZCA9IHNhdmVkWWllbGQ7XG4gIH1cbn07XG5cbk1ldGVvci5fRG91YmxlRW5kZWRRdWV1ZSA9IE5wbS5yZXF1aXJlKCdtZXRlb3ItZGVxdWUnKTtcblxuLy8gTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlIGlzIGEgcXVldWUgd2hpY2ggcnVucyB0YXNrIGZ1bmN0aW9ucyBzZXJpYWxseS5cbi8vIFRhc2tzIGFyZSBhc3N1bWVkIHRvIGJlIHN5bmNocm9ub3VzOiBpZSwgaXQncyBhc3N1bWVkIHRoYXQgdGhleSBhcmVcbi8vIGRvbmUgd2hlbiB0aGV5IHJldHVybi5cbi8vXG4vLyBJdCBoYXMgdHdvIG1ldGhvZHM6XG4vLyAgIC0gcXVldWVUYXNrIHF1ZXVlcyBhIHRhc2sgdG8gYmUgcnVuLCBhbmQgcmV0dXJucyBpbW1lZGlhdGVseS5cbi8vICAgLSBydW5UYXNrIHF1ZXVlcyBhIHRhc2sgdG8gYmUgcnVuLCBhbmQgdGhlbiB5aWVsZHMuIEl0IHJldHVybnNcbi8vICAgICB3aGVuIHRoZSB0YXNrIGZpbmlzaGVzIHJ1bm5pbmcuXG4vL1xuLy8gSXQncyBzYWZlIHRvIGNhbGwgcXVldWVUYXNrIGZyb20gd2l0aGluIGEgdGFzaywgYnV0IG5vdCBydW5UYXNrICh1bmxlc3Ncbi8vIHlvdSdyZSBjYWxsaW5nIHJ1blRhc2sgZnJvbSBhIG5lc3RlZCBGaWJlcikuXG4vL1xuLy8gU29tZXdoYXQgaW5zcGlyZWQgYnkgYXN5bmMucXVldWUsIGJ1dCBzcGVjaWZpYyB0byBibG9ja2luZyB0YXNrcy5cbi8vIFhYWCBicmVhayB0aGlzIG91dCBpbnRvIGFuIE5QTSBtb2R1bGU/XG4vLyBYWFggY291bGQgbWF5YmUgdXNlIHRoZSBucG0gJ3NjaGxvY2snIG1vZHVsZSBpbnN0ZWFkLCB3aGljaCB3b3VsZFxuLy8gICAgIGFsc28gc3VwcG9ydCBtdWx0aXBsZSBjb25jdXJyZW50IFwicmVhZFwiIHRhc2tzXG4vL1xuTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIExpc3Qgb2YgdGFza3MgdG8gcnVuIChub3QgaW5jbHVkaW5nIGEgY3VycmVudGx5LXJ1bm5pbmcgdGFzayBpZiBhbnkpLiBFYWNoXG4gIC8vIGlzIGFuIG9iamVjdCB3aXRoIGZpZWxkICd0YXNrJyAodGhlIHRhc2sgZnVuY3Rpb24gdG8gcnVuKSBhbmQgJ2Z1dHVyZScgKHRoZVxuICAvLyBGdXR1cmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBibG9ja2luZyBydW5UYXNrIGNhbGwgdGhhdCBxdWV1ZWQgaXQsIG9yIG51bGwgaWZcbiAgLy8gY2FsbGVkIGZyb20gcXVldWVUYXNrKS5cbiAgc2VsZi5fdGFza0hhbmRsZXMgPSBuZXcgTWV0ZW9yLl9Eb3VibGVFbmRlZFF1ZXVlKCk7XG4gIC8vIFRoaXMgaXMgdHJ1ZSBpZiBzZWxmLl9ydW4oKSBpcyBlaXRoZXIgY3VycmVudGx5IGV4ZWN1dGluZyBvciBzY2hlZHVsZWQgdG9cbiAgLy8gZG8gc28gc29vbi5cbiAgc2VsZi5fcnVubmluZ09yUnVuU2NoZWR1bGVkID0gZmFsc2U7XG4gIC8vIER1cmluZyB0aGUgZXhlY3V0aW9uIG9mIGEgdGFzaywgdGhpcyBpcyBzZXQgdG8gdGhlIGZpYmVyIHVzZWQgdG8gZXhlY3V0ZVxuICAvLyB0aGF0IHRhc2suIFdlIHVzZSB0aGlzIHRvIHRocm93IGFuIGVycm9yIHJhdGhlciB0aGFuIGRlYWRsb2NraW5nIGlmIHRoZVxuICAvLyB1c2VyIGNhbGxzIHJ1blRhc2sgZnJvbSB3aXRoaW4gYSB0YXNrIG9uIHRoZSBzYW1lIGZpYmVyLlxuICBzZWxmLl9jdXJyZW50VGFza0ZpYmVyID0gdW5kZWZpbmVkO1xuICAvLyBUaGlzIGlzIHRydWUgaWYgd2UncmUgY3VycmVudGx5IGRyYWluaW5nLiAgV2hpbGUgd2UncmUgZHJhaW5pbmcsIGEgZnVydGhlclxuICAvLyBkcmFpbiBpcyBhIG5vb3AsIHRvIHByZXZlbnQgaW5maW5pdGUgbG9vcHMuICBcImRyYWluXCIgaXMgYSBoZXVyaXN0aWMgdHlwZVxuICAvLyBvcGVyYXRpb24sIHRoYXQgaGFzIGEgbWVhbmluZyBsaWtlIHVudG8gXCJ3aGF0IGEgbmFpdmUgcGVyc29uIHdvdWxkIGV4cGVjdFxuICAvLyB3aGVuIG1vZGlmeWluZyBhIHRhYmxlIGZyb20gYW4gb2JzZXJ2ZVwiXG4gIHNlbGYuX2RyYWluaW5nID0gZmFsc2U7XG59O1xuXG5fLmV4dGVuZChNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUucHJvdG90eXBlLCB7XG4gIHJ1blRhc2s6IGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKCFzZWxmLnNhZmVUb1J1blRhc2soKSkge1xuICAgICAgaWYgKEZpYmVyLmN1cnJlbnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHJ1blRhc2sgZnJvbSBhbm90aGVyIHRhc2sgaW4gdGhlIHNhbWUgZmliZXJcIik7XG4gICAgICBlbHNlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgcnVuVGFzayBpbiBhIEZpYmVyXCIpO1xuICAgIH1cblxuICAgIHZhciBmdXQgPSBuZXcgRnV0dXJlO1xuICAgIHZhciBoYW5kbGUgPSB7XG4gICAgICB0YXNrOiBNZXRlb3IuYmluZEVudmlyb25tZW50KHRhc2ssIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gZnJvbSB0YXNrOlwiLCBlICYmIGUuc3RhY2sgfHwgZSk7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9KSxcbiAgICAgIGZ1dHVyZTogZnV0LFxuICAgICAgbmFtZTogdGFzay5uYW1lXG4gICAgfTtcbiAgICBzZWxmLl90YXNrSGFuZGxlcy5wdXNoKGhhbmRsZSk7XG4gICAgc2VsZi5fc2NoZWR1bGVSdW4oKTtcbiAgICAvLyBZaWVsZC4gV2UnbGwgZ2V0IGJhY2sgaGVyZSBhZnRlciB0aGUgdGFzayBpcyBydW4gKGFuZCB3aWxsIHRocm93IGlmIHRoZVxuICAgIC8vIHRhc2sgdGhyb3dzKS5cbiAgICBmdXQud2FpdCgpO1xuICB9LFxuICBxdWV1ZVRhc2s6IGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3Rhc2tIYW5kbGVzLnB1c2goe1xuICAgICAgdGFzazogdGFzayxcbiAgICAgIG5hbWU6IHRhc2submFtZVxuICAgIH0pO1xuICAgIHNlbGYuX3NjaGVkdWxlUnVuKCk7XG4gICAgLy8gTm8gbmVlZCB0byBibG9jay5cbiAgfSxcblxuICBmbHVzaDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLnJ1blRhc2soZnVuY3Rpb24gKCkge30pO1xuICB9LFxuXG4gIHNhZmVUb1J1blRhc2s6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIEZpYmVyLmN1cnJlbnQgJiYgc2VsZi5fY3VycmVudFRhc2tGaWJlciAhPT0gRmliZXIuY3VycmVudDtcbiAgfSxcblxuICBkcmFpbjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fZHJhaW5pbmcpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCFzZWxmLnNhZmVUb1J1blRhc2soKSlcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9kcmFpbmluZyA9IHRydWU7XG4gICAgd2hpbGUgKCEgc2VsZi5fdGFza0hhbmRsZXMuaXNFbXB0eSgpKSB7XG4gICAgICBzZWxmLmZsdXNoKCk7XG4gICAgfVxuICAgIHNlbGYuX2RyYWluaW5nID0gZmFsc2U7XG4gIH0sXG5cbiAgX3NjaGVkdWxlUnVuOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIEFscmVhZHkgcnVubmluZyBvciBzY2hlZHVsZWQ/IERvIG5vdGhpbmcuXG4gICAgaWYgKHNlbGYuX3J1bm5pbmdPclJ1blNjaGVkdWxlZClcbiAgICAgIHJldHVybjtcblxuICAgIHNlbGYuX3J1bm5pbmdPclJ1blNjaGVkdWxlZCA9IHRydWU7XG4gICAgc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgIEZpYmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5fcnVuKCk7XG4gICAgICB9KS5ydW4oKTtcbiAgICB9KTtcbiAgfSxcbiAgX3J1bjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICghc2VsZi5fcnVubmluZ09yUnVuU2NoZWR1bGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZXhwZWN0ZWQgdG8gYmUgX3J1bm5pbmdPclJ1blNjaGVkdWxlZFwiKTtcblxuICAgIGlmIChzZWxmLl90YXNrSGFuZGxlcy5pc0VtcHR5KCkpIHtcbiAgICAgIC8vIERvbmUgcnVubmluZyB0YXNrcyEgRG9uJ3QgaW1tZWRpYXRlbHkgc2NoZWR1bGUgYW5vdGhlciBydW4sIGJ1dFxuICAgICAgLy8gYWxsb3cgZnV0dXJlIHRhc2tzIHRvIGRvIHNvLlxuICAgICAgc2VsZi5fcnVubmluZ09yUnVuU2NoZWR1bGVkID0gZmFsc2U7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0YXNrSGFuZGxlID0gc2VsZi5fdGFza0hhbmRsZXMuc2hpZnQoKTtcblxuICAgIC8vIFJ1biB0aGUgdGFzay5cbiAgICBzZWxmLl9jdXJyZW50VGFza0ZpYmVyID0gRmliZXIuY3VycmVudDtcbiAgICB2YXIgZXhjZXB0aW9uID0gdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICB0YXNrSGFuZGxlLnRhc2soKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmICh0YXNrSGFuZGxlLmZ1dHVyZSkge1xuICAgICAgICAvLyBXZSdsbCB0aHJvdyB0aGlzIGV4Y2VwdGlvbiB0aHJvdWdoIHJ1blRhc2suXG4gICAgICAgIGV4Y2VwdGlvbiA9IGVycjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gaW4gcXVldWVkIHRhc2s6IFwiICsgKGVyci5zdGFjayB8fCBlcnIpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc2VsZi5fY3VycmVudFRhc2tGaWJlciA9IHVuZGVmaW5lZDtcblxuICAgIC8vIFNvb24sIHJ1biB0aGUgbmV4dCB0YXNrLCBpZiB0aGVyZSBpcyBhbnkuXG4gICAgc2VsZi5fcnVubmluZ09yUnVuU2NoZWR1bGVkID0gZmFsc2U7XG4gICAgc2VsZi5fc2NoZWR1bGVSdW4oKTtcblxuICAgIC8vIElmIHRoaXMgd2FzIHF1ZXVlZCB3aXRoIHJ1blRhc2ssIGxldCB0aGUgcnVuVGFzayBjYWxsIHJldHVybiAodGhyb3dpbmcgaWZcbiAgICAvLyB0aGUgdGFzayB0aHJldykuXG4gICAgaWYgKHRhc2tIYW5kbGUuZnV0dXJlKSB7XG4gICAgICBpZiAoZXhjZXB0aW9uKVxuICAgICAgICB0YXNrSGFuZGxlLmZ1dHVyZVsndGhyb3cnXShleGNlcHRpb24pO1xuICAgICAgZWxzZVxuICAgICAgICB0YXNrSGFuZGxlLmZ1dHVyZVsncmV0dXJuJ10oKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vLyBTbGVlcC4gTW9zdGx5IHVzZWQgZm9yIGRlYnVnZ2luZyAoZWcsIGluc2VydGluZyBsYXRlbmN5IGludG8gc2VydmVyXG4vLyBtZXRob2RzKS5cbi8vXG5NZXRlb3IuX3NsZWVwRm9yTXMgPSBmdW5jdGlvbiAobXMpIHtcbiAgdmFyIGZpYmVyID0gRmliZXIuY3VycmVudDtcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBmaWJlci5ydW4oKTtcbiAgfSwgbXMpO1xuICBGaWJlci55aWVsZCgpO1xufTtcbiIsIk1ldGVvci5zdGFydHVwID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIGlmIChfX21ldGVvcl9ib290c3RyYXBfXy5zdGFydHVwSG9va3MpIHtcbiAgICBfX21ldGVvcl9ib290c3RyYXBfXy5zdGFydHVwSG9va3MucHVzaChjYWxsYmFjayk7XG4gIH0gZWxzZSB7XG4gICAgLy8gV2UgYWxyZWFkeSBzdGFydGVkIHVwLiBKdXN0IGNhbGwgaXQgbm93LlxuICAgIGNhbGxiYWNrKCk7XG4gIH1cbn07XG4iLCJ2YXIgc3VwcHJlc3MgPSAwO1xuXG4vLyByZXBsYWNlbWVudCBmb3IgY29uc29sZS5sb2cuIFRoaXMgaXMgYSB0ZW1wb3JhcnkgQVBJLiBXZSBzaG91bGRcbi8vIHByb3ZpZGUgYSByZWFsIGxvZ2dpbmcgQVBJIHNvb24gKHBvc3NpYmx5IGp1c3QgYSBwb2x5ZmlsbCBmb3Jcbi8vIGNvbnNvbGU/KVxuLy9cbi8vIE5PVEU6IHRoaXMgaXMgdXNlZCBvbiB0aGUgc2VydmVyIHRvIHByaW50IHRoZSB3YXJuaW5nIGFib3V0XG4vLyBoYXZpbmcgYXV0b3B1Ymxpc2ggZW5hYmxlZCB3aGVuIHlvdSBwcm9iYWJseSBtZWFudCB0byB0dXJuIGl0XG4vLyBvZmYuIGl0J3Mgbm90IHJlYWxseSB0aGUgcHJvcGVyIHVzZSBvZiBzb21ldGhpbmcgY2FsbGVkXG4vLyBfZGVidWcuIHRoZSBpbnRlbnQgaXMgZm9yIHRoaXMgbWVzc2FnZSB0byBnbyB0byB0aGUgdGVybWluYWwgYW5kXG4vLyBiZSB2ZXJ5IHZpc2libGUuIGlmIHlvdSBjaGFuZ2UgX2RlYnVnIHRvIGdvIHNvbWVwbGFjZSBlbHNlLCBldGMsXG4vLyBwbGVhc2UgZml4IHRoZSBhdXRvcHVibGlzaCBjb2RlIHRvIGRvIHNvbWV0aGluZyByZWFzb25hYmxlLlxuLy9cbk1ldGVvci5fZGVidWcgPSBmdW5jdGlvbiAoLyogYXJndW1lbnRzICovKSB7XG4gIGlmIChzdXBwcmVzcykge1xuICAgIHN1cHByZXNzLS07XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBjb25zb2xlLmxvZyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAwKSB7IC8vIElFIENvbXBhbmlvbiBicmVha3Mgb3RoZXJ3aXNlXG4gICAgICAvLyBJRTEwIFBQNCByZXF1aXJlcyBhdCBsZWFzdCBvbmUgYXJndW1lbnRcbiAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSUUgZG9lc24ndCBoYXZlIGNvbnNvbGUubG9nLmFwcGx5LCBpdCdzIG5vdCBhIHJlYWwgT2JqZWN0LlxuICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy81NTM4OTcyL2NvbnNvbGUtbG9nLWFwcGx5LW5vdC13b3JraW5nLWluLWllOVxuICAgICAgLy8gaHR0cDovL3BhdGlrLmNvbS9ibG9nL2NvbXBsZXRlLWNyb3NzLWJyb3dzZXItY29uc29sZS1sb2cvXG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUubG9nLmFwcGx5ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgLy8gTW9zdCBicm93c2Vyc1xuXG4gICAgICAgIC8vIENocm9tZSBhbmQgU2FmYXJpIG9ubHkgaHlwZXJsaW5rIFVSTHMgdG8gc291cmNlIGZpbGVzIGluIGZpcnN0IGFyZ3VtZW50IG9mXG4gICAgICAgIC8vIGNvbnNvbGUubG9nLCBzbyB0cnkgdG8gY2FsbCBpdCB3aXRoIG9uZSBhcmd1bWVudCBpZiBwb3NzaWJsZS5cbiAgICAgICAgLy8gQXBwcm9hY2ggdGFrZW4gaGVyZTogSWYgYWxsIGFyZ3VtZW50cyBhcmUgc3RyaW5ncywgam9pbiB0aGVtIG9uIHNwYWNlLlxuICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvcHVsbC83MzIjaXNzdWVjb21tZW50LTEzOTc1OTkxXG4gICAgICAgIHZhciBhbGxBcmd1bWVudHNPZlR5cGVTdHJpbmcgPSB0cnVlO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcbiAgICAgICAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1tpXSAhPT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgIGFsbEFyZ3VtZW50c09mVHlwZVN0cmluZyA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChhbGxBcmd1bWVudHNPZlR5cGVTdHJpbmcpXG4gICAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgW0FycmF5LnByb3RvdHlwZS5qb2luLmNhbGwoYXJndW1lbnRzLCBcIiBcIildKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG5cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgLy8gSUU5XG4gICAgICAgIHZhciBsb2cgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlKTtcbiAgICAgICAgbG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJRThcbiAgICAgICAgRnVuY3Rpb24ucHJvdG90eXBlLmNhbGwuY2FsbChjb25zb2xlLmxvZywgY29uc29sZSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vLyBTdXBwcmVzcyB0aGUgbmV4dCAnY291bnQnIE1ldGVvci5fZGVidWcgbWVzc3NhZ2VzLiBVc2UgdGhpcyB0b1xuLy8gc3RvcCB0ZXN0cyBmcm9tIHNwYW1taW5nIHRoZSBjb25zb2xlLlxuLy9cbk1ldGVvci5fc3VwcHJlc3NfbG9nID0gZnVuY3Rpb24gKGNvdW50KSB7XG4gIHN1cHByZXNzICs9IGNvdW50O1xufTtcblxuTWV0ZW9yLl9zdXBwcmVzc2VkX2xvZ19leHBlY3RlZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHN1cHByZXNzICE9PSAwO1xufTtcblxuIiwiLy8gTGlrZSBQZXJsJ3MgcXVvdGVtZXRhOiBxdW90ZXMgYWxsIHJlZ2V4cCBtZXRhY2hhcmFjdGVycy5cbi8vIENvZGUgdGFrZW4gZnJvbVxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9HdWlkZS9SZWd1bGFyX0V4cHJlc3Npb25zXG5NZXRlb3IuX2VzY2FwZVJlZ0V4cCA9IGZ1bmN0aW9uIChzdHJpbmcpIHtcbiAgICByZXR1cm4gU3RyaW5nKHN0cmluZykucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xufTtcbiIsInZhciBURVNUX01FVEFEQVRBX1NUUjtcbmlmIChNZXRlb3IuaXNDbGllbnQpIHtcbiAgVEVTVF9NRVRBREFUQV9TVFIgPSBtZXRlb3JFbnYuVEVTVF9NRVRBREFUQTtcbn0gZWxzZSB7XG4gIFRFU1RfTUVUQURBVEFfU1RSID0gcHJvY2Vzcy5lbnYuVEVTVF9NRVRBREFUQTtcbn1cblxudmFyIFRFU1RfTUVUQURBVEEgPSBKU09OLnBhcnNlKFRFU1RfTUVUQURBVEFfU1RSIHx8IFwie31cIik7XG52YXIgdGVzdERyaXZlclBhY2thZ2VOYW1lID0gVEVTVF9NRVRBREFUQS5kcml2ZXJQYWNrYWdlO1xuXG4vLyBOb3RlIHRoYXQgaWYgd2UgYXJlIGluIHRlc3QtcGFja2FnZXMgbW9kZSBuZWl0aGVyIG9mIHRoZXNlIHdpbGwgYmUgc2V0LFxuLy8gYnV0IHdlIHdpbGwgaGF2ZSBhIHRlc3QgZHJpdmVyIHBhY2thZ2Vcbk1ldGVvci5pc1Rlc3QgPSAhIVRFU1RfTUVUQURBVEEuaXNUZXN0O1xuTWV0ZW9yLmlzQXBwVGVzdCA9ICEhVEVTVF9NRVRBREFUQS5pc0FwcFRlc3Q7XG5NZXRlb3IuaXNQYWNrYWdlVGVzdCA9ICEhdGVzdERyaXZlclBhY2thZ2VOYW1lICYmICFNZXRlb3IuaXNUZXN0ICYmICFNZXRlb3IuaXNBcHBUZXN0OyBcblxuaWYgKHR5cGVvZiB0ZXN0RHJpdmVyUGFja2FnZU5hbWUgPT09IFwic3RyaW5nXCIpIHtcbiAgTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRlc3REcml2ZXJQYWNrYWdlID0gUGFja2FnZVt0ZXN0RHJpdmVyUGFja2FnZU5hbWVdO1xuICAgIGlmICghIHRlc3REcml2ZXJQYWNrYWdlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBmaW5kIHRlc3QgZHJpdmVyIHBhY2thZ2U6IFwiICsgdGVzdERyaXZlclBhY2thZ2VOYW1lKTtcbiAgICB9XG5cbiAgICAvLyBPbiB0aGUgY2xpZW50LCB0aGUgdGVzdCBkcml2ZXIgKm11c3QqIGRlZmluZSBgcnVuVGVzdHNgXG4gICAgaWYgKE1ldGVvci5pc0NsaWVudCkge1xuICAgICAgaWYgKHR5cGVvZiB0ZXN0RHJpdmVyUGFja2FnZS5ydW5UZXN0cyAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRlc3QgZHJpdmVyIHBhY2thZ2UgXCIgKyB0ZXN0RHJpdmVyUGFja2FnZU5hbWVcbiAgICAgICAgICArIFwiIG1pc3NpbmcgYHJ1blRlc3RzYCBleHBvcnRcIik7XG4gICAgICB9XG4gICAgICB0ZXN0RHJpdmVyUGFja2FnZS5ydW5UZXN0cygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgc2VydmVyIGNhbiBvcHRpb25hbGx5IGRlZmluZSBgc3RhcnRgXG4gICAgICBpZiAodHlwZW9mIHRlc3REcml2ZXJQYWNrYWdlLnN0YXJ0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGVzdERyaXZlclBhY2thZ2Uuc3RhcnQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuIiwiLy8gRmliZXItYXdhcmUgaW1wbGVtZW50YXRpb24gb2YgZHluYW1pYyBzY29waW5nLCBmb3IgdXNlIG9uIHRoZSBzZXJ2ZXJcblxudmFyIEZpYmVyID0gTnBtLnJlcXVpcmUoJ2ZpYmVycycpO1xuXG52YXIgbmV4dFNsb3QgPSAwO1xuXG5NZXRlb3IuX25vZGVDb2RlTXVzdEJlSW5GaWJlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCFGaWJlci5jdXJyZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTWV0ZW9yIGNvZGUgbXVzdCBhbHdheXMgcnVuIHdpdGhpbiBhIEZpYmVyLiBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwiVHJ5IHdyYXBwaW5nIGNhbGxiYWNrcyB0aGF0IHlvdSBwYXNzIHRvIG5vbi1NZXRlb3IgXCIgK1xuICAgICAgICAgICAgICAgICAgICBcImxpYnJhcmllcyB3aXRoIE1ldGVvci5iaW5kRW52aXJvbm1lbnQuXCIpO1xuICB9XG59O1xuXG5NZXRlb3IuRW52aXJvbm1lbnRWYXJpYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zbG90ID0gbmV4dFNsb3QrKztcbn07XG5cbl8uZXh0ZW5kKE1ldGVvci5FbnZpcm9ubWVudFZhcmlhYmxlLnByb3RvdHlwZSwge1xuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBNZXRlb3IuX25vZGVDb2RlTXVzdEJlSW5GaWJlcigpO1xuXG4gICAgcmV0dXJuIEZpYmVyLmN1cnJlbnQuX21ldGVvcl9keW5hbWljcyAmJlxuICAgICAgRmliZXIuY3VycmVudC5fbWV0ZW9yX2R5bmFtaWNzW3RoaXMuc2xvdF07XG4gIH0sXG5cbiAgLy8gTW9zdCBNZXRlb3IgY29kZSBvdWdodCB0byBydW4gaW5zaWRlIGEgZmliZXIsIGFuZCB0aGVcbiAgLy8gX25vZGVDb2RlTXVzdEJlSW5GaWJlciBhc3NlcnRpb24gaGVscHMgeW91IHJlbWVtYmVyIHRvIGluY2x1ZGUgYXBwcm9wcmlhdGVcbiAgLy8gYmluZEVudmlyb25tZW50IGNhbGxzICh3aGljaCB3aWxsIGdldCB5b3UgdGhlICpyaWdodCB2YWx1ZSogZm9yIHlvdXJcbiAgLy8gZW52aXJvbm1lbnQgdmFyaWFibGVzLCBvbiB0aGUgc2VydmVyKS5cbiAgLy9cbiAgLy8gSW4gc29tZSB2ZXJ5IHNwZWNpYWwgY2FzZXMsIGl0J3MgbW9yZSBpbXBvcnRhbnQgdG8gcnVuIE1ldGVvciBjb2RlIG9uIHRoZVxuICAvLyBzZXJ2ZXIgaW4gbm9uLUZpYmVyIGNvbnRleHRzIHJhdGhlciB0aGFuIHRvIHN0cm9uZ2x5IGVuZm9yY2UgdGhlIHNhZmVndWFyZFxuICAvLyBhZ2FpbnN0IGZvcmdldHRpbmcgdG8gdXNlIGJpbmRFbnZpcm9ubWVudC4gRm9yIGV4YW1wbGUsIHVzaW5nIGBjaGVja2AgaW5cbiAgLy8gc29tZSB0b3AtbGV2ZWwgY29uc3RydWN0cyBsaWtlIGNvbm5lY3QgaGFuZGxlcnMgd2l0aG91dCBuZWVkaW5nIHVubmVjZXNzYXJ5XG4gIC8vIEZpYmVycyBvbiBldmVyeSByZXF1ZXN0IGlzIG1vcmUgaW1wb3J0YW50IHRoYXQgcG9zc2libHkgZmFpbGluZyB0byBmaW5kIHRoZVxuICAvLyBjb3JyZWN0IGFyZ3VtZW50Q2hlY2tlci4gU28gdGhpcyBmdW5jdGlvbiBpcyBqdXN0IGxpa2UgZ2V0KCksIGJ1dCBpdFxuICAvLyByZXR1cm5zIG51bGwgcmF0aGVyIHRoYW4gdGhyb3dpbmcgd2hlbiBjYWxsZWQgZnJvbSBvdXRzaWRlIGEgRmliZXIuIChPbiB0aGVcbiAgLy8gY2xpZW50LCBpdCBpcyBpZGVudGljYWwgdG8gZ2V0KCkuKVxuICBnZXRPck51bGxJZk91dHNpZGVGaWJlcjogZnVuY3Rpb24gKCkge1xuICAgIGlmICghRmliZXIuY3VycmVudClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0aGlzLmdldCgpO1xuICB9LFxuXG4gIHdpdGhWYWx1ZTogZnVuY3Rpb24gKHZhbHVlLCBmdW5jKSB7XG4gICAgTWV0ZW9yLl9ub2RlQ29kZU11c3RCZUluRmliZXIoKTtcblxuICAgIGlmICghRmliZXIuY3VycmVudC5fbWV0ZW9yX2R5bmFtaWNzKVxuICAgICAgRmliZXIuY3VycmVudC5fbWV0ZW9yX2R5bmFtaWNzID0gW107XG4gICAgdmFyIGN1cnJlbnRWYWx1ZXMgPSBGaWJlci5jdXJyZW50Ll9tZXRlb3JfZHluYW1pY3M7XG5cbiAgICB2YXIgc2F2ZWQgPSBjdXJyZW50VmFsdWVzW3RoaXMuc2xvdF07XG4gICAgdHJ5IHtcbiAgICAgIGN1cnJlbnRWYWx1ZXNbdGhpcy5zbG90XSA9IHZhbHVlO1xuICAgICAgdmFyIHJldCA9IGZ1bmMoKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY3VycmVudFZhbHVlc1t0aGlzLnNsb3RdID0gc2F2ZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxufSk7XG5cbi8vIE1ldGVvciBhcHBsaWNhdGlvbiBjb2RlIGlzIGFsd2F5cyBzdXBwb3NlZCB0byBiZSBydW4gaW5zaWRlIGFcbi8vIGZpYmVyLiBiaW5kRW52aXJvbm1lbnQgZW5zdXJlcyB0aGF0IHRoZSBmdW5jdGlvbiBpdCB3cmFwcyBpcyBydW4gZnJvbVxuLy8gaW5zaWRlIGEgZmliZXIgYW5kIGVuc3VyZXMgaXQgc2VlcyB0aGUgdmFsdWVzIG9mIE1ldGVvciBlbnZpcm9ubWVudFxuLy8gdmFyaWFibGVzIHRoYXQgYXJlIHNldCBhdCB0aGUgdGltZSBiaW5kRW52aXJvbm1lbnQgaXMgY2FsbGVkLlxuLy9cbi8vIElmIGFuIGVudmlyb25tZW50LWJvdW5kIGZ1bmN0aW9uIGlzIGNhbGxlZCBmcm9tIG91dHNpZGUgYSBmaWJlciAoZWcsIGZyb21cbi8vIGFuIGFzeW5jaHJvbm91cyBjYWxsYmFjayBmcm9tIGEgbm9uLU1ldGVvciBsaWJyYXJ5IHN1Y2ggYXMgTW9uZ29EQiksIGl0J2xsXG4vLyBraWNrIG9mZiBhIG5ldyBmaWJlciB0byBleGVjdXRlIHRoZSBmdW5jdGlvbiwgYW5kIHJldHVybnMgdW5kZWZpbmVkIGFzIHNvb25cbi8vIGFzIHRoYXQgZmliZXIgcmV0dXJucyBvciB5aWVsZHMgKGFuZCBmdW5jJ3MgcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWQpLlxuLy9cbi8vIElmIGl0J3MgY2FsbGVkIGluc2lkZSBhIGZpYmVyLCBpdCB3b3JrcyBub3JtYWxseSAodGhlXG4vLyByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHdpbGwgYmUgcGFzc2VkIHRocm91Z2gsIGFuZCBubyBuZXdcbi8vIGZpYmVyIHdpbGwgYmUgY3JlYXRlZC4pXG4vL1xuLy8gYG9uRXhjZXB0aW9uYCBzaG91bGQgYmUgYSBmdW5jdGlvbiBvciBhIHN0cmluZy4gIFdoZW4gaXQgaXMgYVxuLy8gZnVuY3Rpb24sIGl0IGlzIGNhbGxlZCBhcyBhIGNhbGxiYWNrIHdoZW4gdGhlIGJvdW5kIGZ1bmN0aW9uIHJhaXNlc1xuLy8gYW4gZXhjZXB0aW9uLiAgSWYgaXQgaXMgYSBzdHJpbmcsIGl0IHNob3VsZCBiZSBhIGRlc2NyaXB0aW9uIG9mIHRoZVxuLy8gY2FsbGJhY2ssIGFuZCB3aGVuIGFuIGV4Y2VwdGlvbiBpcyByYWlzZWQgYSBkZWJ1ZyBtZXNzYWdlIHdpbGwgYmVcbi8vIHByaW50ZWQgd2l0aCB0aGUgZGVzY3JpcHRpb24uXG5NZXRlb3IuYmluZEVudmlyb25tZW50ID0gZnVuY3Rpb24gKGZ1bmMsIG9uRXhjZXB0aW9uLCBfdGhpcykge1xuICBNZXRlb3IuX25vZGVDb2RlTXVzdEJlSW5GaWJlcigpO1xuXG4gIHZhciBib3VuZFZhbHVlcyA9IF8uY2xvbmUoRmliZXIuY3VycmVudC5fbWV0ZW9yX2R5bmFtaWNzIHx8IFtdKTtcblxuICBpZiAoIW9uRXhjZXB0aW9uIHx8IHR5cGVvZihvbkV4Y2VwdGlvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIGRlc2NyaXB0aW9uID0gb25FeGNlcHRpb24gfHwgXCJjYWxsYmFjayBvZiBhc3luYyBmdW5jdGlvblwiO1xuICAgIG9uRXhjZXB0aW9uID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKFxuICAgICAgICBcIkV4Y2VwdGlvbiBpbiBcIiArIGRlc2NyaXB0aW9uICsgXCI6XCIsXG4gICAgICAgIGVycm9yICYmIGVycm9yLnN0YWNrIHx8IGVycm9yXG4gICAgICApO1xuICAgIH07XG4gIH0gZWxzZSBpZiAodHlwZW9mKG9uRXhjZXB0aW9uKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBFcnJvcignb25FeGNlcHRpb24gYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uLCBzdHJpbmcgb3IgdW5kZWZpbmVkIGZvciBNZXRlb3IuYmluZEVudmlyb25tZW50KCkuJyk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKC8qIGFyZ3VtZW50cyAqLykge1xuICAgIHZhciBhcmdzID0gXy50b0FycmF5KGFyZ3VtZW50cyk7XG5cbiAgICB2YXIgcnVuV2l0aEVudmlyb25tZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNhdmVkVmFsdWVzID0gRmliZXIuY3VycmVudC5fbWV0ZW9yX2R5bmFtaWNzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gTmVlZCB0byBjbG9uZSBib3VuZFZhbHVlcyBpbiBjYXNlIHR3byBmaWJlcnMgaW52b2tlIHRoaXNcbiAgICAgICAgLy8gZnVuY3Rpb24gYXQgdGhlIHNhbWUgdGltZVxuICAgICAgICBGaWJlci5jdXJyZW50Ll9tZXRlb3JfZHluYW1pY3MgPSBfLmNsb25lKGJvdW5kVmFsdWVzKTtcbiAgICAgICAgdmFyIHJldCA9IGZ1bmMuYXBwbHkoX3RoaXMsIGFyZ3MpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBub3RlOiBjYWxsYmFjay1ob29rIGN1cnJlbnRseSByZWxpZXMgb24gdGhlIGZhY3QgdGhhdCBpZiBvbkV4Y2VwdGlvblxuICAgICAgICAvLyB0aHJvd3MgYW5kIHlvdSB3ZXJlIG9yaWdpbmFsbHkgY2FsbGluZyB0aGUgd3JhcHBlZCBjYWxsYmFjayBmcm9tXG4gICAgICAgIC8vIHdpdGhpbiBhIEZpYmVyLCB0aGUgd3JhcHBlZCBjYWxsIHRocm93cy5cbiAgICAgICAgb25FeGNlcHRpb24oZSk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBGaWJlci5jdXJyZW50Ll9tZXRlb3JfZHluYW1pY3MgPSBzYXZlZFZhbHVlcztcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfTtcblxuICAgIGlmIChGaWJlci5jdXJyZW50KVxuICAgICAgcmV0dXJuIHJ1bldpdGhFbnZpcm9ubWVudCgpO1xuICAgIEZpYmVyKHJ1bldpdGhFbnZpcm9ubWVudCkucnVuKCk7XG4gIH07XG59O1xuIiwiaWYgKHByb2Nlc3MuZW52LlJPT1RfVVJMICYmXG4gICAgdHlwZW9mIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPT09IFwib2JqZWN0XCIpIHtcbiAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCA9IHByb2Nlc3MuZW52LlJPT1RfVVJMO1xuICBpZiAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCkge1xuICAgIHZhciBwYXJzZWRVcmwgPSBOcG0ucmVxdWlyZSgndXJsJykucGFyc2UoX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCk7XG4gICAgLy8gU29tZXRpbWVzIHVzZXJzIHRyeSB0byBwYXNzLCBlZywgUk9PVF9VUkw9bXlkb21haW4uY29tLlxuICAgIGlmICghcGFyc2VkVXJsLmhvc3QpIHtcbiAgICAgIHRocm93IEVycm9yKFwiJFJPT1RfVVJMLCBpZiBzcGVjaWZpZWQsIG11c3QgYmUgYW4gVVJMXCIpO1xuICAgIH1cbiAgICB2YXIgcGF0aFByZWZpeCA9IHBhcnNlZFVybC5wYXRobmFtZTtcbiAgICBpZiAocGF0aFByZWZpeC5zbGljZSgtMSkgPT09ICcvJykge1xuICAgICAgLy8gcmVtb3ZlIHRyYWlsaW5nIHNsYXNoIChvciB0dXJuIFwiL1wiIGludG8gXCJcIilcbiAgICAgIHBhdGhQcmVmaXggPSBwYXRoUHJlZml4LnNsaWNlKDAsIC0xKTtcbiAgICB9XG4gICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCA9IHBhdGhQcmVmaXg7XG4gIH0gZWxzZSB7XG4gICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCA9IFwiXCI7XG4gIH1cbn1cbiIsIi8qKlxuICogQHN1bW1hcnkgR2VuZXJhdGUgYW4gYWJzb2x1dGUgVVJMIHBvaW50aW5nIHRvIHRoZSBhcHBsaWNhdGlvbi4gVGhlIHNlcnZlciByZWFkcyBmcm9tIHRoZSBgUk9PVF9VUkxgIGVudmlyb25tZW50IHZhcmlhYmxlIHRvIGRldGVybWluZSB3aGVyZSBpdCBpcyBydW5uaW5nLiBUaGlzIGlzIHRha2VuIGNhcmUgb2YgYXV0b21hdGljYWxseSBmb3IgYXBwcyBkZXBsb3llZCB0byBHYWxheHksIGJ1dCBtdXN0IGJlIHByb3ZpZGVkIHdoZW4gdXNpbmcgYG1ldGVvciBidWlsZGAuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF0gQSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgcm9vdCBVUkwuIERvIG5vdCBpbmNsdWRlIGEgbGVhZGluZyBcImAvYFwiLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnNlY3VyZSBDcmVhdGUgYW4gSFRUUFMgVVJMLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlcGxhY2VMb2NhbGhvc3QgUmVwbGFjZSBsb2NhbGhvc3Qgd2l0aCAxMjcuMC4wLjEuIFVzZWZ1bCBmb3Igc2VydmljZXMgdGhhdCBkb24ndCByZWNvZ25pemUgbG9jYWxob3N0IGFzIGEgZG9tYWluIG5hbWUuXG4gKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5yb290VXJsIE92ZXJyaWRlIHRoZSBkZWZhdWx0IFJPT1RfVVJMIGZyb20gdGhlIHNlcnZlciBlbnZpcm9ubWVudC4gRm9yIGV4YW1wbGU6IFwiYGh0dHA6Ly9mb28uZXhhbXBsZS5jb21gXCJcbiAqL1xuTWV0ZW9yLmFic29sdXRlVXJsID0gZnVuY3Rpb24gKHBhdGgsIG9wdGlvbnMpIHtcbiAgLy8gcGF0aCBpcyBvcHRpb25hbFxuICBpZiAoIW9wdGlvbnMgJiYgdHlwZW9mIHBhdGggPT09ICdvYmplY3QnKSB7XG4gICAgb3B0aW9ucyA9IHBhdGg7XG4gICAgcGF0aCA9IHVuZGVmaW5lZDtcbiAgfVxuICAvLyBtZXJnZSBvcHRpb25zIHdpdGggZGVmYXVsdHNcbiAgb3B0aW9ucyA9IF8uZXh0ZW5kKHt9LCBNZXRlb3IuYWJzb2x1dGVVcmwuZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMgfHwge30pO1xuXG4gIHZhciB1cmwgPSBvcHRpb25zLnJvb3RVcmw7XG4gIGlmICghdXJsKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgcGFzcyBvcHRpb25zLnJvb3RVcmwgb3Igc2V0IFJPT1RfVVJMIGluIHRoZSBzZXJ2ZXIgZW52aXJvbm1lbnRcIik7XG5cbiAgaWYgKCEvXmh0dHBbc10/OlxcL1xcLy9pLnRlc3QodXJsKSkgLy8gdXJsIHN0YXJ0cyB3aXRoICdodHRwOi8vJyBvciAnaHR0cHM6Ly8nXG4gICAgdXJsID0gJ2h0dHA6Ly8nICsgdXJsOyAvLyB3ZSB3aWxsIGxhdGVyIGZpeCB0byBodHRwcyBpZiBvcHRpb25zLnNlY3VyZSBpcyBzZXRcblxuICBpZiAoIS9cXC8kLy50ZXN0KHVybCkpIC8vIHVybCBlbmRzIHdpdGggJy8nXG4gICAgdXJsICs9ICcvJztcblxuICBpZiAocGF0aClcbiAgICB1cmwgKz0gcGF0aDtcblxuICAvLyB0dXJuIGh0dHAgdG8gaHR0cHMgaWYgc2VjdXJlIG9wdGlvbiBpcyBzZXQsIGFuZCB3ZSdyZSBub3QgdGFsa2luZ1xuICAvLyB0byBsb2NhbGhvc3QuXG4gIGlmIChvcHRpb25zLnNlY3VyZSAmJlxuICAgICAgL15odHRwOi8udGVzdCh1cmwpICYmIC8vIHVybCBzdGFydHMgd2l0aCAnaHR0cDonXG4gICAgICAhL2h0dHA6XFwvXFwvbG9jYWxob3N0WzpcXC9dLy50ZXN0KHVybCkgJiYgLy8gZG9lc24ndCBtYXRjaCBsb2NhbGhvc3RcbiAgICAgICEvaHR0cDpcXC9cXC8xMjdcXC4wXFwuMFxcLjFbOlxcL10vLnRlc3QodXJsKSkgLy8gb3IgMTI3LjAuMC4xXG4gICAgdXJsID0gdXJsLnJlcGxhY2UoL15odHRwOi8sICdodHRwczonKTtcblxuICBpZiAob3B0aW9ucy5yZXBsYWNlTG9jYWxob3N0KVxuICAgIHVybCA9IHVybC5yZXBsYWNlKC9eaHR0cDpcXC9cXC9sb2NhbGhvc3QoWzpcXC9dLiopLywgJ2h0dHA6Ly8xMjcuMC4wLjEkMScpO1xuXG4gIHJldHVybiB1cmw7XG59O1xuXG4vLyBhbGxvdyBsYXRlciBwYWNrYWdlcyB0byBvdmVycmlkZSBkZWZhdWx0IG9wdGlvbnNcbk1ldGVvci5hYnNvbHV0ZVVybC5kZWZhdWx0T3B0aW9ucyA9IHsgfTtcbmlmICh0eXBlb2YgX19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9PT0gXCJvYmplY3RcIiAmJlxuICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkwpXG4gIE1ldGVvci5hYnNvbHV0ZVVybC5kZWZhdWx0T3B0aW9ucy5yb290VXJsID0gX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTDtcblxuXG5NZXRlb3IuX3JlbGF0aXZlVG9TaXRlUm9vdFVybCA9IGZ1bmN0aW9uIChsaW5rKSB7XG4gIGlmICh0eXBlb2YgX19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgbGluay5zdWJzdHIoMCwgMSkgPT09IFwiL1wiKVxuICAgIGxpbmsgPSAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCB8fCBcIlwiKSArIGxpbms7XG4gIHJldHVybiBsaW5rO1xufTtcbiIsImlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHtcbiAgLypcbiAgICogQmFzZWQgb24gaHR0cHM6Ly9naXRodWIuY29tL2Nvd2JveS9ub2RlLWV4aXRcbiAgICpcbiAgICogQ29weXJpZ2h0IChjKSAyMDEzIFwiQ293Ym95XCIgQmVuIEFsbWFuXG4gICAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAgICovXG4gIHZhciBvcmlnUHJvY2Vzc0V4aXQgPSBwcm9jZXNzLmV4aXQuYmluZChwcm9jZXNzKTtcbiAgcHJvY2Vzcy5leGl0ID0gZnVuY3Rpb24gKGV4aXRDb2RlKSB7XG4gICAgdmFyIHN0cmVhbXMgPSBbcHJvY2Vzcy5zdGRvdXQsIHByb2Nlc3Muc3RkZXJyXTtcbiAgICB2YXIgZHJhaW5Db3VudCA9IDA7XG4gICAgLy8gQWN0dWFsbHkgZXhpdCBpZiBhbGwgc3RyZWFtcyBhcmUgZHJhaW5lZC5cbiAgICBmdW5jdGlvbiB0cnlUb0V4aXQoKSB7XG4gICAgICBpZiAoZHJhaW5Db3VudCA9PT0gc3RyZWFtcy5sZW5ndGgpIHtcbiAgICAgICAgb3JpZ1Byb2Nlc3NFeGl0KGV4aXRDb2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgc3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgLy8gQ291bnQgZHJhaW5lZCBzdHJlYW1zIG5vdywgYnV0IG1vbml0b3Igbm9uLWRyYWluZWQgc3RyZWFtcy5cbiAgICAgIGlmIChzdHJlYW0uYnVmZmVyU2l6ZSA9PT0gMCkge1xuICAgICAgICBkcmFpbkNvdW50Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJlYW0ud3JpdGUoJycsICd1dGYtOCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRyYWluQ291bnQrKztcbiAgICAgICAgICB0cnlUb0V4aXQoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyBQcmV2ZW50IGZ1cnRoZXIgd3JpdGluZy5cbiAgICAgIHN0cmVhbS53cml0ZSA9IGZ1bmN0aW9uKCkge307XG4gICAgfSk7XG4gICAgLy8gSWYgYWxsIHN0cmVhbXMgd2VyZSBhbHJlYWR5IGRyYWluZWQsIGV4aXQgbm93LlxuICAgIHRyeVRvRXhpdCgpO1xuICAgIC8vIEluIFdpbmRvd3MsIHdoZW4gcnVuIGFzIGEgTm9kZS5qcyBjaGlsZCBwcm9jZXNzLCBhIHNjcmlwdCB1dGlsaXppbmdcbiAgICAvLyB0aGlzIGxpYnJhcnkgbWlnaHQganVzdCBleGl0IHdpdGggYSAwIGV4aXQgY29kZSwgcmVnYXJkbGVzcy4gVGhpcyBjb2RlLFxuICAgIC8vIGRlc3BpdGUgdGhlIGZhY3QgdGhhdCBpdCBsb29rcyBhIGJpdCBjcmF6eSwgYXBwZWFycyB0byBmaXggdGhhdC5cbiAgICBwcm9jZXNzLm9uKCdleGl0JywgZnVuY3Rpb24oKSB7XG4gICAgICBvcmlnUHJvY2Vzc0V4aXQoZXhpdENvZGUpO1xuICAgIH0pO1xuICB9O1xufSJdfQ==
