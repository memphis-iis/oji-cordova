(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var meteorInstall = Package['modules-runtime'].meteorInstall;

/* Package-scope variables */
var Buffer, process;

var require = meteorInstall({"node_modules":{"meteor":{"modules":{"server.js":["./install-packages.js","./buffer.js","./process.js",function(require){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/modules/server.js                                             //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
require("./install-packages.js");
require("./buffer.js");
require("./process.js");

////////////////////////////////////////////////////////////////////////////

}],"buffer.js":["buffer",function(require){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/modules/buffer.js                                             //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
try {
  Buffer = global.Buffer || require("buffer").Buffer;
} catch (noBuffer) {}

////////////////////////////////////////////////////////////////////////////

}],"install-packages.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/modules/install-packages.js                                   //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
function install(name) {
  var meteorDir = {};

  // Given a package name <name>, install a stub module in the
  // /node_modules/meteor directory called <name>.js, so that
  // require.resolve("meteor/<name>") will always return
  // /node_modules/meteor/<name>.js instead of something like
  // /node_modules/meteor/<name>/index.js, in the rare but possible event
  // that the package contains a file called index.js (#6590).
  meteorDir[name + ".js"] = function (r, e, module) {
    module.exports = Package[name];
  };

  meteorInstall({
    node_modules: {
      meteor: meteorDir
    }
  });
}

// This file will be modified during computeJsOutputFilesMap to include
// install(<name>) calls for every Meteor package.

install("underscore");
install("meteor");
install("babel-compiler");
install("ecmascript");
install("modules-runtime");
install("modules");
install("promise");
install("ecmascript-runtime");
install("babel-runtime");
install("random");
install("caching-compiler");
install("compileCoffeescript");

////////////////////////////////////////////////////////////////////////////

},"process.js":["process",function(require,exports,module){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/modules/process.js                                            //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
try {
  // The application can run `npm install process` to provide its own
  // process stub; otherwise this module will provide a partial stub.
  process = global.process || require("process");
} catch (noProcess) {
  process = {};
}

if (Meteor.isServer) {
  // Make require("process") work on the server in all versions of Node.
  meteorInstall({
    node_modules: {
      "process.js": function (r, e, module) {
        module.exports = process;
      }
    }
  });
} else {
  process.platform = "browser";
  process.nextTick = process.nextTick || Meteor._setImmediate;
}

if (typeof process.env !== "object") {
  process.env = {};
}

_.extend(process.env, meteorEnv);

////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/modules/server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.modules = exports, {
  meteorInstall: meteorInstall,
  Buffer: Buffer,
  process: process
});

})();



//# sourceURL=meteor://💻app/packages/modules.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9kdWxlcy9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vZHVsZXMvYnVmZmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb2R1bGVzL2luc3RhbGwtcGFja2FnZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vZHVsZXMvcHJvY2Vzcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7O0FDRkE7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Ii9wYWNrYWdlcy9tb2R1bGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsicmVxdWlyZShcIi4vaW5zdGFsbC1wYWNrYWdlcy5qc1wiKTtcbnJlcXVpcmUoXCIuL2J1ZmZlci5qc1wiKTtcbnJlcXVpcmUoXCIuL3Byb2Nlc3MuanNcIik7XG4iLCJ0cnkge1xuICBCdWZmZXIgPSBnbG9iYWwuQnVmZmVyIHx8IHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyO1xufSBjYXRjaCAobm9CdWZmZXIpIHt9XG4iLCJmdW5jdGlvbiBpbnN0YWxsKG5hbWUpIHtcbiAgdmFyIG1ldGVvckRpciA9IHt9O1xuXG4gIC8vIEdpdmVuIGEgcGFja2FnZSBuYW1lIDxuYW1lPiwgaW5zdGFsbCBhIHN0dWIgbW9kdWxlIGluIHRoZVxuICAvLyAvbm9kZV9tb2R1bGVzL21ldGVvciBkaXJlY3RvcnkgY2FsbGVkIDxuYW1lPi5qcywgc28gdGhhdFxuICAvLyByZXF1aXJlLnJlc29sdmUoXCJtZXRlb3IvPG5hbWU+XCIpIHdpbGwgYWx3YXlzIHJldHVyblxuICAvLyAvbm9kZV9tb2R1bGVzL21ldGVvci88bmFtZT4uanMgaW5zdGVhZCBvZiBzb21ldGhpbmcgbGlrZVxuICAvLyAvbm9kZV9tb2R1bGVzL21ldGVvci88bmFtZT4vaW5kZXguanMsIGluIHRoZSByYXJlIGJ1dCBwb3NzaWJsZSBldmVudFxuICAvLyB0aGF0IHRoZSBwYWNrYWdlIGNvbnRhaW5zIGEgZmlsZSBjYWxsZWQgaW5kZXguanMgKCM2NTkwKS5cbiAgbWV0ZW9yRGlyW25hbWUgKyBcIi5qc1wiXSA9IGZ1bmN0aW9uIChyLCBlLCBtb2R1bGUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFBhY2thZ2VbbmFtZV07XG4gIH07XG5cbiAgbWV0ZW9ySW5zdGFsbCh7XG4gICAgbm9kZV9tb2R1bGVzOiB7XG4gICAgICBtZXRlb3I6IG1ldGVvckRpclxuICAgIH1cbiAgfSk7XG59XG5cbi8vIFRoaXMgZmlsZSB3aWxsIGJlIG1vZGlmaWVkIGR1cmluZyBjb21wdXRlSnNPdXRwdXRGaWxlc01hcCB0byBpbmNsdWRlXG4vLyBpbnN0YWxsKDxuYW1lPikgY2FsbHMgZm9yIGV2ZXJ5IE1ldGVvciBwYWNrYWdlLlxuXG5pbnN0YWxsKFwidW5kZXJzY29yZVwiKTtcbmluc3RhbGwoXCJtZXRlb3JcIik7XG5pbnN0YWxsKFwiYmFiZWwtY29tcGlsZXJcIik7XG5pbnN0YWxsKFwiZWNtYXNjcmlwdFwiKTtcbmluc3RhbGwoXCJtb2R1bGVzLXJ1bnRpbWVcIik7XG5pbnN0YWxsKFwibW9kdWxlc1wiKTtcbmluc3RhbGwoXCJwcm9taXNlXCIpO1xuaW5zdGFsbChcImVjbWFzY3JpcHQtcnVudGltZVwiKTtcbmluc3RhbGwoXCJiYWJlbC1ydW50aW1lXCIpO1xuaW5zdGFsbChcInJhbmRvbVwiKTtcbmluc3RhbGwoXCJjYWNoaW5nLWNvbXBpbGVyXCIpO1xuaW5zdGFsbChcImNvbXBpbGVDb2ZmZWVzY3JpcHRcIik7XG4iLCJ0cnkge1xuICAvLyBUaGUgYXBwbGljYXRpb24gY2FuIHJ1biBgbnBtIGluc3RhbGwgcHJvY2Vzc2AgdG8gcHJvdmlkZSBpdHMgb3duXG4gIC8vIHByb2Nlc3Mgc3R1Yjsgb3RoZXJ3aXNlIHRoaXMgbW9kdWxlIHdpbGwgcHJvdmlkZSBhIHBhcnRpYWwgc3R1Yi5cbiAgcHJvY2VzcyA9IGdsb2JhbC5wcm9jZXNzIHx8IHJlcXVpcmUoXCJwcm9jZXNzXCIpO1xufSBjYXRjaCAobm9Qcm9jZXNzKSB7XG4gIHByb2Nlc3MgPSB7fTtcbn1cblxuaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICAvLyBNYWtlIHJlcXVpcmUoXCJwcm9jZXNzXCIpIHdvcmsgb24gdGhlIHNlcnZlciBpbiBhbGwgdmVyc2lvbnMgb2YgTm9kZS5cbiAgbWV0ZW9ySW5zdGFsbCh7XG4gICAgbm9kZV9tb2R1bGVzOiB7XG4gICAgICBcInByb2Nlc3MuanNcIjogZnVuY3Rpb24gKHIsIGUsIG1vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHByb2Nlc3M7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn0gZWxzZSB7XG4gIHByb2Nlc3MucGxhdGZvcm0gPSBcImJyb3dzZXJcIjtcbiAgcHJvY2Vzcy5uZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2sgfHwgTWV0ZW9yLl9zZXRJbW1lZGlhdGU7XG59XG5cbmlmICh0eXBlb2YgcHJvY2Vzcy5lbnYgIT09IFwib2JqZWN0XCIpIHtcbiAgcHJvY2Vzcy5lbnYgPSB7fTtcbn1cblxuXy5leHRlbmQocHJvY2Vzcy5lbnYsIG1ldGVvckVudik7XG4iXX0=
