(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;

/* Package-scope variables */
var makeInstaller, meteorInstall;

/////////////////////////////////////////////////////////////////////////////
//                                                                         //
// packages/modules-runtime/.npm/package/node_modules/install/install.js   //
// This file is in bare mode and is not in its own closure.                //
//                                                                         //
/////////////////////////////////////////////////////////////////////////////
                                                                           //
makeInstaller = function (options) {
  options = options || {};

  // These file extensions will be appended to required module identifiers
  // if they do not exactly match an installed module.
  var defaultExtensions = options.extensions || [".js", ".json"];

  // This constructor will be used to instantiate the module objects
  // passed to module factory functions (i.e. the third argument after
  // require and exports).
  var Module = options.Module || function Module(id) {
    this.id = id;
    this.children = [];
  };

  // If defined, the options.onInstall function will be called any time
  // new modules are installed.
  var onInstall = options.onInstall;

  // If defined, the options.override function will be called before
  // looking up any top-level package identifiers in node_modules
  // directories. It can either return a string to provide an alternate
  // package identifier, or a non-string value to prevent the lookup from
  // proceeding.
  var override = options.override;

  // If defined, the options.fallback function will be called when no
  // installed module is found for a required module identifier. Often
  // options.fallback will be implemented in terms of the native Node
  // require function, which has the ability to load binary modules.
  var fallback = options.fallback;

  // Nothing special about MISSING.hasOwnProperty, except that it's fewer
  // characters than Object.prototype.hasOwnProperty after minification.
  var hasOwn = {}.hasOwnProperty;

  // The file object representing the root directory of the installed
  // module tree.
  var root = new File("/", new File("/.."));
  var rootRequire = makeRequire(root);

  // Merges the given tree of directories and module factory functions
  // into the tree of installed modules and returns a require function
  // that behaves as if called from a module in the root directory.
  function install(tree, options) {
    if (isObject(tree)) {
      fileMergeContents(root, tree, options);
      if (isFunction(onInstall)) {
        onInstall(rootRequire);
      }
    }
    return rootRequire;
  }

  function getOwn(obj, key) {
    return hasOwn.call(obj, key) && obj[key];
  }

  function isObject(value) {
    return value && typeof value === "object";
  }

  function isFunction(value) {
    return typeof value === "function";
  }

  function isString(value) {
    return typeof value === "string";
  }

  function makeRequire(file) {
    function require(id) {
      var result = fileResolve(file, id);
      if (result) {
        return fileEvaluate(result, file.m);
      }

      var error = new Error("Cannot find module '" + id + "'");

      if (isFunction(fallback)) {
        return fallback(
          id, // The missing module identifier.
          file.m.id, // The path of the requiring file.
          error // The error we would have thrown.
        );
      }

      throw error;
    }

    require.resolve = function (id) {
      var f = fileResolve(file, id);
      if (f) return f.m.id;
      throw new Error("Cannot find module '" + id + "'");
    };

    return require;
  }

  // File objects represent either directories or modules that have been
  // installed. When a `File` respresents a directory, its `.c` (contents)
  // property is an object containing the names of the files (or
  // directories) that it contains. When a `File` represents a module, its
  // `.c` property is a function that can be invoked with the appropriate
  // `(require, exports, module)` arguments to evaluate the module. If the
  // `.c` property is a string, that string will be resolved as a module
  // identifier, and the exports of the resulting module will provide the
  // exports of the original file. The `.p` (parent) property of a File is
  // either a directory `File` or `null`. Note that a child may claim
  // another `File` as its parent even if the parent does not have an
  // entry for that child in its `.c` object.  This is important for
  // implementing anonymous files, and preventing child modules from using
  // `../relative/identifier` syntax to examine unrelated modules.
  function File(name, parent) {
    var file = this;

    // Link to the parent file.
    file.p = parent = parent || null;

    // The module object for this File, which will eventually boast an
    // .exports property when/if the file is evaluated.
    file.m = new Module(name);
  }

  function fileEvaluate(file, parentModule) {
    var contents = file && file.c;
    var module = file.m;
    if (! hasOwn.call(module, "exports")) {
      if (parentModule) {
        module.parent = parentModule;
        var children = parentModule.children;
        if (Array.isArray(children)) {
          children.push(module);
        }
      }

      // If a Module.prototype.useNode method is defined, give it a chance
      // to define module.exports based on module.id using Node.
      if (! isFunction(module.useNode) ||
          ! module.useNode()) {
        contents(
          file.r = file.r || makeRequire(file),
          module.exports = {},
          module,
          file.m.id,
          file.p.m.id
        );
      }
    }
    return module.exports;
  }

  function fileIsDirectory(file) {
    return file && isObject(file.c);
  }

  function fileMergeContents(file, contents, options) {
    // If contents is an array of strings and functions, return the last
    // function with a `.d` property containing all the strings.
    if (Array.isArray(contents)) {
      var deps = [];

      contents.forEach(function (item) {
        if (isString(item)) {
          deps.push(item);
        } else if (isFunction(item)) {
          contents = item;
        }
      });

      if (isFunction(contents)) {
        contents.d = deps;
      } else {
        // If the array did not contain a function, merge nothing.
        contents = null;
      }

    } else if (isFunction(contents)) {
      // If contents is already a function, make sure it has `.d`.
      contents.d = contents.d || [];

    } else if (! isString(contents) &&
               ! isObject(contents)) {
      // If contents is neither an array nor a function nor a string nor
      // an object, just give up and merge nothing.
      contents = null;
    }

    if (contents) {
      file.c = file.c || (isObject(contents) ? {} : contents);
      if (isObject(contents) && fileIsDirectory(file)) {
        Object.keys(contents).forEach(function (key) {
          if (key === "..") {
            child = file.p;

          } else {
            var child = getOwn(file.c, key);
            if (! child) {
              child = file.c[key] = new File(
                file.m.id.replace(/\/*$/, "/") + key,
                file
              );

              child.o = options;
            }
          }

          fileMergeContents(child, contents[key], options);
        });
      }
    }
  }

  function fileGetExtensions(file) {
    return file.o && file.o.extensions || defaultExtensions;
  }

  function fileAppendIdPart(file, part, extensions) {
    // Always append relative to a directory.
    while (file && ! fileIsDirectory(file)) {
      file = file.p;
    }

    if (! file || ! part || part === ".") {
      return file;
    }

    if (part === "..") {
      return file.p;
    }

    var exactChild = getOwn(file.c, part);

    // Only consider multiple file extensions if this part is the last
    // part of a module identifier and not equal to `.` or `..`, and there
    // was no exact match or the exact match was a directory.
    if (extensions && (! exactChild || fileIsDirectory(exactChild))) {
      for (var e = 0; e < extensions.length; ++e) {
        var child = getOwn(file.c, part + extensions[e]);
        if (child) {
          return child;
        }
      }
    }

    return exactChild;
  }

  function fileAppendId(file, id, extensions) {
    var parts = id.split("/");

    // Use `Array.prototype.every` to terminate iteration early if
    // `fileAppendIdPart` returns a falsy value.
    parts.every(function (part, i) {
      return file = i < parts.length - 1
        ? fileAppendIdPart(file, part)
        : fileAppendIdPart(file, part, extensions);
    });

    return file;
  }

  function fileResolve(file, id, seenDirFiles) {
    var extensions = fileGetExtensions(file);

    file =
      // Absolute module identifiers (i.e. those that begin with a `/`
      // character) are interpreted relative to the root directory, which
      // is a slight deviation from Node, which has access to the entire
      // file system.
      id.charAt(0) === "/" ? fileAppendId(root, id, extensions) :
      // Relative module identifiers are interpreted relative to the
      // current file, naturally.
      id.charAt(0) === "." ? fileAppendId(file, id, extensions) :
      // Top-level module identifiers are interpreted as referring to
      // packages in `node_modules` directories.
      nodeModulesLookup(file, id, extensions);

    // If the identifier resolves to a directory, we use the same logic as
    // Node to find an `index.js` or `package.json` file to evaluate.
    while (fileIsDirectory(file)) {
      seenDirFiles = seenDirFiles || [];

      // If the "main" field of a `package.json` file resolves to a
      // directory we've already considered, then we should not attempt to
      // read the same `package.json` file again. Using an array as a set
      // is acceptable here because the number of directories to consider
      // is rarely greater than 1 or 2. Also, using indexOf allows us to
      // store File objects instead of strings.
      if (seenDirFiles.indexOf(file) < 0) {
        seenDirFiles.push(file);

        var pkgJsonFile = fileAppendIdPart(file, "package.json");
        var main = pkgJsonFile && fileEvaluate(pkgJsonFile).main;
        if (isString(main)) {
          // The "main" field of package.json does not have to begin with
          // ./ to be considered relative, so first we try simply
          // appending it to the directory path before falling back to a
          // full fileResolve, which might return a package from a
          // node_modules directory.
          file = fileAppendId(file, main, extensions) ||
            fileResolve(file, main, seenDirFiles);

          if (file) {
            // The fileAppendId call above may have returned a directory,
            // so continue the loop to make sure we resolve it to a
            // non-directory file.
            continue;
          }
        }
      }

      // If we didn't find a `package.json` file, or it didn't have a
      // resolvable `.main` property, the only possibility left to
      // consider is that this directory contains an `index.js` module.
      // This assignment almost always terminates the while loop, because
      // there's very little chance `fileIsDirectory(file)` will be true
      // for the result of `fileAppendIdPart(file, "index.js")`. However,
      // in principle it is remotely possible that a file called
      // `index.js` could be a directory instead of a file.
      file = fileAppendIdPart(file, "index.js");
    }

    if (file && isString(file.c)) {
      file = fileResolve(file, file.c, seenDirFiles);
    }

    return file;
  };

  function nodeModulesLookup(file, id, extensions) {
    if (isFunction(override)) {
      id = override(id, file.m.id);
    }

    if (isString(id)) {
      for (var resolved; file && ! resolved; file = file.p) {
        resolved = fileIsDirectory(file) &&
          fileAppendId(file, "node_modules/" + id, extensions);
      }

      return resolved;
    }
  }

  return install;
};

if (typeof exports === "object") {
  exports.makeInstaller = makeInstaller;
}

/////////////////////////////////////////////////////////////////////////////







(function(){

/////////////////////////////////////////////////////////////////////////////
//                                                                         //
// packages/modules-runtime/modules-runtime.js                             //
//                                                                         //
/////////////////////////////////////////////////////////////////////////////
                                                                           //
var options = {};
var hasOwn = options.hasOwnProperty;

// RegExp matching strings that don't start with a `.` or a `/`.
var topLevelIdPattern = /^[^./]/;

// This function will be called whenever a module identifier that hasn't
// been installed is required. For backwards compatibility, and so that we
// can require binary dependencies on the server, we implement the
// fallback in terms of Npm.require.
options.fallback = function (id, dir, error) {
  // For simplicity, we honor only top-level module identifiers here.
  // We could try to honor relative and absolute module identifiers by
  // somehow combining `id` with `dir`, but we'd have to be really careful
  // that the resulting modules were located in a known directory (not
  // some arbitrary location on the file system), and we only really need
  // the fallback for dependencies installed in node_modules directories.
  if (topLevelIdPattern.test(id)) {
    if (typeof Npm === "object" &&
        typeof Npm.require === "function") {
      return Npm.require(id);
    }
  }

  throw error;
};

if (Meteor.isServer) {
  // Defining Module.prototype.useNode allows the module system to
  // delegate evaluation to Node, unless useNode returns false.
  (options.Module = function Module(id) {
    // Same as the default Module constructor implementation.
    this.id = id;
    this.children = [];
  }).prototype.useNode = function () {
    if (typeof npmRequire !== "function") {
      // Can't use Node if npmRequire is not defined.
      return false;
    }

    var parts = this.id.split("/");
    var start = 0;
    if (parts[start] === "") ++start;
    if (parts[start] === "node_modules" &&
        parts[start + 1] === "meteor") {
      start += 2;
    }

    if (parts.indexOf("node_modules", start) < 0) {
      // Don't try to use Node for modules that aren't in node_modules
      // directories.
      return false;
    }

    try {
      npmRequire.resolve(this.id);
    } catch (e) {
      return false;
    }

    this.exports = npmRequire(this.id);

    return true;
  };
}

meteorInstall = makeInstaller(options);

/////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['modules-runtime'] = {}, {
  meteorInstall: meteorInstall
});

})();



//# sourceURL=meteor://💻app/packages/modules-runtime.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9kdWxlcy1ydW50aW1lLy5ucG0vcGFja2FnZS9ub2RlX21vZHVsZXMvaW5zdGFsbC9pbnN0YWxsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb2R1bGVzLXJ1bnRpbWUvbW9kdWxlcy1ydW50aW1lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUM5VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiL3BhY2thZ2VzL21vZHVsZXMtcnVudGltZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIm1ha2VJbnN0YWxsZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBUaGVzZSBmaWxlIGV4dGVuc2lvbnMgd2lsbCBiZSBhcHBlbmRlZCB0byByZXF1aXJlZCBtb2R1bGUgaWRlbnRpZmllcnNcbiAgLy8gaWYgdGhleSBkbyBub3QgZXhhY3RseSBtYXRjaCBhbiBpbnN0YWxsZWQgbW9kdWxlLlxuICB2YXIgZGVmYXVsdEV4dGVuc2lvbnMgPSBvcHRpb25zLmV4dGVuc2lvbnMgfHwgW1wiLmpzXCIsIFwiLmpzb25cIl07XG5cbiAgLy8gVGhpcyBjb25zdHJ1Y3RvciB3aWxsIGJlIHVzZWQgdG8gaW5zdGFudGlhdGUgdGhlIG1vZHVsZSBvYmplY3RzXG4gIC8vIHBhc3NlZCB0byBtb2R1bGUgZmFjdG9yeSBmdW5jdGlvbnMgKGkuZS4gdGhlIHRoaXJkIGFyZ3VtZW50IGFmdGVyXG4gIC8vIHJlcXVpcmUgYW5kIGV4cG9ydHMpLlxuICB2YXIgTW9kdWxlID0gb3B0aW9ucy5Nb2R1bGUgfHwgZnVuY3Rpb24gTW9kdWxlKGlkKSB7XG4gICAgdGhpcy5pZCA9IGlkO1xuICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgfTtcblxuICAvLyBJZiBkZWZpbmVkLCB0aGUgb3B0aW9ucy5vbkluc3RhbGwgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYW55IHRpbWVcbiAgLy8gbmV3IG1vZHVsZXMgYXJlIGluc3RhbGxlZC5cbiAgdmFyIG9uSW5zdGFsbCA9IG9wdGlvbnMub25JbnN0YWxsO1xuXG4gIC8vIElmIGRlZmluZWQsIHRoZSBvcHRpb25zLm92ZXJyaWRlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGJlZm9yZVxuICAvLyBsb29raW5nIHVwIGFueSB0b3AtbGV2ZWwgcGFja2FnZSBpZGVudGlmaWVycyBpbiBub2RlX21vZHVsZXNcbiAgLy8gZGlyZWN0b3JpZXMuIEl0IGNhbiBlaXRoZXIgcmV0dXJuIGEgc3RyaW5nIHRvIHByb3ZpZGUgYW4gYWx0ZXJuYXRlXG4gIC8vIHBhY2thZ2UgaWRlbnRpZmllciwgb3IgYSBub24tc3RyaW5nIHZhbHVlIHRvIHByZXZlbnQgdGhlIGxvb2t1cCBmcm9tXG4gIC8vIHByb2NlZWRpbmcuXG4gIHZhciBvdmVycmlkZSA9IG9wdGlvbnMub3ZlcnJpZGU7XG5cbiAgLy8gSWYgZGVmaW5lZCwgdGhlIG9wdGlvbnMuZmFsbGJhY2sgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbiBub1xuICAvLyBpbnN0YWxsZWQgbW9kdWxlIGlzIGZvdW5kIGZvciBhIHJlcXVpcmVkIG1vZHVsZSBpZGVudGlmaWVyLiBPZnRlblxuICAvLyBvcHRpb25zLmZhbGxiYWNrIHdpbGwgYmUgaW1wbGVtZW50ZWQgaW4gdGVybXMgb2YgdGhlIG5hdGl2ZSBOb2RlXG4gIC8vIHJlcXVpcmUgZnVuY3Rpb24sIHdoaWNoIGhhcyB0aGUgYWJpbGl0eSB0byBsb2FkIGJpbmFyeSBtb2R1bGVzLlxuICB2YXIgZmFsbGJhY2sgPSBvcHRpb25zLmZhbGxiYWNrO1xuXG4gIC8vIE5vdGhpbmcgc3BlY2lhbCBhYm91dCBNSVNTSU5HLmhhc093blByb3BlcnR5LCBleGNlcHQgdGhhdCBpdCdzIGZld2VyXG4gIC8vIGNoYXJhY3RlcnMgdGhhbiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5IGFmdGVyIG1pbmlmaWNhdGlvbi5cbiAgdmFyIGhhc093biA9IHt9Lmhhc093blByb3BlcnR5O1xuXG4gIC8vIFRoZSBmaWxlIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoZSBpbnN0YWxsZWRcbiAgLy8gbW9kdWxlIHRyZWUuXG4gIHZhciByb290ID0gbmV3IEZpbGUoXCIvXCIsIG5ldyBGaWxlKFwiLy4uXCIpKTtcbiAgdmFyIHJvb3RSZXF1aXJlID0gbWFrZVJlcXVpcmUocm9vdCk7XG5cbiAgLy8gTWVyZ2VzIHRoZSBnaXZlbiB0cmVlIG9mIGRpcmVjdG9yaWVzIGFuZCBtb2R1bGUgZmFjdG9yeSBmdW5jdGlvbnNcbiAgLy8gaW50byB0aGUgdHJlZSBvZiBpbnN0YWxsZWQgbW9kdWxlcyBhbmQgcmV0dXJucyBhIHJlcXVpcmUgZnVuY3Rpb25cbiAgLy8gdGhhdCBiZWhhdmVzIGFzIGlmIGNhbGxlZCBmcm9tIGEgbW9kdWxlIGluIHRoZSByb290IGRpcmVjdG9yeS5cbiAgZnVuY3Rpb24gaW5zdGFsbCh0cmVlLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzT2JqZWN0KHRyZWUpKSB7XG4gICAgICBmaWxlTWVyZ2VDb250ZW50cyhyb290LCB0cmVlLCBvcHRpb25zKTtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKG9uSW5zdGFsbCkpIHtcbiAgICAgICAgb25JbnN0YWxsKHJvb3RSZXF1aXJlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJvb3RSZXF1aXJlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0T3duKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIGhhc093bi5jYWxsKG9iaiwga2V5KSAmJiBvYmpba2V5XTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCI7XG4gIH1cblxuICBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCI7XG4gIH1cblxuICBmdW5jdGlvbiBtYWtlUmVxdWlyZShmaWxlKSB7XG4gICAgZnVuY3Rpb24gcmVxdWlyZShpZCkge1xuICAgICAgdmFyIHJlc3VsdCA9IGZpbGVSZXNvbHZlKGZpbGUsIGlkKTtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIGZpbGVFdmFsdWF0ZShyZXN1bHQsIGZpbGUubSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIgKyBpZCArIFwiJ1wiKTtcblxuICAgICAgaWYgKGlzRnVuY3Rpb24oZmFsbGJhY2spKSB7XG4gICAgICAgIHJldHVybiBmYWxsYmFjayhcbiAgICAgICAgICBpZCwgLy8gVGhlIG1pc3NpbmcgbW9kdWxlIGlkZW50aWZpZXIuXG4gICAgICAgICAgZmlsZS5tLmlkLCAvLyBUaGUgcGF0aCBvZiB0aGUgcmVxdWlyaW5nIGZpbGUuXG4gICAgICAgICAgZXJyb3IgLy8gVGhlIGVycm9yIHdlIHdvdWxkIGhhdmUgdGhyb3duLlxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICByZXF1aXJlLnJlc29sdmUgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHZhciBmID0gZmlsZVJlc29sdmUoZmlsZSwgaWQpO1xuICAgICAgaWYgKGYpIHJldHVybiBmLm0uaWQ7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiICsgaWQgKyBcIidcIik7XG4gICAgfTtcblxuICAgIHJldHVybiByZXF1aXJlO1xuICB9XG5cbiAgLy8gRmlsZSBvYmplY3RzIHJlcHJlc2VudCBlaXRoZXIgZGlyZWN0b3JpZXMgb3IgbW9kdWxlcyB0aGF0IGhhdmUgYmVlblxuICAvLyBpbnN0YWxsZWQuIFdoZW4gYSBgRmlsZWAgcmVzcHJlc2VudHMgYSBkaXJlY3RvcnksIGl0cyBgLmNgIChjb250ZW50cylcbiAgLy8gcHJvcGVydHkgaXMgYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5hbWVzIG9mIHRoZSBmaWxlcyAob3JcbiAgLy8gZGlyZWN0b3JpZXMpIHRoYXQgaXQgY29udGFpbnMuIFdoZW4gYSBgRmlsZWAgcmVwcmVzZW50cyBhIG1vZHVsZSwgaXRzXG4gIC8vIGAuY2AgcHJvcGVydHkgaXMgYSBmdW5jdGlvbiB0aGF0IGNhbiBiZSBpbnZva2VkIHdpdGggdGhlIGFwcHJvcHJpYXRlXG4gIC8vIGAocmVxdWlyZSwgZXhwb3J0cywgbW9kdWxlKWAgYXJndW1lbnRzIHRvIGV2YWx1YXRlIHRoZSBtb2R1bGUuIElmIHRoZVxuICAvLyBgLmNgIHByb3BlcnR5IGlzIGEgc3RyaW5nLCB0aGF0IHN0cmluZyB3aWxsIGJlIHJlc29sdmVkIGFzIGEgbW9kdWxlXG4gIC8vIGlkZW50aWZpZXIsIGFuZCB0aGUgZXhwb3J0cyBvZiB0aGUgcmVzdWx0aW5nIG1vZHVsZSB3aWxsIHByb3ZpZGUgdGhlXG4gIC8vIGV4cG9ydHMgb2YgdGhlIG9yaWdpbmFsIGZpbGUuIFRoZSBgLnBgIChwYXJlbnQpIHByb3BlcnR5IG9mIGEgRmlsZSBpc1xuICAvLyBlaXRoZXIgYSBkaXJlY3RvcnkgYEZpbGVgIG9yIGBudWxsYC4gTm90ZSB0aGF0IGEgY2hpbGQgbWF5IGNsYWltXG4gIC8vIGFub3RoZXIgYEZpbGVgIGFzIGl0cyBwYXJlbnQgZXZlbiBpZiB0aGUgcGFyZW50IGRvZXMgbm90IGhhdmUgYW5cbiAgLy8gZW50cnkgZm9yIHRoYXQgY2hpbGQgaW4gaXRzIGAuY2Agb2JqZWN0LiAgVGhpcyBpcyBpbXBvcnRhbnQgZm9yXG4gIC8vIGltcGxlbWVudGluZyBhbm9ueW1vdXMgZmlsZXMsIGFuZCBwcmV2ZW50aW5nIGNoaWxkIG1vZHVsZXMgZnJvbSB1c2luZ1xuICAvLyBgLi4vcmVsYXRpdmUvaWRlbnRpZmllcmAgc3ludGF4IHRvIGV4YW1pbmUgdW5yZWxhdGVkIG1vZHVsZXMuXG4gIGZ1bmN0aW9uIEZpbGUobmFtZSwgcGFyZW50KSB7XG4gICAgdmFyIGZpbGUgPSB0aGlzO1xuXG4gICAgLy8gTGluayB0byB0aGUgcGFyZW50IGZpbGUuXG4gICAgZmlsZS5wID0gcGFyZW50ID0gcGFyZW50IHx8IG51bGw7XG5cbiAgICAvLyBUaGUgbW9kdWxlIG9iamVjdCBmb3IgdGhpcyBGaWxlLCB3aGljaCB3aWxsIGV2ZW50dWFsbHkgYm9hc3QgYW5cbiAgICAvLyAuZXhwb3J0cyBwcm9wZXJ0eSB3aGVuL2lmIHRoZSBmaWxlIGlzIGV2YWx1YXRlZC5cbiAgICBmaWxlLm0gPSBuZXcgTW9kdWxlKG5hbWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlsZUV2YWx1YXRlKGZpbGUsIHBhcmVudE1vZHVsZSkge1xuICAgIHZhciBjb250ZW50cyA9IGZpbGUgJiYgZmlsZS5jO1xuICAgIHZhciBtb2R1bGUgPSBmaWxlLm07XG4gICAgaWYgKCEgaGFzT3duLmNhbGwobW9kdWxlLCBcImV4cG9ydHNcIikpIHtcbiAgICAgIGlmIChwYXJlbnRNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLnBhcmVudCA9IHBhcmVudE1vZHVsZTtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gcGFyZW50TW9kdWxlLmNoaWxkcmVuO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgICBjaGlsZHJlbi5wdXNoKG1vZHVsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSBNb2R1bGUucHJvdG90eXBlLnVzZU5vZGUgbWV0aG9kIGlzIGRlZmluZWQsIGdpdmUgaXQgYSBjaGFuY2VcbiAgICAgIC8vIHRvIGRlZmluZSBtb2R1bGUuZXhwb3J0cyBiYXNlZCBvbiBtb2R1bGUuaWQgdXNpbmcgTm9kZS5cbiAgICAgIGlmICghIGlzRnVuY3Rpb24obW9kdWxlLnVzZU5vZGUpIHx8XG4gICAgICAgICAgISBtb2R1bGUudXNlTm9kZSgpKSB7XG4gICAgICAgIGNvbnRlbnRzKFxuICAgICAgICAgIGZpbGUuciA9IGZpbGUuciB8fCBtYWtlUmVxdWlyZShmaWxlKSxcbiAgICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHt9LFxuICAgICAgICAgIG1vZHVsZSxcbiAgICAgICAgICBmaWxlLm0uaWQsXG4gICAgICAgICAgZmlsZS5wLm0uaWRcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlsZUlzRGlyZWN0b3J5KGZpbGUpIHtcbiAgICByZXR1cm4gZmlsZSAmJiBpc09iamVjdChmaWxlLmMpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlsZU1lcmdlQ29udGVudHMoZmlsZSwgY29udGVudHMsIG9wdGlvbnMpIHtcbiAgICAvLyBJZiBjb250ZW50cyBpcyBhbiBhcnJheSBvZiBzdHJpbmdzIGFuZCBmdW5jdGlvbnMsIHJldHVybiB0aGUgbGFzdFxuICAgIC8vIGZ1bmN0aW9uIHdpdGggYSBgLmRgIHByb3BlcnR5IGNvbnRhaW5pbmcgYWxsIHRoZSBzdHJpbmdzLlxuICAgIGlmIChBcnJheS5pc0FycmF5KGNvbnRlbnRzKSkge1xuICAgICAgdmFyIGRlcHMgPSBbXTtcblxuICAgICAgY29udGVudHMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpZiAoaXNTdHJpbmcoaXRlbSkpIHtcbiAgICAgICAgICBkZXBzLnB1c2goaXRlbSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNGdW5jdGlvbihpdGVtKSkge1xuICAgICAgICAgIGNvbnRlbnRzID0gaXRlbTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRlbnRzKSkge1xuICAgICAgICBjb250ZW50cy5kID0gZGVwcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZSBhcnJheSBkaWQgbm90IGNvbnRhaW4gYSBmdW5jdGlvbiwgbWVyZ2Ugbm90aGluZy5cbiAgICAgICAgY29udGVudHMgPSBudWxsO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChpc0Z1bmN0aW9uKGNvbnRlbnRzKSkge1xuICAgICAgLy8gSWYgY29udGVudHMgaXMgYWxyZWFkeSBhIGZ1bmN0aW9uLCBtYWtlIHN1cmUgaXQgaGFzIGAuZGAuXG4gICAgICBjb250ZW50cy5kID0gY29udGVudHMuZCB8fCBbXTtcblxuICAgIH0gZWxzZSBpZiAoISBpc1N0cmluZyhjb250ZW50cykgJiZcbiAgICAgICAgICAgICAgICEgaXNPYmplY3QoY29udGVudHMpKSB7XG4gICAgICAvLyBJZiBjb250ZW50cyBpcyBuZWl0aGVyIGFuIGFycmF5IG5vciBhIGZ1bmN0aW9uIG5vciBhIHN0cmluZyBub3JcbiAgICAgIC8vIGFuIG9iamVjdCwganVzdCBnaXZlIHVwIGFuZCBtZXJnZSBub3RoaW5nLlxuICAgICAgY29udGVudHMgPSBudWxsO1xuICAgIH1cblxuICAgIGlmIChjb250ZW50cykge1xuICAgICAgZmlsZS5jID0gZmlsZS5jIHx8IChpc09iamVjdChjb250ZW50cykgPyB7fSA6IGNvbnRlbnRzKTtcbiAgICAgIGlmIChpc09iamVjdChjb250ZW50cykgJiYgZmlsZUlzRGlyZWN0b3J5KGZpbGUpKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGNvbnRlbnRzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICBpZiAoa2V5ID09PSBcIi4uXCIpIHtcbiAgICAgICAgICAgIGNoaWxkID0gZmlsZS5wO1xuXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGdldE93bihmaWxlLmMsIGtleSk7XG4gICAgICAgICAgICBpZiAoISBjaGlsZCkge1xuICAgICAgICAgICAgICBjaGlsZCA9IGZpbGUuY1trZXldID0gbmV3IEZpbGUoXG4gICAgICAgICAgICAgICAgZmlsZS5tLmlkLnJlcGxhY2UoL1xcLyokLywgXCIvXCIpICsga2V5LFxuICAgICAgICAgICAgICAgIGZpbGVcbiAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICBjaGlsZC5vID0gb3B0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmaWxlTWVyZ2VDb250ZW50cyhjaGlsZCwgY29udGVudHNba2V5XSwgb3B0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVHZXRFeHRlbnNpb25zKGZpbGUpIHtcbiAgICByZXR1cm4gZmlsZS5vICYmIGZpbGUuby5leHRlbnNpb25zIHx8IGRlZmF1bHRFeHRlbnNpb25zO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlsZUFwcGVuZElkUGFydChmaWxlLCBwYXJ0LCBleHRlbnNpb25zKSB7XG4gICAgLy8gQWx3YXlzIGFwcGVuZCByZWxhdGl2ZSB0byBhIGRpcmVjdG9yeS5cbiAgICB3aGlsZSAoZmlsZSAmJiAhIGZpbGVJc0RpcmVjdG9yeShmaWxlKSkge1xuICAgICAgZmlsZSA9IGZpbGUucDtcbiAgICB9XG5cbiAgICBpZiAoISBmaWxlIHx8ICEgcGFydCB8fCBwYXJ0ID09PSBcIi5cIikge1xuICAgICAgcmV0dXJuIGZpbGU7XG4gICAgfVxuXG4gICAgaWYgKHBhcnQgPT09IFwiLi5cIikge1xuICAgICAgcmV0dXJuIGZpbGUucDtcbiAgICB9XG5cbiAgICB2YXIgZXhhY3RDaGlsZCA9IGdldE93bihmaWxlLmMsIHBhcnQpO1xuXG4gICAgLy8gT25seSBjb25zaWRlciBtdWx0aXBsZSBmaWxlIGV4dGVuc2lvbnMgaWYgdGhpcyBwYXJ0IGlzIHRoZSBsYXN0XG4gICAgLy8gcGFydCBvZiBhIG1vZHVsZSBpZGVudGlmaWVyIGFuZCBub3QgZXF1YWwgdG8gYC5gIG9yIGAuLmAsIGFuZCB0aGVyZVxuICAgIC8vIHdhcyBubyBleGFjdCBtYXRjaCBvciB0aGUgZXhhY3QgbWF0Y2ggd2FzIGEgZGlyZWN0b3J5LlxuICAgIGlmIChleHRlbnNpb25zICYmICghIGV4YWN0Q2hpbGQgfHwgZmlsZUlzRGlyZWN0b3J5KGV4YWN0Q2hpbGQpKSkge1xuICAgICAgZm9yICh2YXIgZSA9IDA7IGUgPCBleHRlbnNpb25zLmxlbmd0aDsgKytlKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGdldE93bihmaWxlLmMsIHBhcnQgKyBleHRlbnNpb25zW2VdKTtcbiAgICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4YWN0Q2hpbGQ7XG4gIH1cblxuICBmdW5jdGlvbiBmaWxlQXBwZW5kSWQoZmlsZSwgaWQsIGV4dGVuc2lvbnMpIHtcbiAgICB2YXIgcGFydHMgPSBpZC5zcGxpdChcIi9cIik7XG5cbiAgICAvLyBVc2UgYEFycmF5LnByb3RvdHlwZS5ldmVyeWAgdG8gdGVybWluYXRlIGl0ZXJhdGlvbiBlYXJseSBpZlxuICAgIC8vIGBmaWxlQXBwZW5kSWRQYXJ0YCByZXR1cm5zIGEgZmFsc3kgdmFsdWUuXG4gICAgcGFydHMuZXZlcnkoZnVuY3Rpb24gKHBhcnQsIGkpIHtcbiAgICAgIHJldHVybiBmaWxlID0gaSA8IHBhcnRzLmxlbmd0aCAtIDFcbiAgICAgICAgPyBmaWxlQXBwZW5kSWRQYXJ0KGZpbGUsIHBhcnQpXG4gICAgICAgIDogZmlsZUFwcGVuZElkUGFydChmaWxlLCBwYXJ0LCBleHRlbnNpb25zKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlc29sdmUoZmlsZSwgaWQsIHNlZW5EaXJGaWxlcykge1xuICAgIHZhciBleHRlbnNpb25zID0gZmlsZUdldEV4dGVuc2lvbnMoZmlsZSk7XG5cbiAgICBmaWxlID1cbiAgICAgIC8vIEFic29sdXRlIG1vZHVsZSBpZGVudGlmaWVycyAoaS5lLiB0aG9zZSB0aGF0IGJlZ2luIHdpdGggYSBgL2BcbiAgICAgIC8vIGNoYXJhY3RlcikgYXJlIGludGVycHJldGVkIHJlbGF0aXZlIHRvIHRoZSByb290IGRpcmVjdG9yeSwgd2hpY2hcbiAgICAgIC8vIGlzIGEgc2xpZ2h0IGRldmlhdGlvbiBmcm9tIE5vZGUsIHdoaWNoIGhhcyBhY2Nlc3MgdG8gdGhlIGVudGlyZVxuICAgICAgLy8gZmlsZSBzeXN0ZW0uXG4gICAgICBpZC5jaGFyQXQoMCkgPT09IFwiL1wiID8gZmlsZUFwcGVuZElkKHJvb3QsIGlkLCBleHRlbnNpb25zKSA6XG4gICAgICAvLyBSZWxhdGl2ZSBtb2R1bGUgaWRlbnRpZmllcnMgYXJlIGludGVycHJldGVkIHJlbGF0aXZlIHRvIHRoZVxuICAgICAgLy8gY3VycmVudCBmaWxlLCBuYXR1cmFsbHkuXG4gICAgICBpZC5jaGFyQXQoMCkgPT09IFwiLlwiID8gZmlsZUFwcGVuZElkKGZpbGUsIGlkLCBleHRlbnNpb25zKSA6XG4gICAgICAvLyBUb3AtbGV2ZWwgbW9kdWxlIGlkZW50aWZpZXJzIGFyZSBpbnRlcnByZXRlZCBhcyByZWZlcnJpbmcgdG9cbiAgICAgIC8vIHBhY2thZ2VzIGluIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yaWVzLlxuICAgICAgbm9kZU1vZHVsZXNMb29rdXAoZmlsZSwgaWQsIGV4dGVuc2lvbnMpO1xuXG4gICAgLy8gSWYgdGhlIGlkZW50aWZpZXIgcmVzb2x2ZXMgdG8gYSBkaXJlY3RvcnksIHdlIHVzZSB0aGUgc2FtZSBsb2dpYyBhc1xuICAgIC8vIE5vZGUgdG8gZmluZCBhbiBgaW5kZXguanNgIG9yIGBwYWNrYWdlLmpzb25gIGZpbGUgdG8gZXZhbHVhdGUuXG4gICAgd2hpbGUgKGZpbGVJc0RpcmVjdG9yeShmaWxlKSkge1xuICAgICAgc2VlbkRpckZpbGVzID0gc2VlbkRpckZpbGVzIHx8IFtdO1xuXG4gICAgICAvLyBJZiB0aGUgXCJtYWluXCIgZmllbGQgb2YgYSBgcGFja2FnZS5qc29uYCBmaWxlIHJlc29sdmVzIHRvIGFcbiAgICAgIC8vIGRpcmVjdG9yeSB3ZSd2ZSBhbHJlYWR5IGNvbnNpZGVyZWQsIHRoZW4gd2Ugc2hvdWxkIG5vdCBhdHRlbXB0IHRvXG4gICAgICAvLyByZWFkIHRoZSBzYW1lIGBwYWNrYWdlLmpzb25gIGZpbGUgYWdhaW4uIFVzaW5nIGFuIGFycmF5IGFzIGEgc2V0XG4gICAgICAvLyBpcyBhY2NlcHRhYmxlIGhlcmUgYmVjYXVzZSB0aGUgbnVtYmVyIG9mIGRpcmVjdG9yaWVzIHRvIGNvbnNpZGVyXG4gICAgICAvLyBpcyByYXJlbHkgZ3JlYXRlciB0aGFuIDEgb3IgMi4gQWxzbywgdXNpbmcgaW5kZXhPZiBhbGxvd3MgdXMgdG9cbiAgICAgIC8vIHN0b3JlIEZpbGUgb2JqZWN0cyBpbnN0ZWFkIG9mIHN0cmluZ3MuXG4gICAgICBpZiAoc2VlbkRpckZpbGVzLmluZGV4T2YoZmlsZSkgPCAwKSB7XG4gICAgICAgIHNlZW5EaXJGaWxlcy5wdXNoKGZpbGUpO1xuXG4gICAgICAgIHZhciBwa2dKc29uRmlsZSA9IGZpbGVBcHBlbmRJZFBhcnQoZmlsZSwgXCJwYWNrYWdlLmpzb25cIik7XG4gICAgICAgIHZhciBtYWluID0gcGtnSnNvbkZpbGUgJiYgZmlsZUV2YWx1YXRlKHBrZ0pzb25GaWxlKS5tYWluO1xuICAgICAgICBpZiAoaXNTdHJpbmcobWFpbikpIHtcbiAgICAgICAgICAvLyBUaGUgXCJtYWluXCIgZmllbGQgb2YgcGFja2FnZS5qc29uIGRvZXMgbm90IGhhdmUgdG8gYmVnaW4gd2l0aFxuICAgICAgICAgIC8vIC4vIHRvIGJlIGNvbnNpZGVyZWQgcmVsYXRpdmUsIHNvIGZpcnN0IHdlIHRyeSBzaW1wbHlcbiAgICAgICAgICAvLyBhcHBlbmRpbmcgaXQgdG8gdGhlIGRpcmVjdG9yeSBwYXRoIGJlZm9yZSBmYWxsaW5nIGJhY2sgdG8gYVxuICAgICAgICAgIC8vIGZ1bGwgZmlsZVJlc29sdmUsIHdoaWNoIG1pZ2h0IHJldHVybiBhIHBhY2thZ2UgZnJvbSBhXG4gICAgICAgICAgLy8gbm9kZV9tb2R1bGVzIGRpcmVjdG9yeS5cbiAgICAgICAgICBmaWxlID0gZmlsZUFwcGVuZElkKGZpbGUsIG1haW4sIGV4dGVuc2lvbnMpIHx8XG4gICAgICAgICAgICBmaWxlUmVzb2x2ZShmaWxlLCBtYWluLCBzZWVuRGlyRmlsZXMpO1xuXG4gICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgIC8vIFRoZSBmaWxlQXBwZW5kSWQgY2FsbCBhYm92ZSBtYXkgaGF2ZSByZXR1cm5lZCBhIGRpcmVjdG9yeSxcbiAgICAgICAgICAgIC8vIHNvIGNvbnRpbnVlIHRoZSBsb29wIHRvIG1ha2Ugc3VyZSB3ZSByZXNvbHZlIGl0IHRvIGFcbiAgICAgICAgICAgIC8vIG5vbi1kaXJlY3RvcnkgZmlsZS5cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB3ZSBkaWRuJ3QgZmluZCBhIGBwYWNrYWdlLmpzb25gIGZpbGUsIG9yIGl0IGRpZG4ndCBoYXZlIGFcbiAgICAgIC8vIHJlc29sdmFibGUgYC5tYWluYCBwcm9wZXJ0eSwgdGhlIG9ubHkgcG9zc2liaWxpdHkgbGVmdCB0b1xuICAgICAgLy8gY29uc2lkZXIgaXMgdGhhdCB0aGlzIGRpcmVjdG9yeSBjb250YWlucyBhbiBgaW5kZXguanNgIG1vZHVsZS5cbiAgICAgIC8vIFRoaXMgYXNzaWdubWVudCBhbG1vc3QgYWx3YXlzIHRlcm1pbmF0ZXMgdGhlIHdoaWxlIGxvb3AsIGJlY2F1c2VcbiAgICAgIC8vIHRoZXJlJ3MgdmVyeSBsaXR0bGUgY2hhbmNlIGBmaWxlSXNEaXJlY3RvcnkoZmlsZSlgIHdpbGwgYmUgdHJ1ZVxuICAgICAgLy8gZm9yIHRoZSByZXN1bHQgb2YgYGZpbGVBcHBlbmRJZFBhcnQoZmlsZSwgXCJpbmRleC5qc1wiKWAuIEhvd2V2ZXIsXG4gICAgICAvLyBpbiBwcmluY2lwbGUgaXQgaXMgcmVtb3RlbHkgcG9zc2libGUgdGhhdCBhIGZpbGUgY2FsbGVkXG4gICAgICAvLyBgaW5kZXguanNgIGNvdWxkIGJlIGEgZGlyZWN0b3J5IGluc3RlYWQgb2YgYSBmaWxlLlxuICAgICAgZmlsZSA9IGZpbGVBcHBlbmRJZFBhcnQoZmlsZSwgXCJpbmRleC5qc1wiKTtcbiAgICB9XG5cbiAgICBpZiAoZmlsZSAmJiBpc1N0cmluZyhmaWxlLmMpKSB7XG4gICAgICBmaWxlID0gZmlsZVJlc29sdmUoZmlsZSwgZmlsZS5jLCBzZWVuRGlyRmlsZXMpO1xuICAgIH1cblxuICAgIHJldHVybiBmaWxlO1xuICB9O1xuXG4gIGZ1bmN0aW9uIG5vZGVNb2R1bGVzTG9va3VwKGZpbGUsIGlkLCBleHRlbnNpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24ob3ZlcnJpZGUpKSB7XG4gICAgICBpZCA9IG92ZXJyaWRlKGlkLCBmaWxlLm0uaWQpO1xuICAgIH1cblxuICAgIGlmIChpc1N0cmluZyhpZCkpIHtcbiAgICAgIGZvciAodmFyIHJlc29sdmVkOyBmaWxlICYmICEgcmVzb2x2ZWQ7IGZpbGUgPSBmaWxlLnApIHtcbiAgICAgICAgcmVzb2x2ZWQgPSBmaWxlSXNEaXJlY3RvcnkoZmlsZSkgJiZcbiAgICAgICAgICBmaWxlQXBwZW5kSWQoZmlsZSwgXCJub2RlX21vZHVsZXMvXCIgKyBpZCwgZXh0ZW5zaW9ucyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaW5zdGFsbDtcbn07XG5cbmlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuICBleHBvcnRzLm1ha2VJbnN0YWxsZXIgPSBtYWtlSW5zdGFsbGVyO1xufVxuIiwidmFyIG9wdGlvbnMgPSB7fTtcbnZhciBoYXNPd24gPSBvcHRpb25zLmhhc093blByb3BlcnR5O1xuXG4vLyBSZWdFeHAgbWF0Y2hpbmcgc3RyaW5ncyB0aGF0IGRvbid0IHN0YXJ0IHdpdGggYSBgLmAgb3IgYSBgL2AuXG52YXIgdG9wTGV2ZWxJZFBhdHRlcm4gPSAvXlteLi9dLztcblxuLy8gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aGVuZXZlciBhIG1vZHVsZSBpZGVudGlmaWVyIHRoYXQgaGFzbid0XG4vLyBiZWVuIGluc3RhbGxlZCBpcyByZXF1aXJlZC4gRm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LCBhbmQgc28gdGhhdCB3ZVxuLy8gY2FuIHJlcXVpcmUgYmluYXJ5IGRlcGVuZGVuY2llcyBvbiB0aGUgc2VydmVyLCB3ZSBpbXBsZW1lbnQgdGhlXG4vLyBmYWxsYmFjayBpbiB0ZXJtcyBvZiBOcG0ucmVxdWlyZS5cbm9wdGlvbnMuZmFsbGJhY2sgPSBmdW5jdGlvbiAoaWQsIGRpciwgZXJyb3IpIHtcbiAgLy8gRm9yIHNpbXBsaWNpdHksIHdlIGhvbm9yIG9ubHkgdG9wLWxldmVsIG1vZHVsZSBpZGVudGlmaWVycyBoZXJlLlxuICAvLyBXZSBjb3VsZCB0cnkgdG8gaG9ub3IgcmVsYXRpdmUgYW5kIGFic29sdXRlIG1vZHVsZSBpZGVudGlmaWVycyBieVxuICAvLyBzb21laG93IGNvbWJpbmluZyBgaWRgIHdpdGggYGRpcmAsIGJ1dCB3ZSdkIGhhdmUgdG8gYmUgcmVhbGx5IGNhcmVmdWxcbiAgLy8gdGhhdCB0aGUgcmVzdWx0aW5nIG1vZHVsZXMgd2VyZSBsb2NhdGVkIGluIGEga25vd24gZGlyZWN0b3J5IChub3RcbiAgLy8gc29tZSBhcmJpdHJhcnkgbG9jYXRpb24gb24gdGhlIGZpbGUgc3lzdGVtKSwgYW5kIHdlIG9ubHkgcmVhbGx5IG5lZWRcbiAgLy8gdGhlIGZhbGxiYWNrIGZvciBkZXBlbmRlbmNpZXMgaW5zdGFsbGVkIGluIG5vZGVfbW9kdWxlcyBkaXJlY3Rvcmllcy5cbiAgaWYgKHRvcExldmVsSWRQYXR0ZXJuLnRlc3QoaWQpKSB7XG4gICAgaWYgKHR5cGVvZiBOcG0gPT09IFwib2JqZWN0XCIgJiZcbiAgICAgICAgdHlwZW9mIE5wbS5yZXF1aXJlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHJldHVybiBOcG0ucmVxdWlyZShpZCk7XG4gICAgfVxuICB9XG5cbiAgdGhyb3cgZXJyb3I7XG59O1xuXG5pZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gIC8vIERlZmluaW5nIE1vZHVsZS5wcm90b3R5cGUudXNlTm9kZSBhbGxvd3MgdGhlIG1vZHVsZSBzeXN0ZW0gdG9cbiAgLy8gZGVsZWdhdGUgZXZhbHVhdGlvbiB0byBOb2RlLCB1bmxlc3MgdXNlTm9kZSByZXR1cm5zIGZhbHNlLlxuICAob3B0aW9ucy5Nb2R1bGUgPSBmdW5jdGlvbiBNb2R1bGUoaWQpIHtcbiAgICAvLyBTYW1lIGFzIHRoZSBkZWZhdWx0IE1vZHVsZSBjb25zdHJ1Y3RvciBpbXBsZW1lbnRhdGlvbi5cbiAgICB0aGlzLmlkID0gaWQ7XG4gICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICB9KS5wcm90b3R5cGUudXNlTm9kZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIG5wbVJlcXVpcmUgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgLy8gQ2FuJ3QgdXNlIE5vZGUgaWYgbnBtUmVxdWlyZSBpcyBub3QgZGVmaW5lZC5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgcGFydHMgPSB0aGlzLmlkLnNwbGl0KFwiL1wiKTtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGlmIChwYXJ0c1tzdGFydF0gPT09IFwiXCIpICsrc3RhcnQ7XG4gICAgaWYgKHBhcnRzW3N0YXJ0XSA9PT0gXCJub2RlX21vZHVsZXNcIiAmJlxuICAgICAgICBwYXJ0c1tzdGFydCArIDFdID09PSBcIm1ldGVvclwiKSB7XG4gICAgICBzdGFydCArPSAyO1xuICAgIH1cblxuICAgIGlmIChwYXJ0cy5pbmRleE9mKFwibm9kZV9tb2R1bGVzXCIsIHN0YXJ0KSA8IDApIHtcbiAgICAgIC8vIERvbid0IHRyeSB0byB1c2UgTm9kZSBmb3IgbW9kdWxlcyB0aGF0IGFyZW4ndCBpbiBub2RlX21vZHVsZXNcbiAgICAgIC8vIGRpcmVjdG9yaWVzLlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBucG1SZXF1aXJlLnJlc29sdmUodGhpcy5pZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuZXhwb3J0cyA9IG5wbVJlcXVpcmUodGhpcy5pZCk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcbn1cblxubWV0ZW9ySW5zdGFsbCA9IG1ha2VJbnN0YWxsZXIob3B0aW9ucyk7XG4iXX0=
