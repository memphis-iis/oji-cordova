(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Babel = Package['babel-compiler'].Babel;
var BabelCompiler = Package['babel-compiler'].BabelCompiler;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var meteorJsMinify;

var require = meteorInstall({"node_modules":{"meteor":{"minifier-js":{"minifier.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////
//                                                                                      //
// packages/minifier-js/minifier.js                                                     //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////
                                                                                        //
module.export({
  meteorJsMinify: () => meteorJsMinify
});
let terser;

const terserMinify = (source, options, callback) => Promise.asyncApply(() => {
  terser = terser || Npm.require("terser");

  try {
    const result = Promise.await(terser.minify(source, options));
    callback(null, result);
    return result;
  } catch (e) {
    callback(e);
    return e;
  }
});

const meteorJsMinify = function (source) {
  const result = {};
  const NODE_ENV = process.env.NODE_ENV || "development";
  const options = {
    compress: {
      drop_debugger: false,
      // remove debugger; statements
      unused: false,
      // drop unreferenced functions and variables
      dead_code: true,
      // remove unreachable code
      typeofs: false,
      // set to false due to known issues in IE10
      global_defs: {
        "process.env.NODE_ENV": NODE_ENV
      }
    },
    // Fix issue #9866, as explained in this comment:
    // https://github.com/mishoo/UglifyJS2/issues/1753#issuecomment-324814782
    // And fix terser issue #117: https://github.com/terser-js/terser/issues/117
    safari10: true // set this option to true to work around the Safari 10/11 await bug

  };
  const terserJsMinify = Meteor.wrapAsync(terserMinify);
  let terserResult;

  try {
    terserResult = terserJsMinify(source, options);
  } catch (e) {
    throw e;
  } // this is kept to maintain backwards compatability


  result.code = terserResult.code;
  result.minifier = 'terser';
  return result;
};
//////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/minifier-js/minifier.js");

/* Exports */
Package._define("minifier-js", exports, {
  meteorJsMinify: meteorJsMinify
});

})();




//# sourceURL=meteor://💻app/packages/minifier-js.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaWZpZXItanMvbWluaWZpZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwibWV0ZW9ySnNNaW5pZnkiLCJ0ZXJzZXIiLCJ0ZXJzZXJNaW5pZnkiLCJzb3VyY2UiLCJvcHRpb25zIiwiY2FsbGJhY2siLCJOcG0iLCJyZXF1aXJlIiwicmVzdWx0IiwibWluaWZ5IiwiZSIsIk5PREVfRU5WIiwicHJvY2VzcyIsImVudiIsImNvbXByZXNzIiwiZHJvcF9kZWJ1Z2dlciIsInVudXNlZCIsImRlYWRfY29kZSIsInR5cGVvZnMiLCJnbG9iYWxfZGVmcyIsInNhZmFyaTEwIiwidGVyc2VySnNNaW5pZnkiLCJNZXRlb3IiLCJ3cmFwQXN5bmMiLCJ0ZXJzZXJSZXN1bHQiLCJjb2RlIiwibWluaWZpZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjO0FBQUNDLGdCQUFjLEVBQUMsTUFBSUE7QUFBcEIsQ0FBZDtBQUFBLElBQUlDLE1BQUo7O0FBRUEsTUFBTUMsWUFBWSxHQUFHLENBQU9DLE1BQVAsRUFBZUMsT0FBZixFQUF3QkMsUUFBeEIsOEJBQXFDO0FBQ3hESixRQUFNLEdBQUdBLE1BQU0sSUFBSUssR0FBRyxDQUFDQyxPQUFKLENBQVksUUFBWixDQUFuQjs7QUFDQSxNQUFJO0FBQ0YsVUFBTUMsTUFBTSxpQkFBU1AsTUFBTSxDQUFDUSxNQUFQLENBQWNOLE1BQWQsRUFBc0JDLE9BQXRCLENBQVQsQ0FBWjtBQUNBQyxZQUFRLENBQUMsSUFBRCxFQUFPRyxNQUFQLENBQVI7QUFDQSxXQUFPQSxNQUFQO0FBQ0QsR0FKRCxDQUlFLE9BQU9FLENBQVAsRUFBVTtBQUNWTCxZQUFRLENBQUNLLENBQUQsQ0FBUjtBQUNBLFdBQU9BLENBQVA7QUFDRDtBQUNGLENBVm9CLENBQXJCOztBQVlPLE1BQU1WLGNBQWMsR0FBRyxVQUFVRyxNQUFWLEVBQWtCO0FBQzlDLFFBQU1LLE1BQU0sR0FBRyxFQUFmO0FBQ0EsUUFBTUcsUUFBUSxHQUFHQyxPQUFPLENBQUNDLEdBQVIsQ0FBWUYsUUFBWixJQUF3QixhQUF6QztBQUdBLFFBQU1QLE9BQU8sR0FBRztBQUNkVSxZQUFRLEVBQUU7QUFDUkMsbUJBQWEsRUFBRSxLQURQO0FBQ2U7QUFDdkJDLFlBQU0sRUFBRSxLQUZBO0FBRWU7QUFDdkJDLGVBQVMsRUFBRSxJQUhIO0FBR2U7QUFDdkJDLGFBQU8sRUFBRSxLQUpEO0FBSWU7QUFDdkJDLGlCQUFXLEVBQUU7QUFDWCxnQ0FBd0JSO0FBRGI7QUFMTCxLQURJO0FBVWQ7QUFDQTtBQUNBO0FBQ0FTLFlBQVEsRUFBRSxJQWJJLENBYVc7O0FBYlgsR0FBaEI7QUFnQkEsUUFBTUMsY0FBYyxHQUFHQyxNQUFNLENBQUNDLFNBQVAsQ0FBaUJyQixZQUFqQixDQUF2QjtBQUNBLE1BQUlzQixZQUFKOztBQUNBLE1BQUk7QUFDRkEsZ0JBQVksR0FBR0gsY0FBYyxDQUFDbEIsTUFBRCxFQUFTQyxPQUFULENBQTdCO0FBQ0QsR0FGRCxDQUVFLE9BQU9NLENBQVAsRUFBVTtBQUNWLFVBQU1BLENBQU47QUFDRCxHQTNCNkMsQ0E2QjlDOzs7QUFDQUYsUUFBTSxDQUFDaUIsSUFBUCxHQUFjRCxZQUFZLENBQUNDLElBQTNCO0FBQ0FqQixRQUFNLENBQUNrQixRQUFQLEdBQWtCLFFBQWxCO0FBRUEsU0FBT2xCLE1BQVA7QUFDRCxDQWxDTSxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9taW5pZmllci1qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImxldCB0ZXJzZXI7XG5cbmNvbnN0IHRlcnNlck1pbmlmeSA9IGFzeW5jIChzb3VyY2UsIG9wdGlvbnMsIGNhbGxiYWNrKSA9PiB7XG4gIHRlcnNlciA9IHRlcnNlciB8fCBOcG0ucmVxdWlyZShcInRlcnNlclwiKTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0ZXJzZXIubWluaWZ5KHNvdXJjZSwgb3B0aW9ucyk7XG4gICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGNhdGNoIChlKSB7XG4gICAgY2FsbGJhY2soZSk7XG4gICAgcmV0dXJuIGU7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBtZXRlb3JKc01pbmlmeSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgY29uc3QgcmVzdWx0ID0ge307XG4gIGNvbnN0IE5PREVfRU5WID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgXCJkZXZlbG9wbWVudFwiO1xuXG5cbiAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICBjb21wcmVzczoge1xuICAgICAgZHJvcF9kZWJ1Z2dlcjogZmFsc2UsICAvLyByZW1vdmUgZGVidWdnZXI7IHN0YXRlbWVudHNcbiAgICAgIHVudXNlZDogZmFsc2UsICAgICAgICAgLy8gZHJvcCB1bnJlZmVyZW5jZWQgZnVuY3Rpb25zIGFuZCB2YXJpYWJsZXNcbiAgICAgIGRlYWRfY29kZTogdHJ1ZSwgICAgICAgLy8gcmVtb3ZlIHVucmVhY2hhYmxlIGNvZGVcbiAgICAgIHR5cGVvZnM6IGZhbHNlLCAgICAgICAgLy8gc2V0IHRvIGZhbHNlIGR1ZSB0byBrbm93biBpc3N1ZXMgaW4gSUUxMFxuICAgICAgZ2xvYmFsX2RlZnM6IHtcbiAgICAgICAgXCJwcm9jZXNzLmVudi5OT0RFX0VOVlwiOiBOT0RFX0VOVlxuICAgICAgfVxuICAgIH0sXG4gICAgLy8gRml4IGlzc3VlICM5ODY2LCBhcyBleHBsYWluZWQgaW4gdGhpcyBjb21tZW50OlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9taXNob28vVWdsaWZ5SlMyL2lzc3Vlcy8xNzUzI2lzc3VlY29tbWVudC0zMjQ4MTQ3ODJcbiAgICAvLyBBbmQgZml4IHRlcnNlciBpc3N1ZSAjMTE3OiBodHRwczovL2dpdGh1Yi5jb20vdGVyc2VyLWpzL3RlcnNlci9pc3N1ZXMvMTE3XG4gICAgc2FmYXJpMTA6IHRydWUsICAgICAgICAgIC8vIHNldCB0aGlzIG9wdGlvbiB0byB0cnVlIHRvIHdvcmsgYXJvdW5kIHRoZSBTYWZhcmkgMTAvMTEgYXdhaXQgYnVnXG4gIH07XG5cbiAgY29uc3QgdGVyc2VySnNNaW5pZnkgPSBNZXRlb3Iud3JhcEFzeW5jKHRlcnNlck1pbmlmeSk7XG4gIGxldCB0ZXJzZXJSZXN1bHQ7XG4gIHRyeSB7XG4gICAgdGVyc2VyUmVzdWx0ID0gdGVyc2VySnNNaW5pZnkoc291cmNlLCBvcHRpb25zKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IGU7XG4gIH1cblxuICAvLyB0aGlzIGlzIGtlcHQgdG8gbWFpbnRhaW4gYmFja3dhcmRzIGNvbXBhdGFiaWxpdHlcbiAgcmVzdWx0LmNvZGUgPSB0ZXJzZXJSZXN1bHQuY29kZTtcbiAgcmVzdWx0Lm1pbmlmaWVyID0gJ3RlcnNlcic7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iXX0=
