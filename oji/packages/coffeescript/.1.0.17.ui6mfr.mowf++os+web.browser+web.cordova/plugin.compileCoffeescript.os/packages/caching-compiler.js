(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Random = Package.random.Random;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var CachingCompilerBase, CachingCompiler, MultiFileCachingCompiler;

var require = meteorInstall({"node_modules":{"meteor":{"caching-compiler":{"caching-compiler.js":["babel-runtime/helpers/possibleConstructorReturn","babel-runtime/helpers/inherits","babel-runtime/helpers/typeof","babel-runtime/helpers/classCallCheck",function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/caching-compiler/caching-compiler.js                                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');                         //
                                                                                                                      //
var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);                                //
                                                                                                                      //
var _inherits2 = require('babel-runtime/helpers/inherits');                                                           //
                                                                                                                      //
var _inherits3 = _interopRequireDefault(_inherits2);                                                                  //
                                                                                                                      //
var _typeof2 = require('babel-runtime/helpers/typeof');                                                               //
                                                                                                                      //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                      //
                                                                                                                      //
var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');                                               //
                                                                                                                      //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                      //
                                                                                                                      //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }                     //
                                                                                                                      //
var fs = Plugin.fs;                                                                                                   // 1
var path = Plugin.path;                                                                                               // 2
var createHash = Npm.require('crypto').createHash;                                                                    // 3
var assert = Npm.require('assert');                                                                                   // 4
var Future = Npm.require('fibers/future');                                                                            // 5
var LRU = Npm.require('lru-cache');                                                                                   // 6
var async = Npm.require('async');                                                                                     // 7
                                                                                                                      //
// Base class for CachingCompiler and MultiFileCachingCompiler.                                                       //
CachingCompilerBase = function () {                                                                                   // 10
  function CachingCompilerBase(_ref) {                                                                                // 11
    var compilerName = _ref.compilerName;                                                                             //
    var defaultCacheSize = _ref.defaultCacheSize;                                                                     //
    var _ref$maxParallelism = _ref.maxParallelism;                                                                    //
    var maxParallelism = _ref$maxParallelism === undefined ? 20 : _ref$maxParallelism;                                //
    (0, _classCallCheck3['default'])(this, CachingCompilerBase);                                                      //
                                                                                                                      //
    this._compilerName = compilerName;                                                                                // 16
    this._maxParallelism = maxParallelism;                                                                            // 17
    var envVarPrefix = 'METEOR_' + compilerName.toUpperCase() + '_CACHE_';                                            // 18
                                                                                                                      //
    var debugEnvVar = envVarPrefix + 'DEBUG';                                                                         // 20
    this._cacheDebugEnabled = !!process.env[debugEnvVar];                                                             // 21
                                                                                                                      //
    var cacheSizeEnvVar = envVarPrefix + 'SIZE';                                                                      // 23
    this._cacheSize = +process.env[cacheSizeEnvVar] || defaultCacheSize;                                              // 24
                                                                                                                      //
    this._diskCache = null;                                                                                           // 26
                                                                                                                      //
    // For testing.                                                                                                   //
    this._callCount = 0;                                                                                              // 15
  }                                                                                                                   //
                                                                                                                      //
  // Your subclass must override this method to define the key used to identify                                       //
  // a particular version of an InputFile.                                                                            //
  //                                                                                                                  //
  // Given an InputFile (the data type passed to processFilesForTarget as part                                        //
  // of the Plugin.registerCompiler API), returns a cache key that represents                                         //
  // it. This cache key can be any JSON value (it will be converted internally                                        //
  // into a hash).  This should reflect any aspect of the InputFile that affects                                      //
  // the output of `compileOneFile`. Typically you'll want to include                                                 //
  // `inputFile.getDeclaredExports()`, and perhaps                                                                    //
  // `inputFile.getPathInPackage()` or `inputFile.getDeclaredExports` if                                              //
  // `compileOneFile` pays attention to them.                                                                         //
  //                                                                                                                  //
  // Note that for MultiFileCachingCompiler, your cache key doesn't need to                                           //
  // include the file's path, because that is automatically taken into account                                        //
  // by the implementation. CachingCompiler subclasses can choose whether or not                                      //
  // to include the file's path in the cache key.                                                                     //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype.getCacheKey = function getCacheKey(inputFile) {                                       // 10
    throw Error('CachingCompiler subclass should implement getCacheKey!');                                            // 49
  };                                                                                                                  //
                                                                                                                      //
  // Your subclass must override this method to define how a CompileResult                                            //
  // translates into adding assets to the bundle.                                                                     //
  //                                                                                                                  //
  // This method is given an InputFile (the data type passed to                                                       //
  // processFilesForTarget as part of the Plugin.registerCompiler API) and a                                          //
  // CompileResult (either returned directly from compileOneFile or read from                                         //
  // the cache).  It should call methods like `inputFile.addJavaScript`                                               //
  // and `inputFile.error`.                                                                                           //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype.addCompileResult = function addCompileResult(inputFile, compileResult) {              // 10
    throw Error('CachingCompiler subclass should implement addCompileResult!');                                       // 61
  };                                                                                                                  //
                                                                                                                      //
  // Your subclass must override this method to define the size of a                                                  //
  // CompilerResult (used by the in-memory cache to limit the total amount of                                         //
  // data cached).                                                                                                    //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype.compileResultSize = function compileResultSize(compileResult) {                       // 10
    throw Error('CachingCompiler subclass should implement compileResultSize!');                                      // 68
  };                                                                                                                  //
                                                                                                                      //
  // Your subclass may override this method to define an alternate way of                                             //
  // stringifying CompilerResults.  Takes a CompileResult and returns a string.                                       //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype.stringifyCompileResult = function stringifyCompileResult(compileResult) {             // 10
    return JSON.stringify(compileResult);                                                                             // 74
  };                                                                                                                  //
  // Your subclass may override this method to define an alternate way of                                             //
  // parsing CompilerResults from string.  Takes a string and returns a                                               //
  // CompileResult.  If the string doesn't represent a valid CompileResult, you                                       //
  // may want to return null instead of throwing, which will make                                                     //
  // CachingCompiler ignore the cache.                                                                                //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype.parseCompileResult = function parseCompileResult(stringifiedCompileResult) {          // 10
    return this._parseJSONOrNull(stringifiedCompileResult);                                                           // 82
  };                                                                                                                  //
                                                                                                                      //
  CachingCompilerBase.prototype._parseJSONOrNull = function _parseJSONOrNull(json) {                                  // 10
    try {                                                                                                             // 85
      return JSON.parse(json);                                                                                        // 86
    } catch (e) {                                                                                                     //
      if (e instanceof SyntaxError) return null;                                                                      // 88
      throw e;                                                                                                        // 90
    }                                                                                                                 //
  };                                                                                                                  //
                                                                                                                      //
  CachingCompilerBase.prototype._cacheDebug = function _cacheDebug(message) {                                         // 10
    if (!this._cacheDebugEnabled) return;                                                                             // 95
    console.log('CACHE(' + this._compilerName + '): ' + message);                                                     // 97
  };                                                                                                                  //
                                                                                                                      //
  CachingCompilerBase.prototype.setDiskCacheDirectory = function setDiskCacheDirectory(diskCache) {                   // 10
    if (this._diskCache) throw Error('setDiskCacheDirectory called twice?');                                          // 101
    this._diskCache = diskCache;                                                                                      // 103
  };                                                                                                                  //
                                                                                                                      //
  // Since so many compilers will need to calculate the size of a SourceMap in                                        //
  // their compileResultSize, this method is provided.                                                                //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype.sourceMapSize = function sourceMapSize(sm) {                                          // 10
    if (!sm) return 0;                                                                                                // 109
    // sum the length of sources and the mappings, the size of                                                        //
    // metadata is ignored, but it is not a big deal                                                                  //
    return sm.mappings.length + (sm.sourcesContent || []).reduce(function (soFar, current) {                          // 108
      return soFar + (current ? current.length : 0);                                                                  // 114
    }, 0);                                                                                                            //
  };                                                                                                                  //
                                                                                                                      //
  // Borrowed from another MIT-licensed project that benjamn wrote:                                                   //
  // https://github.com/reactjs/commoner/blob/235d54a12c/lib/util.js#L136-L168                                        //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype._deepHash = function _deepHash(val) {                                                 // 10
    var _this = this;                                                                                                 //
                                                                                                                      //
    var hash = createHash('sha1');                                                                                    // 121
    var type = typeof val === 'undefined' ? 'undefined' : (0, _typeof3['default'])(val);                              // 122
                                                                                                                      //
    if (val === null) {                                                                                               // 124
      type = 'null';                                                                                                  // 125
    }                                                                                                                 //
    hash.update(type + '\0');                                                                                         // 127
                                                                                                                      //
    switch (type) {                                                                                                   // 129
      case 'object':                                                                                                  // 130
        var keys = Object.keys(val);                                                                                  // 131
                                                                                                                      //
        // Array keys will already be sorted.                                                                         //
        if (!Array.isArray(val)) {                                                                                    // 130
          keys.sort();                                                                                                // 135
        }                                                                                                             //
                                                                                                                      //
        keys.forEach(function (key) {                                                                                 // 138
          if (typeof val[key] === 'function') {                                                                       // 139
            // Silently ignore nested methods, but nevertheless complain below                                        //
            // if the root value is a function.                                                                       //
            return;                                                                                                   // 142
          }                                                                                                           //
                                                                                                                      //
          hash.update(key + '\0').update(_this._deepHash(val[key]));                                                  // 145
        });                                                                                                           //
                                                                                                                      //
        break;                                                                                                        // 148
                                                                                                                      //
      case 'function':                                                                                                // 129
        assert.ok(false, 'cannot hash function objects');                                                             // 151
        break;                                                                                                        // 152
                                                                                                                      //
      default:                                                                                                        // 129
        hash.update('' + val);                                                                                        // 155
        break;                                                                                                        // 156
    }                                                                                                                 // 129
                                                                                                                      //
    return hash.digest('hex');                                                                                        // 159
  };                                                                                                                  //
                                                                                                                      //
  // We want to write the file atomically. But we also don't want to block                                            //
  // processing on the file write.                                                                                    //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype._writeFileAsync = function _writeFileAsync(filename, contents) {                      // 10
    var tempFilename = filename + '.tmp.' + Random.id();                                                              // 165
    fs.writeFile(tempFilename, contents, function (err) {                                                             // 166
      // ignore errors, it's just a cache                                                                             //
      if (err) {                                                                                                      // 168
        return;                                                                                                       // 169
      }                                                                                                               //
      fs.rename(tempFilename, filename, function (err) {                                                              // 171
        // ignore this error too.                                                                                     //
      });                                                                                                             //
    });                                                                                                               //
  };                                                                                                                  //
                                                                                                                      //
  // Helper function. Returns the body of the file as a string, or null if it                                         //
  // doesn't exist.                                                                                                   //
                                                                                                                      //
                                                                                                                      //
  CachingCompilerBase.prototype._readFileOrNull = function _readFileOrNull(filename) {                                // 10
    try {                                                                                                             // 180
      return fs.readFileSync(filename, 'utf8');                                                                       // 181
    } catch (e) {                                                                                                     //
      if (e && e.code === 'ENOENT') return null;                                                                      // 183
      throw e;                                                                                                        // 185
    }                                                                                                                 //
  };                                                                                                                  //
                                                                                                                      //
  return CachingCompilerBase;                                                                                         //
}();                                                                                                                  //
                                                                                                                      //
// CachingCompiler is a class designed to be used with Plugin.registerCompiler                                        //
// which implements in-memory and on-disk caches for the files that it                                                //
// processes.  You should subclass CachingCompiler and define the following                                           //
// methods: getCacheKey, compileOneFile, addCompileResult, and                                                        //
// compileResultSize.                                                                                                 //
//                                                                                                                    //
// CachingCompiler assumes that files are processed independently of each other;                                      //
// there is no 'import' directive allowing one file to reference another.  That                                       //
// is, editing one file should only require that file to be rebuilt, not other                                        //
// files.                                                                                                             //
//                                                                                                                    //
// The data that is cached for each file is of a type that is (implicitly)                                            //
// defined by your subclass. CachingCompiler refers to this type as                                                   //
// `CompileResult`, but this isn't a single type: it's up to your subclass to                                         //
// decide what type of data this is.  You should document what your subclass's                                        //
// CompileResult type is.                                                                                             //
//                                                                                                                    //
// Your subclass's compiler should call the superclass compiler specifying the                                        //
// compiler name (used to generate environment variables for debugging and                                            //
// tweaking in-memory cache size) and the default cache size.                                                         //
//                                                                                                                    //
// By default, CachingCompiler processes each file in "parallel". That is, if it                                      //
// needs to yield to read from the disk cache, or if getCacheKey,                                                     //
// compileOneFile, or addCompileResult yields, it will start processing the next                                      //
// few files. To set how many files can be processed in parallel (including                                           //
// setting it to 1 if your subclass doesn't support any parallelism), pass the                                        //
// maxParallelism option to the superclass constructor.                                                               //
//                                                                                                                    //
// For example (using ES2015 via the ecmascript package):                                                             //
//                                                                                                                    //
//   class AwesomeCompiler extends CachingCompiler {                                                                  //
//     constructor() {                                                                                                //
//       super({                                                                                                      //
//         compilerName: 'awesome',                                                                                   //
//         defaultCacheSize: 1024*1024*10,                                                                            //
//       });                                                                                                          //
//     }                                                                                                              //
//     // ... define the other methods                                                                                //
//   }                                                                                                                //
//   Plugin.registerCompile({                                                                                         //
//     extensions: ['awesome'],                                                                                       //
//   }, () => new AwesomeCompiler());                                                                                 //
//                                                                                                                    //
// XXX maybe compileResultSize and stringifyCompileResult should just be methods                                      //
// on CompileResult? Sort of hard to do that with parseCompileResult.                                                 //
CachingCompiler = function (_CachingCompilerBase) {                                                                   // 235
  (0, _inherits3['default'])(CachingCompiler, _CachingCompilerBase);                                                  //
                                                                                                                      //
  function CachingCompiler(_ref2) {                                                                                   // 236
    var compilerName = _ref2.compilerName;                                                                            //
    var defaultCacheSize = _ref2.defaultCacheSize;                                                                    //
    var _ref2$maxParallelism = _ref2.maxParallelism;                                                                  //
    var maxParallelism = _ref2$maxParallelism === undefined ? 20 : _ref2$maxParallelism;                              //
    (0, _classCallCheck3['default'])(this, CachingCompiler);                                                          //
                                                                                                                      //
                                                                                                                      //
    // Maps from a hashed cache key to a compileResult.                                                               //
                                                                                                                      //
    var _this2 = (0, _possibleConstructorReturn3['default'])(this, _CachingCompilerBase.call(this, { compilerName: compilerName, defaultCacheSize: defaultCacheSize, maxParallelism: maxParallelism }));
                                                                                                                      //
    _this2._cache = new LRU({                                                                                         // 244
      max: _this2._cacheSize,                                                                                         // 245
      length: function length(value) {                                                                                // 246
        return _this2.compileResultSize(value);                                                                       //
      }                                                                                                               //
    });                                                                                                               //
    return _this2;                                                                                                    //
  }                                                                                                                   //
                                                                                                                      //
  // Your subclass must override this method to define the transformation from                                        //
  // InputFile to its cacheable CompileResult).                                                                       //
  //                                                                                                                  //
  // Given an InputFile (the data type passed to processFilesForTarget as part                                        //
  // of the Plugin.registerCompiler API), compiles the file and returns a                                             //
  // CompileResult (the cacheable data type specific to your subclass).                                               //
  //                                                                                                                  //
  // This method is not called on files when a valid cache entry exists in                                            //
  // memory or on disk.                                                                                               //
  //                                                                                                                  //
  // On a compile error, you should call `inputFile.error` appropriately and                                          //
  // return null; this will not be cached.                                                                            //
  //                                                                                                                  //
  // This method should not call `inputFile.addJavaScript` and similar files!                                         //
  // That's what addCompileResult is for.                                                                             //
                                                                                                                      //
                                                                                                                      //
  CachingCompiler.prototype.compileOneFile = function compileOneFile(inputFile) {                                     // 235
    throw Error('CachingCompiler subclass should implement compileOneFile!');                                         // 266
  };                                                                                                                  //
                                                                                                                      //
  // The processFilesForTarget method from the Plugin.registerCompiler API. If                                        //
  // you have processing you want to perform at the beginning or end of a                                             //
  // processing phase, you may want to override this method and call the                                              //
  // superclass implementation from within your method.                                                               //
                                                                                                                      //
                                                                                                                      //
  CachingCompiler.prototype.processFilesForTarget = function processFilesForTarget(inputFiles) {                      // 235
    var _this3 = this;                                                                                                //
                                                                                                                      //
    var cacheMisses = [];                                                                                             // 274
                                                                                                                      //
    var future = new Future();                                                                                        // 276
    async.eachLimit(inputFiles, this._maxParallelism, function (inputFile, cb) {                                      // 277
      var error = null;                                                                                               // 278
      try {                                                                                                           // 279
        var cacheKey = _this3._deepHash(_this3.getCacheKey(inputFile));                                               // 280
        var compileResult = _this3._cache.get(cacheKey);                                                              // 281
                                                                                                                      //
        if (!compileResult) {                                                                                         // 283
          compileResult = _this3._readCache(cacheKey);                                                                // 284
          if (compileResult) {                                                                                        // 285
            _this3._cacheDebug('Loaded ' + inputFile.getDisplayPath());                                               // 286
          }                                                                                                           //
        }                                                                                                             //
                                                                                                                      //
        if (!compileResult) {                                                                                         // 290
          cacheMisses.push(inputFile.getDisplayPath());                                                               // 291
          compileResult = _this3.compileOneFile(inputFile);                                                           // 292
                                                                                                                      //
          if (!compileResult) {                                                                                       // 294
            // compileOneFile should have called inputFile.error.                                                     //
            //  We don't cache failures for now.                                                                      //
            return;                                                                                                   // 297
          }                                                                                                           //
                                                                                                                      //
          // Save what we've compiled.                                                                                //
          _this3._cache.set(cacheKey, compileResult);                                                                 // 290
          _this3._writeCacheAsync(cacheKey, compileResult);                                                           // 302
        }                                                                                                             //
                                                                                                                      //
        _this3.addCompileResult(inputFile, compileResult);                                                            // 305
      } catch (e) {                                                                                                   //
        error = e;                                                                                                    // 307
      } finally {                                                                                                     //
        cb(error);                                                                                                    // 309
      }                                                                                                               //
    }, future.resolver());                                                                                            //
    future.wait();                                                                                                    // 312
                                                                                                                      //
    if (this._cacheDebugEnabled) {                                                                                    // 314
      cacheMisses.sort();                                                                                             // 315
      this._cacheDebug('Ran (#' + ++this._callCount + ') on: ' + JSON.stringify(cacheMisses));                        // 316
    }                                                                                                                 //
  };                                                                                                                  //
                                                                                                                      //
  CachingCompiler.prototype._cacheFilename = function _cacheFilename(cacheKey) {                                      // 235
    // We want cacheKeys to be hex so that they work on any FS and never end in                                       //
    // .cache.                                                                                                        //
    if (!/^[a-f0-9]+$/.test(cacheKey)) {                                                                              // 324
      throw Error('bad cacheKey: ' + cacheKey);                                                                       // 325
    }                                                                                                                 //
    return path.join(this._diskCache, cacheKey + '.cache');                                                           // 327
  };                                                                                                                  //
  // Load a cache entry from disk. Returns the compileResult object                                                   //
  // and loads it into the in-memory cache too.                                                                       //
                                                                                                                      //
                                                                                                                      //
  CachingCompiler.prototype._readCache = function _readCache(cacheKey) {                                              // 235
    if (!this._diskCache) {                                                                                           // 332
      return null;                                                                                                    // 333
    }                                                                                                                 //
    var cacheFilename = this._cacheFilename(cacheKey);                                                                // 335
    var compileResult = this._readAndParseCompileResultOrNull(cacheFilename);                                         // 336
    if (!compileResult) {                                                                                             // 337
      return null;                                                                                                    // 338
    }                                                                                                                 //
    this._cache.set(cacheKey, compileResult);                                                                         // 340
    return compileResult;                                                                                             // 341
  };                                                                                                                  //
                                                                                                                      //
  CachingCompiler.prototype._writeCacheAsync = function _writeCacheAsync(cacheKey, compileResult) {                   // 235
    if (!this._diskCache) return;                                                                                     // 344
    var cacheFilename = this._cacheFilename(cacheKey);                                                                // 346
    var cacheContents = this.stringifyCompileResult(compileResult);                                                   // 347
    this._writeFileAsync(cacheFilename, cacheContents);                                                               // 348
  };                                                                                                                  //
                                                                                                                      //
  // Returns null if the file does not exist or can't be parsed; otherwise                                            //
  // returns the parsed compileResult in the file.                                                                    //
                                                                                                                      //
                                                                                                                      //
  CachingCompiler.prototype._readAndParseCompileResultOrNull = function _readAndParseCompileResultOrNull(filename) {  // 235
    var raw = this._readFileOrNull(filename);                                                                         // 354
    return this.parseCompileResult(raw);                                                                              // 355
  };                                                                                                                  //
                                                                                                                      //
  return CachingCompiler;                                                                                             //
}(CachingCompilerBase);                                                                                               //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"multi-file-caching-compiler.js":["babel-runtime/helpers/typeof","babel-runtime/helpers/classCallCheck","babel-runtime/helpers/possibleConstructorReturn","babel-runtime/helpers/inherits",function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/caching-compiler/multi-file-caching-compiler.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _typeof2 = require('babel-runtime/helpers/typeof');                                                               //
                                                                                                                      //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                      //
                                                                                                                      //
var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');                                               //
                                                                                                                      //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                      //
                                                                                                                      //
var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');                         //
                                                                                                                      //
var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);                                //
                                                                                                                      //
var _inherits2 = require('babel-runtime/helpers/inherits');                                                           //
                                                                                                                      //
var _inherits3 = _interopRequireDefault(_inherits2);                                                                  //
                                                                                                                      //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }                     //
                                                                                                                      //
var path = Plugin.path;                                                                                               // 1
var Future = Npm.require('fibers/future');                                                                            // 2
var LRU = Npm.require('lru-cache');                                                                                   // 3
var async = Npm.require('async');                                                                                     // 4
                                                                                                                      //
// MultiFileCachingCompiler is like CachingCompiler, but for implementing                                             //
// languages which allow files to reference each other, such as CSS                                                   //
// preprocessors with `@import` directives.                                                                           //
//                                                                                                                    //
// Like CachingCompiler, you should subclass MultiFileCachingCompiler and define                                      //
// the following methods: getCacheKey, compileOneFile, addCompileResult, and                                          //
// compileResultSize.  compileOneFile gets an additional allFiles argument and                                        //
// returns an array of referenced import paths in addition to the CompileResult.                                      //
// You may also override isRoot and getAbsoluteImportPath to customize                                                //
// MultiFileCachingCompiler further.                                                                                  //
MultiFileCachingCompiler = function (_CachingCompilerBase) {                                                          // 16
  (0, _inherits3['default'])(MultiFileCachingCompiler, _CachingCompilerBase);                                         //
                                                                                                                      //
  function MultiFileCachingCompiler(_ref) {                                                                           // 18
    var compilerName = _ref.compilerName;                                                                             //
    var defaultCacheSize = _ref.defaultCacheSize;                                                                     //
    var maxParallelism = _ref.maxParallelism;                                                                         //
    (0, _classCallCheck3['default'])(this, MultiFileCachingCompiler);                                                 //
                                                                                                                      //
                                                                                                                      //
    // Maps from absolute import path to { compileResult, cacheKeys }, where                                          //
    // cacheKeys is an object mapping from absolute import path to hashed                                             //
    // cacheKey for each file referenced by this file (including itself).                                             //
                                                                                                                      //
    var _this = (0, _possibleConstructorReturn3['default'])(this, _CachingCompilerBase.call(this, { compilerName: compilerName, defaultCacheSize: defaultCacheSize, maxParallelism: maxParallelism }));
                                                                                                                      //
    _this._cache = new LRU({                                                                                          // 28
      max: _this._cacheSize,                                                                                          // 29
      // We ignore the size of cacheKeys here.                                                                        //
      length: function length(value) {                                                                                // 31
        return _this.compileResultSize(value.compileResult);                                                          //
      }                                                                                                               //
    });                                                                                                               //
    return _this;                                                                                                     //
  }                                                                                                                   //
                                                                                                                      //
  // Your subclass must override this method to define the transformation from                                        //
  // InputFile to its cacheable CompileResult).                                                                       //
  //                                                                                                                  //
  // Arguments:                                                                                                       //
  //   - inputFile is the InputFile to process                                                                        //
  //   - allFiles is a a Map mapping from absolute import path to InputFile of                                        //
  //     all files being processed in the target                                                                      //
  // Returns an object with keys:                                                                                     //
  //   - compileResult: the CompileResult (the cacheable data type specific to                                        //
  //     your subclass).                                                                                              //
  //   - referencedImportPaths: an array of absolute import paths of files                                            //
  //     which were refererenced by the current file.  The current file                                               //
  //     is included implicitly.                                                                                      //
  //                                                                                                                  //
  // This method is not called on files when a valid cache entry exists in                                            //
  // memory or on disk.                                                                                               //
  //                                                                                                                  //
  // On a compile error, you should call `inputFile.error` appropriately and                                          //
  // return null; this will not be cached.                                                                            //
  //                                                                                                                  //
  // This method should not call `inputFile.addJavaScript` and similar files!                                         //
  // That's what addCompileResult is for.                                                                             //
                                                                                                                      //
                                                                                                                      //
  MultiFileCachingCompiler.prototype.compileOneFile = function compileOneFile(inputFile, allFiles) {                  // 16
    throw Error('MultiFileCachingCompiler subclass should implement compileOneFile!');                                // 58
  };                                                                                                                  //
                                                                                                                      //
  // Your subclass may override this to declare that a file is not a "root" ---                                       //
  // ie, it can be included from other files but is not processed on its own. In                                      //
  // this case, MultiFileCachingCompiler won't waste time trying to look for a                                        //
  // cache for its compilation on disk.                                                                               //
                                                                                                                      //
                                                                                                                      //
  MultiFileCachingCompiler.prototype.isRoot = function isRoot(inputFile) {                                            // 16
    return true;                                                                                                      // 67
  };                                                                                                                  //
                                                                                                                      //
  // Returns the absolute import path for an InputFile. By default, this is a                                         //
  // path is a path of the form "{package}/path/to/file" for files in packages                                        //
  // and "{}/path/to/file" for files in apps. Your subclass may override and/or                                       //
  // call this method.                                                                                                //
                                                                                                                      //
                                                                                                                      //
  MultiFileCachingCompiler.prototype.getAbsoluteImportPath = function getAbsoluteImportPath(inputFile) {              // 16
    if (inputFile.getPackageName() === null) {                                                                        // 75
      return '{}/' + inputFile.getPathInPackage();                                                                    // 76
    }                                                                                                                 //
    return '{' + inputFile.getPackageName() + '}/' + inputFile.getPathInPackage();                                    // 78
  };                                                                                                                  //
                                                                                                                      //
  // The processFilesForTarget method from the Plugin.registerCompiler API.                                           //
                                                                                                                      //
                                                                                                                      //
  MultiFileCachingCompiler.prototype.processFilesForTarget = function processFilesForTarget(inputFiles) {             // 16
    var _this2 = this;                                                                                                //
                                                                                                                      //
    var allFiles = new Map();                                                                                         // 84
    var cacheKeyMap = new Map();                                                                                      // 85
    var cacheMisses = [];                                                                                             // 86
                                                                                                                      //
    inputFiles.forEach(function (inputFile) {                                                                         // 88
      var importPath = _this2.getAbsoluteImportPath(inputFile);                                                       // 89
      allFiles.set(importPath, inputFile);                                                                            // 90
      cacheKeyMap.set(importPath, _this2._deepHash(_this2.getCacheKey(inputFile)));                                   // 91
    });                                                                                                               //
                                                                                                                      //
    var allProcessedFuture = new Future();                                                                            // 94
    async.eachLimit(inputFiles, this._maxParallelism, function (inputFile, cb) {                                      // 95
      var error = null;                                                                                               // 96
      try {                                                                                                           // 97
        var _ret = function () {                                                                                      //
          // If this isn't a root, skip it (and definitely don't waste time                                           //
          // looking for a cache file that won't be there).                                                           //
          if (!_this2.isRoot(inputFile)) {                                                                            // 100
            return {                                                                                                  // 101
              v: void 0                                                                                               //
            };                                                                                                        //
          }                                                                                                           //
                                                                                                                      //
          var absoluteImportPath = _this2.getAbsoluteImportPath(inputFile);                                           // 104
          var cacheEntry = _this2._cache.get(absoluteImportPath);                                                     // 105
          if (!cacheEntry) {                                                                                          // 106
            cacheEntry = _this2._readCache(absoluteImportPath);                                                       // 107
            if (cacheEntry) {                                                                                         // 108
              _this2._cacheDebug('Loaded ' + absoluteImportPath);                                                     // 109
            }                                                                                                         //
          }                                                                                                           //
          if (!(cacheEntry && _this2._cacheEntryValid(cacheEntry, cacheKeyMap))) {                                    // 112
            var _cacheKeys;                                                                                           //
                                                                                                                      //
            cacheMisses.push(inputFile.getDisplayPath());                                                             // 113
                                                                                                                      //
            var compileOneFileReturn = _this2.compileOneFile(inputFile, allFiles);                                    // 115
            if (!compileOneFileReturn) {                                                                              // 116
              // compileOneFile should have called inputFile.error.                                                   //
              //  We don't cache failures for now.                                                                    //
              return {                                                                                                // 119
                v: void 0                                                                                             //
              };                                                                                                      //
            }                                                                                                         //
            var compileResult = compileOneFileReturn.compileResult;                                                   //
            var referencedImportPaths = compileOneFileReturn.referencedImportPaths;                                   //
                                                                                                                      //
                                                                                                                      //
            cacheEntry = {                                                                                            // 123
              compileResult: compileResult,                                                                           // 124
              cacheKeys: (_cacheKeys = {}, _cacheKeys[absoluteImportPath] = cacheKeyMap.get(absoluteImportPath), _cacheKeys)
            };                                                                                                        //
                                                                                                                      //
            // ... and of the other referenced files.                                                                 //
            referencedImportPaths.forEach(function (path) {                                                           // 112
              if (!cacheKeyMap.has(path)) {                                                                           // 133
                throw Error('Unknown absolute import path ' + path);                                                  // 134
              }                                                                                                       //
              cacheEntry.cacheKeys[path] = cacheKeyMap.get(path);                                                     // 136
            });                                                                                                       //
                                                                                                                      //
            // Save the cache entry.                                                                                  //
            _this2._cache.set(absoluteImportPath, cacheEntry);                                                        // 112
            _this2._writeCacheAsync(absoluteImportPath, cacheEntry);                                                  // 141
          }                                                                                                           //
                                                                                                                      //
          _this2.addCompileResult(inputFile, cacheEntry.compileResult);                                               // 144
        }();                                                                                                          //
                                                                                                                      //
        if ((typeof _ret === 'undefined' ? 'undefined' : (0, _typeof3['default'])(_ret)) === "object") return _ret.v;
      } catch (e) {                                                                                                   //
        error = e;                                                                                                    // 146
      } finally {                                                                                                     //
        cb(error);                                                                                                    // 148
      }                                                                                                               //
    }, allProcessedFuture.resolver());                                                                                //
    allProcessedFuture.wait();                                                                                        // 151
                                                                                                                      //
    if (this._cacheDebugEnabled) {                                                                                    // 153
      cacheMisses.sort();                                                                                             // 154
      this._cacheDebug('Ran (#' + ++this._callCount + ') on: ' + JSON.stringify(cacheMisses));                        // 155
    }                                                                                                                 //
  };                                                                                                                  //
                                                                                                                      //
  MultiFileCachingCompiler.prototype._cacheEntryValid = function _cacheEntryValid(cacheEntry, cacheKeyMap) {          // 16
    return Object.keys(cacheEntry.cacheKeys).every(function (path) {                                                  // 161
      return cacheEntry.cacheKeys[path] === cacheKeyMap.get(path);                                                    //
    });                                                                                                               //
  };                                                                                                                  //
                                                                                                                      //
  // The format of a cache file on disk is the JSON-stringified cacheKeys                                             //
  // object, a newline, followed by the CompileResult as returned from                                                //
  // this.stringifyCompileResult.                                                                                     //
                                                                                                                      //
                                                                                                                      //
  MultiFileCachingCompiler.prototype._cacheFilename = function _cacheFilename(absoluteImportPath) {                   // 16
    return path.join(this._diskCache, this._deepHash(absoluteImportPath) + '.cache');                                 // 170
  };                                                                                                                  //
  // Loads a {compileResult, cacheKeys} cache entry from disk. Returns the whole                                      //
  // cache entry and loads it into the in-memory cache too.                                                           //
                                                                                                                      //
                                                                                                                      //
  MultiFileCachingCompiler.prototype._readCache = function _readCache(absoluteImportPath) {                           // 16
    if (!this._diskCache) {                                                                                           // 176
      return null;                                                                                                    // 177
    }                                                                                                                 //
    var cacheFilename = this._cacheFilename(absoluteImportPath);                                                      // 179
    var raw = this._readFileOrNull(cacheFilename);                                                                    // 180
    if (!raw) {                                                                                                       // 181
      return null;                                                                                                    // 182
    }                                                                                                                 //
                                                                                                                      //
    // Split on newline.                                                                                              //
    var newlineIndex = raw.indexOf('\n');                                                                             // 175
    if (newlineIndex === -1) {                                                                                        // 187
      return null;                                                                                                    // 188
    }                                                                                                                 //
    var cacheKeysString = raw.substring(0, newlineIndex);                                                             // 190
    var compileResultString = raw.substring(newlineIndex + 1);                                                        // 191
                                                                                                                      //
    var cacheKeys = this._parseJSONOrNull(cacheKeysString);                                                           // 193
    if (!cacheKeys) {                                                                                                 // 194
      return null;                                                                                                    // 195
    }                                                                                                                 //
    var compileResult = this.parseCompileResult(compileResultString);                                                 // 197
    if (!compileResult) {                                                                                             // 198
      return null;                                                                                                    // 199
    }                                                                                                                 //
                                                                                                                      //
    var cacheEntry = { compileResult: compileResult, cacheKeys: cacheKeys };                                          // 202
    this._cache.set(absoluteImportPath, cacheEntry);                                                                  // 203
    return cacheEntry;                                                                                                // 204
  };                                                                                                                  //
                                                                                                                      //
  MultiFileCachingCompiler.prototype._writeCacheAsync = function _writeCacheAsync(absoluteImportPath, cacheEntry) {   // 16
    if (!this._diskCache) {                                                                                           // 207
      return null;                                                                                                    // 208
    }                                                                                                                 //
    var cacheFilename = this._cacheFilename(absoluteImportPath);                                                      // 210
    var cacheContents = JSON.stringify(cacheEntry.cacheKeys) + '\n' + this.stringifyCompileResult(cacheEntry.compileResult);
    this._writeFileAsync(cacheFilename, cacheContents);                                                               // 214
  };                                                                                                                  //
                                                                                                                      //
  return MultiFileCachingCompiler;                                                                                    //
}(CachingCompilerBase);                                                                                               //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
require("./node_modules/meteor/caching-compiler/caching-compiler.js");
require("./node_modules/meteor/caching-compiler/multi-file-caching-compiler.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['caching-compiler'] = {}, {
  CachingCompiler: CachingCompiler,
  MultiFileCachingCompiler: MultiFileCachingCompiler
});

})();



//# sourceURL=meteor://💻app/packages/caching-compiler.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvY2FjaGluZy1jb21waWxlci9jYWNoaW5nLWNvbXBpbGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9jYWNoaW5nLWNvbXBpbGVyL211bHRpLWZpbGUtY2FjaGluZy1jb21waWxlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBTSxLQUFLLE9BQU8sRUFBUDtBQUNYLElBQU0sT0FBTyxPQUFPLElBQVA7QUFDYixJQUFNLGFBQWEsSUFBSSxPQUFKLENBQVksUUFBWixFQUFzQixVQUF0QjtBQUNuQixJQUFNLFNBQVMsSUFBSSxPQUFKLENBQVksUUFBWixDQUFUO0FBQ04sSUFBTSxTQUFTLElBQUksT0FBSixDQUFZLGVBQVosQ0FBVDtBQUNOLElBQU0sTUFBTSxJQUFJLE9BQUosQ0FBWSxXQUFaLENBQU47QUFDTixJQUFNLFFBQVEsSUFBSSxPQUFKLENBQVksT0FBWixDQUFSOzs7QUFHTjtBQUNFLFdBRDBCLG1CQUMxQixPQUlHO1FBSEQsaUNBR0M7UUFGRCx5Q0FFQzttQ0FERCxlQUNDO1FBREQscURBQWlCLHlCQUNoQjsyQ0FMdUIscUJBS3ZCOztBQUNELFNBQUssYUFBTCxHQUFxQixZQUFyQixDQURDO0FBRUQsU0FBSyxlQUFMLEdBQXVCLGNBQXZCLENBRkM7QUFHRCxRQUFNLGVBQWUsWUFBWSxhQUFhLFdBQWIsRUFBWixHQUF5QyxTQUF6QyxDQUhwQjs7QUFLRCxRQUFNLGNBQWMsZUFBZSxPQUFmLENBTG5CO0FBTUQsU0FBSyxrQkFBTCxHQUEwQixDQUFDLENBQUUsUUFBUSxHQUFSLENBQVksV0FBWixDQUFGLENBTjFCOztBQVFELFFBQU0sa0JBQWtCLGVBQWUsTUFBZixDQVJ2QjtBQVNELFNBQUssVUFBTCxHQUFrQixDQUFDLFFBQVEsR0FBUixDQUFZLGVBQVosQ0FBRCxJQUFpQyxnQkFBakMs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QjtLQUF6QjtBQUdBLFFBQU0sa0JBQWtCLElBQUksU0FBSixDQUFjLENBQWQsRUFBaUIsWUFBakIsQ0FBbEIsQ0FmdUI7QUFnQjdCLFFBQU0sc0JBQXNCLElBQUksU0FBSixDQUFjLGVBQWUsQ0FBZixDQUFwQyxDQWhCdUI7O0FBa0I3QixRQUFNLFlBQVksS0FBSyxnQkFBTCxDQUFzQixlQUF0QixDQUFaLENBbEJ1QjtBQW1CN0IsUUFBSSxDQUFDLFNBQUQsRUFBWTtBQUNkLGFBQU8sSUFBUCxDQURjO0tBQWhCO0FBR0EsUUFBTSxnQkFBZ0IsS0FBSyxrQkFBTCxDQUF3QixtQkFBeEIsQ0FBaEIsQ0F0QnVCO0FBdUI3QixRQUFJLENBQUUsYUFBRixFQUFpQjtBQUNuQixhQUFPLElBQVAsQ0FEbUI7S0FBckI7O0FBSUEsUUFBTSxhQUFhLEVBQUMsNEJBQUQsRUFBZ0Isb0JBQWhCLEVBQWIsQ0EzQnVCO0FBNEI3QixTQUFLLE1BQUwsQ0FBWSxHQUFaLENBQWdCLGtCQUFoQixFQUFvQyxVQUFwQyxFQTVCNkI7QUE2QjdCLFdBQU8sVUFBUCxDQTdCNkI7OztBQS9KQSxxQ0E4TC9CLDZDQUFpQixvQkFBb0IsWUFBWTtBQUMvQyxRQUFJLENBQUUsS0FBSyxVQUFMLEVBQWlCO0FBQ3JCLGFBQU8sSUFBUCxDQURxQjtLQUF2QjtBQUdBLFFBQU0sZ0JBQWdCLEtBQUssY0FBTCxDQUFvQixrQkFBcEIsQ0FBaEIsQ0FKeUM7QUFLL0MsUUFBTSxnQkFDRSxLQUFLLFNBQUwsQ0FBZSxXQUFXLFNBQVgsQ0FBZixHQUF1QyxJQUF2QyxHQUNFLEtBQUssc0JBQUwsQ0FBNEIsV0FBVyxhQUFYLENBRDlCLENBTnVDO0FBUS9DLFNBQUssZUFBTCxDQUFxQixhQUFyQixFQUFvQyxhQUFwQyxFQVIrQzs7O1NBOUxsQjtFQUN6QixvQkFEUixrRyIsImZpbGUiOiIvcGFja2FnZXMvY2FjaGluZy1jb21waWxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGZzID0gUGx1Z2luLmZzO1xuY29uc3QgcGF0aCA9IFBsdWdpbi5wYXRoO1xuY29uc3QgY3JlYXRlSGFzaCA9IE5wbS5yZXF1aXJlKCdjcnlwdG8nKS5jcmVhdGVIYXNoO1xuY29uc3QgYXNzZXJ0ID0gTnBtLnJlcXVpcmUoJ2Fzc2VydCcpO1xuY29uc3QgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcbmNvbnN0IExSVSA9IE5wbS5yZXF1aXJlKCdscnUtY2FjaGUnKTtcbmNvbnN0IGFzeW5jID0gTnBtLnJlcXVpcmUoJ2FzeW5jJyk7XG5cbi8vIEJhc2UgY2xhc3MgZm9yIENhY2hpbmdDb21waWxlciBhbmQgTXVsdGlGaWxlQ2FjaGluZ0NvbXBpbGVyLlxuQ2FjaGluZ0NvbXBpbGVyQmFzZSA9IGNsYXNzIENhY2hpbmdDb21waWxlckJhc2Uge1xuICBjb25zdHJ1Y3Rvcih7XG4gICAgY29tcGlsZXJOYW1lLFxuICAgIGRlZmF1bHRDYWNoZVNpemUsXG4gICAgbWF4UGFyYWxsZWxpc20gPSAyMCxcbiAgfSkge1xuICAgIHRoaXMuX2NvbXBpbGVyTmFtZSA9IGNvbXBpbGVyTmFtZTtcbiAgICB0aGlzLl9tYXhQYXJhbGxlbGlzbSA9IG1heFBhcmFsbGVsaXNtO1xuICAgIGNvbnN0IGVudlZhclByZWZpeCA9ICdNRVRFT1JfJyArIGNvbXBpbGVyTmFtZS50b1VwcGVyQ2FzZSgpICsgJ19DQUNIRV8nO1xuXG4gICAgY29uc3QgZGVidWdFbnZWYXIgPSBlbnZWYXJQcmVmaXggKyAnREVCVUcnO1xuICAgIHRoaXMuX2NhY2hlRGVidWdFbmFibGVkID0gISEgcHJvY2Vzcy5lbnZbZGVidWdFbnZWYXJdO1xuXG4gICAgY29uc3QgY2FjaGVTaXplRW52VmFyID0gZW52VmFyUHJlZml4ICsgJ1NJWkUnO1xuICAgIHRoaXMuX2NhY2hlU2l6ZSA9ICtwcm9jZXNzLmVudltjYWNoZVNpemVFbnZWYXJdIHx8IGRlZmF1bHRDYWNoZVNpemU7XG5cbiAgICB0aGlzLl9kaXNrQ2FjaGUgPSBudWxsO1xuXG4gICAgLy8gRm9yIHRlc3RpbmcuXG4gICAgdGhpcy5fY2FsbENvdW50ID0gMDtcbiAgfVxuXG4gIC8vIFlvdXIgc3ViY2xhc3MgbXVzdCBvdmVycmlkZSB0aGlzIG1ldGhvZCB0byBkZWZpbmUgdGhlIGtleSB1c2VkIHRvIGlkZW50aWZ5XG4gIC8vIGEgcGFydGljdWxhciB2ZXJzaW9uIG9mIGFuIElucHV0RmlsZS5cbiAgLy9cbiAgLy8gR2l2ZW4gYW4gSW5wdXRGaWxlICh0aGUgZGF0YSB0eXBlIHBhc3NlZCB0byBwcm9jZXNzRmlsZXNGb3JUYXJnZXQgYXMgcGFydFxuICAvLyBvZiB0aGUgUGx1Z2luLnJlZ2lzdGVyQ29tcGlsZXIgQVBJKSwgcmV0dXJucyBhIGNhY2hlIGtleSB0aGF0IHJlcHJlc2VudHNcbiAgLy8gaXQuIFRoaXMgY2FjaGUga2V5IGNhbiBiZSBhbnkgSlNPTiB2YWx1ZSAoaXQgd2lsbCBiZSBjb252ZXJ0ZWQgaW50ZXJuYWxseVxuICAvLyBpbnRvIGEgaGFzaCkuICBUaGlzIHNob3VsZCByZWZsZWN0IGFueSBhc3BlY3Qgb2YgdGhlIElucHV0RmlsZSB0aGF0IGFmZmVjdHNcbiAgLy8gdGhlIG91dHB1dCBvZiBgY29tcGlsZU9uZUZpbGVgLiBUeXBpY2FsbHkgeW91J2xsIHdhbnQgdG8gaW5jbHVkZVxuICAvLyBgaW5wdXRGaWxlLmdldERlY2xhcmVkRXhwb3J0cygpYCwgYW5kIHBlcmhhcHNcbiAgLy8gYGlucHV0RmlsZS5nZXRQYXRoSW5QYWNrYWdlKClgIG9yIGBpbnB1dEZpbGUuZ2V0RGVjbGFyZWRFeHBvcnRzYCBpZlxuICAvLyBgY29tcGlsZU9uZUZpbGVgIHBheXMgYXR0ZW50aW9uIHRvIHRoZW0uXG4gIC8vXG4gIC8vIE5vdGUgdGhhdCBmb3IgTXVsdGlGaWxlQ2FjaGluZ0NvbXBpbGVyLCB5b3VyIGNhY2hlIGtleSBkb2Vzbid0IG5lZWQgdG9cbiAgLy8gaW5jbHVkZSB0aGUgZmlsZSdzIHBhdGgsIGJlY2F1c2UgdGhhdCBpcyBhdXRvbWF0aWNhbGx5IHRha2VuIGludG8gYWNjb3VudFxuICAvLyBieSB0aGUgaW1wbGVtZW50YXRpb24uIENhY2hpbmdDb21waWxlciBzdWJjbGFzc2VzIGNhbiBjaG9vc2Ugd2hldGhlciBvciBub3RcbiAgLy8gdG8gaW5jbHVkZSB0aGUgZmlsZSdzIHBhdGggaW4gdGhlIGNhY2hlIGtleS5cbiAgZ2V0Q2FjaGVLZXkoaW5wdXRGaWxlKSB7XG4gICAgdGhyb3cgRXJyb3IoJ0NhY2hpbmdDb21waWxlciBzdWJjbGFzcyBzaG91bGQgaW1wbGVtZW50IGdldENhY2hlS2V5IScpO1xuICB9XG5cbiAgLy8gWW91ciBzdWJjbGFzcyBtdXN0IG92ZXJyaWRlIHRoaXMgbWV0aG9kIHRvIGRlZmluZSBob3cgYSBDb21waWxlUmVzdWx0XG4gIC8vIHRyYW5zbGF0ZXMgaW50byBhZGRpbmcgYXNzZXRzIHRvIHRoZSBidW5kbGUuXG4gIC8vXG4gIC8vIFRoaXMgbWV0aG9kIGlzIGdpdmVuIGFuIElucHV0RmlsZSAodGhlIGRhdGEgdHlwZSBwYXNzZWQgdG9cbiAgLy8gcHJvY2Vzc0ZpbGVzRm9yVGFyZ2V0IGFzIHBhcnQgb2YgdGhlIFBsdWdpbi5yZWdpc3RlckNvbXBpbGVyIEFQSSkgYW5kIGFcbiAgLy8gQ29tcGlsZVJlc3VsdCAoZWl0aGVyIHJldHVybmVkIGRpcmVjdGx5IGZyb20gY29tcGlsZU9uZUZpbGUgb3IgcmVhZCBmcm9tXG4gIC8vIHRoZSBjYWNoZSkuICBJdCBzaG91bGQgY2FsbCBtZXRob2RzIGxpa2UgYGlucHV0RmlsZS5hZGRKYXZhU2NyaXB0YFxuICAvLyBhbmQgYGlucHV0RmlsZS5lcnJvcmAuXG4gIGFkZENvbXBpbGVSZXN1bHQoaW5wdXRGaWxlLCBjb21waWxlUmVzdWx0KSB7XG4gICAgdGhyb3cgRXJyb3IoJ0NhY2hpbmdDb21waWxlciBzdWJjbGFzcyBzaG91bGQgaW1wbGVtZW50IGFkZENvbXBpbGVSZXN1bHQhJyk7XG4gIH1cblxuICAvLyBZb3VyIHN1YmNsYXNzIG11c3Qgb3ZlcnJpZGUgdGhpcyBtZXRob2QgdG8gZGVmaW5lIHRoZSBzaXplIG9mIGFcbiAgLy8gQ29tcGlsZXJSZXN1bHQgKHVzZWQgYnkgdGhlIGluLW1lbW9yeSBjYWNoZSB0byBsaW1pdCB0aGUgdG90YWwgYW1vdW50IG9mXG4gIC8vIGRhdGEgY2FjaGVkKS5cbiAgY29tcGlsZVJlc3VsdFNpemUoY29tcGlsZVJlc3VsdCkge1xuICAgIHRocm93IEVycm9yKCdDYWNoaW5nQ29tcGlsZXIgc3ViY2xhc3Mgc2hvdWxkIGltcGxlbWVudCBjb21waWxlUmVzdWx0U2l6ZSEnKTtcbiAgfVxuXG4gIC8vIFlvdXIgc3ViY2xhc3MgbWF5IG92ZXJyaWRlIHRoaXMgbWV0aG9kIHRvIGRlZmluZSBhbiBhbHRlcm5hdGUgd2F5IG9mXG4gIC8vIHN0cmluZ2lmeWluZyBDb21waWxlclJlc3VsdHMuICBUYWtlcyBhIENvbXBpbGVSZXN1bHQgYW5kIHJldHVybnMgYSBzdHJpbmcuXG4gIHN0cmluZ2lmeUNvbXBpbGVSZXN1bHQoY29tcGlsZVJlc3VsdCkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShjb21waWxlUmVzdWx0KTtcbiAgfVxuICAvLyBZb3VyIHN1YmNsYXNzIG1heSBvdmVycmlkZSB0aGlzIG1ldGhvZCB0byBkZWZpbmUgYW4gYWx0ZXJuYXRlIHdheSBvZlxuICAvLyBwYXJzaW5nIENvbXBpbGVyUmVzdWx0cyBmcm9tIHN0cmluZy4gIFRha2VzIGEgc3RyaW5nIGFuZCByZXR1cm5zIGFcbiAgLy8gQ29tcGlsZVJlc3VsdC4gIElmIHRoZSBzdHJpbmcgZG9lc24ndCByZXByZXNlbnQgYSB2YWxpZCBDb21waWxlUmVzdWx0LCB5b3VcbiAgLy8gbWF5IHdhbnQgdG8gcmV0dXJuIG51bGwgaW5zdGVhZCBvZiB0aHJvd2luZywgd2hpY2ggd2lsbCBtYWtlXG4gIC8vIENhY2hpbmdDb21waWxlciBpZ25vcmUgdGhlIGNhY2hlLlxuICBwYXJzZUNvbXBpbGVSZXN1bHQoc3RyaW5naWZpZWRDb21waWxlUmVzdWx0KSB7XG4gICAgcmV0dXJuIHRoaXMuX3BhcnNlSlNPTk9yTnVsbChzdHJpbmdpZmllZENvbXBpbGVSZXN1bHQpO1xuICB9XG4gIF9wYXJzZUpTT05Pck51bGwoanNvbikge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gSlNPTi5wYXJzZShqc29uKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIFN5bnRheEVycm9yKVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgX2NhY2hlRGVidWcobWVzc2FnZSkge1xuICAgIGlmICghdGhpcy5fY2FjaGVEZWJ1Z0VuYWJsZWQpXG4gICAgICByZXR1cm47XG4gICAgY29uc29sZS5sb2coYENBQ0hFKCR7IHRoaXMuX2NvbXBpbGVyTmFtZSB9KTogJHsgbWVzc2FnZSB9YCk7XG4gIH1cblxuICBzZXREaXNrQ2FjaGVEaXJlY3RvcnkoZGlza0NhY2hlKSB7XG4gICAgaWYgKHRoaXMuX2Rpc2tDYWNoZSlcbiAgICAgIHRocm93IEVycm9yKCdzZXREaXNrQ2FjaGVEaXJlY3RvcnkgY2FsbGVkIHR3aWNlPycpO1xuICAgIHRoaXMuX2Rpc2tDYWNoZSA9IGRpc2tDYWNoZTtcbiAgfVxuXG4gIC8vIFNpbmNlIHNvIG1hbnkgY29tcGlsZXJzIHdpbGwgbmVlZCB0byBjYWxjdWxhdGUgdGhlIHNpemUgb2YgYSBTb3VyY2VNYXAgaW5cbiAgLy8gdGhlaXIgY29tcGlsZVJlc3VsdFNpemUsIHRoaXMgbWV0aG9kIGlzIHByb3ZpZGVkLlxuICBzb3VyY2VNYXBTaXplKHNtKSB7XG4gICAgaWYgKCEgc20pIHJldHVybiAwO1xuICAgIC8vIHN1bSB0aGUgbGVuZ3RoIG9mIHNvdXJjZXMgYW5kIHRoZSBtYXBwaW5ncywgdGhlIHNpemUgb2ZcbiAgICAvLyBtZXRhZGF0YSBpcyBpZ25vcmVkLCBidXQgaXQgaXMgbm90IGEgYmlnIGRlYWxcbiAgICByZXR1cm4gc20ubWFwcGluZ3MubGVuZ3RoXG4gICAgICArIChzbS5zb3VyY2VzQ29udGVudCB8fCBbXSkucmVkdWNlKGZ1bmN0aW9uIChzb0ZhciwgY3VycmVudCkge1xuICAgICAgICByZXR1cm4gc29GYXIgKyAoY3VycmVudCA/IGN1cnJlbnQubGVuZ3RoIDogMCk7XG4gICAgICB9LCAwKTtcbiAgfVxuXG4gIC8vIEJvcnJvd2VkIGZyb20gYW5vdGhlciBNSVQtbGljZW5zZWQgcHJvamVjdCB0aGF0IGJlbmphbW4gd3JvdGU6XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9yZWFjdGpzL2NvbW1vbmVyL2Jsb2IvMjM1ZDU0YTEyYy9saWIvdXRpbC5qcyNMMTM2LUwxNjhcbiAgX2RlZXBIYXNoKHZhbCkge1xuICAgIGNvbnN0IGhhc2ggPSBjcmVhdGVIYXNoKCdzaGExJyk7XG4gICAgbGV0IHR5cGUgPSB0eXBlb2YgdmFsO1xuXG4gICAgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgICAgdHlwZSA9ICdudWxsJztcbiAgICB9XG4gICAgaGFzaC51cGRhdGUodHlwZSArICdcXDAnKTtcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModmFsKTtcblxuICAgICAgLy8gQXJyYXkga2V5cyB3aWxsIGFscmVhZHkgYmUgc29ydGVkLlxuICAgICAgaWYgKCEgQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgIGtleXMuc29ydCgpO1xuICAgICAgfVxuXG4gICAgICBrZXlzLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHZhbFtrZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIG5lc3RlZCBtZXRob2RzLCBidXQgbmV2ZXJ0aGVsZXNzIGNvbXBsYWluIGJlbG93XG4gICAgICAgICAgLy8gaWYgdGhlIHJvb3QgdmFsdWUgaXMgYSBmdW5jdGlvbi5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBoYXNoLnVwZGF0ZShrZXkgKyAnXFwwJykudXBkYXRlKHRoaXMuX2RlZXBIYXNoKHZhbFtrZXldKSk7XG4gICAgICB9KTtcblxuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICBhc3NlcnQub2soZmFsc2UsICdjYW5ub3QgaGFzaCBmdW5jdGlvbiBvYmplY3RzJyk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBoYXNoLnVwZGF0ZSgnJyArIHZhbCk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gaGFzaC5kaWdlc3QoJ2hleCcpO1xuICB9XG5cbiAgLy8gV2Ugd2FudCB0byB3cml0ZSB0aGUgZmlsZSBhdG9taWNhbGx5LiBCdXQgd2UgYWxzbyBkb24ndCB3YW50IHRvIGJsb2NrXG4gIC8vIHByb2Nlc3Npbmcgb24gdGhlIGZpbGUgd3JpdGUuXG4gIF93cml0ZUZpbGVBc3luYyhmaWxlbmFtZSwgY29udGVudHMpIHtcbiAgICBjb25zdCB0ZW1wRmlsZW5hbWUgPSBmaWxlbmFtZSArICcudG1wLicgKyBSYW5kb20uaWQoKTtcbiAgICBmcy53cml0ZUZpbGUodGVtcEZpbGVuYW1lLCBjb250ZW50cywgKGVycikgPT4ge1xuICAgICAgLy8gaWdub3JlIGVycm9ycywgaXQncyBqdXN0IGEgY2FjaGVcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZnMucmVuYW1lKHRlbXBGaWxlbmFtZSwgZmlsZW5hbWUsIChlcnIpID0+IHtcbiAgICAgICAgLy8gaWdub3JlIHRoaXMgZXJyb3IgdG9vLlxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24uIFJldHVybnMgdGhlIGJvZHkgb2YgdGhlIGZpbGUgYXMgYSBzdHJpbmcsIG9yIG51bGwgaWYgaXRcbiAgLy8gZG9lc24ndCBleGlzdC5cbiAgX3JlYWRGaWxlT3JOdWxsKGZpbGVuYW1lKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZmlsZW5hbWUsICd1dGY4Jyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUgJiYgZS5jb2RlID09PSAnRU5PRU5UJylcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufVxuXG4vLyBDYWNoaW5nQ29tcGlsZXIgaXMgYSBjbGFzcyBkZXNpZ25lZCB0byBiZSB1c2VkIHdpdGggUGx1Z2luLnJlZ2lzdGVyQ29tcGlsZXJcbi8vIHdoaWNoIGltcGxlbWVudHMgaW4tbWVtb3J5IGFuZCBvbi1kaXNrIGNhY2hlcyBmb3IgdGhlIGZpbGVzIHRoYXQgaXRcbi8vIHByb2Nlc3Nlcy4gIFlvdSBzaG91bGQgc3ViY2xhc3MgQ2FjaGluZ0NvbXBpbGVyIGFuZCBkZWZpbmUgdGhlIGZvbGxvd2luZ1xuLy8gbWV0aG9kczogZ2V0Q2FjaGVLZXksIGNvbXBpbGVPbmVGaWxlLCBhZGRDb21waWxlUmVzdWx0LCBhbmRcbi8vIGNvbXBpbGVSZXN1bHRTaXplLlxuLy9cbi8vIENhY2hpbmdDb21waWxlciBhc3N1bWVzIHRoYXQgZmlsZXMgYXJlIHByb2Nlc3NlZCBpbmRlcGVuZGVudGx5IG9mIGVhY2ggb3RoZXI7XG4vLyB0aGVyZSBpcyBubyAnaW1wb3J0JyBkaXJlY3RpdmUgYWxsb3dpbmcgb25lIGZpbGUgdG8gcmVmZXJlbmNlIGFub3RoZXIuICBUaGF0XG4vLyBpcywgZWRpdGluZyBvbmUgZmlsZSBzaG91bGQgb25seSByZXF1aXJlIHRoYXQgZmlsZSB0byBiZSByZWJ1aWx0LCBub3Qgb3RoZXJcbi8vIGZpbGVzLlxuLy9cbi8vIFRoZSBkYXRhIHRoYXQgaXMgY2FjaGVkIGZvciBlYWNoIGZpbGUgaXMgb2YgYSB0eXBlIHRoYXQgaXMgKGltcGxpY2l0bHkpXG4vLyBkZWZpbmVkIGJ5IHlvdXIgc3ViY2xhc3MuIENhY2hpbmdDb21waWxlciByZWZlcnMgdG8gdGhpcyB0eXBlIGFzXG4vLyBgQ29tcGlsZVJlc3VsdGAsIGJ1dCB0aGlzIGlzbid0IGEgc2luZ2xlIHR5cGU6IGl0J3MgdXAgdG8geW91ciBzdWJjbGFzcyB0b1xuLy8gZGVjaWRlIHdoYXQgdHlwZSBvZiBkYXRhIHRoaXMgaXMuICBZb3Ugc2hvdWxkIGRvY3VtZW50IHdoYXQgeW91ciBzdWJjbGFzcydzXG4vLyBDb21waWxlUmVzdWx0IHR5cGUgaXMuXG4vL1xuLy8gWW91ciBzdWJjbGFzcydzIGNvbXBpbGVyIHNob3VsZCBjYWxsIHRoZSBzdXBlcmNsYXNzIGNvbXBpbGVyIHNwZWNpZnlpbmcgdGhlXG4vLyBjb21waWxlciBuYW1lICh1c2VkIHRvIGdlbmVyYXRlIGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgZGVidWdnaW5nIGFuZFxuLy8gdHdlYWtpbmcgaW4tbWVtb3J5IGNhY2hlIHNpemUpIGFuZCB0aGUgZGVmYXVsdCBjYWNoZSBzaXplLlxuLy9cbi8vIEJ5IGRlZmF1bHQsIENhY2hpbmdDb21waWxlciBwcm9jZXNzZXMgZWFjaCBmaWxlIGluIFwicGFyYWxsZWxcIi4gVGhhdCBpcywgaWYgaXRcbi8vIG5lZWRzIHRvIHlpZWxkIHRvIHJlYWQgZnJvbSB0aGUgZGlzayBjYWNoZSwgb3IgaWYgZ2V0Q2FjaGVLZXksXG4vLyBjb21waWxlT25lRmlsZSwgb3IgYWRkQ29tcGlsZVJlc3VsdCB5aWVsZHMsIGl0IHdpbGwgc3RhcnQgcHJvY2Vzc2luZyB0aGUgbmV4dFxuLy8gZmV3IGZpbGVzLiBUbyBzZXQgaG93IG1hbnkgZmlsZXMgY2FuIGJlIHByb2Nlc3NlZCBpbiBwYXJhbGxlbCAoaW5jbHVkaW5nXG4vLyBzZXR0aW5nIGl0IHRvIDEgaWYgeW91ciBzdWJjbGFzcyBkb2Vzbid0IHN1cHBvcnQgYW55IHBhcmFsbGVsaXNtKSwgcGFzcyB0aGVcbi8vIG1heFBhcmFsbGVsaXNtIG9wdGlvbiB0byB0aGUgc3VwZXJjbGFzcyBjb25zdHJ1Y3Rvci5cbi8vXG4vLyBGb3IgZXhhbXBsZSAodXNpbmcgRVMyMDE1IHZpYSB0aGUgZWNtYXNjcmlwdCBwYWNrYWdlKTpcbi8vXG4vLyAgIGNsYXNzIEF3ZXNvbWVDb21waWxlciBleHRlbmRzIENhY2hpbmdDb21waWxlciB7XG4vLyAgICAgY29uc3RydWN0b3IoKSB7XG4vLyAgICAgICBzdXBlcih7XG4vLyAgICAgICAgIGNvbXBpbGVyTmFtZTogJ2F3ZXNvbWUnLFxuLy8gICAgICAgICBkZWZhdWx0Q2FjaGVTaXplOiAxMDI0KjEwMjQqMTAsXG4vLyAgICAgICB9KTtcbi8vICAgICB9XG4vLyAgICAgLy8gLi4uIGRlZmluZSB0aGUgb3RoZXIgbWV0aG9kc1xuLy8gICB9XG4vLyAgIFBsdWdpbi5yZWdpc3RlckNvbXBpbGUoe1xuLy8gICAgIGV4dGVuc2lvbnM6IFsnYXdlc29tZSddLFxuLy8gICB9LCAoKSA9PiBuZXcgQXdlc29tZUNvbXBpbGVyKCkpO1xuLy9cbi8vIFhYWCBtYXliZSBjb21waWxlUmVzdWx0U2l6ZSBhbmQgc3RyaW5naWZ5Q29tcGlsZVJlc3VsdCBzaG91bGQganVzdCBiZSBtZXRob2RzXG4vLyBvbiBDb21waWxlUmVzdWx0PyBTb3J0IG9mIGhhcmQgdG8gZG8gdGhhdCB3aXRoIHBhcnNlQ29tcGlsZVJlc3VsdC5cbkNhY2hpbmdDb21waWxlciA9IGNsYXNzIENhY2hpbmdDb21waWxlciBleHRlbmRzIENhY2hpbmdDb21waWxlckJhc2Uge1xuICBjb25zdHJ1Y3Rvcih7XG4gICAgY29tcGlsZXJOYW1lLFxuICAgIGRlZmF1bHRDYWNoZVNpemUsXG4gICAgbWF4UGFyYWxsZWxpc20gPSAyMCxcbiAgfSkge1xuICAgIHN1cGVyKHtjb21waWxlck5hbWUsIGRlZmF1bHRDYWNoZVNpemUsIG1heFBhcmFsbGVsaXNtfSk7XG5cbiAgICAvLyBNYXBzIGZyb20gYSBoYXNoZWQgY2FjaGUga2V5IHRvIGEgY29tcGlsZVJlc3VsdC5cbiAgICB0aGlzLl9jYWNoZSA9IG5ldyBMUlUoe1xuICAgICAgbWF4OiB0aGlzLl9jYWNoZVNpemUsXG4gICAgICBsZW5ndGg6ICh2YWx1ZSkgPT4gdGhpcy5jb21waWxlUmVzdWx0U2l6ZSh2YWx1ZSksXG4gICAgfSk7XG4gIH1cblxuICAvLyBZb3VyIHN1YmNsYXNzIG11c3Qgb3ZlcnJpZGUgdGhpcyBtZXRob2QgdG8gZGVmaW5lIHRoZSB0cmFuc2Zvcm1hdGlvbiBmcm9tXG4gIC8vIElucHV0RmlsZSB0byBpdHMgY2FjaGVhYmxlIENvbXBpbGVSZXN1bHQpLlxuICAvL1xuICAvLyBHaXZlbiBhbiBJbnB1dEZpbGUgKHRoZSBkYXRhIHR5cGUgcGFzc2VkIHRvIHByb2Nlc3NGaWxlc0ZvclRhcmdldCBhcyBwYXJ0XG4gIC8vIG9mIHRoZSBQbHVnaW4ucmVnaXN0ZXJDb21waWxlciBBUEkpLCBjb21waWxlcyB0aGUgZmlsZSBhbmQgcmV0dXJucyBhXG4gIC8vIENvbXBpbGVSZXN1bHQgKHRoZSBjYWNoZWFibGUgZGF0YSB0eXBlIHNwZWNpZmljIHRvIHlvdXIgc3ViY2xhc3MpLlxuICAvL1xuICAvLyBUaGlzIG1ldGhvZCBpcyBub3QgY2FsbGVkIG9uIGZpbGVzIHdoZW4gYSB2YWxpZCBjYWNoZSBlbnRyeSBleGlzdHMgaW5cbiAgLy8gbWVtb3J5IG9yIG9uIGRpc2suXG4gIC8vXG4gIC8vIE9uIGEgY29tcGlsZSBlcnJvciwgeW91IHNob3VsZCBjYWxsIGBpbnB1dEZpbGUuZXJyb3JgIGFwcHJvcHJpYXRlbHkgYW5kXG4gIC8vIHJldHVybiBudWxsOyB0aGlzIHdpbGwgbm90IGJlIGNhY2hlZC5cbiAgLy9cbiAgLy8gVGhpcyBtZXRob2Qgc2hvdWxkIG5vdCBjYWxsIGBpbnB1dEZpbGUuYWRkSmF2YVNjcmlwdGAgYW5kIHNpbWlsYXIgZmlsZXMhXG4gIC8vIFRoYXQncyB3aGF0IGFkZENvbXBpbGVSZXN1bHQgaXMgZm9yLlxuICBjb21waWxlT25lRmlsZShpbnB1dEZpbGUpIHtcbiAgICB0aHJvdyBFcnJvcignQ2FjaGluZ0NvbXBpbGVyIHN1YmNsYXNzIHNob3VsZCBpbXBsZW1lbnQgY29tcGlsZU9uZUZpbGUhJyk7XG4gIH1cblxuICAvLyBUaGUgcHJvY2Vzc0ZpbGVzRm9yVGFyZ2V0IG1ldGhvZCBmcm9tIHRoZSBQbHVnaW4ucmVnaXN0ZXJDb21waWxlciBBUEkuIElmXG4gIC8vIHlvdSBoYXZlIHByb2Nlc3NpbmcgeW91IHdhbnQgdG8gcGVyZm9ybSBhdCB0aGUgYmVnaW5uaW5nIG9yIGVuZCBvZiBhXG4gIC8vIHByb2Nlc3NpbmcgcGhhc2UsIHlvdSBtYXkgd2FudCB0byBvdmVycmlkZSB0aGlzIG1ldGhvZCBhbmQgY2FsbCB0aGVcbiAgLy8gc3VwZXJjbGFzcyBpbXBsZW1lbnRhdGlvbiBmcm9tIHdpdGhpbiB5b3VyIG1ldGhvZC5cbiAgcHJvY2Vzc0ZpbGVzRm9yVGFyZ2V0KGlucHV0RmlsZXMpIHtcbiAgICBjb25zdCBjYWNoZU1pc3NlcyA9IFtdO1xuXG4gICAgY29uc3QgZnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgICBhc3luYy5lYWNoTGltaXQoaW5wdXRGaWxlcywgdGhpcy5fbWF4UGFyYWxsZWxpc20sIChpbnB1dEZpbGUsIGNiKSA9PiB7XG4gICAgICBsZXQgZXJyb3IgPSBudWxsO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSB0aGlzLl9kZWVwSGFzaCh0aGlzLmdldENhY2hlS2V5KGlucHV0RmlsZSkpO1xuICAgICAgICBsZXQgY29tcGlsZVJlc3VsdCA9IHRoaXMuX2NhY2hlLmdldChjYWNoZUtleSk7XG5cbiAgICAgICAgaWYgKCEgY29tcGlsZVJlc3VsdCkge1xuICAgICAgICAgIGNvbXBpbGVSZXN1bHQgPSB0aGlzLl9yZWFkQ2FjaGUoY2FjaGVLZXkpO1xuICAgICAgICAgIGlmIChjb21waWxlUmVzdWx0KSB7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZURlYnVnKGBMb2FkZWQgJHsgaW5wdXRGaWxlLmdldERpc3BsYXlQYXRoKCkgfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghIGNvbXBpbGVSZXN1bHQpIHtcbiAgICAgICAgICBjYWNoZU1pc3Nlcy5wdXNoKGlucHV0RmlsZS5nZXREaXNwbGF5UGF0aCgpKTtcbiAgICAgICAgICBjb21waWxlUmVzdWx0ID0gdGhpcy5jb21waWxlT25lRmlsZShpbnB1dEZpbGUpO1xuXG4gICAgICAgICAgaWYgKCEgY29tcGlsZVJlc3VsdCkge1xuICAgICAgICAgICAgLy8gY29tcGlsZU9uZUZpbGUgc2hvdWxkIGhhdmUgY2FsbGVkIGlucHV0RmlsZS5lcnJvci5cbiAgICAgICAgICAgIC8vICBXZSBkb24ndCBjYWNoZSBmYWlsdXJlcyBmb3Igbm93LlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNhdmUgd2hhdCB3ZSd2ZSBjb21waWxlZC5cbiAgICAgICAgICB0aGlzLl9jYWNoZS5zZXQoY2FjaGVLZXksIGNvbXBpbGVSZXN1bHQpO1xuICAgICAgICAgIHRoaXMuX3dyaXRlQ2FjaGVBc3luYyhjYWNoZUtleSwgY29tcGlsZVJlc3VsdCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFkZENvbXBpbGVSZXN1bHQoaW5wdXRGaWxlLCBjb21waWxlUmVzdWx0KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZXJyb3IgPSBlO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgY2IoZXJyb3IpO1xuICAgICAgfVxuICAgIH0sIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgICBmdXR1cmUud2FpdCgpO1xuXG4gICAgaWYgKHRoaXMuX2NhY2hlRGVidWdFbmFibGVkKSB7XG4gICAgICBjYWNoZU1pc3Nlcy5zb3J0KCk7XG4gICAgICB0aGlzLl9jYWNoZURlYnVnKFxuICAgICAgICBgUmFuICgjJHsgKyt0aGlzLl9jYWxsQ291bnQgfSkgb246ICR7IEpTT04uc3RyaW5naWZ5KGNhY2hlTWlzc2VzKSB9YCk7XG4gICAgfVxuICB9XG5cbiAgX2NhY2hlRmlsZW5hbWUoY2FjaGVLZXkpIHtcbiAgICAvLyBXZSB3YW50IGNhY2hlS2V5cyB0byBiZSBoZXggc28gdGhhdCB0aGV5IHdvcmsgb24gYW55IEZTIGFuZCBuZXZlciBlbmQgaW5cbiAgICAvLyAuY2FjaGUuXG4gICAgaWYgKCEvXlthLWYwLTldKyQvLnRlc3QoY2FjaGVLZXkpKSB7XG4gICAgICB0aHJvdyBFcnJvcignYmFkIGNhY2hlS2V5OiAnICsgY2FjaGVLZXkpO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aC5qb2luKHRoaXMuX2Rpc2tDYWNoZSwgY2FjaGVLZXkgKyAnLmNhY2hlJyk7XG4gIH1cbiAgLy8gTG9hZCBhIGNhY2hlIGVudHJ5IGZyb20gZGlzay4gUmV0dXJucyB0aGUgY29tcGlsZVJlc3VsdCBvYmplY3RcbiAgLy8gYW5kIGxvYWRzIGl0IGludG8gdGhlIGluLW1lbW9yeSBjYWNoZSB0b28uXG4gIF9yZWFkQ2FjaGUoY2FjaGVLZXkpIHtcbiAgICBpZiAoISB0aGlzLl9kaXNrQ2FjaGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjYWNoZUZpbGVuYW1lID0gdGhpcy5fY2FjaGVGaWxlbmFtZShjYWNoZUtleSk7XG4gICAgY29uc3QgY29tcGlsZVJlc3VsdCA9IHRoaXMuX3JlYWRBbmRQYXJzZUNvbXBpbGVSZXN1bHRPck51bGwoY2FjaGVGaWxlbmFtZSk7XG4gICAgaWYgKCEgY29tcGlsZVJlc3VsdCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHRoaXMuX2NhY2hlLnNldChjYWNoZUtleSwgY29tcGlsZVJlc3VsdCk7XG4gICAgcmV0dXJuIGNvbXBpbGVSZXN1bHQ7XG4gIH1cbiAgX3dyaXRlQ2FjaGVBc3luYyhjYWNoZUtleSwgY29tcGlsZVJlc3VsdCkge1xuICAgIGlmICghIHRoaXMuX2Rpc2tDYWNoZSlcbiAgICAgIHJldHVybjtcbiAgICBjb25zdCBjYWNoZUZpbGVuYW1lID0gdGhpcy5fY2FjaGVGaWxlbmFtZShjYWNoZUtleSk7XG4gICAgY29uc3QgY2FjaGVDb250ZW50cyA9IHRoaXMuc3RyaW5naWZ5Q29tcGlsZVJlc3VsdChjb21waWxlUmVzdWx0KTtcbiAgICB0aGlzLl93cml0ZUZpbGVBc3luYyhjYWNoZUZpbGVuYW1lLCBjYWNoZUNvbnRlbnRzKTtcbiAgfVxuXG4gIC8vIFJldHVybnMgbnVsbCBpZiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdCBvciBjYW4ndCBiZSBwYXJzZWQ7IG90aGVyd2lzZVxuICAvLyByZXR1cm5zIHRoZSBwYXJzZWQgY29tcGlsZVJlc3VsdCBpbiB0aGUgZmlsZS5cbiAgX3JlYWRBbmRQYXJzZUNvbXBpbGVSZXN1bHRPck51bGwoZmlsZW5hbWUpIHtcbiAgICBjb25zdCByYXcgPSB0aGlzLl9yZWFkRmlsZU9yTnVsbChmaWxlbmFtZSk7XG4gICAgcmV0dXJuIHRoaXMucGFyc2VDb21waWxlUmVzdWx0KHJhdyk7XG4gIH1cbn1cbiIsImNvbnN0IHBhdGggPSBQbHVnaW4ucGF0aDtcbmNvbnN0IEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5jb25zdCBMUlUgPSBOcG0ucmVxdWlyZSgnbHJ1LWNhY2hlJyk7XG5jb25zdCBhc3luYyA9IE5wbS5yZXF1aXJlKCdhc3luYycpO1xuXG4vLyBNdWx0aUZpbGVDYWNoaW5nQ29tcGlsZXIgaXMgbGlrZSBDYWNoaW5nQ29tcGlsZXIsIGJ1dCBmb3IgaW1wbGVtZW50aW5nXG4vLyBsYW5ndWFnZXMgd2hpY2ggYWxsb3cgZmlsZXMgdG8gcmVmZXJlbmNlIGVhY2ggb3RoZXIsIHN1Y2ggYXMgQ1NTXG4vLyBwcmVwcm9jZXNzb3JzIHdpdGggYEBpbXBvcnRgIGRpcmVjdGl2ZXMuXG4vL1xuLy8gTGlrZSBDYWNoaW5nQ29tcGlsZXIsIHlvdSBzaG91bGQgc3ViY2xhc3MgTXVsdGlGaWxlQ2FjaGluZ0NvbXBpbGVyIGFuZCBkZWZpbmVcbi8vIHRoZSBmb2xsb3dpbmcgbWV0aG9kczogZ2V0Q2FjaGVLZXksIGNvbXBpbGVPbmVGaWxlLCBhZGRDb21waWxlUmVzdWx0LCBhbmRcbi8vIGNvbXBpbGVSZXN1bHRTaXplLiAgY29tcGlsZU9uZUZpbGUgZ2V0cyBhbiBhZGRpdGlvbmFsIGFsbEZpbGVzIGFyZ3VtZW50IGFuZFxuLy8gcmV0dXJucyBhbiBhcnJheSBvZiByZWZlcmVuY2VkIGltcG9ydCBwYXRocyBpbiBhZGRpdGlvbiB0byB0aGUgQ29tcGlsZVJlc3VsdC5cbi8vIFlvdSBtYXkgYWxzbyBvdmVycmlkZSBpc1Jvb3QgYW5kIGdldEFic29sdXRlSW1wb3J0UGF0aCB0byBjdXN0b21pemVcbi8vIE11bHRpRmlsZUNhY2hpbmdDb21waWxlciBmdXJ0aGVyLlxuTXVsdGlGaWxlQ2FjaGluZ0NvbXBpbGVyID0gY2xhc3MgTXVsdGlGaWxlQ2FjaGluZ0NvbXBpbGVyXG5leHRlbmRzIENhY2hpbmdDb21waWxlckJhc2Uge1xuICBjb25zdHJ1Y3Rvcih7XG4gICAgY29tcGlsZXJOYW1lLFxuICAgIGRlZmF1bHRDYWNoZVNpemUsXG4gICAgbWF4UGFyYWxsZWxpc21cbiAgfSkge1xuICAgIHN1cGVyKHtjb21waWxlck5hbWUsIGRlZmF1bHRDYWNoZVNpemUsIG1heFBhcmFsbGVsaXNtfSk7XG5cbiAgICAvLyBNYXBzIGZyb20gYWJzb2x1dGUgaW1wb3J0IHBhdGggdG8geyBjb21waWxlUmVzdWx0LCBjYWNoZUtleXMgfSwgd2hlcmVcbiAgICAvLyBjYWNoZUtleXMgaXMgYW4gb2JqZWN0IG1hcHBpbmcgZnJvbSBhYnNvbHV0ZSBpbXBvcnQgcGF0aCB0byBoYXNoZWRcbiAgICAvLyBjYWNoZUtleSBmb3IgZWFjaCBmaWxlIHJlZmVyZW5jZWQgYnkgdGhpcyBmaWxlIChpbmNsdWRpbmcgaXRzZWxmKS5cbiAgICB0aGlzLl9jYWNoZSA9IG5ldyBMUlUoe1xuICAgICAgbWF4OiB0aGlzLl9jYWNoZVNpemUsXG4gICAgICAvLyBXZSBpZ25vcmUgdGhlIHNpemUgb2YgY2FjaGVLZXlzIGhlcmUuXG4gICAgICBsZW5ndGg6ICh2YWx1ZSkgPT4gdGhpcy5jb21waWxlUmVzdWx0U2l6ZSh2YWx1ZS5jb21waWxlUmVzdWx0KSxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFlvdXIgc3ViY2xhc3MgbXVzdCBvdmVycmlkZSB0aGlzIG1ldGhvZCB0byBkZWZpbmUgdGhlIHRyYW5zZm9ybWF0aW9uIGZyb21cbiAgLy8gSW5wdXRGaWxlIHRvIGl0cyBjYWNoZWFibGUgQ29tcGlsZVJlc3VsdCkuXG4gIC8vXG4gIC8vIEFyZ3VtZW50czpcbiAgLy8gICAtIGlucHV0RmlsZSBpcyB0aGUgSW5wdXRGaWxlIHRvIHByb2Nlc3NcbiAgLy8gICAtIGFsbEZpbGVzIGlzIGEgYSBNYXAgbWFwcGluZyBmcm9tIGFic29sdXRlIGltcG9ydCBwYXRoIHRvIElucHV0RmlsZSBvZlxuICAvLyAgICAgYWxsIGZpbGVzIGJlaW5nIHByb2Nlc3NlZCBpbiB0aGUgdGFyZ2V0XG4gIC8vIFJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5czpcbiAgLy8gICAtIGNvbXBpbGVSZXN1bHQ6IHRoZSBDb21waWxlUmVzdWx0ICh0aGUgY2FjaGVhYmxlIGRhdGEgdHlwZSBzcGVjaWZpYyB0b1xuICAvLyAgICAgeW91ciBzdWJjbGFzcykuXG4gIC8vICAgLSByZWZlcmVuY2VkSW1wb3J0UGF0aHM6IGFuIGFycmF5IG9mIGFic29sdXRlIGltcG9ydCBwYXRocyBvZiBmaWxlc1xuICAvLyAgICAgd2hpY2ggd2VyZSByZWZlcmVyZW5jZWQgYnkgdGhlIGN1cnJlbnQgZmlsZS4gIFRoZSBjdXJyZW50IGZpbGVcbiAgLy8gICAgIGlzIGluY2x1ZGVkIGltcGxpY2l0bHkuXG4gIC8vXG4gIC8vIFRoaXMgbWV0aG9kIGlzIG5vdCBjYWxsZWQgb24gZmlsZXMgd2hlbiBhIHZhbGlkIGNhY2hlIGVudHJ5IGV4aXN0cyBpblxuICAvLyBtZW1vcnkgb3Igb24gZGlzay5cbiAgLy9cbiAgLy8gT24gYSBjb21waWxlIGVycm9yLCB5b3Ugc2hvdWxkIGNhbGwgYGlucHV0RmlsZS5lcnJvcmAgYXBwcm9wcmlhdGVseSBhbmRcbiAgLy8gcmV0dXJuIG51bGw7IHRoaXMgd2lsbCBub3QgYmUgY2FjaGVkLlxuICAvL1xuICAvLyBUaGlzIG1ldGhvZCBzaG91bGQgbm90IGNhbGwgYGlucHV0RmlsZS5hZGRKYXZhU2NyaXB0YCBhbmQgc2ltaWxhciBmaWxlcyFcbiAgLy8gVGhhdCdzIHdoYXQgYWRkQ29tcGlsZVJlc3VsdCBpcyBmb3IuXG4gIGNvbXBpbGVPbmVGaWxlKGlucHV0RmlsZSwgYWxsRmlsZXMpIHtcbiAgICB0aHJvdyBFcnJvcihcbiAgICAgICdNdWx0aUZpbGVDYWNoaW5nQ29tcGlsZXIgc3ViY2xhc3Mgc2hvdWxkIGltcGxlbWVudCBjb21waWxlT25lRmlsZSEnKTtcbiAgfVxuXG4gIC8vIFlvdXIgc3ViY2xhc3MgbWF5IG92ZXJyaWRlIHRoaXMgdG8gZGVjbGFyZSB0aGF0IGEgZmlsZSBpcyBub3QgYSBcInJvb3RcIiAtLS1cbiAgLy8gaWUsIGl0IGNhbiBiZSBpbmNsdWRlZCBmcm9tIG90aGVyIGZpbGVzIGJ1dCBpcyBub3QgcHJvY2Vzc2VkIG9uIGl0cyBvd24uIEluXG4gIC8vIHRoaXMgY2FzZSwgTXVsdGlGaWxlQ2FjaGluZ0NvbXBpbGVyIHdvbid0IHdhc3RlIHRpbWUgdHJ5aW5nIHRvIGxvb2sgZm9yIGFcbiAgLy8gY2FjaGUgZm9yIGl0cyBjb21waWxhdGlvbiBvbiBkaXNrLlxuICBpc1Jvb3QoaW5wdXRGaWxlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBSZXR1cm5zIHRoZSBhYnNvbHV0ZSBpbXBvcnQgcGF0aCBmb3IgYW4gSW5wdXRGaWxlLiBCeSBkZWZhdWx0LCB0aGlzIGlzIGFcbiAgLy8gcGF0aCBpcyBhIHBhdGggb2YgdGhlIGZvcm0gXCJ7cGFja2FnZX0vcGF0aC90by9maWxlXCIgZm9yIGZpbGVzIGluIHBhY2thZ2VzXG4gIC8vIGFuZCBcInt9L3BhdGgvdG8vZmlsZVwiIGZvciBmaWxlcyBpbiBhcHBzLiBZb3VyIHN1YmNsYXNzIG1heSBvdmVycmlkZSBhbmQvb3JcbiAgLy8gY2FsbCB0aGlzIG1ldGhvZC5cbiAgZ2V0QWJzb2x1dGVJbXBvcnRQYXRoKGlucHV0RmlsZSkge1xuICAgIGlmIChpbnB1dEZpbGUuZ2V0UGFja2FnZU5hbWUoKSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuICd7fS8nICsgaW5wdXRGaWxlLmdldFBhdGhJblBhY2thZ2UoKTtcbiAgICB9XG4gICAgcmV0dXJuICd7JyArIGlucHV0RmlsZS5nZXRQYWNrYWdlTmFtZSgpICsgJ30vJ1xuICAgICAgKyBpbnB1dEZpbGUuZ2V0UGF0aEluUGFja2FnZSgpO1xuICB9XG5cbiAgLy8gVGhlIHByb2Nlc3NGaWxlc0ZvclRhcmdldCBtZXRob2QgZnJvbSB0aGUgUGx1Z2luLnJlZ2lzdGVyQ29tcGlsZXIgQVBJLlxuICBwcm9jZXNzRmlsZXNGb3JUYXJnZXQoaW5wdXRGaWxlcykge1xuICAgIGNvbnN0IGFsbEZpbGVzID0gbmV3IE1hcDtcbiAgICBjb25zdCBjYWNoZUtleU1hcCA9IG5ldyBNYXA7XG4gICAgY29uc3QgY2FjaGVNaXNzZXMgPSBbXTtcblxuICAgIGlucHV0RmlsZXMuZm9yRWFjaCgoaW5wdXRGaWxlKSA9PiB7XG4gICAgICBjb25zdCBpbXBvcnRQYXRoID0gdGhpcy5nZXRBYnNvbHV0ZUltcG9ydFBhdGgoaW5wdXRGaWxlKTtcbiAgICAgIGFsbEZpbGVzLnNldChpbXBvcnRQYXRoLCBpbnB1dEZpbGUpO1xuICAgICAgY2FjaGVLZXlNYXAuc2V0KGltcG9ydFBhdGgsIHRoaXMuX2RlZXBIYXNoKHRoaXMuZ2V0Q2FjaGVLZXkoaW5wdXRGaWxlKSkpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgYWxsUHJvY2Vzc2VkRnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgICBhc3luYy5lYWNoTGltaXQoaW5wdXRGaWxlcywgdGhpcy5fbWF4UGFyYWxsZWxpc20sIChpbnB1dEZpbGUsIGNiKSA9PiB7XG4gICAgICBsZXQgZXJyb3IgPSBudWxsO1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gSWYgdGhpcyBpc24ndCBhIHJvb3QsIHNraXAgaXQgKGFuZCBkZWZpbml0ZWx5IGRvbid0IHdhc3RlIHRpbWVcbiAgICAgICAgLy8gbG9va2luZyBmb3IgYSBjYWNoZSBmaWxlIHRoYXQgd29uJ3QgYmUgdGhlcmUpLlxuICAgICAgICBpZiAoIXRoaXMuaXNSb290KGlucHV0RmlsZSkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhYnNvbHV0ZUltcG9ydFBhdGggPSB0aGlzLmdldEFic29sdXRlSW1wb3J0UGF0aChpbnB1dEZpbGUpO1xuICAgICAgICBsZXQgY2FjaGVFbnRyeSA9IHRoaXMuX2NhY2hlLmdldChhYnNvbHV0ZUltcG9ydFBhdGgpO1xuICAgICAgICBpZiAoISBjYWNoZUVudHJ5KSB7XG4gICAgICAgICAgY2FjaGVFbnRyeSA9IHRoaXMuX3JlYWRDYWNoZShhYnNvbHV0ZUltcG9ydFBhdGgpO1xuICAgICAgICAgIGlmIChjYWNoZUVudHJ5KSB7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZURlYnVnKGBMb2FkZWQgJHsgYWJzb2x1dGVJbXBvcnRQYXRoIH1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEgKGNhY2hlRW50cnkgJiYgdGhpcy5fY2FjaGVFbnRyeVZhbGlkKGNhY2hlRW50cnksIGNhY2hlS2V5TWFwKSkpIHtcbiAgICAgICAgICBjYWNoZU1pc3Nlcy5wdXNoKGlucHV0RmlsZS5nZXREaXNwbGF5UGF0aCgpKTtcblxuICAgICAgICAgIGNvbnN0IGNvbXBpbGVPbmVGaWxlUmV0dXJuID0gdGhpcy5jb21waWxlT25lRmlsZShpbnB1dEZpbGUsIGFsbEZpbGVzKTtcbiAgICAgICAgICBpZiAoISBjb21waWxlT25lRmlsZVJldHVybikge1xuICAgICAgICAgICAgLy8gY29tcGlsZU9uZUZpbGUgc2hvdWxkIGhhdmUgY2FsbGVkIGlucHV0RmlsZS5lcnJvci5cbiAgICAgICAgICAgIC8vICBXZSBkb24ndCBjYWNoZSBmYWlsdXJlcyBmb3Igbm93LlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCB7Y29tcGlsZVJlc3VsdCwgcmVmZXJlbmNlZEltcG9ydFBhdGhzfSA9IGNvbXBpbGVPbmVGaWxlUmV0dXJuO1xuXG4gICAgICAgICAgY2FjaGVFbnRyeSA9IHtcbiAgICAgICAgICAgIGNvbXBpbGVSZXN1bHQsXG4gICAgICAgICAgICBjYWNoZUtleXM6IHtcbiAgICAgICAgICAgICAgLy8gSW5jbHVkZSB0aGUgaGFzaGVkIGNhY2hlIGtleSBvZiB0aGUgZmlsZSBpdHNlbGYuLi5cbiAgICAgICAgICAgICAgW2Fic29sdXRlSW1wb3J0UGF0aF06IGNhY2hlS2V5TWFwLmdldChhYnNvbHV0ZUltcG9ydFBhdGgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIC4uLiBhbmQgb2YgdGhlIG90aGVyIHJlZmVyZW5jZWQgZmlsZXMuXG4gICAgICAgICAgcmVmZXJlbmNlZEltcG9ydFBhdGhzLmZvckVhY2goKHBhdGgpID0+IHtcbiAgICAgICAgICAgIGlmICghY2FjaGVLZXlNYXAuaGFzKHBhdGgpKSB7XG4gICAgICAgICAgICAgIHRocm93IEVycm9yKGBVbmtub3duIGFic29sdXRlIGltcG9ydCBwYXRoICR7IHBhdGggfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FjaGVFbnRyeS5jYWNoZUtleXNbcGF0aF0gPSBjYWNoZUtleU1hcC5nZXQocGF0aCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBTYXZlIHRoZSBjYWNoZSBlbnRyeS5cbiAgICAgICAgICB0aGlzLl9jYWNoZS5zZXQoYWJzb2x1dGVJbXBvcnRQYXRoLCBjYWNoZUVudHJ5KTtcbiAgICAgICAgICB0aGlzLl93cml0ZUNhY2hlQXN5bmMoYWJzb2x1dGVJbXBvcnRQYXRoLCBjYWNoZUVudHJ5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYWRkQ29tcGlsZVJlc3VsdChpbnB1dEZpbGUsIGNhY2hlRW50cnkuY29tcGlsZVJlc3VsdCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yID0gZTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGNiKGVycm9yKTtcbiAgICAgIH1cbiAgICB9LCBhbGxQcm9jZXNzZWRGdXR1cmUucmVzb2x2ZXIoKSk7XG4gICAgYWxsUHJvY2Vzc2VkRnV0dXJlLndhaXQoKTtcblxuICAgIGlmICh0aGlzLl9jYWNoZURlYnVnRW5hYmxlZCkge1xuICAgICAgY2FjaGVNaXNzZXMuc29ydCgpO1xuICAgICAgdGhpcy5fY2FjaGVEZWJ1ZyhcbiAgICAgICAgYFJhbiAoIyR7ICsrdGhpcy5fY2FsbENvdW50IH0pIG9uOiAkeyBKU09OLnN0cmluZ2lmeShjYWNoZU1pc3NlcykgfWApO1xuICAgIH1cbiAgfVxuXG4gIF9jYWNoZUVudHJ5VmFsaWQoY2FjaGVFbnRyeSwgY2FjaGVLZXlNYXApIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoY2FjaGVFbnRyeS5jYWNoZUtleXMpLmV2ZXJ5KFxuICAgICAgKHBhdGgpID0+IGNhY2hlRW50cnkuY2FjaGVLZXlzW3BhdGhdID09PSBjYWNoZUtleU1hcC5nZXQocGF0aClcbiAgICApO1xuICB9XG5cbiAgLy8gVGhlIGZvcm1hdCBvZiBhIGNhY2hlIGZpbGUgb24gZGlzayBpcyB0aGUgSlNPTi1zdHJpbmdpZmllZCBjYWNoZUtleXNcbiAgLy8gb2JqZWN0LCBhIG5ld2xpbmUsIGZvbGxvd2VkIGJ5IHRoZSBDb21waWxlUmVzdWx0IGFzIHJldHVybmVkIGZyb21cbiAgLy8gdGhpcy5zdHJpbmdpZnlDb21waWxlUmVzdWx0LlxuICBfY2FjaGVGaWxlbmFtZShhYnNvbHV0ZUltcG9ydFBhdGgpIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHRoaXMuX2Rpc2tDYWNoZSxcbiAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2RlZXBIYXNoKGFic29sdXRlSW1wb3J0UGF0aCkgKyAnLmNhY2hlJyk7XG4gIH1cbiAgLy8gTG9hZHMgYSB7Y29tcGlsZVJlc3VsdCwgY2FjaGVLZXlzfSBjYWNoZSBlbnRyeSBmcm9tIGRpc2suIFJldHVybnMgdGhlIHdob2xlXG4gIC8vIGNhY2hlIGVudHJ5IGFuZCBsb2FkcyBpdCBpbnRvIHRoZSBpbi1tZW1vcnkgY2FjaGUgdG9vLlxuICBfcmVhZENhY2hlKGFic29sdXRlSW1wb3J0UGF0aCkge1xuICAgIGlmICghIHRoaXMuX2Rpc2tDYWNoZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNhY2hlRmlsZW5hbWUgPSB0aGlzLl9jYWNoZUZpbGVuYW1lKGFic29sdXRlSW1wb3J0UGF0aCk7XG4gICAgY29uc3QgcmF3ID0gdGhpcy5fcmVhZEZpbGVPck51bGwoY2FjaGVGaWxlbmFtZSk7XG4gICAgaWYgKCFyYXcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFNwbGl0IG9uIG5ld2xpbmUuXG4gICAgY29uc3QgbmV3bGluZUluZGV4ID0gcmF3LmluZGV4T2YoJ1xcbicpO1xuICAgIGlmIChuZXdsaW5lSW5kZXggPT09IC0xKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY2FjaGVLZXlzU3RyaW5nID0gcmF3LnN1YnN0cmluZygwLCBuZXdsaW5lSW5kZXgpO1xuICAgIGNvbnN0IGNvbXBpbGVSZXN1bHRTdHJpbmcgPSByYXcuc3Vic3RyaW5nKG5ld2xpbmVJbmRleCArIDEpO1xuXG4gICAgY29uc3QgY2FjaGVLZXlzID0gdGhpcy5fcGFyc2VKU09OT3JOdWxsKGNhY2hlS2V5c1N0cmluZyk7XG4gICAgaWYgKCFjYWNoZUtleXMpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjb21waWxlUmVzdWx0ID0gdGhpcy5wYXJzZUNvbXBpbGVSZXN1bHQoY29tcGlsZVJlc3VsdFN0cmluZyk7XG4gICAgaWYgKCEgY29tcGlsZVJlc3VsdCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY2FjaGVFbnRyeSA9IHtjb21waWxlUmVzdWx0LCBjYWNoZUtleXN9O1xuICAgIHRoaXMuX2NhY2hlLnNldChhYnNvbHV0ZUltcG9ydFBhdGgsIGNhY2hlRW50cnkpO1xuICAgIHJldHVybiBjYWNoZUVudHJ5O1xuICB9XG4gIF93cml0ZUNhY2hlQXN5bmMoYWJzb2x1dGVJbXBvcnRQYXRoLCBjYWNoZUVudHJ5KSB7XG4gICAgaWYgKCEgdGhpcy5fZGlza0NhY2hlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY2FjaGVGaWxlbmFtZSA9IHRoaXMuX2NhY2hlRmlsZW5hbWUoYWJzb2x1dGVJbXBvcnRQYXRoKTtcbiAgICBjb25zdCBjYWNoZUNvbnRlbnRzID1cbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGNhY2hlRW50cnkuY2FjaGVLZXlzKSArICdcXG4nXG4gICAgICAgICAgICArIHRoaXMuc3RyaW5naWZ5Q29tcGlsZVJlc3VsdChjYWNoZUVudHJ5LmNvbXBpbGVSZXN1bHQpO1xuICAgIHRoaXMuX3dyaXRlRmlsZUFzeW5jKGNhY2hlRmlsZW5hbWUsIGNhY2hlQ29udGVudHMpO1xuICB9XG59XG4iXX0=
