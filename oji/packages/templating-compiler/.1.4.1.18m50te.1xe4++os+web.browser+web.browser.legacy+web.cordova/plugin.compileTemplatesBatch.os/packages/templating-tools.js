(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var TemplatingTools;

var require = meteorInstall({"node_modules":{"meteor":{"templating-tools":{"templating-tools.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/templating-tools/templating-tools.js                                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  TemplatingTools: () => TemplatingTools
});
let scanHtmlForTags;
module.link("./html-scanner", {
  scanHtmlForTags(v) {
    scanHtmlForTags = v;
  }

}, 0);
let compileTagsWithSpacebars;
module.link("./compile-tags-with-spacebars", {
  compileTagsWithSpacebars(v) {
    compileTagsWithSpacebars = v;
  }

}, 1);
let generateTemplateJS, generateBodyJS;
module.link("./code-generation", {
  generateTemplateJS(v) {
    generateTemplateJS = v;
  },

  generateBodyJS(v) {
    generateBodyJS = v;
  }

}, 2);
let CompileError, throwCompileError;
module.link("./throw-compile-error", {
  CompileError(v) {
    CompileError = v;
  },

  throwCompileError(v) {
    throwCompileError = v;
  }

}, 3);
const TemplatingTools = {
  scanHtmlForTags,
  compileTagsWithSpacebars,
  generateTemplateJS,
  generateBodyJS,
  CompileError,
  throwCompileError
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"code-generation.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/templating-tools/code-generation.js                                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
!function (module1) {
  module1.export({
    generateTemplateJS: () => generateTemplateJS,
    generateBodyJS: () => generateBodyJS
  });

  function generateTemplateJS(name, renderFuncCode, useHMR) {
    const nameLiteral = JSON.stringify(name);
    const templateDotNameLiteral = JSON.stringify("Template.".concat(name));

    if (useHMR) {
      // module.hot.data is used to make sure Template.__checkName can still
      // detect duplicates
      return "\nTemplate._migrateTemplate(\n  ".concat(nameLiteral, ",\n  new Template(").concat(templateDotNameLiteral, ", ").concat(renderFuncCode, "),\n);\nif (typeof module === \"object\" && module.hot) {\n  module.hot.accept();\n  module.hot.dispose(function () {\n    Template.__pendingReplacement.push(").concat(nameLiteral, ");\n    Template._applyHmrChanges(").concat(nameLiteral, ");\n  });\n}\n");
    }

    return "\nTemplate.__checkName(".concat(nameLiteral, ");\nTemplate[").concat(nameLiteral, "] = new Template(").concat(templateDotNameLiteral, ", ").concat(renderFuncCode, ");\n");
  }

  function generateBodyJS(renderFuncCode, useHMR) {
    if (useHMR) {
      return "\n(function () {\n  var renderFunc = ".concat(renderFuncCode, ";\n  Template.body.addContent(renderFunc);\n  Meteor.startup(Template.body.renderToDocument);\n  if (typeof module === \"object\" && module.hot) {\n    module.hot.accept();\n    module.hot.dispose(function () {\n      var index = Template.body.contentRenderFuncs.indexOf(renderFunc)\n      Template.body.contentRenderFuncs.splice(index, 1);\n      Template._applyHmrChanges();\n    });\n  }\n})();\n");
    }

    return "\nTemplate.body.addContent(".concat(renderFuncCode, ");\nMeteor.startup(Template.body.renderToDocument);\n");
  }
}.call(this, module);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"compile-tags-with-spacebars.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/templating-tools/compile-tags-with-spacebars.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _objectWithoutProperties;

module.link("@babel/runtime/helpers/objectWithoutProperties", {
  default(v) {
    _objectWithoutProperties = v;
  }

}, 0);
module.export({
  compileTagsWithSpacebars: () => compileTagsWithSpacebars
});
let SpacebarsCompiler;
module.link("meteor/spacebars-compiler", {
  SpacebarsCompiler(v) {
    SpacebarsCompiler = v;
  }

}, 0);
let generateBodyJS, generateTemplateJS;
module.link("./code-generation", {
  generateBodyJS(v) {
    generateBodyJS = v;
  },

  generateTemplateJS(v) {
    generateTemplateJS = v;
  }

}, 1);
let throwCompileError;
module.link("./throw-compile-error", {
  throwCompileError(v) {
    throwCompileError = v;
  }

}, 2);

function compileTagsWithSpacebars(tags, hmrAvailable) {
  var handler = new SpacebarsTagCompiler();
  tags.forEach(tag => {
    handler.addTagToResults(tag, hmrAvailable);
  });
  return handler.getResults();
}

class SpacebarsTagCompiler {
  constructor() {
    this.results = {
      head: '',
      body: '',
      js: '',
      bodyAttrs: {}
    };
  }

  getResults() {
    return this.results;
  }

  addTagToResults(tag, hmrAvailable) {
    this.tag = tag; // do we have 1 or more attributes?

    const hasAttribs = !_.isEmpty(this.tag.attribs);

    if (this.tag.tagName === "head") {
      if (hasAttribs) {
        this.throwCompileError("Attributes on <head> not supported");
      }

      this.results.head += this.tag.contents;
      return;
    } // <body> or <template>


    try {
      if (this.tag.tagName === "template") {
        const name = this.tag.attribs.name;

        if (!name) {
          this.throwCompileError("Template has no 'name' attribute");
        }

        if (SpacebarsCompiler.isReservedName(name)) {
          this.throwCompileError("Template can't be named \"".concat(name, "\""));
        }

        const whitespace = this.tag.attribs.whitespace || '';
        const renderFuncCode = SpacebarsCompiler.compile(this.tag.contents, {
          whitespace,
          isTemplate: true,
          sourceName: "Template \"".concat(name, "\"")
        });
        this.results.js += generateTemplateJS(name, renderFuncCode, hmrAvailable);
      } else if (this.tag.tagName === "body") {
        const _this$tag$attribs = this.tag.attribs,
              {
          whitespace = ''
        } = _this$tag$attribs,
              attribs = _objectWithoutProperties(_this$tag$attribs, ["whitespace"]);

        this.addBodyAttrs(attribs);
        const renderFuncCode = SpacebarsCompiler.compile(this.tag.contents, {
          whitespace,
          isBody: true,
          sourceName: "<body>"
        }); // We may be one of many `<body>` tags.

        this.results.js += generateBodyJS(renderFuncCode, hmrAvailable);
      } else {
        this.throwCompileError("Expected <template>, <head>, or <body> tag in template file", tagStartIndex);
      }
    } catch (e) {
      if (e.scanner) {
        // The error came from Spacebars
        this.throwCompileError(e.message, this.tag.contentsStartIndex + e.offset);
      } else {
        throw e;
      }
    }
  }

  addBodyAttrs(attrs) {
    Object.keys(attrs).forEach(attr => {
      const val = attrs[attr]; // This check is for conflicting body attributes in the same file;
      // we check across multiple files in caching-html-compiler using the
      // attributes on results.bodyAttrs

      if (this.results.bodyAttrs.hasOwnProperty(attr) && this.results.bodyAttrs[attr] !== val) {
        this.throwCompileError("<body> declarations have conflicting values for the '".concat(attr, "' attribute."));
      }

      this.results.bodyAttrs[attr] = val;
    });
  }

  throwCompileError(message, overrideIndex) {
    throwCompileError(this.tag, message, overrideIndex);
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"html-scanner.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/templating-tools/html-scanner.js                                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  scanHtmlForTags: () => scanHtmlForTags
});
let CompileError;
module.link("./throw-compile-error", {
  CompileError(v) {
    CompileError = v;
  }

}, 0);

function scanHtmlForTags(options) {
  const scan = new HtmlScan(options);
  return scan.getTags();
}

/**
 * Scan an HTML file for top-level tags and extract their contents. Pass them to
 * a tag handler (an object with a handleTag method)
 *
 * This is a primitive, regex-based scanner.  It scans
 * top-level tags, which are allowed to have attributes,
 * and ignores top-level HTML comments.
 */
class HtmlScan {
  /**
   * Initialize and run a scan of a single file
   * @param  {String} sourceName The filename, used in errors only
   * @param  {String} contents   The contents of the file
   * @param  {String[]} tagNames An array of tag names that are accepted at the
   * top level. If any other tag is encountered, an error is thrown.
   */
  constructor(_ref) {
    let {
      sourceName,
      contents,
      tagNames
    } = _ref;
    this.sourceName = sourceName;
    this.contents = contents;
    this.tagNames = tagNames;
    this.rest = contents;
    this.index = 0;
    this.tags = [];
    const tagNameRegex = this.tagNames.join("|");
    const openTagRegex = new RegExp("^((<(".concat(tagNameRegex, ")\\b)|(<!--)|(<!DOCTYPE|{{!)|$)"), "i");

    while (this.rest) {
      // skip whitespace first (for better line numbers)
      this.advance(this.rest.match(/^\s*/)[0].length);
      const match = openTagRegex.exec(this.rest);

      if (!match) {
        this.throwCompileError("Expected one of: <".concat(this.tagNames.join('>, <'), ">"));
      }

      const matchToken = match[1];
      const matchTokenTagName = match[3];
      const matchTokenComment = match[4];
      const matchTokenUnsupported = match[5];
      const tagStartIndex = this.index;
      this.advance(match.index + match[0].length);

      if (!matchToken) {
        break; // matched $ (end of file)
      }

      if (matchTokenComment === '<!--') {
        // top-level HTML comment
        const commentEnd = /--\s*>/.exec(this.rest);
        if (!commentEnd) this.throwCompileError("unclosed HTML comment in template file");
        this.advance(commentEnd.index + commentEnd[0].length);
        continue;
      }

      if (matchTokenUnsupported) {
        switch (matchTokenUnsupported.toLowerCase()) {
          case '<!doctype':
            this.throwCompileError("Can't set DOCTYPE here.  (Meteor sets <!DOCTYPE html> for you)");

          case '{{!':
            this.throwCompileError("Can't use '{{! }}' outside a template.  Use '<!-- -->'.");
        }

        this.throwCompileError();
      } // otherwise, a <tag>


      const tagName = matchTokenTagName.toLowerCase();
      const tagAttribs = {}; // bare name -> value dict

      const tagPartRegex = /^\s*((([a-zA-Z0-9:_-]+)\s*=\s*(["'])(.*?)\4)|(>))/; // read attributes

      let attr;

      while (attr = tagPartRegex.exec(this.rest)) {
        const attrToken = attr[1];
        const attrKey = attr[3];
        let attrValue = attr[5];
        this.advance(attr.index + attr[0].length);

        if (attrToken === '>') {
          break;
        } // XXX we don't HTML unescape the attribute value
        // (e.g. to allow "abcd&quot;efg") or protect against
        // collisions with methods of tagAttribs (e.g. for
        // a property named toString)


        attrValue = attrValue.match(/^\s*([\s\S]*?)\s*$/)[1]; // trim

        tagAttribs[attrKey] = attrValue;
      }

      if (!attr) {
        // didn't end on '>'
        this.throwCompileError("Parse error in tag");
      } // find </tag>


      const end = new RegExp('</' + tagName + '\\s*>', 'i').exec(this.rest);

      if (!end) {
        this.throwCompileError("unclosed <" + tagName + ">");
      }

      const tagContents = this.rest.slice(0, end.index);
      const contentsStartIndex = this.index; // trim the tag contents.
      // this is a courtesy and is also relied on by some unit tests.

      var m = tagContents.match(/^([ \t\r\n]*)([\s\S]*?)[ \t\r\n]*$/);
      const trimmedContentsStartIndex = contentsStartIndex + m[1].length;
      const trimmedTagContents = m[2];
      const tag = {
        tagName: tagName,
        attribs: tagAttribs,
        contents: trimmedTagContents,
        contentsStartIndex: trimmedContentsStartIndex,
        tagStartIndex: tagStartIndex,
        fileContents: this.contents,
        sourceName: this.sourceName
      }; // save the tag

      this.tags.push(tag); // advance afterwards, so that line numbers in errors are correct

      this.advance(end.index + end[0].length);
    }
  }
  /**
   * Advance the parser
   * @param  {Number} amount The amount of characters to advance
   */


  advance(amount) {
    this.rest = this.rest.substring(amount);
    this.index += amount;
  }

  throwCompileError(msg, overrideIndex) {
    const finalIndex = typeof overrideIndex === 'number' ? overrideIndex : this.index;
    const err = new CompileError();
    err.message = msg || "bad formatting in template file";
    err.file = this.sourceName;
    err.line = this.contents.substring(0, finalIndex).split('\n').length;
    throw err;
  }

  throwBodyAttrsError(msg) {
    this.parseError(msg);
  }

  getTags() {
    return this.tags;
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"throw-compile-error.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/templating-tools/throw-compile-error.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  CompileError: () => CompileError,
  throwCompileError: () => throwCompileError
});

class CompileError {}

function throwCompileError(tag, message, overrideIndex) {
  const finalIndex = typeof overrideIndex === 'number' ? overrideIndex : tag.tagStartIndex;
  const err = new CompileError();
  err.message = message || "bad formatting in template file";
  err.file = tag.sourceName;
  err.line = tag.fileContents.substring(0, finalIndex).split('\n').length;
  throw err;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/templating-tools/templating-tools.js");

/* Exports */
Package._define("templating-tools", exports, {
  TemplatingTools: TemplatingTools
});

})();




//# sourceURL=meteor://💻app/packages/templating-tools.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvdGVtcGxhdGluZy10b29scy90ZW1wbGF0aW5nLXRvb2xzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy90ZW1wbGF0aW5nLXRvb2xzL2NvZGUtZ2VuZXJhdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvdGVtcGxhdGluZy10b29scy9jb21waWxlLXRhZ3Mtd2l0aC1zcGFjZWJhcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3RlbXBsYXRpbmctdG9vbHMvaHRtbC1zY2FubmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy90ZW1wbGF0aW5nLXRvb2xzL3Rocm93LWNvbXBpbGUtZXJyb3IuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiVGVtcGxhdGluZ1Rvb2xzIiwic2Nhbkh0bWxGb3JUYWdzIiwibGluayIsInYiLCJjb21waWxlVGFnc1dpdGhTcGFjZWJhcnMiLCJnZW5lcmF0ZVRlbXBsYXRlSlMiLCJnZW5lcmF0ZUJvZHlKUyIsIkNvbXBpbGVFcnJvciIsInRocm93Q29tcGlsZUVycm9yIiwibW9kdWxlMSIsIm5hbWUiLCJyZW5kZXJGdW5jQ29kZSIsInVzZUhNUiIsIm5hbWVMaXRlcmFsIiwiSlNPTiIsInN0cmluZ2lmeSIsInRlbXBsYXRlRG90TmFtZUxpdGVyYWwiLCJfb2JqZWN0V2l0aG91dFByb3BlcnRpZXMiLCJkZWZhdWx0IiwiU3BhY2ViYXJzQ29tcGlsZXIiLCJ0YWdzIiwiaG1yQXZhaWxhYmxlIiwiaGFuZGxlciIsIlNwYWNlYmFyc1RhZ0NvbXBpbGVyIiwiZm9yRWFjaCIsInRhZyIsImFkZFRhZ1RvUmVzdWx0cyIsImdldFJlc3VsdHMiLCJjb25zdHJ1Y3RvciIsInJlc3VsdHMiLCJoZWFkIiwiYm9keSIsImpzIiwiYm9keUF0dHJzIiwiaGFzQXR0cmlicyIsIl8iLCJpc0VtcHR5IiwiYXR0cmlicyIsInRhZ05hbWUiLCJjb250ZW50cyIsImlzUmVzZXJ2ZWROYW1lIiwid2hpdGVzcGFjZSIsImNvbXBpbGUiLCJpc1RlbXBsYXRlIiwic291cmNlTmFtZSIsImFkZEJvZHlBdHRycyIsImlzQm9keSIsInRhZ1N0YXJ0SW5kZXgiLCJlIiwic2Nhbm5lciIsIm1lc3NhZ2UiLCJjb250ZW50c1N0YXJ0SW5kZXgiLCJvZmZzZXQiLCJhdHRycyIsIk9iamVjdCIsImtleXMiLCJhdHRyIiwidmFsIiwiaGFzT3duUHJvcGVydHkiLCJvdmVycmlkZUluZGV4Iiwib3B0aW9ucyIsInNjYW4iLCJIdG1sU2NhbiIsImdldFRhZ3MiLCJ0YWdOYW1lcyIsInJlc3QiLCJpbmRleCIsInRhZ05hbWVSZWdleCIsImpvaW4iLCJvcGVuVGFnUmVnZXgiLCJSZWdFeHAiLCJhZHZhbmNlIiwibWF0Y2giLCJsZW5ndGgiLCJleGVjIiwibWF0Y2hUb2tlbiIsIm1hdGNoVG9rZW5UYWdOYW1lIiwibWF0Y2hUb2tlbkNvbW1lbnQiLCJtYXRjaFRva2VuVW5zdXBwb3J0ZWQiLCJjb21tZW50RW5kIiwidG9Mb3dlckNhc2UiLCJ0YWdBdHRyaWJzIiwidGFnUGFydFJlZ2V4IiwiYXR0clRva2VuIiwiYXR0cktleSIsImF0dHJWYWx1ZSIsImVuZCIsInRhZ0NvbnRlbnRzIiwic2xpY2UiLCJtIiwidHJpbW1lZENvbnRlbnRzU3RhcnRJbmRleCIsInRyaW1tZWRUYWdDb250ZW50cyIsImZpbGVDb250ZW50cyIsInB1c2giLCJhbW91bnQiLCJzdWJzdHJpbmciLCJtc2ciLCJmaW5hbEluZGV4IiwiZXJyIiwiZmlsZSIsImxpbmUiLCJzcGxpdCIsInRocm93Qm9keUF0dHJzRXJyb3IiLCJwYXJzZUVycm9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjO0FBQUNDLGlCQUFlLEVBQUMsTUFBSUE7QUFBckIsQ0FBZDtBQUFxRCxJQUFJQyxlQUFKO0FBQW9CSCxNQUFNLENBQUNJLElBQVAsQ0FBWSxnQkFBWixF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ekIsR0FDbEJBLGFBRGtCLEdBQ0ZsQyxHQUFHLENBQUNzQixhQUR0QjtBQUdBLFFBQU1tRCxHQUFHLEdBQUcsSUFBSTNGLFlBQUosRUFBWjtBQUNBMkYsS0FBRyxDQUFDaEQsT0FBSixHQUFjQSxPQUFPLElBQUksaUNBQXpCO0FBQ0FnRCxLQUFHLENBQUNDLElBQUosR0FBVzFFLEdBQUcsQ0FBQ21CLFVBQWY7QUFDQXNELEtBQUcsQ0FBQ0UsSUFBSixHQUFXM0UsR0FBRyxDQUFDbUUsWUFBSixDQUFpQkcsU0FBakIsQ0FBMkIsQ0FBM0IsRUFBOEJFLFVBQTlCLEVBQTBDSSxLQUExQyxDQUFnRCxJQUFoRCxFQUFzRDVCLE1BQWpFO0FBQ0EsUUFBTXlCLEdBQU47QUFDRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy90ZW1wbGF0aW5nLXRvb2xzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2Nhbkh0bWxGb3JUYWdzIH0gZnJvbSAnLi9odG1sLXNjYW5uZXInO1xuaW1wb3J0IHsgY29tcGlsZVRhZ3NXaXRoU3BhY2ViYXJzIH0gZnJvbSAnLi9jb21waWxlLXRhZ3Mtd2l0aC1zcGFjZWJhcnMnO1xuaW1wb3J0IHsgZ2VuZXJhdGVUZW1wbGF0ZUpTLCBnZW5lcmF0ZUJvZHlKUyB9IGZyb20gJy4vY29kZS1nZW5lcmF0aW9uJ1xuaW1wb3J0IHsgQ29tcGlsZUVycm9yLCB0aHJvd0NvbXBpbGVFcnJvcn0gZnJvbSAnLi90aHJvdy1jb21waWxlLWVycm9yJztcblxuZXhwb3J0IGNvbnN0IFRlbXBsYXRpbmdUb29scyAgPSB7XG4gIHNjYW5IdG1sRm9yVGFncyxcbiAgY29tcGlsZVRhZ3NXaXRoU3BhY2ViYXJzLFxuICBnZW5lcmF0ZVRlbXBsYXRlSlMsXG4gIGdlbmVyYXRlQm9keUpTLFxuICBDb21waWxlRXJyb3IsXG4gIHRocm93Q29tcGlsZUVycm9yXG59O1xuIiwiZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlVGVtcGxhdGVKUyhuYW1lLCByZW5kZXJGdW5jQ29kZSwgdXNlSE1SKSB7XG4gIGNvbnN0IG5hbWVMaXRlcmFsID0gSlNPTi5zdHJpbmdpZnkobmFtZSk7XG4gIGNvbnN0IHRlbXBsYXRlRG90TmFtZUxpdGVyYWwgPSBKU09OLnN0cmluZ2lmeShgVGVtcGxhdGUuJHtuYW1lfWApO1xuXG4gIGlmICh1c2VITVIpIHtcbiAgICAvLyBtb2R1bGUuaG90LmRhdGEgaXMgdXNlZCB0byBtYWtlIHN1cmUgVGVtcGxhdGUuX19jaGVja05hbWUgY2FuIHN0aWxsXG4gICAgLy8gZGV0ZWN0IGR1cGxpY2F0ZXNcbiAgICByZXR1cm4gYFxuVGVtcGxhdGUuX21pZ3JhdGVUZW1wbGF0ZShcbiAgJHtuYW1lTGl0ZXJhbH0sXG4gIG5ldyBUZW1wbGF0ZSgke3RlbXBsYXRlRG90TmFtZUxpdGVyYWx9LCAke3JlbmRlckZ1bmNDb2RlfSksXG4pO1xuaWYgKHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgbW9kdWxlLmhvdCkge1xuICBtb2R1bGUuaG90LmFjY2VwdCgpO1xuICBtb2R1bGUuaG90LmRpc3Bvc2UoZnVuY3Rpb24gKCkge1xuICAgIFRlbXBsYXRlLl9fcGVuZGluZ1JlcGxhY2VtZW50LnB1c2goJHtuYW1lTGl0ZXJhbH0pO1xuICAgIFRlbXBsYXRlLl9hcHBseUhtckNoYW5nZXMoJHtuYW1lTGl0ZXJhbH0pO1xuICB9KTtcbn1cbmBcbiAgfVxuXG4gIHJldHVybiBgXG5UZW1wbGF0ZS5fX2NoZWNrTmFtZSgke25hbWVMaXRlcmFsfSk7XG5UZW1wbGF0ZVske25hbWVMaXRlcmFsfV0gPSBuZXcgVGVtcGxhdGUoJHt0ZW1wbGF0ZURvdE5hbWVMaXRlcmFsfSwgJHtyZW5kZXJGdW5jQ29kZX0pO1xuYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQm9keUpTKHJlbmRlckZ1bmNDb2RlLCB1c2VITVIpIHtcbiAgaWYgKHVzZUhNUikge1xuICAgIHJldHVybiBgXG4oZnVuY3Rpb24gKCkge1xuICB2YXIgcmVuZGVyRnVuYyA9ICR7cmVuZGVyRnVuY0NvZGV9O1xuICBUZW1wbGF0ZS5ib2R5LmFkZENvbnRlbnQocmVuZGVyRnVuYyk7XG4gIE1ldGVvci5zdGFydHVwKFRlbXBsYXRlLmJvZHkucmVuZGVyVG9Eb2N1bWVudCk7XG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiICYmIG1vZHVsZS5ob3QpIHtcbiAgICBtb2R1bGUuaG90LmFjY2VwdCgpO1xuICAgIG1vZHVsZS5ob3QuZGlzcG9zZShmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaW5kZXggPSBUZW1wbGF0ZS5ib2R5LmNvbnRlbnRSZW5kZXJGdW5jcy5pbmRleE9mKHJlbmRlckZ1bmMpXG4gICAgICBUZW1wbGF0ZS5ib2R5LmNvbnRlbnRSZW5kZXJGdW5jcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgVGVtcGxhdGUuX2FwcGx5SG1yQ2hhbmdlcygpO1xuICAgIH0pO1xuICB9XG59KSgpO1xuYFxuICB9XG5cbiAgcmV0dXJuIGBcblRlbXBsYXRlLmJvZHkuYWRkQ29udGVudCgke3JlbmRlckZ1bmNDb2RlfSk7XG5NZXRlb3Iuc3RhcnR1cChUZW1wbGF0ZS5ib2R5LnJlbmRlclRvRG9jdW1lbnQpO1xuYDtcbn1cbiIsImltcG9ydCB7IFNwYWNlYmFyc0NvbXBpbGVyIH0gZnJvbSAnbWV0ZW9yL3NwYWNlYmFycy1jb21waWxlcic7XG5pbXBvcnQgeyBnZW5lcmF0ZUJvZHlKUywgZ2VuZXJhdGVUZW1wbGF0ZUpTIH0gZnJvbSAnLi9jb2RlLWdlbmVyYXRpb24nO1xuaW1wb3J0IHsgdGhyb3dDb21waWxlRXJyb3IgfSBmcm9tICcuL3Rocm93LWNvbXBpbGUtZXJyb3InO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZVRhZ3NXaXRoU3BhY2ViYXJzKHRhZ3MsIGhtckF2YWlsYWJsZSkge1xuICB2YXIgaGFuZGxlciA9IG5ldyBTcGFjZWJhcnNUYWdDb21waWxlcigpO1xuXG4gIHRhZ3MuZm9yRWFjaCgodGFnKSA9PiB7XG4gICAgaGFuZGxlci5hZGRUYWdUb1Jlc3VsdHModGFnLCBobXJBdmFpbGFibGUpO1xuICB9KTtcblxuICByZXR1cm4gaGFuZGxlci5nZXRSZXN1bHRzKCk7XG59XG5cbmNsYXNzIFNwYWNlYmFyc1RhZ0NvbXBpbGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5yZXN1bHRzID0ge1xuICAgICAgaGVhZDogJycsXG4gICAgICBib2R5OiAnJyxcbiAgICAgIGpzOiAnJyxcbiAgICAgIGJvZHlBdHRyczoge31cbiAgICB9O1xuICB9XG5cbiAgZ2V0UmVzdWx0cygpIHtcbiAgICByZXR1cm4gdGhpcy5yZXN1bHRzO1xuICB9XG5cbiAgYWRkVGFnVG9SZXN1bHRzKHRhZywgaG1yQXZhaWxhYmxlKSB7XG4gICAgdGhpcy50YWcgPSB0YWc7XG5cbiAgICAvLyBkbyB3ZSBoYXZlIDEgb3IgbW9yZSBhdHRyaWJ1dGVzP1xuICAgIGNvbnN0IGhhc0F0dHJpYnMgPSAhIF8uaXNFbXB0eSh0aGlzLnRhZy5hdHRyaWJzKTtcblxuICAgIGlmICh0aGlzLnRhZy50YWdOYW1lID09PSBcImhlYWRcIikge1xuICAgICAgaWYgKGhhc0F0dHJpYnMpIHtcbiAgICAgICAgdGhpcy50aHJvd0NvbXBpbGVFcnJvcihcIkF0dHJpYnV0ZXMgb24gPGhlYWQ+IG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVzdWx0cy5oZWFkICs9IHRoaXMudGFnLmNvbnRlbnRzO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgLy8gPGJvZHk+IG9yIDx0ZW1wbGF0ZT5cblxuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy50YWcudGFnTmFtZSA9PT0gXCJ0ZW1wbGF0ZVwiKSB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLnRhZy5hdHRyaWJzLm5hbWU7XG5cbiAgICAgICAgaWYgKCEgbmFtZSkge1xuICAgICAgICAgIHRoaXMudGhyb3dDb21waWxlRXJyb3IoXCJUZW1wbGF0ZSBoYXMgbm8gJ25hbWUnIGF0dHJpYnV0ZVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChTcGFjZWJhcnNDb21waWxlci5pc1Jlc2VydmVkTmFtZShuYW1lKSkge1xuICAgICAgICAgIHRoaXMudGhyb3dDb21waWxlRXJyb3IoYFRlbXBsYXRlIGNhbid0IGJlIG5hbWVkIFwiJHtuYW1lfVwiYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3aGl0ZXNwYWNlID0gdGhpcy50YWcuYXR0cmlicy53aGl0ZXNwYWNlIHx8ICcnO1xuXG4gICAgICAgIGNvbnN0IHJlbmRlckZ1bmNDb2RlID0gU3BhY2ViYXJzQ29tcGlsZXIuY29tcGlsZSh0aGlzLnRhZy5jb250ZW50cywge1xuICAgICAgICAgIHdoaXRlc3BhY2UsXG4gICAgICAgICAgaXNUZW1wbGF0ZTogdHJ1ZSxcbiAgICAgICAgICBzb3VyY2VOYW1lOiBgVGVtcGxhdGUgXCIke25hbWV9XCJgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucmVzdWx0cy5qcyArPSBnZW5lcmF0ZVRlbXBsYXRlSlMoXG4gICAgICAgICAgbmFtZSwgcmVuZGVyRnVuY0NvZGUsIGhtckF2YWlsYWJsZSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMudGFnLnRhZ05hbWUgPT09IFwiYm9keVwiKSB7XG4gICAgICAgIGNvbnN0IHsgd2hpdGVzcGFjZSA9ICcnLCAuLi5hdHRyaWJzIH0gPSB0aGlzLnRhZy5hdHRyaWJzO1xuICAgICAgICB0aGlzLmFkZEJvZHlBdHRycyhhdHRyaWJzKTtcblxuICAgICAgICBjb25zdCByZW5kZXJGdW5jQ29kZSA9IFNwYWNlYmFyc0NvbXBpbGVyLmNvbXBpbGUodGhpcy50YWcuY29udGVudHMsIHtcbiAgICAgICAgICB3aGl0ZXNwYWNlLFxuICAgICAgICAgIGlzQm9keTogdHJ1ZSxcbiAgICAgICAgICBzb3VyY2VOYW1lOiBcIjxib2R5PlwiXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdlIG1heSBiZSBvbmUgb2YgbWFueSBgPGJvZHk+YCB0YWdzLlxuICAgICAgICB0aGlzLnJlc3VsdHMuanMgKz0gZ2VuZXJhdGVCb2R5SlMocmVuZGVyRnVuY0NvZGUsIGhtckF2YWlsYWJsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRocm93Q29tcGlsZUVycm9yKFwiRXhwZWN0ZWQgPHRlbXBsYXRlPiwgPGhlYWQ+LCBvciA8Ym9keT4gdGFnIGluIHRlbXBsYXRlIGZpbGVcIiwgdGFnU3RhcnRJbmRleCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUuc2Nhbm5lcikge1xuICAgICAgICAvLyBUaGUgZXJyb3IgY2FtZSBmcm9tIFNwYWNlYmFyc1xuICAgICAgICB0aGlzLnRocm93Q29tcGlsZUVycm9yKGUubWVzc2FnZSwgdGhpcy50YWcuY29udGVudHNTdGFydEluZGV4ICsgZS5vZmZzZXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhZGRCb2R5QXR0cnMoYXR0cnMpIHtcbiAgICBPYmplY3Qua2V5cyhhdHRycykuZm9yRWFjaCgoYXR0cikgPT4ge1xuICAgICAgY29uc3QgdmFsID0gYXR0cnNbYXR0cl07XG5cbiAgICAgIC8vIFRoaXMgY2hlY2sgaXMgZm9yIGNvbmZsaWN0aW5nIGJvZHkgYXR0cmlidXRlcyBpbiB0aGUgc2FtZSBmaWxlO1xuICAgICAgLy8gd2UgY2hlY2sgYWNyb3NzIG11bHRpcGxlIGZpbGVzIGluIGNhY2hpbmctaHRtbC1jb21waWxlciB1c2luZyB0aGVcbiAgICAgIC8vIGF0dHJpYnV0ZXMgb24gcmVzdWx0cy5ib2R5QXR0cnNcbiAgICAgIGlmICh0aGlzLnJlc3VsdHMuYm9keUF0dHJzLmhhc093blByb3BlcnR5KGF0dHIpICYmIHRoaXMucmVzdWx0cy5ib2R5QXR0cnNbYXR0cl0gIT09IHZhbCkge1xuICAgICAgICB0aGlzLnRocm93Q29tcGlsZUVycm9yKFxuICAgICAgICAgIGA8Ym9keT4gZGVjbGFyYXRpb25zIGhhdmUgY29uZmxpY3RpbmcgdmFsdWVzIGZvciB0aGUgJyR7YXR0cn0nIGF0dHJpYnV0ZS5gKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXN1bHRzLmJvZHlBdHRyc1thdHRyXSA9IHZhbDtcbiAgICB9KTtcbiAgfVxuXG4gIHRocm93Q29tcGlsZUVycm9yKG1lc3NhZ2UsIG92ZXJyaWRlSW5kZXgpIHtcbiAgICB0aHJvd0NvbXBpbGVFcnJvcih0aGlzLnRhZywgbWVzc2FnZSwgb3ZlcnJpZGVJbmRleCk7XG4gIH1cbn1cbiIsImltcG9ydCB7IENvbXBpbGVFcnJvciB9IGZyb20gJy4vdGhyb3ctY29tcGlsZS1lcnJvcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBzY2FuSHRtbEZvclRhZ3Mob3B0aW9ucykge1xuICBjb25zdCBzY2FuID0gbmV3IEh0bWxTY2FuKG9wdGlvbnMpO1xuICByZXR1cm4gc2Nhbi5nZXRUYWdzKCk7XG59XG5cbi8qKlxuICogU2NhbiBhbiBIVE1MIGZpbGUgZm9yIHRvcC1sZXZlbCB0YWdzIGFuZCBleHRyYWN0IHRoZWlyIGNvbnRlbnRzLiBQYXNzIHRoZW0gdG9cbiAqIGEgdGFnIGhhbmRsZXIgKGFuIG9iamVjdCB3aXRoIGEgaGFuZGxlVGFnIG1ldGhvZClcbiAqXG4gKiBUaGlzIGlzIGEgcHJpbWl0aXZlLCByZWdleC1iYXNlZCBzY2FubmVyLiAgSXQgc2NhbnNcbiAqIHRvcC1sZXZlbCB0YWdzLCB3aGljaCBhcmUgYWxsb3dlZCB0byBoYXZlIGF0dHJpYnV0ZXMsXG4gKiBhbmQgaWdub3JlcyB0b3AtbGV2ZWwgSFRNTCBjb21tZW50cy5cbiAqL1xuY2xhc3MgSHRtbFNjYW4ge1xuICAvKipcbiAgICogSW5pdGlhbGl6ZSBhbmQgcnVuIGEgc2NhbiBvZiBhIHNpbmdsZSBmaWxlXG4gICAqIEBwYXJhbSAge1N0cmluZ30gc291cmNlTmFtZSBUaGUgZmlsZW5hbWUsIHVzZWQgaW4gZXJyb3JzIG9ubHlcbiAgICogQHBhcmFtICB7U3RyaW5nfSBjb250ZW50cyAgIFRoZSBjb250ZW50cyBvZiB0aGUgZmlsZVxuICAgKiBAcGFyYW0gIHtTdHJpbmdbXX0gdGFnTmFtZXMgQW4gYXJyYXkgb2YgdGFnIG5hbWVzIHRoYXQgYXJlIGFjY2VwdGVkIGF0IHRoZVxuICAgKiB0b3AgbGV2ZWwuIElmIGFueSBvdGhlciB0YWcgaXMgZW5jb3VudGVyZWQsIGFuIGVycm9yIGlzIHRocm93bi5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHtcbiAgICAgICAgc291cmNlTmFtZSxcbiAgICAgICAgY29udGVudHMsXG4gICAgICAgIHRhZ05hbWVzXG4gICAgICB9KSB7XG4gICAgdGhpcy5zb3VyY2VOYW1lID0gc291cmNlTmFtZTtcbiAgICB0aGlzLmNvbnRlbnRzID0gY29udGVudHM7XG4gICAgdGhpcy50YWdOYW1lcyA9IHRhZ05hbWVzO1xuXG4gICAgdGhpcy5yZXN0ID0gY29udGVudHM7XG4gICAgdGhpcy5pbmRleCA9IDA7XG5cbiAgICB0aGlzLnRhZ3MgPSBbXTtcblxuICAgIGNvbnN0IHRhZ05hbWVSZWdleCA9IHRoaXMudGFnTmFtZXMuam9pbihcInxcIik7XG4gICAgY29uc3Qgb3BlblRhZ1JlZ2V4ID0gbmV3IFJlZ0V4cChgXigoPCgke3RhZ05hbWVSZWdleH0pXFxcXGIpfCg8IS0tKXwoPCFET0NUWVBFfHt7ISl8JClgLCBcImlcIik7XG5cbiAgICB3aGlsZSAodGhpcy5yZXN0KSB7XG4gICAgICAvLyBza2lwIHdoaXRlc3BhY2UgZmlyc3QgKGZvciBiZXR0ZXIgbGluZSBudW1iZXJzKVxuICAgICAgdGhpcy5hZHZhbmNlKHRoaXMucmVzdC5tYXRjaCgvXlxccyovKVswXS5sZW5ndGgpO1xuXG4gICAgICBjb25zdCBtYXRjaCA9IG9wZW5UYWdSZWdleC5leGVjKHRoaXMucmVzdCk7XG5cbiAgICAgIGlmICghIG1hdGNoKSB7XG4gICAgICAgIHRoaXMudGhyb3dDb21waWxlRXJyb3IoYEV4cGVjdGVkIG9uZSBvZjogPCR7dGhpcy50YWdOYW1lcy5qb2luKCc+LCA8Jyl9PmApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaFRva2VuID0gbWF0Y2hbMV07XG4gICAgICBjb25zdCBtYXRjaFRva2VuVGFnTmFtZSA9ICBtYXRjaFszXTtcbiAgICAgIGNvbnN0IG1hdGNoVG9rZW5Db21tZW50ID0gbWF0Y2hbNF07XG4gICAgICBjb25zdCBtYXRjaFRva2VuVW5zdXBwb3J0ZWQgPSBtYXRjaFs1XTtcblxuICAgICAgY29uc3QgdGFnU3RhcnRJbmRleCA9IHRoaXMuaW5kZXg7XG4gICAgICB0aGlzLmFkdmFuY2UobWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGgpO1xuXG4gICAgICBpZiAoISBtYXRjaFRva2VuKSB7XG4gICAgICAgIGJyZWFrOyAvLyBtYXRjaGVkICQgKGVuZCBvZiBmaWxlKVxuICAgICAgfVxuXG4gICAgICBpZiAobWF0Y2hUb2tlbkNvbW1lbnQgPT09ICc8IS0tJykge1xuICAgICAgICAvLyB0b3AtbGV2ZWwgSFRNTCBjb21tZW50XG4gICAgICAgIGNvbnN0IGNvbW1lbnRFbmQgPSAvLS1cXHMqPi8uZXhlYyh0aGlzLnJlc3QpO1xuICAgICAgICBpZiAoISBjb21tZW50RW5kKVxuICAgICAgICAgIHRoaXMudGhyb3dDb21waWxlRXJyb3IoXCJ1bmNsb3NlZCBIVE1MIGNvbW1lbnQgaW4gdGVtcGxhdGUgZmlsZVwiKTtcbiAgICAgICAgdGhpcy5hZHZhbmNlKGNvbW1lbnRFbmQuaW5kZXggKyBjb21tZW50RW5kWzBdLmxlbmd0aCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobWF0Y2hUb2tlblVuc3VwcG9ydGVkKSB7XG4gICAgICAgIHN3aXRjaCAobWF0Y2hUb2tlblVuc3VwcG9ydGVkLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgY2FzZSAnPCFkb2N0eXBlJzpcbiAgICAgICAgICB0aGlzLnRocm93Q29tcGlsZUVycm9yKFxuICAgICAgICAgICAgXCJDYW4ndCBzZXQgRE9DVFlQRSBoZXJlLiAgKE1ldGVvciBzZXRzIDwhRE9DVFlQRSBodG1sPiBmb3IgeW91KVwiKTtcbiAgICAgICAgY2FzZSAne3shJzpcbiAgICAgICAgICB0aGlzLnRocm93Q29tcGlsZUVycm9yKFxuICAgICAgICAgICAgXCJDYW4ndCB1c2UgJ3t7ISB9fScgb3V0c2lkZSBhIHRlbXBsYXRlLiAgVXNlICc8IS0tIC0tPicuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50aHJvd0NvbXBpbGVFcnJvcigpO1xuICAgICAgfVxuXG4gICAgICAvLyBvdGhlcndpc2UsIGEgPHRhZz5cbiAgICAgIGNvbnN0IHRhZ05hbWUgPSBtYXRjaFRva2VuVGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgY29uc3QgdGFnQXR0cmlicyA9IHt9OyAvLyBiYXJlIG5hbWUgLT4gdmFsdWUgZGljdFxuICAgICAgY29uc3QgdGFnUGFydFJlZ2V4ID0gL15cXHMqKCgoW2EtekEtWjAtOTpfLV0rKVxccyo9XFxzKihbXCInXSkoLio/KVxcNCl8KD4pKS87XG5cbiAgICAgIC8vIHJlYWQgYXR0cmlidXRlc1xuICAgICAgbGV0IGF0dHI7XG4gICAgICB3aGlsZSAoKGF0dHIgPSB0YWdQYXJ0UmVnZXguZXhlYyh0aGlzLnJlc3QpKSkge1xuICAgICAgICBjb25zdCBhdHRyVG9rZW4gPSBhdHRyWzFdO1xuICAgICAgICBjb25zdCBhdHRyS2V5ID0gYXR0clszXTtcbiAgICAgICAgbGV0IGF0dHJWYWx1ZSA9IGF0dHJbNV07XG4gICAgICAgIHRoaXMuYWR2YW5jZShhdHRyLmluZGV4ICsgYXR0clswXS5sZW5ndGgpO1xuXG4gICAgICAgIGlmIChhdHRyVG9rZW4gPT09ICc+Jykge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gWFhYIHdlIGRvbid0IEhUTUwgdW5lc2NhcGUgdGhlIGF0dHJpYnV0ZSB2YWx1ZVxuICAgICAgICAvLyAoZS5nLiB0byBhbGxvdyBcImFiY2QmcXVvdDtlZmdcIikgb3IgcHJvdGVjdCBhZ2FpbnN0XG4gICAgICAgIC8vIGNvbGxpc2lvbnMgd2l0aCBtZXRob2RzIG9mIHRhZ0F0dHJpYnMgKGUuZy4gZm9yXG4gICAgICAgIC8vIGEgcHJvcGVydHkgbmFtZWQgdG9TdHJpbmcpXG4gICAgICAgIGF0dHJWYWx1ZSA9IGF0dHJWYWx1ZS5tYXRjaCgvXlxccyooW1xcc1xcU10qPylcXHMqJC8pWzFdOyAvLyB0cmltXG4gICAgICAgIHRhZ0F0dHJpYnNbYXR0cktleV0gPSBhdHRyVmFsdWU7XG4gICAgICB9XG5cbiAgICAgIGlmICghIGF0dHIpIHsgLy8gZGlkbid0IGVuZCBvbiAnPidcbiAgICAgICAgdGhpcy50aHJvd0NvbXBpbGVFcnJvcihcIlBhcnNlIGVycm9yIGluIHRhZ1wiKTtcbiAgICAgIH1cblxuICAgICAgLy8gZmluZCA8L3RhZz5cbiAgICAgIGNvbnN0IGVuZCA9IChuZXcgUmVnRXhwKCc8LycrdGFnTmFtZSsnXFxcXHMqPicsICdpJykpLmV4ZWModGhpcy5yZXN0KTtcbiAgICAgIGlmICghIGVuZCkge1xuICAgICAgICB0aGlzLnRocm93Q29tcGlsZUVycm9yKFwidW5jbG9zZWQgPFwiK3RhZ05hbWUrXCI+XCIpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0YWdDb250ZW50cyA9IHRoaXMucmVzdC5zbGljZSgwLCBlbmQuaW5kZXgpO1xuICAgICAgY29uc3QgY29udGVudHNTdGFydEluZGV4ID0gdGhpcy5pbmRleDtcblxuICAgICAgLy8gdHJpbSB0aGUgdGFnIGNvbnRlbnRzLlxuICAgICAgLy8gdGhpcyBpcyBhIGNvdXJ0ZXN5IGFuZCBpcyBhbHNvIHJlbGllZCBvbiBieSBzb21lIHVuaXQgdGVzdHMuXG4gICAgICB2YXIgbSA9IHRhZ0NvbnRlbnRzLm1hdGNoKC9eKFsgXFx0XFxyXFxuXSopKFtcXHNcXFNdKj8pWyBcXHRcXHJcXG5dKiQvKTtcbiAgICAgIGNvbnN0IHRyaW1tZWRDb250ZW50c1N0YXJ0SW5kZXggPSBjb250ZW50c1N0YXJ0SW5kZXggKyBtWzFdLmxlbmd0aDtcbiAgICAgIGNvbnN0IHRyaW1tZWRUYWdDb250ZW50cyA9IG1bMl07XG5cbiAgICAgIGNvbnN0IHRhZyA9IHtcbiAgICAgICAgdGFnTmFtZTogdGFnTmFtZSxcbiAgICAgICAgYXR0cmliczogdGFnQXR0cmlicyxcbiAgICAgICAgY29udGVudHM6IHRyaW1tZWRUYWdDb250ZW50cyxcbiAgICAgICAgY29udGVudHNTdGFydEluZGV4OiB0cmltbWVkQ29udGVudHNTdGFydEluZGV4LFxuICAgICAgICB0YWdTdGFydEluZGV4OiB0YWdTdGFydEluZGV4LFxuICAgICAgICBmaWxlQ29udGVudHM6IHRoaXMuY29udGVudHMsXG4gICAgICAgIHNvdXJjZU5hbWU6IHRoaXMuc291cmNlTmFtZVxuICAgICAgfTtcblxuICAgICAgLy8gc2F2ZSB0aGUgdGFnXG4gICAgICB0aGlzLnRhZ3MucHVzaCh0YWcpO1xuXG4gICAgICAvLyBhZHZhbmNlIGFmdGVyd2FyZHMsIHNvIHRoYXQgbGluZSBudW1iZXJzIGluIGVycm9ycyBhcmUgY29ycmVjdFxuICAgICAgdGhpcy5hZHZhbmNlKGVuZC5pbmRleCArIGVuZFswXS5sZW5ndGgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZHZhbmNlIHRoZSBwYXJzZXJcbiAgICogQHBhcmFtICB7TnVtYmVyfSBhbW91bnQgVGhlIGFtb3VudCBvZiBjaGFyYWN0ZXJzIHRvIGFkdmFuY2VcbiAgICovXG4gIGFkdmFuY2UoYW1vdW50KSB7XG4gICAgdGhpcy5yZXN0ID0gdGhpcy5yZXN0LnN1YnN0cmluZyhhbW91bnQpO1xuICAgIHRoaXMuaW5kZXggKz0gYW1vdW50O1xuICB9XG5cbiAgdGhyb3dDb21waWxlRXJyb3IobXNnLCBvdmVycmlkZUluZGV4KSB7XG4gICAgY29uc3QgZmluYWxJbmRleCA9ICh0eXBlb2Ygb3ZlcnJpZGVJbmRleCA9PT0gJ251bWJlcicgPyBvdmVycmlkZUluZGV4IDogdGhpcy5pbmRleCk7XG5cbiAgICBjb25zdCBlcnIgPSBuZXcgQ29tcGlsZUVycm9yKCk7XG4gICAgZXJyLm1lc3NhZ2UgPSBtc2cgfHwgXCJiYWQgZm9ybWF0dGluZyBpbiB0ZW1wbGF0ZSBmaWxlXCI7XG4gICAgZXJyLmZpbGUgPSB0aGlzLnNvdXJjZU5hbWU7XG4gICAgZXJyLmxpbmUgPSB0aGlzLmNvbnRlbnRzLnN1YnN0cmluZygwLCBmaW5hbEluZGV4KS5zcGxpdCgnXFxuJykubGVuZ3RoO1xuXG4gICAgdGhyb3cgZXJyO1xuICB9XG5cbiAgdGhyb3dCb2R5QXR0cnNFcnJvcihtc2cpIHtcbiAgICB0aGlzLnBhcnNlRXJyb3IobXNnKTtcbiAgfVxuXG4gIGdldFRhZ3MoKSB7XG4gICAgcmV0dXJuIHRoaXMudGFncztcbiAgfVxufVxuIiwiZXhwb3J0IGNsYXNzIENvbXBpbGVFcnJvciB7fVxuXG5leHBvcnQgZnVuY3Rpb24gdGhyb3dDb21waWxlRXJyb3IodGFnLCBtZXNzYWdlLCBvdmVycmlkZUluZGV4KSB7XG4gIGNvbnN0IGZpbmFsSW5kZXggPSAodHlwZW9mIG92ZXJyaWRlSW5kZXggPT09ICdudW1iZXInID9cbiAgICBvdmVycmlkZUluZGV4IDogdGFnLnRhZ1N0YXJ0SW5kZXgpO1xuXG4gIGNvbnN0IGVyciA9IG5ldyBDb21waWxlRXJyb3IoKTtcbiAgZXJyLm1lc3NhZ2UgPSBtZXNzYWdlIHx8IFwiYmFkIGZvcm1hdHRpbmcgaW4gdGVtcGxhdGUgZmlsZVwiO1xuICBlcnIuZmlsZSA9IHRhZy5zb3VyY2VOYW1lO1xuICBlcnIubGluZSA9IHRhZy5maWxlQ29udGVudHMuc3Vic3RyaW5nKDAsIGZpbmFsSW5kZXgpLnNwbGl0KCdcXG4nKS5sZW5ndGg7XG4gIHRocm93IGVycjtcbn1cbiJdfQ==
