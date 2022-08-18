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

//////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                          //
// packages/minifier-js/minifier.js                                                         //
//                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////
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
      evaluate: false,
      // work around issue in terser (possibly https://github.com/terser/terser/issues/837)
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
//////////////////////////////////////////////////////////////////////////////////////////////

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaWZpZXItanMvbWluaWZpZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwibWV0ZW9ySnNNaW5pZnkiLCJ0ZXJzZXIiLCJ0ZXJzZXJNaW5pZnkiLCJzb3VyY2UiLCJvcHRpb25zIiwiY2FsbGJhY2siLCJOcG0iLCJyZXF1aXJlIiwicmVzdWx0IiwibWluaWZ5IiwiZSIsIk5PREVfRU5WIiwicHJvY2VzcyIsImVudiIsImNvbXByZXNzIiwiZHJvcF9kZWJ1Z2dlciIsInVudXNlZCIsImRlYWRfY29kZSIsImV2YWx1YXRlIiwidHlwZW9mcyIsImdsb2JhbF9kZWZzIiwic2FmYXJpMTAiLCJ0ZXJzZXJKc01pbmlmeSIsIk1ldGVvciIsIndyYXBBc3luYyIsInRlcnNlclJlc3VsdCIsImNvZGUiLCJtaW5pZmllciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxNQUFQLENBQWM7QUFBQ0MsZ0JBQWMsRUFBQyxNQUFJQTtBQUFwQixDQUFkO0FBQUEsSUFBSUMsTUFBSjs7QUFFQSxNQUFNQyxZQUFZLEdBQUcsQ0FBT0MsTUFBUCxFQUFlQyxPQUFmLEVBQXdCQyxRQUF4Qiw4QkFBcUM7QUFDeERKLFFBQU0sR0FBR0EsTUFBTSxJQUFJSyxHQUFHLENBQUNDLE9BQUosQ0FBWSxRQUFaLENBQW5COztBQUNBLE1BQUk7QUFDRixVQUFNQyxNQUFNLGlCQUFTUCxNQUFNLENBQUNRLE1BQVAsQ0FBY04sTUFBZCxFQUFzQkMsT0FBdEIsQ0FBVCxDQUFaO0FBQ0FDLFlBQVEsQ0FBQyxJQUFELEVBQU9HLE1BQVAsQ0FBUjtBQUNBLFdBQU9BLE1BQVA7QUFDRCxHQUpELENBSUUsT0FBT0UsQ0FBUCxFQUFVO0FBQ1ZMLFlBQVEsQ0FBQ0ssQ0FBRCxDQUFSO0FBQ0EsV0FBT0EsQ0FBUDtBQUNEO0FBQ0YsQ0FWb0IsQ0FBckI7O0FBWU8sTUFBTVYsY0FBYyxHQUFHLFVBQVVHLE1BQVYsRUFBa0I7QUFDOUMsUUFBTUssTUFBTSxHQUFHLEVBQWY7QUFDQSxRQUFNRyxRQUFRLEdBQUdDLE9BQU8sQ0FBQ0MsR0FBUixDQUFZRixRQUFaLElBQXdCLGFBQXpDO0FBR0EsUUFBTVAsT0FBTyxHQUFHO0FBQ2RVLFlBQVEsRUFBRTtBQUNSQyxtQkFBYSxFQUFFLEtBRFA7QUFDZTtBQUN2QkMsWUFBTSxFQUFFLEtBRkE7QUFFZTtBQUN2QkMsZUFBUyxFQUFFLElBSEg7QUFHZTtBQUN2QkMsY0FBUSxFQUFFLEtBSkY7QUFJZTtBQUN2QkMsYUFBTyxFQUFFLEtBTEQ7QUFLZTtBQUN2QkMsaUJBQVcsRUFBRTtBQUNYLGdDQUF3QlQ7QUFEYjtBQU5MLEtBREk7QUFXZDtBQUNBO0FBQ0E7QUFDQVUsWUFBUSxFQUFFLElBZEksQ0FjVzs7QUFkWCxHQUFoQjtBQWlCQSxRQUFNQyxjQUFjLEdBQUdDLE1BQU0sQ0FBQ0MsU0FBUCxDQUFpQnRCLFlBQWpCLENBQXZCO0FBQ0EsTUFBSXVCLFlBQUo7O0FBQ0EsTUFBSTtBQUNGQSxnQkFBWSxHQUFHSCxjQUFjLENBQUNuQixNQUFELEVBQVNDLE9BQVQsQ0FBN0I7QUFDRCxHQUZELENBRUUsT0FBT00sQ0FBUCxFQUFVO0FBQ1YsVUFBTUEsQ0FBTjtBQUNELEdBNUI2QyxDQThCOUM7OztBQUNBRixRQUFNLENBQUNrQixJQUFQLEdBQWNELFlBQVksQ0FBQ0MsSUFBM0I7QUFDQWxCLFFBQU0sQ0FBQ21CLFFBQVAsR0FBa0IsUUFBbEI7QUFFQSxTQUFPbkIsTUFBUDtBQUNELENBbkNNLEMiLCJmaWxlIjoiL3BhY2thZ2VzL21pbmlmaWVyLWpzLmpzIiwic291cmNlc0NvbnRlbnQiOlsibGV0IHRlcnNlcjtcblxuY29uc3QgdGVyc2VyTWluaWZ5ID0gYXN5bmMgKHNvdXJjZSwgb3B0aW9ucywgY2FsbGJhY2spID0+IHtcbiAgdGVyc2VyID0gdGVyc2VyIHx8IE5wbS5yZXF1aXJlKFwidGVyc2VyXCIpO1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRlcnNlci5taW5pZnkoc291cmNlLCBvcHRpb25zKTtcbiAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjYWxsYmFjayhlKTtcbiAgICByZXR1cm4gZTtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IG1ldGVvckpzTWluaWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSkge1xuICBjb25zdCByZXN1bHQgPSB7fTtcbiAgY29uc3QgTk9ERV9FTlYgPSBwcm9jZXNzLmVudi5OT0RFX0VOViB8fCBcImRldmVsb3BtZW50XCI7XG5cblxuICBjb25zdCBvcHRpb25zID0ge1xuICAgIGNvbXByZXNzOiB7XG4gICAgICBkcm9wX2RlYnVnZ2VyOiBmYWxzZSwgIC8vIHJlbW92ZSBkZWJ1Z2dlcjsgc3RhdGVtZW50c1xuICAgICAgdW51c2VkOiBmYWxzZSwgICAgICAgICAvLyBkcm9wIHVucmVmZXJlbmNlZCBmdW5jdGlvbnMgYW5kIHZhcmlhYmxlc1xuICAgICAgZGVhZF9jb2RlOiB0cnVlLCAgICAgICAvLyByZW1vdmUgdW5yZWFjaGFibGUgY29kZVxuICAgICAgZXZhbHVhdGU6IGZhbHNlLCAgICAgICAvLyB3b3JrIGFyb3VuZCBpc3N1ZSBpbiB0ZXJzZXIgKHBvc3NpYmx5IGh0dHBzOi8vZ2l0aHViLmNvbS90ZXJzZXIvdGVyc2VyL2lzc3Vlcy84MzcpXG4gICAgICB0eXBlb2ZzOiBmYWxzZSwgICAgICAgIC8vIHNldCB0byBmYWxzZSBkdWUgdG8ga25vd24gaXNzdWVzIGluIElFMTBcbiAgICAgIGdsb2JhbF9kZWZzOiB7XG4gICAgICAgIFwicHJvY2Vzcy5lbnYuTk9ERV9FTlZcIjogTk9ERV9FTlZcbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIEZpeCBpc3N1ZSAjOTg2NiwgYXMgZXhwbGFpbmVkIGluIHRoaXMgY29tbWVudDpcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWlzaG9vL1VnbGlmeUpTMi9pc3N1ZXMvMTc1MyNpc3N1ZWNvbW1lbnQtMzI0ODE0NzgyXG4gICAgLy8gQW5kIGZpeCB0ZXJzZXIgaXNzdWUgIzExNzogaHR0cHM6Ly9naXRodWIuY29tL3RlcnNlci1qcy90ZXJzZXIvaXNzdWVzLzExN1xuICAgIHNhZmFyaTEwOiB0cnVlLCAgICAgICAgICAvLyBzZXQgdGhpcyBvcHRpb24gdG8gdHJ1ZSB0byB3b3JrIGFyb3VuZCB0aGUgU2FmYXJpIDEwLzExIGF3YWl0IGJ1Z1xuICB9O1xuXG4gIGNvbnN0IHRlcnNlckpzTWluaWZ5ID0gTWV0ZW9yLndyYXBBc3luYyh0ZXJzZXJNaW5pZnkpO1xuICBsZXQgdGVyc2VyUmVzdWx0O1xuICB0cnkge1xuICAgIHRlcnNlclJlc3VsdCA9IHRlcnNlckpzTWluaWZ5KHNvdXJjZSwgb3B0aW9ucyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgLy8gdGhpcyBpcyBrZXB0IHRvIG1haW50YWluIGJhY2t3YXJkcyBjb21wYXRhYmlsaXR5XG4gIHJlc3VsdC5jb2RlID0gdGVyc2VyUmVzdWx0LmNvZGU7XG4gIHJlc3VsdC5taW5pZmllciA9ICd0ZXJzZXInO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuIl19
