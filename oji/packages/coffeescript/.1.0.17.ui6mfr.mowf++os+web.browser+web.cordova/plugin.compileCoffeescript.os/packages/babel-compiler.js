(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;

/* Package-scope variables */
var Babel, BabelCompiler;

(function(){

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
// packages/babel-compiler/babel.js                                           //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
                                                                              //
var meteorBabel = Npm.require('meteor-babel');

/**
 * Returns a new object containing default options appropriate for
 */
function getDefaultOptions(extraFeatures) {
  // See https://github.com/meteor/babel/blob/master/options.js for more
  // information about what the default options are.
  var options = meteorBabel.getDefaultOptions(extraFeatures);

  // The sourceMap option should probably be removed from the default
  // options returned by meteorBabel.getDefaultOptions.
  delete options.sourceMap;

  return options;
}

Babel = {
  getDefaultOptions: getDefaultOptions,

  // Deprecated, now a no-op.
  validateExtraFeatures: Function.prototype,

  compile: function (source, options) {
    options = options || getDefaultOptions();
    return meteorBabel.compile(source, options);
  },

  setCacheDir: function (cacheDir) {
    meteorBabel.setCacheDir(cacheDir);
  }
};

////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
// packages/babel-compiler/babel-compiler.js                                  //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////
                                                                              //
/**
 * A compiler that can be instantiated with features and used inside
 * Plugin.registerCompiler
 * @param {Object} extraFeatures The same object that getDefaultOptions takes
 */
BabelCompiler = function BabelCompiler(extraFeatures) {
  this.extraFeatures = extraFeatures;
};

var BCp = BabelCompiler.prototype;
var excludedFileExtensionPattern = /\.es5\.js$/i;

BCp.processFilesForTarget = function (inputFiles) {
  var self = this;

  inputFiles.forEach(function (inputFile) {
    var source = inputFile.getContentsAsString();
    var packageName = inputFile.getPackageName();
    var inputFilePath = inputFile.getPathInPackage();
    var outputFilePath = inputFilePath;
    var fileOptions = inputFile.getFileOptions();
    var toBeAdded = {
      sourcePath: inputFilePath,
      path: outputFilePath,
      data: source,
      hash: inputFile.getSourceHash(),
      sourceMap: null,
      bare: !! fileOptions.bare
    };

    // If you need to exclude a specific file within a package from Babel
    // compilation, pass the { transpile: false } options to api.addFiles
    // when you add that file.
    if (fileOptions.transpile !== false &&
        // If you need to exclude a specific file within an app from Babel
        // compilation, give it the following file extension: .es5.js
        ! excludedFileExtensionPattern.test(inputFilePath)) {

      var targetCouldBeInternetExplorer8 =
        inputFile.getArch() === "web.browser";

      self.extraFeatures = self.extraFeatures || {};
      if (! self.extraFeatures.hasOwnProperty("jscript")) {
        // Perform some additional transformations to improve
        // compatibility in older browsers (e.g. wrapping named function
        // expressions, per http://kiro.me/blog/nfe_dilemma.html).
        self.extraFeatures.jscript = targetCouldBeInternetExplorer8;
      }

      var babelOptions = Babel.getDefaultOptions(self.extraFeatures);

      babelOptions.sourceMap = true;
      babelOptions.filename =
      babelOptions.sourceFileName = packageName
        ? "/packages/" + packageName + "/" + inputFilePath
        : "/" + inputFilePath;

      babelOptions.sourceMapTarget = babelOptions.filename + ".map";

      try {
        var result = profile('Babel.compile', function () {
          return Babel.compile(source, babelOptions);
        });
      } catch (e) {
        if (e.loc) {
          inputFile.error({
            message: e.message,
            line: e.loc.line,
            column: e.loc.column,
          });

          return;
        }

        throw e;
      }

      toBeAdded.data = result.code;
      toBeAdded.hash = result.hash;
      toBeAdded.sourceMap = result.map;
    }

    inputFile.addJavaScript(toBeAdded);
  });
};

BCp.setDiskCacheDirectory = function (cacheDir) {
  Babel.setCacheDir(cacheDir);
};

function profile(name, func) {
  if (typeof Profile !== 'undefined') {
    return Profile.time(name, func);
  } else {
    return func();
  }
};

////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['babel-compiler'] = {}, {
  Babel: Babel,
  BabelCompiler: BabelCompiler
});

})();



//# sourceURL=meteor://💻app/packages/babel-compiler.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYmFiZWwtY29tcGlsZXIvYmFiZWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2JhYmVsLWNvbXBpbGVyL2JhYmVsLWNvbXBpbGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiL3BhY2thZ2VzL2JhYmVsLWNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIG1ldGVvckJhYmVsID0gTnBtLnJlcXVpcmUoJ21ldGVvci1iYWJlbCcpO1xuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgb2JqZWN0IGNvbnRhaW5pbmcgZGVmYXVsdCBvcHRpb25zIGFwcHJvcHJpYXRlIGZvclxuICovXG5mdW5jdGlvbiBnZXREZWZhdWx0T3B0aW9ucyhleHRyYUZlYXR1cmVzKSB7XG4gIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL2JhYmVsL2Jsb2IvbWFzdGVyL29wdGlvbnMuanMgZm9yIG1vcmVcbiAgLy8gaW5mb3JtYXRpb24gYWJvdXQgd2hhdCB0aGUgZGVmYXVsdCBvcHRpb25zIGFyZS5cbiAgdmFyIG9wdGlvbnMgPSBtZXRlb3JCYWJlbC5nZXREZWZhdWx0T3B0aW9ucyhleHRyYUZlYXR1cmVzKTtcblxuICAvLyBUaGUgc291cmNlTWFwIG9wdGlvbiBzaG91bGQgcHJvYmFibHkgYmUgcmVtb3ZlZCBmcm9tIHRoZSBkZWZhdWx0XG4gIC8vIG9wdGlvbnMgcmV0dXJuZWQgYnkgbWV0ZW9yQmFiZWwuZ2V0RGVmYXVsdE9wdGlvbnMuXG4gIGRlbGV0ZSBvcHRpb25zLnNvdXJjZU1hcDtcblxuICByZXR1cm4gb3B0aW9ucztcbn1cblxuQmFiZWwgPSB7XG4gIGdldERlZmF1bHRPcHRpb25zOiBnZXREZWZhdWx0T3B0aW9ucyxcblxuICAvLyBEZXByZWNhdGVkLCBub3cgYSBuby1vcC5cbiAgdmFsaWRhdGVFeHRyYUZlYXR1cmVzOiBGdW5jdGlvbi5wcm90b3R5cGUsXG5cbiAgY29tcGlsZTogZnVuY3Rpb24gKHNvdXJjZSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IGdldERlZmF1bHRPcHRpb25zKCk7XG4gICAgcmV0dXJuIG1ldGVvckJhYmVsLmNvbXBpbGUoc291cmNlLCBvcHRpb25zKTtcbiAgfSxcblxuICBzZXRDYWNoZURpcjogZnVuY3Rpb24gKGNhY2hlRGlyKSB7XG4gICAgbWV0ZW9yQmFiZWwuc2V0Q2FjaGVEaXIoY2FjaGVEaXIpO1xuICB9XG59O1xuIiwiLyoqXG4gKiBBIGNvbXBpbGVyIHRoYXQgY2FuIGJlIGluc3RhbnRpYXRlZCB3aXRoIGZlYXR1cmVzIGFuZCB1c2VkIGluc2lkZVxuICogUGx1Z2luLnJlZ2lzdGVyQ29tcGlsZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBleHRyYUZlYXR1cmVzIFRoZSBzYW1lIG9iamVjdCB0aGF0IGdldERlZmF1bHRPcHRpb25zIHRha2VzXG4gKi9cbkJhYmVsQ29tcGlsZXIgPSBmdW5jdGlvbiBCYWJlbENvbXBpbGVyKGV4dHJhRmVhdHVyZXMpIHtcbiAgdGhpcy5leHRyYUZlYXR1cmVzID0gZXh0cmFGZWF0dXJlcztcbn07XG5cbnZhciBCQ3AgPSBCYWJlbENvbXBpbGVyLnByb3RvdHlwZTtcbnZhciBleGNsdWRlZEZpbGVFeHRlbnNpb25QYXR0ZXJuID0gL1xcLmVzNVxcLmpzJC9pO1xuXG5CQ3AucHJvY2Vzc0ZpbGVzRm9yVGFyZ2V0ID0gZnVuY3Rpb24gKGlucHV0RmlsZXMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlucHV0RmlsZXMuZm9yRWFjaChmdW5jdGlvbiAoaW5wdXRGaWxlKSB7XG4gICAgdmFyIHNvdXJjZSA9IGlucHV0RmlsZS5nZXRDb250ZW50c0FzU3RyaW5nKCk7XG4gICAgdmFyIHBhY2thZ2VOYW1lID0gaW5wdXRGaWxlLmdldFBhY2thZ2VOYW1lKCk7XG4gICAgdmFyIGlucHV0RmlsZVBhdGggPSBpbnB1dEZpbGUuZ2V0UGF0aEluUGFja2FnZSgpO1xuICAgIHZhciBvdXRwdXRGaWxlUGF0aCA9IGlucHV0RmlsZVBhdGg7XG4gICAgdmFyIGZpbGVPcHRpb25zID0gaW5wdXRGaWxlLmdldEZpbGVPcHRpb25zKCk7XG4gICAgdmFyIHRvQmVBZGRlZCA9IHtcbiAgICAgIHNvdXJjZVBhdGg6IGlucHV0RmlsZVBhdGgsXG4gICAgICBwYXRoOiBvdXRwdXRGaWxlUGF0aCxcbiAgICAgIGRhdGE6IHNvdXJjZSxcbiAgICAgIGhhc2g6IGlucHV0RmlsZS5nZXRTb3VyY2VIYXNoKCksXG4gICAgICBzb3VyY2VNYXA6IG51bGwsXG4gICAgICBiYXJlOiAhISBmaWxlT3B0aW9ucy5iYXJlXG4gICAgfTtcblxuICAgIC8vIElmIHlvdSBuZWVkIHRvIGV4Y2x1ZGUgYSBzcGVjaWZpYyBmaWxlIHdpdGhpbiBhIHBhY2thZ2UgZnJvbSBCYWJlbFxuICAgIC8vIGNvbXBpbGF0aW9uLCBwYXNzIHRoZSB7IHRyYW5zcGlsZTogZmFsc2UgfSBvcHRpb25zIHRvIGFwaS5hZGRGaWxlc1xuICAgIC8vIHdoZW4geW91IGFkZCB0aGF0IGZpbGUuXG4gICAgaWYgKGZpbGVPcHRpb25zLnRyYW5zcGlsZSAhPT0gZmFsc2UgJiZcbiAgICAgICAgLy8gSWYgeW91IG5lZWQgdG8gZXhjbHVkZSBhIHNwZWNpZmljIGZpbGUgd2l0aGluIGFuIGFwcCBmcm9tIEJhYmVsXG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLCBnaXZlIGl0IHRoZSBmb2xsb3dpbmcgZmlsZSBleHRlbnNpb246IC5lczUuanNcbiAgICAgICAgISBleGNsdWRlZEZpbGVFeHRlbnNpb25QYXR0ZXJuLnRlc3QoaW5wdXRGaWxlUGF0aCkpIHtcblxuICAgICAgdmFyIHRhcmdldENvdWxkQmVJbnRlcm5ldEV4cGxvcmVyOCA9XG4gICAgICAgIGlucHV0RmlsZS5nZXRBcmNoKCkgPT09IFwid2ViLmJyb3dzZXJcIjtcblxuICAgICAgc2VsZi5leHRyYUZlYXR1cmVzID0gc2VsZi5leHRyYUZlYXR1cmVzIHx8IHt9O1xuICAgICAgaWYgKCEgc2VsZi5leHRyYUZlYXR1cmVzLmhhc093blByb3BlcnR5KFwianNjcmlwdFwiKSkge1xuICAgICAgICAvLyBQZXJmb3JtIHNvbWUgYWRkaXRpb25hbCB0cmFuc2Zvcm1hdGlvbnMgdG8gaW1wcm92ZVxuICAgICAgICAvLyBjb21wYXRpYmlsaXR5IGluIG9sZGVyIGJyb3dzZXJzIChlLmcuIHdyYXBwaW5nIG5hbWVkIGZ1bmN0aW9uXG4gICAgICAgIC8vIGV4cHJlc3Npb25zLCBwZXIgaHR0cDovL2tpcm8ubWUvYmxvZy9uZmVfZGlsZW1tYS5odG1sKS5cbiAgICAgICAgc2VsZi5leHRyYUZlYXR1cmVzLmpzY3JpcHQgPSB0YXJnZXRDb3VsZEJlSW50ZXJuZXRFeHBsb3Jlcjg7XG4gICAgICB9XG5cbiAgICAgIHZhciBiYWJlbE9wdGlvbnMgPSBCYWJlbC5nZXREZWZhdWx0T3B0aW9ucyhzZWxmLmV4dHJhRmVhdHVyZXMpO1xuXG4gICAgICBiYWJlbE9wdGlvbnMuc291cmNlTWFwID0gdHJ1ZTtcbiAgICAgIGJhYmVsT3B0aW9ucy5maWxlbmFtZSA9XG4gICAgICBiYWJlbE9wdGlvbnMuc291cmNlRmlsZU5hbWUgPSBwYWNrYWdlTmFtZVxuICAgICAgICA/IFwiL3BhY2thZ2VzL1wiICsgcGFja2FnZU5hbWUgKyBcIi9cIiArIGlucHV0RmlsZVBhdGhcbiAgICAgICAgOiBcIi9cIiArIGlucHV0RmlsZVBhdGg7XG5cbiAgICAgIGJhYmVsT3B0aW9ucy5zb3VyY2VNYXBUYXJnZXQgPSBiYWJlbE9wdGlvbnMuZmlsZW5hbWUgKyBcIi5tYXBcIjtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHByb2ZpbGUoJ0JhYmVsLmNvbXBpbGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIEJhYmVsLmNvbXBpbGUoc291cmNlLCBiYWJlbE9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUubG9jKSB7XG4gICAgICAgICAgaW5wdXRGaWxlLmVycm9yKHtcbiAgICAgICAgICAgIG1lc3NhZ2U6IGUubWVzc2FnZSxcbiAgICAgICAgICAgIGxpbmU6IGUubG9jLmxpbmUsXG4gICAgICAgICAgICBjb2x1bW46IGUubG9jLmNvbHVtbixcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG5cbiAgICAgIHRvQmVBZGRlZC5kYXRhID0gcmVzdWx0LmNvZGU7XG4gICAgICB0b0JlQWRkZWQuaGFzaCA9IHJlc3VsdC5oYXNoO1xuICAgICAgdG9CZUFkZGVkLnNvdXJjZU1hcCA9IHJlc3VsdC5tYXA7XG4gICAgfVxuXG4gICAgaW5wdXRGaWxlLmFkZEphdmFTY3JpcHQodG9CZUFkZGVkKTtcbiAgfSk7XG59O1xuXG5CQ3Auc2V0RGlza0NhY2hlRGlyZWN0b3J5ID0gZnVuY3Rpb24gKGNhY2hlRGlyKSB7XG4gIEJhYmVsLnNldENhY2hlRGlyKGNhY2hlRGlyKTtcbn07XG5cbmZ1bmN0aW9uIHByb2ZpbGUobmFtZSwgZnVuYykge1xuICBpZiAodHlwZW9mIFByb2ZpbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIFByb2ZpbGUudGltZShuYW1lLCBmdW5jKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZnVuYygpO1xuICB9XG59O1xuIl19
