(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var CachingCompiler = Package['caching-compiler'].CachingCompiler;
var MultiFileCachingCompiler = Package['caching-compiler'].MultiFileCachingCompiler;
var ECMAScript = Package.ecmascript.ECMAScript;
var TemplatingTools = Package['templating-tools'].TemplatingTools;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var CachingHtmlCompiler;

var require = meteorInstall({"node_modules":{"meteor":{"caching-html-compiler":{"caching-html-compiler.js":function module(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/caching-html-compiler/caching-html-compiler.js                                                       //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
const path = Plugin.path; // The CompileResult type for this CachingCompiler is the return value of
// htmlScanner.scan: a {js, head, body, bodyAttrs} object.

CachingHtmlCompiler = class CachingHtmlCompiler extends CachingCompiler {
  /**
   * Constructor for CachingHtmlCompiler
   * @param  {String} name The name of the compiler, printed in errors -
   * should probably always be the same as the name of the build
   * plugin/package
   * @param  {Function} tagScannerFunc Transforms a template file (commonly
   * .html) into an array of Tags
   * @param  {Function} tagHandlerFunc Transforms an array of tags into a
   * results object with js, body, head, and bodyAttrs properties
   */
  constructor(name, tagScannerFunc, tagHandlerFunc) {
    super({
      compilerName: name,
      defaultCacheSize: 1024 * 1024 * 10
    });
    this._bodyAttrInfo = null;
    this.tagScannerFunc = tagScannerFunc;
    this.tagHandlerFunc = tagHandlerFunc;
  } // Implements method from CachingCompilerBase


  compileResultSize(compileResult) {
    function lengthOrZero(field) {
      return field ? field.length : 0;
    }

    return lengthOrZero(compileResult.head) + lengthOrZero(compileResult.body) + lengthOrZero(compileResult.js);
  } // Overrides method from CachingCompiler


  processFilesForTarget(inputFiles) {
    this._bodyAttrInfo = {};
    return super.processFilesForTarget(inputFiles);
  } // Implements method from CachingCompilerBase


  getCacheKey(inputFile) {
    // Note: the path is only used for errors, so it doesn't have to be part
    // of the cache key.
    return [inputFile.getArch(), inputFile.getSourceHash(), inputFile.hmrAvailable && inputFile.hmrAvailable()];
  } // Implements method from CachingCompiler


  compileOneFile(inputFile) {
    const contents = inputFile.getContentsAsString();
    const inputPath = inputFile.getPathInPackage();

    try {
      const tags = this.tagScannerFunc({
        sourceName: inputPath,
        contents: contents,
        tagNames: ["body", "head", "template"]
      });
      return this.tagHandlerFunc(tags, inputFile.hmrAvailable && inputFile.hmrAvailable());
    } catch (e) {
      if (e instanceof TemplatingTools.CompileError) {
        inputFile.error({
          message: e.message,
          line: e.line
        });
        return null;
      } else {
        throw e;
      }
    }
  } // Implements method from CachingCompilerBase


  addCompileResult(inputFile, compileResult) {
    let allJavaScript = "";

    if (compileResult.head) {
      inputFile.addHtml({
        section: "head",
        data: compileResult.head
      });
    }

    if (compileResult.body) {
      inputFile.addHtml({
        section: "body",
        data: compileResult.body
      });
    }

    if (compileResult.js) {
      allJavaScript += compileResult.js;
    }

    if (!_.isEmpty(compileResult.bodyAttrs)) {
      Object.keys(compileResult.bodyAttrs).forEach(attr => {
        const value = compileResult.bodyAttrs[attr];

        if (this._bodyAttrInfo.hasOwnProperty(attr) && this._bodyAttrInfo[attr].value !== value) {
          // two conflicting attributes on <body> tags in two different template
          // files
          inputFile.error({
            message: "<body> declarations have conflicting values for the '".concat(attr, "' ") + "attribute in the following files: " + this._bodyAttrInfo[attr].inputFile.getPathInPackage() + ", ".concat(inputFile.getPathInPackage())
          });
        } else {
          this._bodyAttrInfo[attr] = {
            inputFile,
            value
          };
        }
      }); // Add JavaScript code to set attributes on body

      allJavaScript += "Meteor.startup(function() {\n  var attrs = ".concat(JSON.stringify(compileResult.bodyAttrs), ";\n  for (var prop in attrs) {\n    document.body.setAttribute(prop, attrs[prop]);\n  }\n});\n");
    }

    if (allJavaScript) {
      const filePath = inputFile.getPathInPackage(); // XXX this path manipulation may be unnecessarily complex

      let pathPart = path.dirname(filePath);
      if (pathPart === '.') pathPart = '';
      if (pathPart.length && pathPart !== path.sep) pathPart = pathPart + path.sep;
      const ext = path.extname(filePath);
      const basename = path.basename(filePath, ext); // XXX generate a source map

      inputFile.addJavaScript({
        path: path.join(pathPart, "template." + basename + ".js"),
        data: allJavaScript
      });
    }
  }

};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/caching-html-compiler/caching-html-compiler.js");

/* Exports */
Package._define("caching-html-compiler", {
  CachingHtmlCompiler: CachingHtmlCompiler
});

})();




//# sourceURL=meteor://💻app/packages/caching-html-compiler.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvY2FjaGluZy1odG1sLWNvbXBpbGVyL2NhY2hpbmctaHRtbC1jb21waWxlci5qcyJdLCJuYW1lcyI6WyJwYXRoIiwiUGx1Z2luIiwiQ2FjaGluZ0h0bWxDb21waWxlciIsIkNhY2hpbmdDb21waWxlciIsImNvbnN0cnVjdG9yIiwibmFtZSIsInRhZ1NjYW5uZXJGdW5jIiwidGFnSGFuZGxlckZ1bmMiLCJjb21waWxlck5hbWUiLCJkZWZhdWx0Q2FjaGVTaXplIiwiX2JvZHlBdHRySW5mbyIsImNvbXBpbGVSZXN1bHRTaXplIiwiY29tcGlsZVJlc3VsdCIsImxlbmd0aE9yWmVybyIsImZpZWxkIiwibGVuZ3RoIiwiaGVhZCIsImJvZHkiLCJqcyIsInByb2Nlc3NGaWxlc0ZvclRhcmdldCIsImlucHV0RmlsZXMiLCJnZXRDYWNoZUtleSIsImlucHV0RmlsZSIsImdldEFyY2giLCJnZXRTb3VyY2VIYXNoIiwiaG1yQXZhaWxhYmxlIiwiY29tcGlsZU9uZUZpbGUiLCJjb250ZW50cyIsImdldENvbnRlbnRzQXNTdHJpbmciLCJpbnB1dFBhdGgiLCJnZXRQYXRoSW5QYWNrYWdlIiwidGFncyIsInNvdXJjZU5hbWUiLCJ0YWdOYW1lcyIsImUiLCJUZW1wbGF0aW5nVG9vbHMiLCJDb21waWxlRXJyb3IiLCJlcnJvciIsIm1lc3NhZ2UiLCJsaW5lIiwiYWRkQ29tcGlsZVJlc3VsdCIsImFsbEphdmFTY3JpcHQiLCJhZGRIdG1sIiwic2VjdGlvbiIsImRhdGEiLCJfIiwiaXNFbXB0eSIsImJvZHlBdHRycyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiYXR0ciIsInZhbHVlIiwiaGFzT3duUHJvcGVydHkiLCJKU09OIiwic3RyaW5naWZ5IiwiZmlsZVBhdGgiLCJwYXRoUGFydCIsImRpcm5hbWUiLCJzZXAiLCJleHQiLCJleHRuYW1lIiwiYmFzZW5hbWUiLCJhZGRKYXZhU2NyaXB0Iiwiam9pbiJdLCJtYXBwaW5ncyI6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QUZHLG1HQUFiO0FBUUQ7O0FBR0QsUUFBSU4sYUFBSixFQUFtQjtBQUNqQixZQUFNZSxRQUFRLEdBQUdsQyxTQUFTLENBQUNRLGdCQUFWLEVBQWpCLENBRGlCLENBRWpCOztBQUNBLFVBQUkyQixRQUFRLEdBQUd6RCxJQUFJLENBQUMwRCxPQUFMLENBQWFGLFFBQWIsQ0FBZjtBQUNBLFVBQUlDLFFBQVEsS0FBSyxHQUFqQixFQUNFQSxRQUFRLEdBQUcsRUFBWDtBQUNGLFVBQUlBLFFBQVEsQ0FBQzFDLE1BQVQsSUFBbUIwQyxRQUFRLEtBQUt6RCxJQUFJLENBQUMyRCxHQUF6QyxFQUNFRixRQUFRLEdBQUdBLFFBQVEsR0FBR3pELElBQUksQ0FBQzJELEdBQTNCO0FBQ0YsWUFBTUMsR0FBRyxHQUFHNUQsSUFBSSxDQUFDNkQsT0FBTCxDQUFhTCxRQUFiLENBQVo7QUFDQSxZQUFNTSxRQUFRLEdBQUc5RCxJQUFJLENBQUM4RCxRQUFMLENBQWNOLFFBQWQsRUFBd0JJLEdBQXhCLENBQWpCLENBVGlCLENBV2pCOztBQUVBdEMsZUFBUyxDQUFDeUMsYUFBVixDQUF3QjtBQUN0Qi9ELFlBQUksRUFBRUEsSUFBSSxDQUFDZ0UsSUFBTCxDQUFVUCxRQUFWLEVBQW9CLGNBQWNLLFFBQWQsR0FBeUIsS0FBN0MsQ0FEZ0I7QUFFdEJsQixZQUFJLEVBQUVIO0FBRmdCLE9BQXhCO0FBSUQ7QUFDRjs7QUEzSXFFLENBQXhFLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2NhY2hpbmctaHRtbC1jb21waWxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHBhdGggPSBQbHVnaW4ucGF0aDtcblxuLy8gVGhlIENvbXBpbGVSZXN1bHQgdHlwZSBmb3IgdGhpcyBDYWNoaW5nQ29tcGlsZXIgaXMgdGhlIHJldHVybiB2YWx1ZSBvZlxuLy8gaHRtbFNjYW5uZXIuc2NhbjogYSB7anMsIGhlYWQsIGJvZHksIGJvZHlBdHRyc30gb2JqZWN0LlxuQ2FjaGluZ0h0bWxDb21waWxlciA9IGNsYXNzIENhY2hpbmdIdG1sQ29tcGlsZXIgZXh0ZW5kcyBDYWNoaW5nQ29tcGlsZXIge1xuICAvKipcbiAgICogQ29uc3RydWN0b3IgZm9yIENhY2hpbmdIdG1sQ29tcGlsZXJcbiAgICogQHBhcmFtICB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBjb21waWxlciwgcHJpbnRlZCBpbiBlcnJvcnMgLVxuICAgKiBzaG91bGQgcHJvYmFibHkgYWx3YXlzIGJlIHRoZSBzYW1lIGFzIHRoZSBuYW1lIG9mIHRoZSBidWlsZFxuICAgKiBwbHVnaW4vcGFja2FnZVxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gdGFnU2Nhbm5lckZ1bmMgVHJhbnNmb3JtcyBhIHRlbXBsYXRlIGZpbGUgKGNvbW1vbmx5XG4gICAqIC5odG1sKSBpbnRvIGFuIGFycmF5IG9mIFRhZ3NcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IHRhZ0hhbmRsZXJGdW5jIFRyYW5zZm9ybXMgYW4gYXJyYXkgb2YgdGFncyBpbnRvIGFcbiAgICogcmVzdWx0cyBvYmplY3Qgd2l0aCBqcywgYm9keSwgaGVhZCwgYW5kIGJvZHlBdHRycyBwcm9wZXJ0aWVzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lLCB0YWdTY2FubmVyRnVuYywgdGFnSGFuZGxlckZ1bmMpIHtcbiAgICBzdXBlcih7XG4gICAgICBjb21waWxlck5hbWU6IG5hbWUsXG4gICAgICBkZWZhdWx0Q2FjaGVTaXplOiAxMDI0KjEwMjQqMTAsXG4gICAgfSk7XG5cbiAgICB0aGlzLl9ib2R5QXR0ckluZm8gPSBudWxsO1xuXG4gICAgdGhpcy50YWdTY2FubmVyRnVuYyA9IHRhZ1NjYW5uZXJGdW5jO1xuICAgIHRoaXMudGFnSGFuZGxlckZ1bmMgPSB0YWdIYW5kbGVyRnVuYztcbiAgfVxuXG4gIC8vIEltcGxlbWVudHMgbWV0aG9kIGZyb20gQ2FjaGluZ0NvbXBpbGVyQmFzZVxuICBjb21waWxlUmVzdWx0U2l6ZShjb21waWxlUmVzdWx0KSB7XG4gICAgZnVuY3Rpb24gbGVuZ3RoT3JaZXJvKGZpZWxkKSB7XG4gICAgICByZXR1cm4gZmllbGQgPyBmaWVsZC5sZW5ndGggOiAwO1xuICAgIH1cbiAgICByZXR1cm4gbGVuZ3RoT3JaZXJvKGNvbXBpbGVSZXN1bHQuaGVhZCkgKyBsZW5ndGhPclplcm8oY29tcGlsZVJlc3VsdC5ib2R5KSArXG4gICAgICBsZW5ndGhPclplcm8oY29tcGlsZVJlc3VsdC5qcyk7XG4gIH1cblxuICAvLyBPdmVycmlkZXMgbWV0aG9kIGZyb20gQ2FjaGluZ0NvbXBpbGVyXG4gIHByb2Nlc3NGaWxlc0ZvclRhcmdldChpbnB1dEZpbGVzKSB7XG4gICAgdGhpcy5fYm9keUF0dHJJbmZvID0ge307XG4gICAgcmV0dXJuIHN1cGVyLnByb2Nlc3NGaWxlc0ZvclRhcmdldChpbnB1dEZpbGVzKTtcbiAgfVxuXG4gIC8vIEltcGxlbWVudHMgbWV0aG9kIGZyb20gQ2FjaGluZ0NvbXBpbGVyQmFzZVxuICBnZXRDYWNoZUtleShpbnB1dEZpbGUpIHtcbiAgICAvLyBOb3RlOiB0aGUgcGF0aCBpcyBvbmx5IHVzZWQgZm9yIGVycm9ycywgc28gaXQgZG9lc24ndCBoYXZlIHRvIGJlIHBhcnRcbiAgICAvLyBvZiB0aGUgY2FjaGUga2V5LlxuICAgIHJldHVybiBbXG4gICAgICBpbnB1dEZpbGUuZ2V0QXJjaCgpLFxuICAgICAgaW5wdXRGaWxlLmdldFNvdXJjZUhhc2goKSxcbiAgICAgIGlucHV0RmlsZS5obXJBdmFpbGFibGUgJiYgaW5wdXRGaWxlLmhtckF2YWlsYWJsZSgpXG4gICAgXTtcbiAgfVxuXG4gIC8vIEltcGxlbWVudHMgbWV0aG9kIGZyb20gQ2FjaGluZ0NvbXBpbGVyXG4gIGNvbXBpbGVPbmVGaWxlKGlucHV0RmlsZSkge1xuICAgIGNvbnN0IGNvbnRlbnRzID0gaW5wdXRGaWxlLmdldENvbnRlbnRzQXNTdHJpbmcoKTtcbiAgICBjb25zdCBpbnB1dFBhdGggPSBpbnB1dEZpbGUuZ2V0UGF0aEluUGFja2FnZSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YWdzID0gdGhpcy50YWdTY2FubmVyRnVuYyh7XG4gICAgICAgIHNvdXJjZU5hbWU6IGlucHV0UGF0aCxcbiAgICAgICAgY29udGVudHM6IGNvbnRlbnRzLFxuICAgICAgICB0YWdOYW1lczogW1wiYm9keVwiLCBcImhlYWRcIiwgXCJ0ZW1wbGF0ZVwiXVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB0aGlzLnRhZ0hhbmRsZXJGdW5jKHRhZ3MsIGlucHV0RmlsZS5obXJBdmFpbGFibGUgJiYgaW5wdXRGaWxlLmhtckF2YWlsYWJsZSgpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZSBpbnN0YW5jZW9mIFRlbXBsYXRpbmdUb29scy5Db21waWxlRXJyb3IpIHtcbiAgICAgICAgaW5wdXRGaWxlLmVycm9yKHtcbiAgICAgICAgICBtZXNzYWdlOiBlLm1lc3NhZ2UsXG4gICAgICAgICAgbGluZTogZS5saW5lXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gSW1wbGVtZW50cyBtZXRob2QgZnJvbSBDYWNoaW5nQ29tcGlsZXJCYXNlXG4gIGFkZENvbXBpbGVSZXN1bHQoaW5wdXRGaWxlLCBjb21waWxlUmVzdWx0KSB7XG4gICAgbGV0IGFsbEphdmFTY3JpcHQgPSBcIlwiO1xuXG4gICAgaWYgKGNvbXBpbGVSZXN1bHQuaGVhZCkge1xuICAgICAgaW5wdXRGaWxlLmFkZEh0bWwoeyBzZWN0aW9uOiBcImhlYWRcIiwgZGF0YTogY29tcGlsZVJlc3VsdC5oZWFkIH0pO1xuICAgIH1cblxuICAgIGlmIChjb21waWxlUmVzdWx0LmJvZHkpIHtcbiAgICAgIGlucHV0RmlsZS5hZGRIdG1sKHsgc2VjdGlvbjogXCJib2R5XCIsIGRhdGE6IGNvbXBpbGVSZXN1bHQuYm9keSB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZVJlc3VsdC5qcykge1xuICAgICAgYWxsSmF2YVNjcmlwdCArPSBjb21waWxlUmVzdWx0LmpzO1xuICAgIH1cblxuICAgIGlmICghIF8uaXNFbXB0eShjb21waWxlUmVzdWx0LmJvZHlBdHRycykpIHtcbiAgICAgIE9iamVjdC5rZXlzKGNvbXBpbGVSZXN1bHQuYm9keUF0dHJzKS5mb3JFYWNoKChhdHRyKSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gY29tcGlsZVJlc3VsdC5ib2R5QXR0cnNbYXR0cl07XG4gICAgICAgIGlmICh0aGlzLl9ib2R5QXR0ckluZm8uaGFzT3duUHJvcGVydHkoYXR0cikgJiZcbiAgICAgICAgICAgIHRoaXMuX2JvZHlBdHRySW5mb1thdHRyXS52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAvLyB0d28gY29uZmxpY3RpbmcgYXR0cmlidXRlcyBvbiA8Ym9keT4gdGFncyBpbiB0d28gZGlmZmVyZW50IHRlbXBsYXRlXG4gICAgICAgICAgLy8gZmlsZXNcbiAgICAgICAgICBpbnB1dEZpbGUuZXJyb3Ioe1xuICAgICAgICAgICAgbWVzc2FnZTpcbiAgICAgICAgICAgIGA8Ym9keT4gZGVjbGFyYXRpb25zIGhhdmUgY29uZmxpY3RpbmcgdmFsdWVzIGZvciB0aGUgJyR7IGF0dHIgfScgYCArXG4gICAgICAgICAgICAgIGBhdHRyaWJ1dGUgaW4gdGhlIGZvbGxvd2luZyBmaWxlczogYCArXG4gICAgICAgICAgICAgIHRoaXMuX2JvZHlBdHRySW5mb1thdHRyXS5pbnB1dEZpbGUuZ2V0UGF0aEluUGFja2FnZSgpICtcbiAgICAgICAgICAgICAgYCwgJHsgaW5wdXRGaWxlLmdldFBhdGhJblBhY2thZ2UoKSB9YFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2JvZHlBdHRySW5mb1thdHRyXSA9IHtpbnB1dEZpbGUsIHZhbHVlfTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFkZCBKYXZhU2NyaXB0IGNvZGUgdG8gc2V0IGF0dHJpYnV0ZXMgb24gYm9keVxuICAgICAgYWxsSmF2YVNjcmlwdCArPVxuYE1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuICB2YXIgYXR0cnMgPSAke0pTT04uc3RyaW5naWZ5KGNvbXBpbGVSZXN1bHQuYm9keUF0dHJzKX07XG4gIGZvciAodmFyIHByb3AgaW4gYXR0cnMpIHtcbiAgICBkb2N1bWVudC5ib2R5LnNldEF0dHJpYnV0ZShwcm9wLCBhdHRyc1twcm9wXSk7XG4gIH1cbn0pO1xuYDtcbiAgICB9XG4gICAgXG5cbiAgICBpZiAoYWxsSmF2YVNjcmlwdCkge1xuICAgICAgY29uc3QgZmlsZVBhdGggPSBpbnB1dEZpbGUuZ2V0UGF0aEluUGFja2FnZSgpO1xuICAgICAgLy8gWFhYIHRoaXMgcGF0aCBtYW5pcHVsYXRpb24gbWF5IGJlIHVubmVjZXNzYXJpbHkgY29tcGxleFxuICAgICAgbGV0IHBhdGhQYXJ0ID0gcGF0aC5kaXJuYW1lKGZpbGVQYXRoKTtcbiAgICAgIGlmIChwYXRoUGFydCA9PT0gJy4nKVxuICAgICAgICBwYXRoUGFydCA9ICcnO1xuICAgICAgaWYgKHBhdGhQYXJ0Lmxlbmd0aCAmJiBwYXRoUGFydCAhPT0gcGF0aC5zZXApXG4gICAgICAgIHBhdGhQYXJ0ID0gcGF0aFBhcnQgKyBwYXRoLnNlcDtcbiAgICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShmaWxlUGF0aCk7XG4gICAgICBjb25zdCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgsIGV4dCk7XG5cbiAgICAgIC8vIFhYWCBnZW5lcmF0ZSBhIHNvdXJjZSBtYXBcblxuICAgICAgaW5wdXRGaWxlLmFkZEphdmFTY3JpcHQoe1xuICAgICAgICBwYXRoOiBwYXRoLmpvaW4ocGF0aFBhcnQsIFwidGVtcGxhdGUuXCIgKyBiYXNlbmFtZSArIFwiLmpzXCIpLFxuICAgICAgICBkYXRhOiBhbGxKYXZhU2NyaXB0XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==
