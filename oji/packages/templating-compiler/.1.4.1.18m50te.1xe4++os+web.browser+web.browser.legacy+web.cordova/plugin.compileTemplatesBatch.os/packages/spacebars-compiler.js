(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var HTML = Package.htmljs.HTML;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"spacebars-compiler":{"preamble.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/spacebars-compiler/preamble.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  SpacebarsCompiler: () => SpacebarsCompiler
});
let CodeGen, builtInBlockHelpers, isReservedName;
module.link("./codegen", {
  CodeGen(v) {
    CodeGen = v;
  },

  builtInBlockHelpers(v) {
    builtInBlockHelpers = v;
  },

  isReservedName(v) {
    isReservedName = v;
  }

}, 0);
let optimize;
module.link("./optimizer", {
  optimize(v) {
    optimize = v;
  }

}, 1);
let parse, compile, codeGen, TemplateTagReplacer, beautify;
module.link("./compiler", {
  parse(v) {
    parse = v;
  },

  compile(v) {
    compile = v;
  },

  codeGen(v) {
    codeGen = v;
  },

  TemplateTagReplacer(v) {
    TemplateTagReplacer = v;
  },

  beautify(v) {
    beautify = v;
  }

}, 2);
let TemplateTag;
module.link("./templatetag", {
  TemplateTag(v) {
    TemplateTag = v;
  }

}, 3);
const SpacebarsCompiler = {
  CodeGen,
  _builtInBlockHelpers: builtInBlockHelpers,
  isReservedName,
  optimize,
  parse,
  compile,
  codeGen,
  _TemplateTagReplacer: TemplateTagReplacer,
  _beautify: beautify,
  TemplateTag
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"codegen.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/spacebars-compiler/codegen.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  CodeGen: () => CodeGen,
  builtInBlockHelpers: () => builtInBlockHelpers,
  isReservedName: () => isReservedName
});
let HTMLTools;
module.link("meteor/html-tools", {
  HTMLTools(v) {
    HTMLTools = v;
  }

}, 0);
let HTML;
module.link("meteor/htmljs", {
  HTML(v) {
    HTML = v;
  }

}, 1);
let BlazeTools;
module.link("meteor/blaze-tools", {
  BlazeTools(v) {
    BlazeTools = v;
  }

}, 2);
let codeGen;
module.link("./compiler", {
  codeGen(v) {
    codeGen = v;
  }

}, 3);

function CodeGen() {}

const builtInBlockHelpers = {
  'if': 'Blaze.If',
  'unless': 'Blaze.Unless',
  'with': 'Spacebars.With',
  'each': 'Blaze.Each',
  'let': 'Blaze.Let'
};
// Mapping of "macros" which, when preceded by `Template.`, expand
// to special code rather than following the lookup rules for dotted
// symbols.
var builtInTemplateMacros = {
  // `view` is a local variable defined in the generated render
  // function for the template in which `Template.contentBlock` or
  // `Template.elseBlock` is invoked.
  'contentBlock': 'view.templateContentBlock',
  'elseBlock': 'view.templateElseBlock',
  // Confusingly, this makes `{{> Template.dynamic}}` an alias
  // for `{{> __dynamic}}`, where "__dynamic" is the template that
  // implements the dynamic template feature.
  'dynamic': 'Template.__dynamic',
  'subscriptionsReady': 'view.templateInstance().subscriptionsReady()'
};
var additionalReservedNames = ["body", "toString", "instance", "constructor", "toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "__defineGetter__", "__lookupGetter__", "__defineSetter__", "__lookupSetter__", "__proto__", "dynamic", "registerHelper", "currentData", "parentData", "_migrateTemplate", "_applyHmrChanges", "__pendingReplacement"]; // A "reserved name" can't be used as a <template> name.  This
// function is used by the template file scanner.
//
// Note that the runtime imposes additional restrictions, for example
// banning the name "body" and names of built-in object properties
// like "toString".

function isReservedName(name) {
  return builtInBlockHelpers.hasOwnProperty(name) || builtInTemplateMacros.hasOwnProperty(name) || _.indexOf(additionalReservedNames, name) > -1;
}

var makeObjectLiteral = function (obj) {
  var parts = [];

  for (var k in obj) parts.push(BlazeTools.toObjectLiteralKey(k) + ': ' + obj[k]);

  return '{' + parts.join(', ') + '}';
};

_.extend(CodeGen.prototype, {
  codeGenTemplateTag: function (tag) {
    var self = this;

    if (tag.position === HTMLTools.TEMPLATE_TAG_POSITION.IN_START_TAG) {
      // Special dynamic attributes: `<div {{attrs}}>...`
      // only `tag.type === 'DOUBLE'` allowed (by earlier validation)
      return BlazeTools.EmitCode('function () { return ' + self.codeGenMustache(tag.path, tag.args, 'attrMustache') + '; }');
    } else {
      if (tag.type === 'DOUBLE' || tag.type === 'TRIPLE') {
        var code = self.codeGenMustache(tag.path, tag.args);

        if (tag.type === 'TRIPLE') {
          code = 'Spacebars.makeRaw(' + code + ')';
        }

        if (tag.position !== HTMLTools.TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {
          // Reactive attributes are already wrapped in a function,
          // and there's no fine-grained reactivity.
          // Anywhere else, we need to create a View.
          code = 'Blaze.View(' + BlazeTools.toJSLiteral('lookup:' + tag.path.join('.')) + ', ' + 'function () { return ' + code + '; })';
        }

        return BlazeTools.EmitCode(code);
      } else if (tag.type === 'INCLUSION' || tag.type === 'BLOCKOPEN') {
        var path = tag.path;
        var args = tag.args;

        if (tag.type === 'BLOCKOPEN' && builtInBlockHelpers.hasOwnProperty(path[0])) {
          // if, unless, with, each.
          //
          // If someone tries to do `{{> if}}`, we don't
          // get here, but an error is thrown when we try to codegen the path.
          // Note: If we caught these errors earlier, while scanning, we'd be able to
          // provide nice line numbers.
          if (path.length > 1) throw new Error("Unexpected dotted path beginning with " + path[0]);
          if (!args.length) throw new Error("#" + path[0] + " requires an argument");
          var dataCode = null; // #each has a special treatment as it features two different forms:
          // - {{#each people}}
          // - {{#each person in people}}

          if (path[0] === 'each' && args.length >= 2 && args[1][0] === 'PATH' && args[1][1].length && args[1][1][0] === 'in') {
            // minimum conditions are met for each-in.  now validate this
            // isn't some weird case.
            var eachUsage = "Use either {{#each items}} or " + "{{#each item in items}} form of #each.";
            var inArg = args[1];

            if (!(args.length >= 3 && inArg[1].length === 1)) {
              // we don't have at least 3 space-separated parts after #each, or
              // inArg doesn't look like ['PATH',['in']]
              throw new Error("Malformed #each. " + eachUsage);
            } // split out the variable name and sequence arguments


            var variableArg = args[0];

            if (!(variableArg[0] === "PATH" && variableArg[1].length === 1 && variableArg[1][0].replace(/\./g, ''))) {
              throw new Error("Bad variable name in #each");
            }

            var variable = variableArg[1][0];
            dataCode = 'function () { return { _sequence: ' + self.codeGenInclusionData(args.slice(2)) + ', _variable: ' + BlazeTools.toJSLiteral(variable) + ' }; }';
          } else if (path[0] === 'let') {
            var dataProps = {};

            _.each(args, function (arg) {
              if (arg.length !== 3) {
                // not a keyword arg (x=y)
                throw new Error("Incorrect form of #let");
              }

              var argKey = arg[2];
              dataProps[argKey] = 'function () { return Spacebars.call(' + self.codeGenArgValue(arg) + '); }';
            });

            dataCode = makeObjectLiteral(dataProps);
          }

          if (!dataCode) {
            // `args` must exist (tag.args.length > 0)
            dataCode = self.codeGenInclusionDataFunc(args) || 'null';
          } // `content` must exist


          var contentBlock = 'content' in tag ? self.codeGenBlock(tag.content) : null; // `elseContent` may not exist

          var elseContentBlock = 'elseContent' in tag ? self.codeGenBlock(tag.elseContent) : null;
          var callArgs = [dataCode, contentBlock];
          if (elseContentBlock) callArgs.push(elseContentBlock);
          return BlazeTools.EmitCode(builtInBlockHelpers[path[0]] + '(' + callArgs.join(', ') + ')');
        } else {
          var compCode = self.codeGenPath(path, {
            lookupTemplate: true
          });

          if (path.length > 1) {
            // capture reactivity
            compCode = 'function () { return Spacebars.call(' + compCode + '); }';
          }

          var dataCode = self.codeGenInclusionDataFunc(tag.args);
          var content = 'content' in tag ? self.codeGenBlock(tag.content) : null;
          var elseContent = 'elseContent' in tag ? self.codeGenBlock(tag.elseContent) : null;
          var includeArgs = [compCode];

          if (content) {
            includeArgs.push(content);
            if (elseContent) includeArgs.push(elseContent);
          }

          var includeCode = 'Spacebars.include(' + includeArgs.join(', ') + ')'; // calling convention compat -- set the data context around the
          // entire inclusion, so that if the name of the inclusion is
          // a helper function, it gets the data context in `this`.
          // This makes for a pretty confusing calling convention --
          // In `{{#foo bar}}`, `foo` is evaluated in the context of `bar`
          // -- but it's what we shipped for 0.8.0.  The rationale is that
          // `{{#foo bar}}` is sugar for `{{#with bar}}{{#foo}}...`.

          if (dataCode) {
            includeCode = 'Blaze._TemplateWith(' + dataCode + ', function () { return ' + includeCode + '; })';
          } // XXX BACK COMPAT - UI is the old name, Template is the new


          if ((path[0] === 'UI' || path[0] === 'Template') && (path[1] === 'contentBlock' || path[1] === 'elseBlock')) {
            // Call contentBlock and elseBlock in the appropriate scope
            includeCode = 'Blaze._InOuterTemplateScope(view, function () { return ' + includeCode + '; })';
          }

          return BlazeTools.EmitCode(includeCode);
        }
      } else if (tag.type === 'ESCAPE') {
        return tag.value;
      } else {
        // Can't get here; TemplateTag validation should catch any
        // inappropriate tag types that might come out of the parser.
        throw new Error("Unexpected template tag type: " + tag.type);
      }
    }
  },
  // `path` is an array of at least one string.
  //
  // If `path.length > 1`, the generated code may be reactive
  // (i.e. it may invalidate the current computation).
  //
  // No code is generated to call the result if it's a function.
  //
  // Options:
  //
  // - lookupTemplate {Boolean} If true, generated code also looks in
  //   the list of templates. (After helpers, before data context).
  //   Used when generating code for `{{> foo}}` or `{{#foo}}`. Only
  //   used for non-dotted paths.
  codeGenPath: function (path, opts) {
    if (builtInBlockHelpers.hasOwnProperty(path[0])) throw new Error("Can't use the built-in '" + path[0] + "' here"); // Let `{{#if Template.contentBlock}}` check whether this template was
    // invoked via inclusion or as a block helper, in addition to supporting
    // `{{> Template.contentBlock}}`.
    // XXX BACK COMPAT - UI is the old name, Template is the new

    if (path.length >= 2 && (path[0] === 'UI' || path[0] === 'Template') && builtInTemplateMacros.hasOwnProperty(path[1])) {
      if (path.length > 2) throw new Error("Unexpected dotted path beginning with " + path[0] + '.' + path[1]);
      return builtInTemplateMacros[path[1]];
    }

    var firstPathItem = BlazeTools.toJSLiteral(path[0]);
    var lookupMethod = 'lookup';
    if (opts && opts.lookupTemplate && path.length === 1) lookupMethod = 'lookupTemplate';
    var code = 'view.' + lookupMethod + '(' + firstPathItem + ')';

    if (path.length > 1) {
      code = 'Spacebars.dot(' + code + ', ' + _.map(path.slice(1), BlazeTools.toJSLiteral).join(', ') + ')';
    }

    return code;
  },
  // Generates code for an `[argType, argValue]` argument spec,
  // ignoring the third element (keyword argument name) if present.
  //
  // The resulting code may be reactive (in the case of a PATH of
  // more than one element) and is not wrapped in a closure.
  codeGenArgValue: function (arg) {
    var self = this;
    var argType = arg[0];
    var argValue = arg[1];
    var argCode;

    switch (argType) {
      case 'STRING':
      case 'NUMBER':
      case 'BOOLEAN':
      case 'NULL':
        argCode = BlazeTools.toJSLiteral(argValue);
        break;

      case 'PATH':
        argCode = self.codeGenPath(argValue);
        break;

      case 'EXPR':
        // The format of EXPR is ['EXPR', { type: 'EXPR', path: [...], args: { ... } }]
        argCode = self.codeGenMustache(argValue.path, argValue.args, 'dataMustache');
        break;

      default:
        // can't get here
        throw new Error("Unexpected arg type: " + argType);
    }

    return argCode;
  },
  // Generates a call to `Spacebars.fooMustache` on evaluated arguments.
  // The resulting code has no function literals and must be wrapped in
  // one for fine-grained reactivity.
  codeGenMustache: function (path, args, mustacheType) {
    var self = this;
    var nameCode = self.codeGenPath(path);
    var argCode = self.codeGenMustacheArgs(args);
    var mustache = mustacheType || 'mustache';
    return 'Spacebars.' + mustache + '(' + nameCode + (argCode ? ', ' + argCode.join(', ') : '') + ')';
  },
  // returns: array of source strings, or null if no
  // args at all.
  codeGenMustacheArgs: function (tagArgs) {
    var self = this;
    var kwArgs = null; // source -> source

    var args = null; // [source]
    // tagArgs may be null

    _.each(tagArgs, function (arg) {
      var argCode = self.codeGenArgValue(arg);

      if (arg.length > 2) {
        // keyword argument (represented as [type, value, name])
        kwArgs = kwArgs || {};
        kwArgs[arg[2]] = argCode;
      } else {
        // positional argument
        args = args || [];
        args.push(argCode);
      }
    }); // put kwArgs in options dictionary at end of args


    if (kwArgs) {
      args = args || [];
      args.push('Spacebars.kw(' + makeObjectLiteral(kwArgs) + ')');
    }

    return args;
  },
  codeGenBlock: function (content) {
    return codeGen(content);
  },
  codeGenInclusionData: function (args) {
    var self = this;

    if (!args.length) {
      // e.g. `{{#foo}}`
      return null;
    } else if (args[0].length === 3) {
      // keyword arguments only, e.g. `{{> point x=1 y=2}}`
      var dataProps = {};

      _.each(args, function (arg) {
        var argKey = arg[2];
        dataProps[argKey] = 'Spacebars.call(' + self.codeGenArgValue(arg) + ')';
      });

      return makeObjectLiteral(dataProps);
    } else if (args[0][0] !== 'PATH') {
      // literal first argument, e.g. `{{> foo "blah"}}`
      //
      // tag validation has confirmed, in this case, that there is only
      // one argument (`args.length === 1`)
      return self.codeGenArgValue(args[0]);
    } else if (args.length === 1) {
      // one argument, must be a PATH
      return 'Spacebars.call(' + self.codeGenPath(args[0][1]) + ')';
    } else {
      // Multiple positional arguments; treat them as a nested
      // "data mustache"
      return self.codeGenMustache(args[0][1], args.slice(1), 'dataMustache');
    }
  },
  codeGenInclusionDataFunc: function (args) {
    var self = this;
    var dataCode = self.codeGenInclusionData(args);

    if (dataCode) {
      return 'function () { return ' + dataCode + '; }';
    } else {
      return null;
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"compiler.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/spacebars-compiler/compiler.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  parse: () => parse,
  compile: () => compile,
  TemplateTagReplacer: () => TemplateTagReplacer,
  codeGen: () => codeGen,
  beautify: () => beautify
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTMLTools;
module.link("meteor/html-tools", {
  HTMLTools(v) {
    HTMLTools = v;
  }

}, 1);
let HTML;
module.link("meteor/htmljs", {
  HTML(v) {
    HTML = v;
  }

}, 2);
let BlazeTools;
module.link("meteor/blaze-tools", {
  BlazeTools(v) {
    BlazeTools = v;
  }

}, 3);
let CodeGen;
module.link("./codegen", {
  CodeGen(v) {
    CodeGen = v;
  }

}, 4);
let optimize;
module.link("./optimizer", {
  optimize(v) {
    optimize = v;
  }

}, 5);
let ReactComponentSiblingForbidder;
module.link("./react", {
  ReactComponentSiblingForbidder(v) {
    ReactComponentSiblingForbidder = v;
  }

}, 6);
let TemplateTag;
module.link("./templatetag", {
  TemplateTag(v) {
    TemplateTag = v;
  }

}, 7);
let removeWhitespace;
module.link("./whitespace", {
  removeWhitespace(v) {
    removeWhitespace = v;
  }

}, 8);
var UglifyJSMinify = null;

if (Meteor.isServer) {
  UglifyJSMinify = Npm.require('uglify-js').minify;
}

function parse(input) {
  return HTMLTools.parseFragment(input, {
    getTemplateTag: TemplateTag.parseCompleteTag
  });
}

function compile(input, options) {
  var tree = parse(input);
  return codeGen(tree, options);
}

const TemplateTagReplacer = HTML.TransformingVisitor.extend();
TemplateTagReplacer.def({
  visitObject: function (x) {
    if (x instanceof HTMLTools.TemplateTag) {
      // Make sure all TemplateTags in attributes have the right
      // `.position` set on them.  This is a bit of a hack
      // (we shouldn't be mutating that here), but it allows
      // cleaner codegen of "synthetic" attributes like TEXTAREA's
      // "value", where the template tags were originally not
      // in an attribute.
      if (this.inAttributeValue) x.position = HTMLTools.TEMPLATE_TAG_POSITION.IN_ATTRIBUTE;
      return this.codegen.codeGenTemplateTag(x);
    }

    return HTML.TransformingVisitor.prototype.visitObject.call(this, x);
  },
  visitAttributes: function (attrs) {
    if (attrs instanceof HTMLTools.TemplateTag) return this.codegen.codeGenTemplateTag(attrs); // call super (e.g. for case where `attrs` is an array)

    return HTML.TransformingVisitor.prototype.visitAttributes.call(this, attrs);
  },
  visitAttribute: function (name, value, tag) {
    this.inAttributeValue = true;
    var result = this.visit(value);
    this.inAttributeValue = false;

    if (result !== value) {
      // some template tags must have been replaced, because otherwise
      // we try to keep things `===` when transforming.  Wrap the code
      // in a function as per the rules.  You can't have
      // `{id: Blaze.View(...)}` as an attributes dict because the View
      // would be rendered more than once; you need to wrap it in a function
      // so that it's a different View each time.
      return BlazeTools.EmitCode(this.codegen.codeGenBlock(result));
    }

    return result;
  }
});

function codeGen(parseTree, options) {
  // is this a template, rather than a block passed to
  // a block helper, say
  var isTemplate = options && options.isTemplate;
  var isBody = options && options.isBody;
  var whitespace = options && options.whitespace;
  var sourceName = options && options.sourceName;
  var tree = parseTree; // The flags `isTemplate` and `isBody` are kind of a hack.

  if (isTemplate || isBody) {
    if (typeof whitespace === 'string' && whitespace.toLowerCase() === 'strip') {
      tree = removeWhitespace(tree);
    } // optimizing fragments would require being smarter about whether we are
    // in a TEXTAREA, say.


    tree = optimize(tree);
  } // throws an error if using `{{> React}}` with siblings


  new ReactComponentSiblingForbidder({
    sourceName: sourceName
  }).visit(tree);
  var codegen = new CodeGen();
  tree = new TemplateTagReplacer({
    codegen: codegen
  }).visit(tree);
  var code = '(function () { ';

  if (isTemplate || isBody) {
    code += 'var view = this; ';
  }

  code += 'return ';
  code += BlazeTools.toJS(tree);
  code += '; })';
  code = beautify(code);
  return code;
}

function beautify(code) {
  if (!UglifyJSMinify) {
    return code;
  }

  var result = UglifyJSMinify(code, {
    fromString: true,
    mangle: false,
    compress: false,
    output: {
      beautify: true,
      indent_level: 2,
      width: 80
    }
  });
  var output = result.code; // Uglify interprets our expression as a statement and may add a semicolon.
  // Strip trailing semicolon.

  output = output.replace(/;$/, '');
  return output;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"optimizer.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/spacebars-compiler/optimizer.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  toRaw: () => toRaw,
  TreeTransformer: () => TreeTransformer,
  optimize: () => optimize
});
let HTMLTools;
module.link("meteor/html-tools", {
  HTMLTools(v) {
    HTMLTools = v;
  }

}, 0);
let HTML;
module.link("meteor/htmljs", {
  HTML(v) {
    HTML = v;
  }

}, 1);

// Optimize parts of an HTMLjs tree into raw HTML strings when they don't
// contain template tags.
var constant = function (value) {
  return function () {
    return value;
  };
};

var OPTIMIZABLE = {
  NONE: 0,
  PARTS: 1,
  FULL: 2
}; // We can only turn content into an HTML string if it contains no template
// tags and no "tricky" HTML tags.  If we can optimize the entire content
// into a string, we return OPTIMIZABLE.FULL.  If the we are given an
// unoptimizable node, we return OPTIMIZABLE.NONE.  If we are given a tree
// that contains an unoptimizable node somewhere, we return OPTIMIZABLE.PARTS.
//
// For example, we always create SVG elements programmatically, since SVG
// doesn't have innerHTML.  If we are given an SVG element, we return NONE.
// However, if we are given a big tree that contains SVG somewhere, we
// return PARTS so that the optimizer can descend into the tree and optimize
// other parts of it.

var CanOptimizeVisitor = HTML.Visitor.extend();
CanOptimizeVisitor.def({
  visitNull: constant(OPTIMIZABLE.FULL),
  visitPrimitive: constant(OPTIMIZABLE.FULL),
  visitComment: constant(OPTIMIZABLE.FULL),
  visitCharRef: constant(OPTIMIZABLE.FULL),
  visitRaw: constant(OPTIMIZABLE.FULL),
  visitObject: constant(OPTIMIZABLE.NONE),
  visitFunction: constant(OPTIMIZABLE.NONE),
  visitArray: function (x) {
    for (var i = 0; i < x.length; i++) if (this.visit(x[i]) !== OPTIMIZABLE.FULL) return OPTIMIZABLE.PARTS;

    return OPTIMIZABLE.FULL;
  },
  visitTag: function (tag) {
    var tagName = tag.tagName;

    if (tagName === 'textarea') {
      // optimizing into a TEXTAREA's RCDATA would require being a little
      // more clever.
      return OPTIMIZABLE.NONE;
    } else if (tagName === 'script') {
      // script tags don't work when rendered from strings
      return OPTIMIZABLE.NONE;
    } else if (!(HTML.isKnownElement(tagName) && !HTML.isKnownSVGElement(tagName))) {
      // foreign elements like SVG can't be stringified for innerHTML.
      return OPTIMIZABLE.NONE;
    } else if (tagName === 'table') {
      // Avoid ever producing HTML containing `<table><tr>...`, because the
      // browser will insert a TBODY.  If we just `createElement("table")` and
      // `createElement("tr")`, on the other hand, no TBODY is necessary
      // (assuming IE 8+).
      return OPTIMIZABLE.PARTS;
    } else if (tagName === 'tr') {
      return OPTIMIZABLE.PARTS;
    }

    var children = tag.children;

    for (var i = 0; i < children.length; i++) if (this.visit(children[i]) !== OPTIMIZABLE.FULL) return OPTIMIZABLE.PARTS;

    if (this.visitAttributes(tag.attrs) !== OPTIMIZABLE.FULL) return OPTIMIZABLE.PARTS;
    return OPTIMIZABLE.FULL;
  },
  visitAttributes: function (attrs) {
    if (attrs) {
      var isArray = HTML.isArray(attrs);

      for (var i = 0; i < (isArray ? attrs.length : 1); i++) {
        var a = isArray ? attrs[i] : attrs;
        if (typeof a !== 'object' || a instanceof HTMLTools.TemplateTag) return OPTIMIZABLE.PARTS;

        for (var k in a) if (this.visit(a[k]) !== OPTIMIZABLE.FULL) return OPTIMIZABLE.PARTS;
      }
    }

    return OPTIMIZABLE.FULL;
  }
});

var getOptimizability = function (content) {
  return new CanOptimizeVisitor().visit(content);
};

function toRaw(x) {
  return HTML.Raw(HTML.toHTML(x));
}

const TreeTransformer = HTML.TransformingVisitor.extend();
TreeTransformer.def({
  visitAttributes: function (attrs
  /*, ...*/
  ) {
    // pass template tags through by default
    if (attrs instanceof HTMLTools.TemplateTag) return attrs;
    return HTML.TransformingVisitor.prototype.visitAttributes.apply(this, arguments);
  }
}); // Replace parts of the HTMLjs tree that have no template tags (or
// tricky HTML tags) with HTML.Raw objects containing raw HTML.

var OptimizingVisitor = TreeTransformer.extend();
OptimizingVisitor.def({
  visitNull: toRaw,
  visitPrimitive: toRaw,
  visitComment: toRaw,
  visitCharRef: toRaw,
  visitArray: function (array) {
    var optimizability = getOptimizability(array);

    if (optimizability === OPTIMIZABLE.FULL) {
      return toRaw(array);
    } else if (optimizability === OPTIMIZABLE.PARTS) {
      return TreeTransformer.prototype.visitArray.call(this, array);
    } else {
      return array;
    }
  },
  visitTag: function (tag) {
    var optimizability = getOptimizability(tag);

    if (optimizability === OPTIMIZABLE.FULL) {
      return toRaw(tag);
    } else if (optimizability === OPTIMIZABLE.PARTS) {
      return TreeTransformer.prototype.visitTag.call(this, tag);
    } else {
      return tag;
    }
  },
  visitChildren: function (children) {
    // don't optimize the children array into a Raw object!
    return TreeTransformer.prototype.visitArray.call(this, children);
  },
  visitAttributes: function (attrs) {
    return attrs;
  }
}); // Combine consecutive HTML.Raws.  Remove empty ones.

var RawCompactingVisitor = TreeTransformer.extend();
RawCompactingVisitor.def({
  visitArray: function (array) {
    var result = [];

    for (var i = 0; i < array.length; i++) {
      var item = array[i];

      if (item instanceof HTML.Raw && (!item.value || result.length && result[result.length - 1] instanceof HTML.Raw)) {
        // two cases: item is an empty Raw, or previous item is
        // a Raw as well.  In the latter case, replace the previous
        // Raw with a longer one that includes the new Raw.
        if (item.value) {
          result[result.length - 1] = HTML.Raw(result[result.length - 1].value + item.value);
        }
      } else {
        result.push(this.visit(item));
      }
    }

    return result;
  }
}); // Replace pointless Raws like `HTMl.Raw('foo')` that contain no special
// characters with simple strings.

var RawReplacingVisitor = TreeTransformer.extend();
RawReplacingVisitor.def({
  visitRaw: function (raw) {
    var html = raw.value;

    if (html.indexOf('&') < 0 && html.indexOf('<') < 0) {
      return html;
    } else {
      return raw;
    }
  }
});

function optimize(tree) {
  tree = new OptimizingVisitor().visit(tree);
  tree = new RawCompactingVisitor().visit(tree);
  tree = new RawReplacingVisitor().visit(tree);
  return tree;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"react.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/spacebars-compiler/react.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ReactComponentSiblingForbidder: () => ReactComponentSiblingForbidder
});
let HTMLTools;
module.link("meteor/html-tools", {
  HTMLTools(v) {
    HTMLTools = v;
  }

}, 0);
let HTML;
module.link("meteor/htmljs", {
  HTML(v) {
    HTML = v;
  }

}, 1);
let BlazeTools;
module.link("meteor/blaze-tools", {
  BlazeTools(v) {
    BlazeTools = v;
  }

}, 2);
const ReactComponentSiblingForbidder = HTML.Visitor.extend();
ReactComponentSiblingForbidder.def({
  visitArray: function (array, parentTag) {
    for (var i = 0; i < array.length; i++) {
      this.visit(array[i], parentTag);
    }
  },
  visitObject: function (obj, parentTag) {
    if (obj.type === "INCLUSION" && obj.path.length === 1 && obj.path[0] === "React") {
      if (!parentTag) {
        throw new Error("{{> React}} must be used in a container element" + (this.sourceName ? " in " + this.sourceName : "") + ". Learn more at https://github.com/meteor/meteor/wiki/React-components-must-be-the-only-thing-in-their-wrapper-element");
      }

      var numSiblings = 0;

      for (var i = 0; i < parentTag.children.length; i++) {
        var child = parentTag.children[i];

        if (child !== obj && !(typeof child === "string" && child.match(/^\s*$/))) {
          numSiblings++;
        }
      }

      if (numSiblings > 0) {
        throw new Error("{{> React}} must be used as the only child in a container element" + (this.sourceName ? " in " + this.sourceName : "") + ". Learn more at https://github.com/meteor/meteor/wiki/React-components-must-be-the-only-thing-in-their-wrapper-element");
      }
    }
  },
  visitTag: function (tag) {
    this.visitArray(tag.children, tag
    /*parentTag*/
    );
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"templatetag.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/spacebars-compiler/templatetag.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  TemplateTag: () => TemplateTag
});
let HTMLTools;
module.link("meteor/html-tools", {
  HTMLTools(v) {
    HTMLTools = v;
  }

}, 0);
let HTML;
module.link("meteor/htmljs", {
  HTML(v) {
    HTML = v;
  }

}, 1);
let BlazeTools;
module.link("meteor/blaze-tools", {
  BlazeTools(v) {
    BlazeTools = v;
  }

}, 2);
// A TemplateTag is the result of parsing a single `{{...}}` tag.
//
// The `.type` of a TemplateTag is one of:
//
// - `"DOUBLE"` - `{{foo}}`
// - `"TRIPLE"` - `{{{foo}}}`
// - `"EXPR"` - `(foo)`
// - `"COMMENT"` - `{{! foo}}`
// - `"BLOCKCOMMENT" - `{{!-- foo--}}`
// - `"INCLUSION"` - `{{> foo}}`
// - `"BLOCKOPEN"` - `{{#foo}}`
// - `"BLOCKCLOSE"` - `{{/foo}}`
// - `"ELSE"` - `{{else}}`
// - `"ESCAPE"` - `{{|`, `{{{|`, `{{{{|` and so on
//
// Besides `type`, the mandatory properties of a TemplateTag are:
//
// - `path` - An array of one or more strings.  The path of `{{foo.bar}}`
//   is `["foo", "bar"]`.  Applies to DOUBLE, TRIPLE, INCLUSION, BLOCKOPEN,
//   BLOCKCLOSE, and ELSE.
//
// - `args` - An array of zero or more argument specs.  An argument spec
//   is a two or three element array, consisting of a type, value, and
//   optional keyword name.  For example, the `args` of `{{foo "bar" x=3}}`
//   are `[["STRING", "bar"], ["NUMBER", 3, "x"]]`.  Applies to DOUBLE,
//   TRIPLE, INCLUSION, BLOCKOPEN, and ELSE.
//
// - `value` - A string of the comment's text. Applies to COMMENT and
//   BLOCKCOMMENT.
//
// These additional are typically set during parsing:
//
// - `position` - The HTMLTools.TEMPLATE_TAG_POSITION specifying at what sort
//   of site the TemplateTag was encountered (e.g. at element level or as
//   part of an attribute value). Its absence implies
//   TEMPLATE_TAG_POSITION.ELEMENT.
//
// - `content` and `elseContent` - When a BLOCKOPEN tag's contents are
//   parsed, they are put here.  `elseContent` will only be present if
//   an `{{else}}` was found.
var TEMPLATE_TAG_POSITION = HTMLTools.TEMPLATE_TAG_POSITION;

function TemplateTag() {
  HTMLTools.TemplateTag.apply(this, arguments);
}

TemplateTag.prototype = new HTMLTools.TemplateTag();
TemplateTag.prototype.constructorName = 'SpacebarsCompiler.TemplateTag';

var makeStacheTagStartRegex = function (r) {
  return new RegExp(r.source + /(?![{>!#/])/.source, r.ignoreCase ? 'i' : '');
}; // "starts" regexes are used to see what type of template
// tag the parser is looking at.  They must match a non-empty
// result, but not the interesting part of the tag.


var starts = {
  ESCAPE: /^\{\{(?=\{*\|)/,
  ELSE: makeStacheTagStartRegex(/^\{\{\s*else(\s+(?!\s)|(?=[}]))/i),
  DOUBLE: makeStacheTagStartRegex(/^\{\{\s*(?!\s)/),
  TRIPLE: makeStacheTagStartRegex(/^\{\{\{\s*(?!\s)/),
  BLOCKCOMMENT: makeStacheTagStartRegex(/^\{\{\s*!--/),
  COMMENT: makeStacheTagStartRegex(/^\{\{\s*!/),
  INCLUSION: makeStacheTagStartRegex(/^\{\{\s*>\s*(?!\s)/),
  BLOCKOPEN: makeStacheTagStartRegex(/^\{\{\s*#\s*(?!\s)/),
  BLOCKCLOSE: makeStacheTagStartRegex(/^\{\{\s*\/\s*(?!\s)/)
};
var ends = {
  DOUBLE: /^\s*\}\}/,
  TRIPLE: /^\s*\}\}\}/,
  EXPR: /^\s*\)/
};
var endsString = {
  DOUBLE: '}}',
  TRIPLE: '}}}',
  EXPR: ')'
}; // Parse a tag from the provided scanner or string.  If the input
// doesn't start with `{{`, returns null.  Otherwise, either succeeds
// and returns a SpacebarsCompiler.TemplateTag, or throws an error (using
// `scanner.fatal` if a scanner is provided).

TemplateTag.parse = function (scannerOrString) {
  var scanner = scannerOrString;
  if (typeof scanner === 'string') scanner = new HTMLTools.Scanner(scannerOrString);
  if (!(scanner.peek() === '{' && scanner.rest().slice(0, 2) === '{{')) return null;

  var run = function (regex) {
    // regex is assumed to start with `^`
    var result = regex.exec(scanner.rest());
    if (!result) return null;
    var ret = result[0];
    scanner.pos += ret.length;
    return ret;
  };

  var advance = function (amount) {
    scanner.pos += amount;
  };

  var scanIdentifier = function (isFirstInPath) {
    var id = BlazeTools.parseExtendedIdentifierName(scanner);

    if (!id) {
      expected('IDENTIFIER');
    }

    if (isFirstInPath && (id === 'null' || id === 'true' || id === 'false')) scanner.fatal("Can't use null, true, or false, as an identifier at start of path");
    return id;
  };

  var scanPath = function () {
    var segments = []; // handle initial `.`, `..`, `./`, `../`, `../..`, `../../`, etc

    var dots;

    if (dots = run(/^[\.\/]+/)) {
      var ancestorStr = '.'; // eg `../../..` maps to `....`

      var endsWithSlash = /\/$/.test(dots);
      if (endsWithSlash) dots = dots.slice(0, -1);

      _.each(dots.split('/'), function (dotClause, index) {
        if (index === 0) {
          if (dotClause !== '.' && dotClause !== '..') expected("`.`, `..`, `./` or `../`");
        } else {
          if (dotClause !== '..') expected("`..` or `../`");
        }

        if (dotClause === '..') ancestorStr += '.';
      });

      segments.push(ancestorStr);
      if (!endsWithSlash) return segments;
    }

    while (true) {
      // scan a path segment
      if (run(/^\[/)) {
        var seg = run(/^[\s\S]*?\]/);
        if (!seg) error("Unterminated path segment");
        seg = seg.slice(0, -1);
        if (!seg && !segments.length) error("Path can't start with empty string");
        segments.push(seg);
      } else {
        var id = scanIdentifier(!segments.length);

        if (id === 'this') {
          if (!segments.length) {
            // initial `this`
            segments.push('.');
          } else {
            error("Can only use `this` at the beginning of a path.\nInstead of `foo.this` or `../this`, just write `foo` or `..`.");
          }
        } else {
          segments.push(id);
        }
      }

      var sep = run(/^[\.\/]/);
      if (!sep) break;
    }

    return segments;
  }; // scan the keyword portion of a keyword argument
  // (the "foo" portion in "foo=bar").
  // Result is either the keyword matched, or null
  // if we're not at a keyword argument position.


  var scanArgKeyword = function () {
    var match = /^([^\{\}\(\)\>#=\s"'\[\]]+)\s*=\s*/.exec(scanner.rest());

    if (match) {
      scanner.pos += match[0].length;
      return match[1];
    } else {
      return null;
    }
  }; // scan an argument; succeeds or errors.
  // Result is an array of two or three items:
  // type , value, and (indicating a keyword argument)
  // keyword name.


  var scanArg = function () {
    var keyword = scanArgKeyword(); // null if not parsing a kwarg

    var value = scanArgValue();
    return keyword ? value.concat(keyword) : value;
  }; // scan an argument value (for keyword or positional arguments);
  // succeeds or errors.  Result is an array of type, value.


  var scanArgValue = function () {
    var startPos = scanner.pos;
    var result;

    if (result = BlazeTools.parseNumber(scanner)) {
      return ['NUMBER', result.value];
    } else if (result = BlazeTools.parseStringLiteral(scanner)) {
      return ['STRING', result.value];
    } else if (/^[\.\[]/.test(scanner.peek())) {
      return ['PATH', scanPath()];
    } else if (run(/^\(/)) {
      return ['EXPR', scanExpr('EXPR')];
    } else if (result = BlazeTools.parseExtendedIdentifierName(scanner)) {
      var id = result;

      if (id === 'null') {
        return ['NULL', null];
      } else if (id === 'true' || id === 'false') {
        return ['BOOLEAN', id === 'true'];
      } else {
        scanner.pos = startPos; // unconsume `id`

        return ['PATH', scanPath()];
      }
    } else {
      expected('identifier, number, string, boolean, null, or a sub expression enclosed in "(", ")"');
    }
  };

  var scanExpr = function (type) {
    var endType = type;
    if (type === 'INCLUSION' || type === 'BLOCKOPEN' || type === 'ELSE') endType = 'DOUBLE';
    var tag = new TemplateTag();
    tag.type = type;
    tag.path = scanPath();
    tag.args = [];
    var foundKwArg = false;

    while (true) {
      run(/^\s*/);
      if (run(ends[endType])) break;else if (/^[})]/.test(scanner.peek())) {
        expected('`' + endsString[endType] + '`');
      }
      var newArg = scanArg();

      if (newArg.length === 3) {
        foundKwArg = true;
      } else {
        if (foundKwArg) error("Can't have a non-keyword argument after a keyword argument");
      }

      tag.args.push(newArg); // expect a whitespace or a closing ')' or '}'

      if (run(/^(?=[\s})])/) !== '') expected('space');
    }

    return tag;
  };

  var type;

  var error = function (msg) {
    scanner.fatal(msg);
  };

  var expected = function (what) {
    error('Expected ' + what);
  }; // must do ESCAPE first, immediately followed by ELSE
  // order of others doesn't matter


  if (run(starts.ESCAPE)) type = 'ESCAPE';else if (run(starts.ELSE)) type = 'ELSE';else if (run(starts.DOUBLE)) type = 'DOUBLE';else if (run(starts.TRIPLE)) type = 'TRIPLE';else if (run(starts.BLOCKCOMMENT)) type = 'BLOCKCOMMENT';else if (run(starts.COMMENT)) type = 'COMMENT';else if (run(starts.INCLUSION)) type = 'INCLUSION';else if (run(starts.BLOCKOPEN)) type = 'BLOCKOPEN';else if (run(starts.BLOCKCLOSE)) type = 'BLOCKCLOSE';else error('Unknown stache tag');
  var tag = new TemplateTag();
  tag.type = type;

  if (type === 'BLOCKCOMMENT') {
    var result = run(/^[\s\S]*?--\s*?\}\}/);
    if (!result) error("Unclosed block comment");
    tag.value = result.slice(0, result.lastIndexOf('--'));
  } else if (type === 'COMMENT') {
    var result = run(/^[\s\S]*?\}\}/);
    if (!result) error("Unclosed comment");
    tag.value = result.slice(0, -2);
  } else if (type === 'BLOCKCLOSE') {
    tag.path = scanPath();
    if (!run(ends.DOUBLE)) expected('`}}`');
  } else if (type === 'ELSE') {
    if (!run(ends.DOUBLE)) {
      tag = scanExpr(type);
    }
  } else if (type === 'ESCAPE') {
    var result = run(/^\{*\|/);
    tag.value = '{{' + result.slice(0, -1);
  } else {
    // DOUBLE, TRIPLE, BLOCKOPEN, INCLUSION
    tag = scanExpr(type);
  }

  return tag;
}; // Returns a SpacebarsCompiler.TemplateTag parsed from `scanner`, leaving scanner
// at its original position.
//
// An error will still be thrown if there is not a valid template tag at
// the current position.


TemplateTag.peek = function (scanner) {
  var startPos = scanner.pos;
  var result = TemplateTag.parse(scanner);
  scanner.pos = startPos;
  return result;
}; // Like `TemplateTag.parse`, but in the case of blocks, parse the complete
// `{{#foo}}...{{/foo}}` with `content` and possible `elseContent`, rather
// than just the BLOCKOPEN tag.
//
// In addition:
//
// - Throws an error if `{{else}}` or `{{/foo}}` tag is encountered.
//
// - Returns `null` for a COMMENT.  (This case is distinguishable from
//   parsing no tag by the fact that the scanner is advanced.)
//
// - Takes an HTMLTools.TEMPLATE_TAG_POSITION `position` and sets it as the
//   TemplateTag's `.position` property.
//
// - Validates the tag's well-formedness and legality at in its position.


TemplateTag.parseCompleteTag = function (scannerOrString, position) {
  var scanner = scannerOrString;
  if (typeof scanner === 'string') scanner = new HTMLTools.Scanner(scannerOrString);
  var startPos = scanner.pos; // for error messages

  var result = TemplateTag.parse(scannerOrString);
  if (!result) return result;
  if (result.type === 'BLOCKCOMMENT') return null;
  if (result.type === 'COMMENT') return null;
  if (result.type === 'ELSE') scanner.fatal("Unexpected {{else}}");
  if (result.type === 'BLOCKCLOSE') scanner.fatal("Unexpected closing template tag");
  position = position || TEMPLATE_TAG_POSITION.ELEMENT;
  if (position !== TEMPLATE_TAG_POSITION.ELEMENT) result.position = position;

  if (result.type === 'BLOCKOPEN') {
    // parse block contents
    // Construct a string version of `.path` for comparing start and
    // end tags.  For example, `foo/[0]` was parsed into `["foo", "0"]`
    // and now becomes `foo,0`.  This form may also show up in error
    // messages.
    var blockName = result.path.join(',');
    var textMode = null;

    if (blockName === 'markdown' || position === TEMPLATE_TAG_POSITION.IN_RAWTEXT) {
      textMode = HTML.TEXTMODE.STRING;
    } else if (position === TEMPLATE_TAG_POSITION.IN_RCDATA || position === TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {
      textMode = HTML.TEXTMODE.RCDATA;
    }

    var parserOptions = {
      getTemplateTag: TemplateTag.parseCompleteTag,
      shouldStop: isAtBlockCloseOrElse,
      textMode: textMode
    };
    result.textMode = textMode;
    result.content = HTMLTools.parseFragment(scanner, parserOptions);
    if (scanner.rest().slice(0, 2) !== '{{') scanner.fatal("Expected {{else}} or block close for " + blockName);
    var lastPos = scanner.pos; // save for error messages

    var tmplTag = TemplateTag.parse(scanner); // {{else}} or {{/foo}}

    var lastElseContentTag = result;

    while (tmplTag.type === 'ELSE') {
      if (lastElseContentTag === null) {
        scanner.fatal("Unexpected else after {{else}}");
      }

      if (tmplTag.path) {
        lastElseContentTag.elseContent = new TemplateTag();
        lastElseContentTag.elseContent.type = 'BLOCKOPEN';
        lastElseContentTag.elseContent.path = tmplTag.path;
        lastElseContentTag.elseContent.args = tmplTag.args;
        lastElseContentTag.elseContent.textMode = textMode;
        lastElseContentTag.elseContent.content = HTMLTools.parseFragment(scanner, parserOptions);
        lastElseContentTag = lastElseContentTag.elseContent;
      } else {
        // parse {{else}} and content up to close tag
        lastElseContentTag.elseContent = HTMLTools.parseFragment(scanner, parserOptions);
        lastElseContentTag = null;
      }

      if (scanner.rest().slice(0, 2) !== '{{') scanner.fatal("Expected block close for " + blockName);
      lastPos = scanner.pos;
      tmplTag = TemplateTag.parse(scanner);
    }

    if (tmplTag.type === 'BLOCKCLOSE') {
      var blockName2 = tmplTag.path.join(',');

      if (blockName !== blockName2) {
        scanner.pos = lastPos;
        scanner.fatal('Expected tag to close ' + blockName + ', found ' + blockName2);
      }
    } else {
      scanner.pos = lastPos;
      scanner.fatal('Expected tag to close ' + blockName + ', found ' + tmplTag.type);
    }
  }

  var finalPos = scanner.pos;
  scanner.pos = startPos;
  validateTag(result, scanner);
  scanner.pos = finalPos;
  return result;
};

var isAtBlockCloseOrElse = function (scanner) {
  // Detect `{{else}}` or `{{/foo}}`.
  //
  // We do as much work ourselves before deferring to `TemplateTag.peek`,
  // for efficiency (we're called for every input token) and to be
  // less obtrusive, because `TemplateTag.peek` will throw an error if it
  // sees `{{` followed by a malformed tag.
  var rest, type;
  return scanner.peek() === '{' && (rest = scanner.rest()).slice(0, 2) === '{{' && /^\{\{\s*(\/|else\b)/.test(rest) && (type = TemplateTag.peek(scanner).type) && (type === 'BLOCKCLOSE' || type === 'ELSE');
}; // Validate that `templateTag` is correctly formed and legal for its
// HTML position.  Use `scanner` to report errors. On success, does
// nothing.


var validateTag = function (ttag, scanner) {
  if (ttag.type === 'INCLUSION' || ttag.type === 'BLOCKOPEN') {
    var args = ttag.args;

    if (ttag.path[0] === 'each' && args[1] && args[1][0] === 'PATH' && args[1][1][0] === 'in') {// For slightly better error messages, we detect the each-in case
      // here in order not to complain if the user writes `{{#each 3 in x}}`
      // that "3 is not a function"
    } else {
      if (args.length > 1 && args[0].length === 2 && args[0][0] !== 'PATH') {
        // we have a positional argument that is not a PATH followed by
        // other arguments
        scanner.fatal("First argument must be a function, to be called on " + "the rest of the arguments; found " + args[0][0]);
      }
    }
  }

  var position = ttag.position || TEMPLATE_TAG_POSITION.ELEMENT;

  if (position === TEMPLATE_TAG_POSITION.IN_ATTRIBUTE) {
    if (ttag.type === 'DOUBLE' || ttag.type === 'ESCAPE') {
      return;
    } else if (ttag.type === 'BLOCKOPEN') {
      var path = ttag.path;
      var path0 = path[0];

      if (!(path.length === 1 && (path0 === 'if' || path0 === 'unless' || path0 === 'with' || path0 === 'each'))) {
        scanner.fatal("Custom block helpers are not allowed in an HTML attribute, only built-in ones like #each and #if");
      }
    } else {
      scanner.fatal(ttag.type + " template tag is not allowed in an HTML attribute");
    }
  } else if (position === TEMPLATE_TAG_POSITION.IN_START_TAG) {
    if (!(ttag.type === 'DOUBLE')) {
      scanner.fatal("Reactive HTML attributes must either have a constant name or consist of a single {{helper}} providing a dictionary of names and values.  A template tag of type " + ttag.type + " is not allowed here.");
    }

    if (scanner.peek() === '=') {
      scanner.fatal("Template tags are not allowed in attribute names, only in attribute values or in the form of a single {{helper}} that evaluates to a dictionary of name=value pairs.");
    }
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"whitespace.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/spacebars-compiler/whitespace.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  removeWhitespace: () => removeWhitespace
});
let HTML;
module.link("meteor/htmljs", {
  HTML(v) {
    HTML = v;
  }

}, 0);
let TreeTransformer, toRaw;
module.link("./optimizer", {
  TreeTransformer(v) {
    TreeTransformer = v;
  },

  toRaw(v) {
    toRaw = v;
  }

}, 1);

function compactRaw(array) {
  var result = [];

  for (var i = 0; i < array.length; i++) {
    var item = array[i];

    if (item instanceof HTML.Raw) {
      if (!item.value) {
        continue;
      }

      if (result.length && result[result.length - 1] instanceof HTML.Raw) {
        result[result.length - 1] = HTML.Raw(result[result.length - 1].value + item.value);
        continue;
      }
    }

    result.push(item);
  }

  return result;
}

function replaceIfContainsNewline(match) {
  if (match.indexOf('\n') >= 0) {
    return '';
  }

  return match;
}

function stripWhitespace(array) {
  var result = [];

  for (var i = 0; i < array.length; i++) {
    var item = array[i];

    if (item instanceof HTML.Raw) {
      // remove nodes that contain only whitespace & a newline
      if (item.value.indexOf('\n') !== -1 && !/\S/.test(item.value)) {
        continue;
      } // Trim any preceding whitespace, if it contains a newline


      var newStr = item.value;
      newStr = newStr.replace(/^\s+/, replaceIfContainsNewline);
      newStr = newStr.replace(/\s+$/, replaceIfContainsNewline);
      item.value = newStr;
    }

    result.push(item);
  }

  return result;
}

var WhitespaceRemovingVisitor = TreeTransformer.extend();
WhitespaceRemovingVisitor.def({
  visitNull: toRaw,
  visitPrimitive: toRaw,
  visitCharRef: toRaw,
  visitArray: function (array) {
    // this.super(array)
    var result = TreeTransformer.prototype.visitArray.call(this, array);
    result = compactRaw(result);
    result = stripWhitespace(result);
    return result;
  },
  visitTag: function (tag) {
    var tagName = tag.tagName; // TODO - List tags that we don't want to strip whitespace for.

    if (tagName === 'textarea' || tagName === 'script' || tagName === 'pre' || !HTML.isKnownElement(tagName) || HTML.isKnownSVGElement(tagName)) {
      return tag;
    }

    return TreeTransformer.prototype.visitTag.call(this, tag);
  },
  visitAttributes: function (attrs) {
    return attrs;
  }
});

function removeWhitespace(tree) {
  tree = new WhitespaceRemovingVisitor().visit(tree);
  return tree;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/spacebars-compiler/preamble.js");

/* Exports */
Package._define("spacebars-compiler", exports);

})();




//# sourceURL=meteor://💻app/packages/spacebars-compiler.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3BhY2ViYXJzLWNvbXBpbGVyL3ByZWFtYmxlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zcGFjZWJhcnMtY29tcGlsZXIvY29kZWdlbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3BhY2ViYXJzLWNvbXBpbGVyL2NvbXBpbGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zcGFjZWJhcnMtY29tcGlsZXIvb3B0aW1pemVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zcGFjZWJhcnMtY29tcGlsZXIvcmVhY3QuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3NwYWNlYmFycy1jb21waWxlci90ZW1wbGF0ZXRhZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3BhY2ViYXJzLWNvbXBpbGVyL3doaXRlc3BhY2UuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiU3BhY2ViYXJzQ29tcGlsZXIiLCJDb2RlR2VuIiwiYnVpbHRJbkJsb2NrSGVscGVycyIsImlzUmVzZXJ2ZWROYW1lIiwibGluayIsInYiLCJvcHRpbWl6ZSIsInBhcnNlIiwiY29tcGlsZSIsImNvZGVHZW4iLCJUZW1wbGF0ZVRhZ1JlcGxhY2VyIiwiYmVhdXRpZnkiLCJUZW1wbGF0ZVRhZyIsIl9idWlsdEluQmxvY2tIZWxwZXJzIiwiX1RlbXBsYXRlVGFnUmVwbGFjZXIiLCJfYmVhdXRpZnkiLCJIVE1MVG9vbHMiLCJIVE1MIiwiQmxhemVUb29scyIsImJ1aWx0SW5UZW1wbGF0ZU1hY3JvcyIsImFkZGl0aW9uYWxSZXNlcnZlZE5hbWVzIiwibmFtZSIsImhhc093blByb3BlcnR5IiwiXyIsImluZGV4T2YiLCJtYWtlT2JqZWN0TGl0ZXJhbCIsIm9iaiIsInBhcnRzIiwiayIsInB1c2giLCJ0b09iamVjdExpdGVyYWxLZXkiLCJqb2luIiwiZXh0ZW5kIiwicHJvdG90eXBlIiwiY29kZUdlblRlbXBsYXRlVGFnIiwidGFnIiwic2VsZiIsInBvc2l0aW9uIiwiVEVNUExBVEVfVEFHX1BPU0lUSU9OIiwiSU5fU1RBUlRfVEFHIiwiRW1pdENvZGUiLCJjb2RlR2VuTXVzdGFjaGUiLCJwYXRoIiwiYXJncyIsInR5cGUiLCJjb2RlIiwiSU5fQVRUUklCVVRFIiwidG9KU0xpdGVyYWwiLCJsZW5ndGgiLCJFcnJvciIsImRhdGFDb2RlIiwiZWFjaFVzYWdlIiwiaW5BcmciLCJ2YXJpYWJsZUFyZyIsInJlcGxhY2UiLCJ2YXJpYWJsZSIsImNvZGVHZW5JbmNsdXNpb25EYXRhIiwic2xpY2UiLCJkYXRhUHJvcHMiLCJlYWNoIiwiYXJnIiwiYXJnS2V5IiwiY29kZUdlbkFyZ1ZhbHVlIiwiY29kZUdlbkluY2x1c2lvbkRhdGFGdW5jIiwiY29udGVudEJsb2NrIiwiY29kZUdlbkJsb2NrIiwiY29udGVudCIsImVsc2VDb250ZW50QmxvY2siLCJlbHNlQ29udGVudCIsImNhbGxBcmdzIiwiY29tcENvZGUiLCJjb2RlR2VuUGF0aCIsImxvb2t1cFRlbXBsYXRlIiwiaW5jbHVkZUFyZ3MiLCJpbmNsdWRlQ29kZSIsInZhbHVlIiwib3B0cyIsImZpcnN0UGF0aEl0ZW0iLCJsb29rdXBNZXRob2QiLCJtYXAiLCJhcmdUeXBlIiwiYXJnVmFsdWUiLCJhcmdDb2RlIiwibXVzdGFjaGVUeXBlIiwibmFtZUNvZGUiLCJjb2RlR2VuTXVzdGFjaGVBcmdzIiwibXVzdGFjaGUiLCJ0YWdBcmdzIiwia3dBcmdzIiwiTWV0ZW9yIiwiUmVhY3RDb21wb25lbnRTaWJsaW5nRm9yYmlkZGVyIiwicmVtb3ZlV2hpdGVzcGFjZSIsIlVnbGlmeUpTTWluaWZ5IiwiaXNTZXJ2ZXIiLCJOcG0iLCJyZXF1aXJlIiwibWluaWZ5IiwiaW5wdXQiLCJwYXJzZUZyYWdtZW50IiwiZ2V0VGVtcGxhdGVUYWciLCJwYXJzZUNvbXBsZXRlVGFnIiwib3B0aW9ucyIsInRyZWUiLCJUcmFuc2Zvcm1pbmdWaXNpdG9yIiwiZGVmIiwidmlzaXRPYmplY3QiLCJ4IiwiaW5BdHRyaWJ1dGVWYWx1ZSIsImNvZGVnZW4iLCJjYWxsIiwidmlzaXRBdHRyaWJ1dGVzIiwiYXR0cnMiLCJ2aXNpdEF0dHJpYnV0ZSIsInJlc3VsdCIsInZpc2l0IiwicGFyc2VUcmVlIiwiaXNUZW1wbGF0ZSIsImlzQm9keSIsIndoaXRlc3BhY2UiLCJzb3VyY2VOYW1lIiwidG9Mb3dlckNhc2UiLCJ0b0pTIiwiZnJvbVN0cmluZyIsIm1hbmdsZSIsImNvbXByZXNzIiwib3V0cHV0IiwiaW5kZW50X2xldmVsIiwid2lkdGgiLCJ0b1JhdyIsIlRyZWVUcmFuc2Zvcm1lciIsImNvbnN0YW50IiwiT1BUSU1JWkFCTEUiLCJOT05FIiwiUEFSVFMiLCJGVUxMIiwiQ2FuT3B0aW1pemVWaXNpdG9yIiwiVmlzaXRvciIsInZpc2l0TnVsbCIsInZpc2l0UHJpbWl0aXZlIiwidmlzaXRDb21tZW50IiwidmlzaXRDaGFyUmVmIiwidmlzaXRSYXciLCJ2aXNpdEZ1bmN0aW9uIiwidmlzaXRBcnJheSIsImkiLCJ2aXNpdFRhZyIsInRhZ05hbWUiLCJpc0tub3duRWxlbWVudCIsImlzS25vd25TVkdFbGVtZW50IiwiY2hpbGRyZW4iLCJpc0FycmF5IiwiYSIsImdldE9wdGltaXphYmlsaXR5IiwiUmF3IiwidG9IVE1MIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJPcHRpbWl6aW5nVmlzaXRvciIsImFycmF5Iiwib3B0aW1pemFiaWxpdHkiLCJ2aXNpdENoaWxkcmVuIiwiUmF3Q29tcGFjdGluZ1Zpc2l0b3IiLCJpdGVtIiwiUmF3UmVwbGFjaW5nVmlzaXRvciIsInJhdyIsImh0bWwiLCJwYXJlbnRUYWciLCJudW1TaWJsaW5ncyIsImNoaWxkIiwibWF0Y2giLCJjb25zdHJ1Y3Rvck5hbWUiLCJtYWtlU3RhY2hlVGFnU3RhcnRSZWdleCIsInIiLCJSZWdFeHAiLCJzb3VyY2UiLCJpZ25vcmVDYXNlIiwic3RhcnRzIiwiRVNDQVBFIiwiRUxTRSIsIkRPVUJMRSIsIlRSSVBMRSIsIkJMT0NLQ09NTUVOVCIsIkNPTU1FTlQiLCJJTkNMVVNJT04iLCJCTE9DS09QRU4iLCJCTE9DS0NMT1NFIiwiZW5kcyIsIkVYUFIiLCJlbmRzU3RyaW5nIiwic2Nhbm5lck9yU3RyaW5nIiwic2Nhbm5lciIsIlNjYW5uZXIiLCJwZWVrIiwicmVzdCIsInJ1biIsInJlZ2V4IiwiZXhlYyIsInJldCIsInBvcyIsImFkdmFuY2UiLCJhbW91bnQiLCJzY2FuSWRlbnRpZmllciIsImlzRmlyc3RJblBhdGgiLCJpZCIsInBhcnNlRXh0ZW5kZWRJZGVudGlmaWVyTmFtZSIsImV4cGVjdGVkIiwiZmF0YWwiLCJzY2FuUGF0aCIsInNlZ21lbnRzIiwiZG90cyIsImFuY2VzdG9yU3RyIiwiZW5kc1dpdGhTbGFzaCIsInRlc3QiLCJzcGxpdCIsImRvdENsYXVzZSIsImluZGV4Iiwic2VnIiwiZXJyb3IiLCJzZXAiLCJzY2FuQXJnS2V5d29yZCIsInNjYW5BcmciLCJrZXl3b3JkIiwic2NhbkFyZ1ZhbHVlIiwiY29uY2F0Iiwic3RhcnRQb3MiLCJwYXJzZU51bWJlciIsInBhcnNlU3RyaW5nTGl0ZXJhbCIsInNjYW5FeHByIiwiZW5kVHlwZSIsImZvdW5kS3dBcmciLCJuZXdBcmciLCJtc2ciLCJ3aGF0IiwibGFzdEluZGV4T2YiLCJFTEVNRU5UIiwiYmxvY2tOYW1lIiwidGV4dE1vZGUiLCJJTl9SQVdURVhUIiwiVEVYVE1PREUiLCJTVFJJTkciLCJJTl9SQ0RBVEEiLCJSQ0RBVEEiLCJwYXJzZXJPcHRpb25zIiwic2hvdWxkU3RvcCIsImlzQXRCbG9ja0Nsb3NlT3JFbHNlIiwibGFzdFBvcyIsInRtcGxUYWciLCJsYXN0RWxzZUNvbnRlbnRUYWciLCJibG9ja05hbWUyIiwiZmluYWxQb3MiLCJ2YWxpZGF0ZVRhZyIsInR0YWciLCJwYXRoMCIsImNvbXBhY3RSYXciLCJyZXBsYWNlSWZDb250YWluc05ld2xpbmUiLCJzdHJpcFdoaXRlc3BhY2UiLCJuZXdTdHIiLCJXaGl0ZXNwYWNlUmVtb3ZpbmdWaXNpdG9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDQyxtQkFBaUIsRUFBQyxNQUFJQTtBQUF2QixDQUFkO0FBQXlELElBQUlDLE9BQUosRUFBWUMsbUJBQVosRUFBZ0NDLGNBQWhDO0FBQStDTCxNQUFNLENBQUNNLElBQVAsQ0FBWSxXQUFaLEVBQXdCO0FBQUNILFNBQU8sQ0FBQ0ksQ0FBRCxFQUFHO0FBQUNKLFdBQU8sR0FBQ0ksQ0FBUjtBQUFVLEdBQXRCOztBQUF1QkgscUJBQW1CLENBQUNHLENBQUQsRUFBRztBQUFDSCx1QkFBbUIsR0FBQ0csQ0FBcEI7QUFBc0IsR0FBcEU7O0FBQXFFRixnQkFBYyxDQUFDRSxDQUFELEVBQUc7QUFBQ0Ysa0JBQWMsR0FBQ0UsQ0FBZjtBQUFpQjs7QUFBeEcsQ0FBeEIsRUFBa0ksQ0FBbEk7QUFBcUksSUFBSUMsUUFBSjtBQUFhUixNQUFNLENBQUNNLElBQVAsQ0FBWSxhQUFaLEVBQTBCO0FBQUNFLFVBQVEsQ0FBQ0QsQ0FBRCxFQUFHO0FBQUNDLFlBQVEsR0FBQ0QsQ0FBVDtBQUFXOztBQUF4QixDQUExQixFQUFvRCxDQUFwRDtBQUF1RCxJQUFJRSxLQUFKLEVBQVVDLE9BQVYsRUFBa0JDLE9BQWxCLEVBQTBCQyxtQkFBMUIsRUFBOENDLFFBQTlDO0FBQXVEYixNQUFNLENBQUNNLElBQVAsQ0FBWSxZQUFaLEVBQXlCO0FBQUNHLE9BQUssQ0FBQ0YsQ0FBRCxFQUFHO0FBQUNFLFNBQUssR0FBQ0YsQ0FBTjtBQUFRLEdBQWxCOztBQUFtQkcsU0FBTyxDQUFDSCxDQUFELEVBQUc7QUFBQ0csV0FBTyxHQUFDSCxDQUFSO0FBQVUsR0FBeEM7O0FBQXlDSSxTQUFPLENBQUNKLENBQUQsRUFBRztBQUFDSSxXQUFPLEdBQUNKLENBQVI7QUFBVSxHQUE5RDs7QUFBK0RLLHFCQUFtQixDQUFDTCxDQUFELEVBQUc7QUFBQ0ssdUJBQW1CLEdBQUNMLENBQXBCO0FBQXNCLEdBQTVHOztBQUE2R00sVUFBUSxDQUFDTixDQUFELEVBQUc7QUFBQ00sWUFBUSxHQUFDTixDQUFUO0FBQVc7O0FBQXBJLENBQXpCLEVBQStKLENBQS9KO0FBQWtLLElBQUlPLFdBQUo7QUFBZ0JkLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLGVBQVosRUFBNEI7QUFBQ1EsYUFBVyxDQUFDUCxDQUFELEVBQUc7QUFBQ08sZUFBVyxHQUFDUCxDQUFaO0FBQWM7O0FBQTlCLENBQTVCLEVBQTRELENBQTVEO0FBS25oQixNQUFNTCxpQkFBaUIsR0FBRztBQUMvQkMsU0FEK0I7QUFFL0JZLHNCQUFvQixFQUFFWCxtQkFGUztBQUcvQkMsZ0JBSCtCO0FBSS9CRyxVQUorQjtBQUsvQkMsT0FMK0I7QUFNL0JDLFNBTitCO0FBTy9CQyxTQVArQjtBQVEvQkssc0JBQW9CLEVBQUVKLG1CQVJTO0FBUy9CSyxXQUFTLEVBQUVKLFFBVG9CO0FBVS9CQztBQVYrQixDQUExQixDOzs7Ozs7Ozs7OztBQ0xQZCxNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDRSxTQUFPLEVBQUMsTUFBSUEsT0FBYjtBQUFxQkMscUJBQW1CLEVBQUMsTUFBSUEsbUJBQTdDO0FBQWlFQyxnQkFBYyxFQUFDLE1BQUlBO0FBQXBGLENBQWQ7QUFBbUgsSUFBSWEsU0FBSjtBQUFjbEIsTUFBTSxDQUFDTSxJQUFQLENBQVksbUJBQVosRUFBZ0M7QUFBQ1ksV0FBUyxDQUFDWCxDQUFELEVBQUc7QUFBQ1csYUFBUyxHQUFDWCxDQUFWO0FBQVk7O0FBQTFCLENBQWhDLEVBQTRELENBQTVEO0FBQStELElBQUlZLElBQUo7QUFBU25CLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLGVBQVosRUFBNEI7QUFBQ2EsTUFBSSxDQUFDWixDQUFELEVBQUc7QUFBQ1ksUUFBSSxHQUFDWixDQUFMO0FBQU87O0FBQWhCLENBQTVCLEVBQThDLENBQTlDO0FBQWlELElBQUlhLFVBQUo7QUFBZXBCLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLG9CQUFaLEVBQWlDO0FBQUNjLFlBQVUsQ0FBQ2IsQ0FBRCxFQUFHO0FBQUNhLGNBQVUsR0FBQ2IsQ0FBWDtBQUFhOztBQUE1QixDQUFqQyxFQUErRCxDQUEvRDtBQUFrRSxJQUFJSSxPQUFKO0FBQVlYLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLFlBQVosRUFBeUI7QUFBQ0ssU0FBTyxDQUFDSixDQUFELEVBQUc7QUFBQ0ksV0FBTyxHQUFDSixDQUFSO0FBQVU7O0FBQXRCLENBQXpCLEVBQWlELENBQWpEOztBQVloVixTQUFTSixPQUFULEdBQW1CLENBQUU7O0FBRXJCLE1BQU1DLG1CQUFtQixHQUFHO0FBQ2pDLFFBQU0sVUFEMkI7QUFFakMsWUFBVSxjQUZ1QjtBQUdqQyxVQUFRLGdCQUh5QjtBQUlqQyxVQUFRLFlBSnlCO0FBS2pDLFNBQU87QUFMMEIsQ0FBNUI7QUFTUDtBQUNBO0FBQ0E7QUFDQSxJQUFJaUIscUJBQXFCLEdBQUc7QUFDMUI7QUFDQTtBQUNBO0FBQ0Esa0JBQWdCLDJCQUpVO0FBSzFCLGVBQWEsd0JBTGE7QUFPMUI7QUFDQTtBQUNBO0FBQ0EsYUFBVyxvQkFWZTtBQVkxQix3QkFBc0I7QUFaSSxDQUE1QjtBQWVBLElBQUlDLHVCQUF1QixHQUFHLENBQUMsTUFBRCxFQUFTLFVBQVQsRUFBcUIsVUFBckIsRUFBa0MsYUFBbEMsRUFDNUIsVUFENEIsRUFDaEIsZ0JBRGdCLEVBQ0UsU0FERixFQUNhLGdCQURiLEVBQytCLGVBRC9CLEVBRTVCLHNCQUY0QixFQUVKLGtCQUZJLEVBRWdCLGtCQUZoQixFQUc1QixrQkFINEIsRUFHUixrQkFIUSxFQUdZLFdBSFosRUFHeUIsU0FIekIsRUFJNUIsZ0JBSjRCLEVBSVYsYUFKVSxFQUlLLFlBSkwsRUFJbUIsa0JBSm5CLEVBSzVCLGtCQUw0QixFQUtSLHNCQUxRLENBQTlCLEMsQ0FRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ08sU0FBU2pCLGNBQVQsQ0FBd0JrQixJQUF4QixFQUE4QjtBQUNuQyxTQUFPbkIsbUJBQW1CLENBQUNvQixjQUFwQixDQUFtQ0QsSUFBbkMsS0FDTEYscUJBQXFCLENBQUNHLGNBQXRCLENBQXFDRCxJQUFyQyxDQURLLElBRUxFLENBQUMsQ0FBQ0MsT0FBRixDQUFVSix1QkFBVixFQUFtQ0MsSUFBbkMsSUFBMkMsQ0FBQyxDQUY5QztBQUdEOztBQUVELElBQUlJLGlCQUFpQixHQUFHLFVBQVVDLEdBQVYsRUFBZTtBQUNyQyxNQUFJQyxLQUFLLEdBQUcsRUFBWjs7QUFDQSxPQUFLLElBQUlDLENBQVQsSUFBY0YsR0FBZCxFQUNFQyxLQUFLLENBQUNFLElBQU4sQ0FBV1gsVUFBVSxDQUFDWSxrQkFBWCxDQUE4QkYsQ0FBOUIsSUFBbUMsSUFBbkMsR0FBMENGLEdBQUcsQ0FBQ0UsQ0FBRCxDQUF4RDs7QUFDRixTQUFPLE1BQU1ELEtBQUssQ0FBQ0ksSUFBTixDQUFXLElBQVgsQ0FBTixHQUF5QixHQUFoQztBQUNELENBTEQ7O0FBT0FSLENBQUMsQ0FBQ1MsTUFBRixDQUFTL0IsT0FBTyxDQUFDZ0MsU0FBakIsRUFBNEI7QUFDMUJDLG9CQUFrQixFQUFFLFVBQVVDLEdBQVYsRUFBZTtBQUNqQyxRQUFJQyxJQUFJLEdBQUcsSUFBWDs7QUFDQSxRQUFJRCxHQUFHLENBQUNFLFFBQUosS0FBaUJyQixTQUFTLENBQUNzQixxQkFBVixDQUFnQ0MsWUFBckQsRUFBbUU7QUFDakU7QUFDQTtBQUNBLGFBQU9yQixVQUFVLENBQUNzQixRQUFYLENBQW9CLDBCQUN2QkosSUFBSSxDQUFDSyxlQUFMLENBQXFCTixHQUFHLENBQUNPLElBQXpCLEVBQStCUCxHQUFHLENBQUNRLElBQW5DLEVBQXlDLGNBQXpDLENBRHVCLEdBRXJCLEtBRkMsQ0FBUDtBQUdELEtBTkQsTUFNTztBQUNMLFVBQUlSLEdBQUcsQ0FBQ1MsSUFBSixLQUFhLFFBQWIsSUFBeUJULEdBQUcsQ0FBQ1MsSUFBSixLQUFhLFFBQTFDLEVBQW9EO0FBQ2xELFlBQUlDLElBQUksR0FBR1QsSUFBSSxDQUFDSyxlQUFMLENBQXFCTixHQUFHLENBQUNPLElBQXpCLEVBQStCUCxHQUFHLENBQUNRLElBQW5DLENBQVg7O0FBQ0EsWUFBSVIsR0FBRyxDQUFDUyxJQUFKLEtBQWEsUUFBakIsRUFBMkI7QUFDekJDLGNBQUksR0FBRyx1QkFBdUJBLElBQXZCLEdBQThCLEdBQXJDO0FBQ0Q7O0FBQ0QsWUFBSVYsR0FBRyxDQUFDRSxRQUFKLEtBQWlCckIsU0FBUyxDQUFDc0IscUJBQVYsQ0FBZ0NRLFlBQXJELEVBQW1FO0FBQ2pFO0FBQ0E7QUFDQTtBQUNBRCxjQUFJLEdBQUcsZ0JBQ0wzQixVQUFVLENBQUM2QixXQUFYLENBQXVCLFlBQVlaLEdBQUcsQ0FBQ08sSUFBSixDQUFTWCxJQUFULENBQWMsR0FBZCxDQUFuQyxDQURLLEdBQ29ELElBRHBELEdBRUwsdUJBRkssR0FFcUJjLElBRnJCLEdBRTRCLE1BRm5DO0FBR0Q7O0FBQ0QsZUFBTzNCLFVBQVUsQ0FBQ3NCLFFBQVgsQ0FBb0JLLElBQXBCLENBQVA7QUFDRCxPQWRELE1BY08sSUFBSVYsR0FBRyxDQUFDUyxJQUFKLEtBQWEsV0FBYixJQUE0QlQsR0FBRyxDQUFDUyxJQUFKLEtBQWEsV0FBN0MsRUFBMEQ7QUFDL0QsWUFBSUYsSUFBSSxHQUFHUCxHQUFHLENBQUNPLElBQWY7QUFDQSxZQUFJQyxJQUFJLEdBQUdSLEdBQUcsQ0FBQ1EsSUFBZjs7QUFFQSxZQUFJUixHQUFHLENBQUNTLElBQUosS0FBYSxXQUFiLElBQ0ExQyxtQkFBbUIsQ0FBQ29CLGNBQXBCLENBQW1Db0IsSUFBSSxDQUFDLENBQUQsQ0FBdkMsQ0FESixFQUNpRDtBQUMvQztBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQSxjQUFJQSxJQUFJLENBQUNNLE1BQUwsR0FBYyxDQUFsQixFQUNFLE1BQU0sSUFBSUMsS0FBSixDQUFVLDJDQUEyQ1AsSUFBSSxDQUFDLENBQUQsQ0FBekQsQ0FBTjtBQUNGLGNBQUksQ0FBRUMsSUFBSSxDQUFDSyxNQUFYLEVBQ0UsTUFBTSxJQUFJQyxLQUFKLENBQVUsTUFBTVAsSUFBSSxDQUFDLENBQUQsQ0FBVixHQUFnQix1QkFBMUIsQ0FBTjtBQUVGLGNBQUlRLFFBQVEsR0FBRyxJQUFmLENBYitDLENBYy9DO0FBQ0E7QUFDQTs7QUFDQSxjQUFJUixJQUFJLENBQUMsQ0FBRCxDQUFKLEtBQVksTUFBWixJQUFzQkMsSUFBSSxDQUFDSyxNQUFMLElBQWUsQ0FBckMsSUFBMENMLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUSxDQUFSLE1BQWUsTUFBekQsSUFDQUEsSUFBSSxDQUFDLENBQUQsQ0FBSixDQUFRLENBQVIsRUFBV0ssTUFEWCxJQUNxQkwsSUFBSSxDQUFDLENBQUQsQ0FBSixDQUFRLENBQVIsRUFBVyxDQUFYLE1BQWtCLElBRDNDLEVBQ2lEO0FBQy9DO0FBQ0E7QUFDQSxnQkFBSVEsU0FBUyxHQUFHLG1DQUNWLHdDQUROO0FBRUEsZ0JBQUlDLEtBQUssR0FBR1QsSUFBSSxDQUFDLENBQUQsQ0FBaEI7O0FBQ0EsZ0JBQUksRUFBR0EsSUFBSSxDQUFDSyxNQUFMLElBQWUsQ0FBZixJQUFvQkksS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTSixNQUFULEtBQW9CLENBQTNDLENBQUosRUFBbUQ7QUFDakQ7QUFDQTtBQUNBLG9CQUFNLElBQUlDLEtBQUosQ0FBVSxzQkFBc0JFLFNBQWhDLENBQU47QUFDRCxhQVY4QyxDQVcvQzs7O0FBQ0EsZ0JBQUlFLFdBQVcsR0FBR1YsSUFBSSxDQUFDLENBQUQsQ0FBdEI7O0FBQ0EsZ0JBQUksRUFBR1UsV0FBVyxDQUFDLENBQUQsQ0FBWCxLQUFtQixNQUFuQixJQUE2QkEsV0FBVyxDQUFDLENBQUQsQ0FBWCxDQUFlTCxNQUFmLEtBQTBCLENBQXZELElBQ0FLLFdBQVcsQ0FBQyxDQUFELENBQVgsQ0FBZSxDQUFmLEVBQWtCQyxPQUFsQixDQUEwQixLQUExQixFQUFpQyxFQUFqQyxDQURILENBQUosRUFDOEM7QUFDNUMsb0JBQU0sSUFBSUwsS0FBSixDQUFVLDRCQUFWLENBQU47QUFDRDs7QUFDRCxnQkFBSU0sUUFBUSxHQUFHRixXQUFXLENBQUMsQ0FBRCxDQUFYLENBQWUsQ0FBZixDQUFmO0FBQ0FILG9CQUFRLEdBQUcsdUNBQ1RkLElBQUksQ0FBQ29CLG9CQUFMLENBQTBCYixJQUFJLENBQUNjLEtBQUwsQ0FBVyxDQUFYLENBQTFCLENBRFMsR0FFVCxlQUZTLEdBRVN2QyxVQUFVLENBQUM2QixXQUFYLENBQXVCUSxRQUF2QixDQUZULEdBRTRDLE9BRnZEO0FBR0QsV0F0QkQsTUFzQk8sSUFBSWIsSUFBSSxDQUFDLENBQUQsQ0FBSixLQUFZLEtBQWhCLEVBQXVCO0FBQzVCLGdCQUFJZ0IsU0FBUyxHQUFHLEVBQWhCOztBQUNBbkMsYUFBQyxDQUFDb0MsSUFBRixDQUFPaEIsSUFBUCxFQUFhLFVBQVVpQixHQUFWLEVBQWU7QUFDMUIsa0JBQUlBLEdBQUcsQ0FBQ1osTUFBSixLQUFlLENBQW5CLEVBQXNCO0FBQ3BCO0FBQ0Esc0JBQU0sSUFBSUMsS0FBSixDQUFVLHdCQUFWLENBQU47QUFDRDs7QUFDRCxrQkFBSVksTUFBTSxHQUFHRCxHQUFHLENBQUMsQ0FBRCxDQUFoQjtBQUNBRix1QkFBUyxDQUFDRyxNQUFELENBQVQsR0FDRSx5Q0FDQXpCLElBQUksQ0FBQzBCLGVBQUwsQ0FBcUJGLEdBQXJCLENBREEsR0FDNEIsTUFGOUI7QUFHRCxhQVREOztBQVVBVixvQkFBUSxHQUFHekIsaUJBQWlCLENBQUNpQyxTQUFELENBQTVCO0FBQ0Q7O0FBRUQsY0FBSSxDQUFFUixRQUFOLEVBQWdCO0FBQ2Q7QUFDQUEsb0JBQVEsR0FBR2QsSUFBSSxDQUFDMkIsd0JBQUwsQ0FBOEJwQixJQUE5QixLQUF1QyxNQUFsRDtBQUNELFdBekQ4QyxDQTJEL0M7OztBQUNBLGNBQUlxQixZQUFZLEdBQUssYUFBYTdCLEdBQWQsR0FDQUMsSUFBSSxDQUFDNkIsWUFBTCxDQUFrQjlCLEdBQUcsQ0FBQytCLE9BQXRCLENBREEsR0FDaUMsSUFEckQsQ0E1RCtDLENBOEQvQzs7QUFDQSxjQUFJQyxnQkFBZ0IsR0FBSyxpQkFBaUJoQyxHQUFsQixHQUNBQyxJQUFJLENBQUM2QixZQUFMLENBQWtCOUIsR0FBRyxDQUFDaUMsV0FBdEIsQ0FEQSxHQUNxQyxJQUQ3RDtBQUdBLGNBQUlDLFFBQVEsR0FBRyxDQUFDbkIsUUFBRCxFQUFXYyxZQUFYLENBQWY7QUFDQSxjQUFJRyxnQkFBSixFQUNFRSxRQUFRLENBQUN4QyxJQUFULENBQWNzQyxnQkFBZDtBQUVGLGlCQUFPakQsVUFBVSxDQUFDc0IsUUFBWCxDQUNMdEMsbUJBQW1CLENBQUN3QyxJQUFJLENBQUMsQ0FBRCxDQUFMLENBQW5CLEdBQStCLEdBQS9CLEdBQXFDMkIsUUFBUSxDQUFDdEMsSUFBVCxDQUFjLElBQWQsQ0FBckMsR0FBMkQsR0FEdEQsQ0FBUDtBQUdELFNBMUVELE1BMEVPO0FBQ0wsY0FBSXVDLFFBQVEsR0FBR2xDLElBQUksQ0FBQ21DLFdBQUwsQ0FBaUI3QixJQUFqQixFQUF1QjtBQUFDOEIsMEJBQWMsRUFBRTtBQUFqQixXQUF2QixDQUFmOztBQUNBLGNBQUk5QixJQUFJLENBQUNNLE1BQUwsR0FBYyxDQUFsQixFQUFxQjtBQUNuQjtBQUNBc0Isb0JBQVEsR0FBRyx5Q0FBeUNBLFFBQXpDLEdBQ1QsTUFERjtBQUVEOztBQUVELGNBQUlwQixRQUFRLEdBQUdkLElBQUksQ0FBQzJCLHdCQUFMLENBQThCNUIsR0FBRyxDQUFDUSxJQUFsQyxDQUFmO0FBQ0EsY0FBSXVCLE9BQU8sR0FBSyxhQUFhL0IsR0FBZCxHQUNBQyxJQUFJLENBQUM2QixZQUFMLENBQWtCOUIsR0FBRyxDQUFDK0IsT0FBdEIsQ0FEQSxHQUNpQyxJQURoRDtBQUVBLGNBQUlFLFdBQVcsR0FBSyxpQkFBaUJqQyxHQUFsQixHQUNBQyxJQUFJLENBQUM2QixZQUFMLENBQWtCOUIsR0FBRyxDQUFDaUMsV0FBdEIsQ0FEQSxHQUNxQyxJQUR4RDtBQUdBLGNBQUlLLFdBQVcsR0FBRyxDQUFDSCxRQUFELENBQWxCOztBQUNBLGNBQUlKLE9BQUosRUFBYTtBQUNYTyx1QkFBVyxDQUFDNUMsSUFBWixDQUFpQnFDLE9BQWpCO0FBQ0EsZ0JBQUlFLFdBQUosRUFDRUssV0FBVyxDQUFDNUMsSUFBWixDQUFpQnVDLFdBQWpCO0FBQ0g7O0FBRUQsY0FBSU0sV0FBVyxHQUNULHVCQUF1QkQsV0FBVyxDQUFDMUMsSUFBWixDQUFpQixJQUFqQixDQUF2QixHQUFnRCxHQUR0RCxDQXJCSyxDQXdCTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxjQUFJbUIsUUFBSixFQUFjO0FBQ1p3Qix1QkFBVyxHQUNULHlCQUF5QnhCLFFBQXpCLEdBQW9DLHlCQUFwQyxHQUNBd0IsV0FEQSxHQUNjLE1BRmhCO0FBR0QsV0FuQ0ksQ0FxQ0w7OztBQUNBLGNBQUksQ0FBQ2hDLElBQUksQ0FBQyxDQUFELENBQUosS0FBWSxJQUFaLElBQW9CQSxJQUFJLENBQUMsQ0FBRCxDQUFKLEtBQVksVUFBakMsTUFDQ0EsSUFBSSxDQUFDLENBQUQsQ0FBSixLQUFZLGNBQVosSUFBOEJBLElBQUksQ0FBQyxDQUFELENBQUosS0FBWSxXQUQzQyxDQUFKLEVBQzZEO0FBQzNEO0FBQ0FnQyx1QkFBVyxHQUFHLDREQUNWQSxXQURVLEdBQ0ksTUFEbEI7QUFFRDs7QUFFRCxpQkFBT3hELFVBQVUsQ0FBQ3NCLFFBQVgsQ0FBb0JrQyxXQUFwQixDQUFQO0FBQ0Q7QUFDRixPQTdITSxNQTZIQSxJQUFJdkMsR0FBRyxDQUFDUyxJQUFKLEtBQWEsUUFBakIsRUFBMkI7QUFDaEMsZUFBT1QsR0FBRyxDQUFDd0MsS0FBWDtBQUNELE9BRk0sTUFFQTtBQUNMO0FBQ0E7QUFDQSxjQUFNLElBQUkxQixLQUFKLENBQVUsbUNBQW1DZCxHQUFHLENBQUNTLElBQWpELENBQU47QUFDRDtBQUNGO0FBQ0YsR0E3SnlCO0FBK0oxQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBMkIsYUFBVyxFQUFFLFVBQVU3QixJQUFWLEVBQWdCa0MsSUFBaEIsRUFBc0I7QUFDakMsUUFBSTFFLG1CQUFtQixDQUFDb0IsY0FBcEIsQ0FBbUNvQixJQUFJLENBQUMsQ0FBRCxDQUF2QyxDQUFKLEVBQ0UsTUFBTSxJQUFJTyxLQUFKLENBQVUsNkJBQTZCUCxJQUFJLENBQUMsQ0FBRCxDQUFqQyxHQUF1QyxRQUFqRCxDQUFOLENBRitCLENBR2pDO0FBQ0E7QUFDQTtBQUNBOztBQUNBLFFBQUlBLElBQUksQ0FBQ00sTUFBTCxJQUFlLENBQWYsS0FDQ04sSUFBSSxDQUFDLENBQUQsQ0FBSixLQUFZLElBQVosSUFBb0JBLElBQUksQ0FBQyxDQUFELENBQUosS0FBWSxVQURqQyxLQUVHdkIscUJBQXFCLENBQUNHLGNBQXRCLENBQXFDb0IsSUFBSSxDQUFDLENBQUQsQ0FBekMsQ0FGUCxFQUVzRDtBQUNwRCxVQUFJQSxJQUFJLENBQUNNLE1BQUwsR0FBYyxDQUFsQixFQUNFLE1BQU0sSUFBSUMsS0FBSixDQUFVLDJDQUNBUCxJQUFJLENBQUMsQ0FBRCxDQURKLEdBQ1UsR0FEVixHQUNnQkEsSUFBSSxDQUFDLENBQUQsQ0FEOUIsQ0FBTjtBQUVGLGFBQU92QixxQkFBcUIsQ0FBQ3VCLElBQUksQ0FBQyxDQUFELENBQUwsQ0FBNUI7QUFDRDs7QUFFRCxRQUFJbUMsYUFBYSxHQUFHM0QsVUFBVSxDQUFDNkIsV0FBWCxDQUF1QkwsSUFBSSxDQUFDLENBQUQsQ0FBM0IsQ0FBcEI7QUFDQSxRQUFJb0MsWUFBWSxHQUFHLFFBQW5CO0FBQ0EsUUFBSUYsSUFBSSxJQUFJQSxJQUFJLENBQUNKLGNBQWIsSUFBK0I5QixJQUFJLENBQUNNLE1BQUwsS0FBZ0IsQ0FBbkQsRUFDRThCLFlBQVksR0FBRyxnQkFBZjtBQUNGLFFBQUlqQyxJQUFJLEdBQUcsVUFBVWlDLFlBQVYsR0FBeUIsR0FBekIsR0FBK0JELGFBQS9CLEdBQStDLEdBQTFEOztBQUVBLFFBQUluQyxJQUFJLENBQUNNLE1BQUwsR0FBYyxDQUFsQixFQUFxQjtBQUNuQkgsVUFBSSxHQUFHLG1CQUFtQkEsSUFBbkIsR0FBMEIsSUFBMUIsR0FDTHRCLENBQUMsQ0FBQ3dELEdBQUYsQ0FBTXJDLElBQUksQ0FBQ2UsS0FBTCxDQUFXLENBQVgsQ0FBTixFQUFxQnZDLFVBQVUsQ0FBQzZCLFdBQWhDLEVBQTZDaEIsSUFBN0MsQ0FBa0QsSUFBbEQsQ0FESyxHQUNxRCxHQUQ1RDtBQUVEOztBQUVELFdBQU9jLElBQVA7QUFDRCxHQXhNeUI7QUEwTTFCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQWlCLGlCQUFlLEVBQUUsVUFBVUYsR0FBVixFQUFlO0FBQzlCLFFBQUl4QixJQUFJLEdBQUcsSUFBWDtBQUVBLFFBQUk0QyxPQUFPLEdBQUdwQixHQUFHLENBQUMsQ0FBRCxDQUFqQjtBQUNBLFFBQUlxQixRQUFRLEdBQUdyQixHQUFHLENBQUMsQ0FBRCxDQUFsQjtBQUVBLFFBQUlzQixPQUFKOztBQUNBLFlBQVFGLE9BQVI7QUFDQSxXQUFLLFFBQUw7QUFDQSxXQUFLLFFBQUw7QUFDQSxXQUFLLFNBQUw7QUFDQSxXQUFLLE1BQUw7QUFDRUUsZUFBTyxHQUFHaEUsVUFBVSxDQUFDNkIsV0FBWCxDQUF1QmtDLFFBQXZCLENBQVY7QUFDQTs7QUFDRixXQUFLLE1BQUw7QUFDRUMsZUFBTyxHQUFHOUMsSUFBSSxDQUFDbUMsV0FBTCxDQUFpQlUsUUFBakIsQ0FBVjtBQUNBOztBQUNGLFdBQUssTUFBTDtBQUNFO0FBQ0FDLGVBQU8sR0FBRzlDLElBQUksQ0FBQ0ssZUFBTCxDQUFxQndDLFFBQVEsQ0FBQ3ZDLElBQTlCLEVBQW9DdUMsUUFBUSxDQUFDdEMsSUFBN0MsRUFBbUQsY0FBbkQsQ0FBVjtBQUNBOztBQUNGO0FBQ0U7QUFDQSxjQUFNLElBQUlNLEtBQUosQ0FBVSwwQkFBMEIrQixPQUFwQyxDQUFOO0FBaEJGOztBQW1CQSxXQUFPRSxPQUFQO0FBQ0QsR0ExT3lCO0FBNE8xQjtBQUNBO0FBQ0E7QUFDQXpDLGlCQUFlLEVBQUUsVUFBVUMsSUFBVixFQUFnQkMsSUFBaEIsRUFBc0J3QyxZQUF0QixFQUFvQztBQUNuRCxRQUFJL0MsSUFBSSxHQUFHLElBQVg7QUFFQSxRQUFJZ0QsUUFBUSxHQUFHaEQsSUFBSSxDQUFDbUMsV0FBTCxDQUFpQjdCLElBQWpCLENBQWY7QUFDQSxRQUFJd0MsT0FBTyxHQUFHOUMsSUFBSSxDQUFDaUQsbUJBQUwsQ0FBeUIxQyxJQUF6QixDQUFkO0FBQ0EsUUFBSTJDLFFBQVEsR0FBSUgsWUFBWSxJQUFJLFVBQWhDO0FBRUEsV0FBTyxlQUFlRyxRQUFmLEdBQTBCLEdBQTFCLEdBQWdDRixRQUFoQyxJQUNKRixPQUFPLEdBQUcsT0FBT0EsT0FBTyxDQUFDbkQsSUFBUixDQUFhLElBQWIsQ0FBVixHQUErQixFQURsQyxJQUN3QyxHQUQvQztBQUVELEdBeFB5QjtBQTBQMUI7QUFDQTtBQUNBc0QscUJBQW1CLEVBQUUsVUFBVUUsT0FBVixFQUFtQjtBQUN0QyxRQUFJbkQsSUFBSSxHQUFHLElBQVg7QUFFQSxRQUFJb0QsTUFBTSxHQUFHLElBQWIsQ0FIc0MsQ0FHbkI7O0FBQ25CLFFBQUk3QyxJQUFJLEdBQUcsSUFBWCxDQUpzQyxDQUlyQjtBQUVqQjs7QUFDQXBCLEtBQUMsQ0FBQ29DLElBQUYsQ0FBTzRCLE9BQVAsRUFBZ0IsVUFBVTNCLEdBQVYsRUFBZTtBQUM3QixVQUFJc0IsT0FBTyxHQUFHOUMsSUFBSSxDQUFDMEIsZUFBTCxDQUFxQkYsR0FBckIsQ0FBZDs7QUFFQSxVQUFJQSxHQUFHLENBQUNaLE1BQUosR0FBYSxDQUFqQixFQUFvQjtBQUNsQjtBQUNBd0MsY0FBTSxHQUFJQSxNQUFNLElBQUksRUFBcEI7QUFDQUEsY0FBTSxDQUFDNUIsR0FBRyxDQUFDLENBQUQsQ0FBSixDQUFOLEdBQWlCc0IsT0FBakI7QUFDRCxPQUpELE1BSU87QUFDTDtBQUNBdkMsWUFBSSxHQUFJQSxJQUFJLElBQUksRUFBaEI7QUFDQUEsWUFBSSxDQUFDZCxJQUFMLENBQVVxRCxPQUFWO0FBQ0Q7QUFDRixLQVpELEVBUHNDLENBcUJ0Qzs7O0FBQ0EsUUFBSU0sTUFBSixFQUFZO0FBQ1Y3QyxVQUFJLEdBQUlBLElBQUksSUFBSSxFQUFoQjtBQUNBQSxVQUFJLENBQUNkLElBQUwsQ0FBVSxrQkFBa0JKLGlCQUFpQixDQUFDK0QsTUFBRCxDQUFuQyxHQUE4QyxHQUF4RDtBQUNEOztBQUVELFdBQU83QyxJQUFQO0FBQ0QsR0F4UnlCO0FBMFIxQnNCLGNBQVksRUFBRSxVQUFVQyxPQUFWLEVBQW1CO0FBQy9CLFdBQU96RCxPQUFPLENBQUN5RCxPQUFELENBQWQ7QUFDRCxHQTVSeUI7QUE4UjFCVixzQkFBb0IsRUFBRSxVQUFVYixJQUFWLEVBQWdCO0FBQ3BDLFFBQUlQLElBQUksR0FBRyxJQUFYOztBQUVBLFFBQUksQ0FBRU8sSUFBSSxDQUFDSyxNQUFYLEVBQW1CO0FBQ2pCO0FBQ0EsYUFBTyxJQUFQO0FBQ0QsS0FIRCxNQUdPLElBQUlMLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUUssTUFBUixLQUFtQixDQUF2QixFQUEwQjtBQUMvQjtBQUNBLFVBQUlVLFNBQVMsR0FBRyxFQUFoQjs7QUFDQW5DLE9BQUMsQ0FBQ29DLElBQUYsQ0FBT2hCLElBQVAsRUFBYSxVQUFVaUIsR0FBVixFQUFlO0FBQzFCLFlBQUlDLE1BQU0sR0FBR0QsR0FBRyxDQUFDLENBQUQsQ0FBaEI7QUFDQUYsaUJBQVMsQ0FBQ0csTUFBRCxDQUFULEdBQW9CLG9CQUFvQnpCLElBQUksQ0FBQzBCLGVBQUwsQ0FBcUJGLEdBQXJCLENBQXBCLEdBQWdELEdBQXBFO0FBQ0QsT0FIRDs7QUFJQSxhQUFPbkMsaUJBQWlCLENBQUNpQyxTQUFELENBQXhCO0FBQ0QsS0FSTSxNQVFBLElBQUlmLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUSxDQUFSLE1BQWUsTUFBbkIsRUFBMkI7QUFDaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFPUCxJQUFJLENBQUMwQixlQUFMLENBQXFCbkIsSUFBSSxDQUFDLENBQUQsQ0FBekIsQ0FBUDtBQUNELEtBTk0sTUFNQSxJQUFJQSxJQUFJLENBQUNLLE1BQUwsS0FBZ0IsQ0FBcEIsRUFBdUI7QUFDNUI7QUFDQSxhQUFPLG9CQUFvQlosSUFBSSxDQUFDbUMsV0FBTCxDQUFpQjVCLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUSxDQUFSLENBQWpCLENBQXBCLEdBQW1ELEdBQTFEO0FBQ0QsS0FITSxNQUdBO0FBQ0w7QUFDQTtBQUNBLGFBQU9QLElBQUksQ0FBQ0ssZUFBTCxDQUFxQkUsSUFBSSxDQUFDLENBQUQsQ0FBSixDQUFRLENBQVIsQ0FBckIsRUFBaUNBLElBQUksQ0FBQ2MsS0FBTCxDQUFXLENBQVgsQ0FBakMsRUFDcUIsY0FEckIsQ0FBUDtBQUVEO0FBRUYsR0E1VHlCO0FBOFQxQk0sMEJBQXdCLEVBQUUsVUFBVXBCLElBQVYsRUFBZ0I7QUFDeEMsUUFBSVAsSUFBSSxHQUFHLElBQVg7QUFDQSxRQUFJYyxRQUFRLEdBQUdkLElBQUksQ0FBQ29CLG9CQUFMLENBQTBCYixJQUExQixDQUFmOztBQUNBLFFBQUlPLFFBQUosRUFBYztBQUNaLGFBQU8sMEJBQTBCQSxRQUExQixHQUFxQyxLQUE1QztBQUNELEtBRkQsTUFFTztBQUNMLGFBQU8sSUFBUDtBQUNEO0FBQ0Y7QUF0VXlCLENBQTVCLEU7Ozs7Ozs7Ozs7O0FDcEVBcEQsTUFBTSxDQUFDQyxNQUFQLENBQWM7QUFBQ1EsT0FBSyxFQUFDLE1BQUlBLEtBQVg7QUFBaUJDLFNBQU8sRUFBQyxNQUFJQSxPQUE3QjtBQUFxQ0UscUJBQW1CLEVBQUMsTUFBSUEsbUJBQTdEO0FBQWlGRCxTQUFPLEVBQUMsTUFBSUEsT0FBN0Y7QUFBcUdFLFVBQVEsRUFBQyxNQUFJQTtBQUFsSCxDQUFkO0FBQTJJLElBQUk4RSxNQUFKO0FBQVczRixNQUFNLENBQUNNLElBQVAsQ0FBWSxlQUFaLEVBQTRCO0FBQUNxRixRQUFNLENBQUNwRixDQUFELEVBQUc7QUFBQ29GLFVBQU0sR0FBQ3BGLENBQVA7QUFBUzs7QUFBcEIsQ0FBNUIsRUFBa0QsQ0FBbEQ7QUFBcUQsSUFBSVcsU0FBSjtBQUFjbEIsTUFBTSxDQUFDTSxJQUFQLENBQVksbUJBQVosRUFBZ0M7QUFBQ1ksV0FBUyxDQUFDWCxDQUFELEVBQUc7QUFBQ1csYUFBUyxHQUFDWCxDQUFWO0FBQVk7O0FBQTFCLENBQWhDLEVBQTRELENBQTVEO0FBQStELElBQUlZLElBQUo7QUFBU25CLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLGVBQVosRUFBNEI7QUFBQ2EsTUFBSSxDQUFDWixDQUFELEVBQUc7QUFBQ1ksUUFBSSxHQUFDWixDQUFMO0FBQU87O0FBQWhCLENBQTVCLEVBQThDLENBQTlDO0FBQWlELElBQUlhLFVBQUo7QUFBZXBCLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLG9CQUFaLEVBQWlDO0FBQUNjLFlBQVUsQ0FBQ2IsQ0FBRCxFQUFHO0FBQUNhLGNBQVUsR0FBQ2IsQ0FBWDtBQUFhOztBQUE1QixDQUFqQyxFQUErRCxDQUEvRDtBQUFrRSxJQUFJSixPQUFKO0FBQVlILE1BQU0sQ0FBQ00sSUFBUCxDQUFZLFdBQVosRUFBd0I7QUFBQ0gsU0FBTyxDQUFDSSxDQUFELEVBQUc7QUFBQ0osV0FBTyxHQUFDSSxDQUFSO0FBQVU7O0FBQXRCLENBQXhCLEVBQWdELENBQWhEO0FBQW1ELElBQUlDLFFBQUo7QUFBYVIsTUFBTSxDQUFDTSxJQUFQLENBQVksYUFBWixFQUEwQjtBQUFDRSxVQUFRLENBQUNELENBQUQsRUFBRztBQUFDQyxZQUFRLEdBQUNELENBQVQ7QUFBVzs7QUFBeEIsQ0FBMUIsRUFBb0QsQ0FBcEQ7QUFBdUQsSUFBSXFGLDhCQUFKO0FBQW1DNUYsTUFBTSxDQUFDTSxJQUFQLENBQVksU0FBWixFQUFzQjtBQUFDc0YsZ0NBQThCLENBQUNyRixDQUFELEVBQUc7QUFBQ3FGLGtDQUE4QixHQUFDckYsQ0FBL0I7QUFBaUM7O0FBQXBFLENBQXRCLEVBQTRGLENBQTVGO0FBQStGLElBQUlPLFdBQUo7QUFBZ0JkLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLGVBQVosRUFBNEI7QUFBQ1EsYUFBVyxDQUFDUCxDQUFELEVBQUc7QUFBQ08sZUFBVyxHQUFDUCxDQUFaO0FBQWM7O0FBQTlCLENBQTVCLEVBQTRELENBQTVEO0FBQStELElBQUlzRixnQkFBSjtBQUFxQjdGLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLGNBQVosRUFBMkI7QUFBQ3VGLGtCQUFnQixDQUFDdEYsQ0FBRCxFQUFHO0FBQUNzRixvQkFBZ0IsR0FBQ3RGLENBQWpCO0FBQW1COztBQUF4QyxDQUEzQixFQUFxRSxDQUFyRTtBQVU1d0IsSUFBSXVGLGNBQWMsR0FBRyxJQUFyQjs7QUFDQSxJQUFJSCxNQUFNLENBQUNJLFFBQVgsRUFBcUI7QUFDbkJELGdCQUFjLEdBQUdFLEdBQUcsQ0FBQ0MsT0FBSixDQUFZLFdBQVosRUFBeUJDLE1BQTFDO0FBQ0Q7O0FBRU0sU0FBU3pGLEtBQVQsQ0FBZTBGLEtBQWYsRUFBc0I7QUFDM0IsU0FBT2pGLFNBQVMsQ0FBQ2tGLGFBQVYsQ0FDTEQsS0FESyxFQUVMO0FBQUVFLGtCQUFjLEVBQUV2RixXQUFXLENBQUN3RjtBQUE5QixHQUZLLENBQVA7QUFHRDs7QUFFTSxTQUFTNUYsT0FBVCxDQUFpQnlGLEtBQWpCLEVBQXdCSSxPQUF4QixFQUFpQztBQUN0QyxNQUFJQyxJQUFJLEdBQUcvRixLQUFLLENBQUMwRixLQUFELENBQWhCO0FBQ0EsU0FBT3hGLE9BQU8sQ0FBQzZGLElBQUQsRUFBT0QsT0FBUCxDQUFkO0FBQ0Q7O0FBRU0sTUFBTTNGLG1CQUFtQixHQUFHTyxJQUFJLENBQUNzRixtQkFBTCxDQUF5QnZFLE1BQXpCLEVBQTVCO0FBQ1B0QixtQkFBbUIsQ0FBQzhGLEdBQXBCLENBQXdCO0FBQ3RCQyxhQUFXLEVBQUUsVUFBVUMsQ0FBVixFQUFhO0FBQ3hCLFFBQUlBLENBQUMsWUFBWTFGLFNBQVMsQ0FBQ0osV0FBM0IsRUFBd0M7QUFFdEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBSSxLQUFLK0YsZ0JBQVQsRUFDRUQsQ0FBQyxDQUFDckUsUUFBRixHQUFhckIsU0FBUyxDQUFDc0IscUJBQVYsQ0FBZ0NRLFlBQTdDO0FBRUYsYUFBTyxLQUFLOEQsT0FBTCxDQUFhMUUsa0JBQWIsQ0FBZ0N3RSxDQUFoQyxDQUFQO0FBQ0Q7O0FBRUQsV0FBT3pGLElBQUksQ0FBQ3NGLG1CQUFMLENBQXlCdEUsU0FBekIsQ0FBbUN3RSxXQUFuQyxDQUErQ0ksSUFBL0MsQ0FBb0QsSUFBcEQsRUFBMERILENBQTFELENBQVA7QUFDRCxHQWpCcUI7QUFrQnRCSSxpQkFBZSxFQUFFLFVBQVVDLEtBQVYsRUFBaUI7QUFDaEMsUUFBSUEsS0FBSyxZQUFZL0YsU0FBUyxDQUFDSixXQUEvQixFQUNFLE9BQU8sS0FBS2dHLE9BQUwsQ0FBYTFFLGtCQUFiLENBQWdDNkUsS0FBaEMsQ0FBUCxDQUY4QixDQUloQzs7QUFDQSxXQUFPOUYsSUFBSSxDQUFDc0YsbUJBQUwsQ0FBeUJ0RSxTQUF6QixDQUFtQzZFLGVBQW5DLENBQW1ERCxJQUFuRCxDQUF3RCxJQUF4RCxFQUE4REUsS0FBOUQsQ0FBUDtBQUNELEdBeEJxQjtBQXlCdEJDLGdCQUFjLEVBQUUsVUFBVTNGLElBQVYsRUFBZ0JzRCxLQUFoQixFQUF1QnhDLEdBQXZCLEVBQTRCO0FBQzFDLFNBQUt3RSxnQkFBTCxHQUF3QixJQUF4QjtBQUNBLFFBQUlNLE1BQU0sR0FBRyxLQUFLQyxLQUFMLENBQVd2QyxLQUFYLENBQWI7QUFDQSxTQUFLZ0MsZ0JBQUwsR0FBd0IsS0FBeEI7O0FBRUEsUUFBSU0sTUFBTSxLQUFLdEMsS0FBZixFQUFzQjtBQUNwQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFPekQsVUFBVSxDQUFDc0IsUUFBWCxDQUFvQixLQUFLb0UsT0FBTCxDQUFhM0MsWUFBYixDQUEwQmdELE1BQTFCLENBQXBCLENBQVA7QUFDRDs7QUFDRCxXQUFPQSxNQUFQO0FBQ0Q7QUF4Q3FCLENBQXhCOztBQTJDTyxTQUFTeEcsT0FBVCxDQUFrQjBHLFNBQWxCLEVBQTZCZCxPQUE3QixFQUFzQztBQUMzQztBQUNBO0FBQ0EsTUFBSWUsVUFBVSxHQUFJZixPQUFPLElBQUlBLE9BQU8sQ0FBQ2UsVUFBckM7QUFDQSxNQUFJQyxNQUFNLEdBQUloQixPQUFPLElBQUlBLE9BQU8sQ0FBQ2dCLE1BQWpDO0FBQ0EsTUFBSUMsVUFBVSxHQUFJakIsT0FBTyxJQUFJQSxPQUFPLENBQUNpQixVQUFyQztBQUNBLE1BQUlDLFVBQVUsR0FBSWxCLE9BQU8sSUFBSUEsT0FBTyxDQUFDa0IsVUFBckM7QUFFQSxNQUFJakIsSUFBSSxHQUFHYSxTQUFYLENBUjJDLENBVTNDOztBQUNBLE1BQUlDLFVBQVUsSUFBSUMsTUFBbEIsRUFBMEI7QUFDeEIsUUFBSSxPQUFPQyxVQUFQLEtBQXNCLFFBQXRCLElBQWtDQSxVQUFVLENBQUNFLFdBQVgsT0FBNkIsT0FBbkUsRUFBNEU7QUFDMUVsQixVQUFJLEdBQUdYLGdCQUFnQixDQUFDVyxJQUFELENBQXZCO0FBQ0QsS0FIdUIsQ0FJeEI7QUFDQTs7O0FBQ0FBLFFBQUksR0FBR2hHLFFBQVEsQ0FBQ2dHLElBQUQsQ0FBZjtBQUNELEdBbEIwQyxDQW9CM0M7OztBQUNBLE1BQUlaLDhCQUFKLENBQW1DO0FBQUM2QixjQUFVLEVBQUVBO0FBQWIsR0FBbkMsRUFDR0wsS0FESCxDQUNTWixJQURUO0FBR0EsTUFBSU0sT0FBTyxHQUFHLElBQUkzRyxPQUFKLEVBQWQ7QUFDQXFHLE1BQUksR0FBSSxJQUFJNUYsbUJBQUosQ0FDTjtBQUFDa0csV0FBTyxFQUFFQTtBQUFWLEdBRE0sQ0FBRCxDQUNnQk0sS0FEaEIsQ0FDc0JaLElBRHRCLENBQVA7QUFHQSxNQUFJekQsSUFBSSxHQUFHLGlCQUFYOztBQUNBLE1BQUl1RSxVQUFVLElBQUlDLE1BQWxCLEVBQTBCO0FBQ3hCeEUsUUFBSSxJQUFJLG1CQUFSO0FBQ0Q7O0FBQ0RBLE1BQUksSUFBSSxTQUFSO0FBQ0FBLE1BQUksSUFBSTNCLFVBQVUsQ0FBQ3VHLElBQVgsQ0FBZ0JuQixJQUFoQixDQUFSO0FBQ0F6RCxNQUFJLElBQUksTUFBUjtBQUVBQSxNQUFJLEdBQUdsQyxRQUFRLENBQUNrQyxJQUFELENBQWY7QUFFQSxTQUFPQSxJQUFQO0FBQ0Q7O0FBRU0sU0FBU2xDLFFBQVQsQ0FBbUJrQyxJQUFuQixFQUF5QjtBQUM5QixNQUFJLENBQUMrQyxjQUFMLEVBQXFCO0FBQ25CLFdBQU8vQyxJQUFQO0FBQ0Q7O0FBRUQsTUFBSW9FLE1BQU0sR0FBR3JCLGNBQWMsQ0FBQy9DLElBQUQsRUFBTztBQUNoQzZFLGNBQVUsRUFBRSxJQURvQjtBQUVoQ0MsVUFBTSxFQUFFLEtBRndCO0FBR2hDQyxZQUFRLEVBQUUsS0FIc0I7QUFJaENDLFVBQU0sRUFBRTtBQUNObEgsY0FBUSxFQUFFLElBREo7QUFFTm1ILGtCQUFZLEVBQUUsQ0FGUjtBQUdOQyxXQUFLLEVBQUU7QUFIRDtBQUp3QixHQUFQLENBQTNCO0FBV0EsTUFBSUYsTUFBTSxHQUFHWixNQUFNLENBQUNwRSxJQUFwQixDQWhCOEIsQ0FpQjlCO0FBQ0E7O0FBQ0FnRixRQUFNLEdBQUdBLE1BQU0sQ0FBQ3ZFLE9BQVAsQ0FBZSxJQUFmLEVBQXFCLEVBQXJCLENBQVQ7QUFDQSxTQUFPdUUsTUFBUDtBQUNELEM7Ozs7Ozs7Ozs7O0FDcElEL0gsTUFBTSxDQUFDQyxNQUFQLENBQWM7QUFBQ2lJLE9BQUssRUFBQyxNQUFJQSxLQUFYO0FBQWlCQyxpQkFBZSxFQUFDLE1BQUlBLGVBQXJDO0FBQXFEM0gsVUFBUSxFQUFDLE1BQUlBO0FBQWxFLENBQWQ7QUFBMkYsSUFBSVUsU0FBSjtBQUFjbEIsTUFBTSxDQUFDTSxJQUFQLENBQVksbUJBQVosRUFBZ0M7QUFBQ1ksV0FBUyxDQUFDWCxDQUFELEVBQUc7QUFBQ1csYUFBUyxHQUFDWCxDQUFWO0FBQVk7O0FBQTFCLENBQWhDLEVBQTRELENBQTVEO0FBQStELElBQUlZLElBQUo7QUFBU25CLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLGVBQVosRUFBNEI7QUFBQ2EsTUFBSSxDQUFDWixDQUFELEVBQUc7QUFBQ1ksUUFBSSxHQUFDWixDQUFMO0FBQU87O0FBQWhCLENBQTVCLEVBQThDLENBQTlDOztBQUdqTDtBQUNBO0FBRUEsSUFBSTZILFFBQVEsR0FBRyxVQUFVdkQsS0FBVixFQUFpQjtBQUM5QixTQUFPLFlBQVk7QUFBRSxXQUFPQSxLQUFQO0FBQWUsR0FBcEM7QUFDRCxDQUZEOztBQUlBLElBQUl3RCxXQUFXLEdBQUc7QUFDaEJDLE1BQUksRUFBRSxDQURVO0FBRWhCQyxPQUFLLEVBQUUsQ0FGUztBQUdoQkMsTUFBSSxFQUFFO0FBSFUsQ0FBbEIsQyxDQU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsSUFBSUMsa0JBQWtCLEdBQUd0SCxJQUFJLENBQUN1SCxPQUFMLENBQWF4RyxNQUFiLEVBQXpCO0FBQ0F1RyxrQkFBa0IsQ0FBQy9CLEdBQW5CLENBQXVCO0FBQ3JCaUMsV0FBUyxFQUFFUCxRQUFRLENBQUNDLFdBQVcsQ0FBQ0csSUFBYixDQURFO0FBRXJCSSxnQkFBYyxFQUFFUixRQUFRLENBQUNDLFdBQVcsQ0FBQ0csSUFBYixDQUZIO0FBR3JCSyxjQUFZLEVBQUVULFFBQVEsQ0FBQ0MsV0FBVyxDQUFDRyxJQUFiLENBSEQ7QUFJckJNLGNBQVksRUFBRVYsUUFBUSxDQUFDQyxXQUFXLENBQUNHLElBQWIsQ0FKRDtBQUtyQk8sVUFBUSxFQUFFWCxRQUFRLENBQUNDLFdBQVcsQ0FBQ0csSUFBYixDQUxHO0FBTXJCN0IsYUFBVyxFQUFFeUIsUUFBUSxDQUFDQyxXQUFXLENBQUNDLElBQWIsQ0FOQTtBQU9yQlUsZUFBYSxFQUFFWixRQUFRLENBQUNDLFdBQVcsQ0FBQ0MsSUFBYixDQVBGO0FBUXJCVyxZQUFVLEVBQUUsVUFBVXJDLENBQVYsRUFBYTtBQUN2QixTQUFLLElBQUlzQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHdEMsQ0FBQyxDQUFDMUQsTUFBdEIsRUFBOEJnRyxDQUFDLEVBQS9CLEVBQ0UsSUFBSSxLQUFLOUIsS0FBTCxDQUFXUixDQUFDLENBQUNzQyxDQUFELENBQVosTUFBcUJiLFdBQVcsQ0FBQ0csSUFBckMsRUFDRSxPQUFPSCxXQUFXLENBQUNFLEtBQW5COztBQUNKLFdBQU9GLFdBQVcsQ0FBQ0csSUFBbkI7QUFDRCxHQWJvQjtBQWNyQlcsVUFBUSxFQUFFLFVBQVU5RyxHQUFWLEVBQWU7QUFDdkIsUUFBSStHLE9BQU8sR0FBRy9HLEdBQUcsQ0FBQytHLE9BQWxCOztBQUNBLFFBQUlBLE9BQU8sS0FBSyxVQUFoQixFQUE0QjtBQUMxQjtBQUNBO0FBQ0EsYUFBT2YsV0FBVyxDQUFDQyxJQUFuQjtBQUNELEtBSkQsTUFJTyxJQUFJYyxPQUFPLEtBQUssUUFBaEIsRUFBMEI7QUFDL0I7QUFDQSxhQUFPZixXQUFXLENBQUNDLElBQW5CO0FBQ0QsS0FITSxNQUdBLElBQUksRUFBR25ILElBQUksQ0FBQ2tJLGNBQUwsQ0FBb0JELE9BQXBCLEtBQ0EsQ0FBRWpJLElBQUksQ0FBQ21JLGlCQUFMLENBQXVCRixPQUF2QixDQURMLENBQUosRUFDMkM7QUFDaEQ7QUFDQSxhQUFPZixXQUFXLENBQUNDLElBQW5CO0FBQ0QsS0FKTSxNQUlBLElBQUljLE9BQU8sS0FBSyxPQUFoQixFQUF5QjtBQUM5QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQU9mLFdBQVcsQ0FBQ0UsS0FBbkI7QUFDRCxLQU5NLE1BTUEsSUFBSWEsT0FBTyxLQUFLLElBQWhCLEVBQXFCO0FBQzFCLGFBQU9mLFdBQVcsQ0FBQ0UsS0FBbkI7QUFDRDs7QUFFRCxRQUFJZ0IsUUFBUSxHQUFHbEgsR0FBRyxDQUFDa0gsUUFBbkI7O0FBQ0EsU0FBSyxJQUFJTCxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHSyxRQUFRLENBQUNyRyxNQUE3QixFQUFxQ2dHLENBQUMsRUFBdEMsRUFDRSxJQUFJLEtBQUs5QixLQUFMLENBQVdtQyxRQUFRLENBQUNMLENBQUQsQ0FBbkIsTUFBNEJiLFdBQVcsQ0FBQ0csSUFBNUMsRUFDRSxPQUFPSCxXQUFXLENBQUNFLEtBQW5COztBQUVKLFFBQUksS0FBS3ZCLGVBQUwsQ0FBcUIzRSxHQUFHLENBQUM0RSxLQUF6QixNQUFvQ29CLFdBQVcsQ0FBQ0csSUFBcEQsRUFDRSxPQUFPSCxXQUFXLENBQUNFLEtBQW5CO0FBRUYsV0FBT0YsV0FBVyxDQUFDRyxJQUFuQjtBQUNELEdBOUNvQjtBQStDckJ4QixpQkFBZSxFQUFFLFVBQVVDLEtBQVYsRUFBaUI7QUFDaEMsUUFBSUEsS0FBSixFQUFXO0FBQ1QsVUFBSXVDLE9BQU8sR0FBR3JJLElBQUksQ0FBQ3FJLE9BQUwsQ0FBYXZDLEtBQWIsQ0FBZDs7QUFDQSxXQUFLLElBQUlpQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxJQUFJTSxPQUFPLEdBQUd2QyxLQUFLLENBQUMvRCxNQUFULEdBQWtCLENBQTdCLENBQWpCLEVBQWtEZ0csQ0FBQyxFQUFuRCxFQUF1RDtBQUNyRCxZQUFJTyxDQUFDLEdBQUlELE9BQU8sR0FBR3ZDLEtBQUssQ0FBQ2lDLENBQUQsQ0FBUixHQUFjakMsS0FBOUI7QUFDQSxZQUFLLE9BQU93QyxDQUFQLEtBQWEsUUFBZCxJQUE0QkEsQ0FBQyxZQUFZdkksU0FBUyxDQUFDSixXQUF2RCxFQUNFLE9BQU91SCxXQUFXLENBQUNFLEtBQW5COztBQUNGLGFBQUssSUFBSXpHLENBQVQsSUFBYzJILENBQWQsRUFDRSxJQUFJLEtBQUtyQyxLQUFMLENBQVdxQyxDQUFDLENBQUMzSCxDQUFELENBQVosTUFBcUJ1RyxXQUFXLENBQUNHLElBQXJDLEVBQ0UsT0FBT0gsV0FBVyxDQUFDRSxLQUFuQjtBQUNMO0FBQ0Y7O0FBQ0QsV0FBT0YsV0FBVyxDQUFDRyxJQUFuQjtBQUNEO0FBNURvQixDQUF2Qjs7QUErREEsSUFBSWtCLGlCQUFpQixHQUFHLFVBQVV0RixPQUFWLEVBQW1CO0FBQ3pDLFNBQVEsSUFBSXFFLGtCQUFKLEVBQUQsQ0FBeUJyQixLQUF6QixDQUErQmhELE9BQS9CLENBQVA7QUFDRCxDQUZEOztBQUlPLFNBQVM4RCxLQUFULENBQWV0QixDQUFmLEVBQWtCO0FBQ3ZCLFNBQU96RixJQUFJLENBQUN3SSxHQUFMLENBQVN4SSxJQUFJLENBQUN5SSxNQUFMLENBQVloRCxDQUFaLENBQVQsQ0FBUDtBQUNEOztBQUVNLE1BQU11QixlQUFlLEdBQUdoSCxJQUFJLENBQUNzRixtQkFBTCxDQUF5QnZFLE1BQXpCLEVBQXhCO0FBQ1BpRyxlQUFlLENBQUN6QixHQUFoQixDQUFvQjtBQUNsQk0saUJBQWUsRUFBRSxVQUFVQztBQUFLO0FBQWYsSUFBMEI7QUFDekM7QUFDQSxRQUFJQSxLQUFLLFlBQVkvRixTQUFTLENBQUNKLFdBQS9CLEVBQ0UsT0FBT21HLEtBQVA7QUFFRixXQUFPOUYsSUFBSSxDQUFDc0YsbUJBQUwsQ0FBeUJ0RSxTQUF6QixDQUFtQzZFLGVBQW5DLENBQW1ENkMsS0FBbkQsQ0FDTCxJQURLLEVBQ0NDLFNBREQsQ0FBUDtBQUVEO0FBUmlCLENBQXBCLEUsQ0FXQTtBQUNBOztBQUNBLElBQUlDLGlCQUFpQixHQUFHNUIsZUFBZSxDQUFDakcsTUFBaEIsRUFBeEI7QUFDQTZILGlCQUFpQixDQUFDckQsR0FBbEIsQ0FBc0I7QUFDcEJpQyxXQUFTLEVBQUVULEtBRFM7QUFFcEJVLGdCQUFjLEVBQUVWLEtBRkk7QUFHcEJXLGNBQVksRUFBRVgsS0FITTtBQUlwQlksY0FBWSxFQUFFWixLQUpNO0FBS3BCZSxZQUFVLEVBQUUsVUFBVWUsS0FBVixFQUFpQjtBQUMzQixRQUFJQyxjQUFjLEdBQUdQLGlCQUFpQixDQUFDTSxLQUFELENBQXRDOztBQUNBLFFBQUlDLGNBQWMsS0FBSzVCLFdBQVcsQ0FBQ0csSUFBbkMsRUFBeUM7QUFDdkMsYUFBT04sS0FBSyxDQUFDOEIsS0FBRCxDQUFaO0FBQ0QsS0FGRCxNQUVPLElBQUlDLGNBQWMsS0FBSzVCLFdBQVcsQ0FBQ0UsS0FBbkMsRUFBMEM7QUFDL0MsYUFBT0osZUFBZSxDQUFDaEcsU0FBaEIsQ0FBMEI4RyxVQUExQixDQUFxQ2xDLElBQXJDLENBQTBDLElBQTFDLEVBQWdEaUQsS0FBaEQsQ0FBUDtBQUNELEtBRk0sTUFFQTtBQUNMLGFBQU9BLEtBQVA7QUFDRDtBQUNGLEdBZG1CO0FBZXBCYixVQUFRLEVBQUUsVUFBVTlHLEdBQVYsRUFBZTtBQUN2QixRQUFJNEgsY0FBYyxHQUFHUCxpQkFBaUIsQ0FBQ3JILEdBQUQsQ0FBdEM7O0FBQ0EsUUFBSTRILGNBQWMsS0FBSzVCLFdBQVcsQ0FBQ0csSUFBbkMsRUFBeUM7QUFDdkMsYUFBT04sS0FBSyxDQUFDN0YsR0FBRCxDQUFaO0FBQ0QsS0FGRCxNQUVPLElBQUk0SCxjQUFjLEtBQUs1QixXQUFXLENBQUNFLEtBQW5DLEVBQTBDO0FBQy9DLGFBQU9KLGVBQWUsQ0FBQ2hHLFNBQWhCLENBQTBCZ0gsUUFBMUIsQ0FBbUNwQyxJQUFuQyxDQUF3QyxJQUF4QyxFQUE4QzFFLEdBQTlDLENBQVA7QUFDRCxLQUZNLE1BRUE7QUFDTCxhQUFPQSxHQUFQO0FBQ0Q7QUFDRixHQXhCbUI7QUF5QnBCNkgsZUFBYSxFQUFFLFVBQVVYLFFBQVYsRUFBb0I7QUFDakM7QUFDQSxXQUFPcEIsZUFBZSxDQUFDaEcsU0FBaEIsQ0FBMEI4RyxVQUExQixDQUFxQ2xDLElBQXJDLENBQTBDLElBQTFDLEVBQWdEd0MsUUFBaEQsQ0FBUDtBQUNELEdBNUJtQjtBQTZCcEJ2QyxpQkFBZSxFQUFFLFVBQVVDLEtBQVYsRUFBaUI7QUFDaEMsV0FBT0EsS0FBUDtBQUNEO0FBL0JtQixDQUF0QixFLENBa0NBOztBQUNBLElBQUlrRCxvQkFBb0IsR0FBR2hDLGVBQWUsQ0FBQ2pHLE1BQWhCLEVBQTNCO0FBQ0FpSSxvQkFBb0IsQ0FBQ3pELEdBQXJCLENBQXlCO0FBQ3ZCdUMsWUFBVSxFQUFFLFVBQVVlLEtBQVYsRUFBaUI7QUFDM0IsUUFBSTdDLE1BQU0sR0FBRyxFQUFiOztBQUNBLFNBQUssSUFBSStCLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdjLEtBQUssQ0FBQzlHLE1BQTFCLEVBQWtDZ0csQ0FBQyxFQUFuQyxFQUF1QztBQUNyQyxVQUFJa0IsSUFBSSxHQUFHSixLQUFLLENBQUNkLENBQUQsQ0FBaEI7O0FBQ0EsVUFBS2tCLElBQUksWUFBWWpKLElBQUksQ0FBQ3dJLEdBQXRCLEtBQ0UsQ0FBRVMsSUFBSSxDQUFDdkYsS0FBUixJQUNDc0MsTUFBTSxDQUFDakUsTUFBUCxJQUNDaUUsTUFBTSxDQUFDQSxNQUFNLENBQUNqRSxNQUFQLEdBQWdCLENBQWpCLENBQU4sWUFBcUMvQixJQUFJLENBQUN3SSxHQUg3QyxDQUFKLEVBR3lEO0FBQ3ZEO0FBQ0E7QUFDQTtBQUNBLFlBQUlTLElBQUksQ0FBQ3ZGLEtBQVQsRUFBZ0I7QUFDZHNDLGdCQUFNLENBQUNBLE1BQU0sQ0FBQ2pFLE1BQVAsR0FBZ0IsQ0FBakIsQ0FBTixHQUE0Qi9CLElBQUksQ0FBQ3dJLEdBQUwsQ0FDMUJ4QyxNQUFNLENBQUNBLE1BQU0sQ0FBQ2pFLE1BQVAsR0FBZ0IsQ0FBakIsQ0FBTixDQUEwQjJCLEtBQTFCLEdBQWtDdUYsSUFBSSxDQUFDdkYsS0FEYixDQUE1QjtBQUVEO0FBQ0YsT0FYRCxNQVdPO0FBQ0xzQyxjQUFNLENBQUNwRixJQUFQLENBQVksS0FBS3FGLEtBQUwsQ0FBV2dELElBQVgsQ0FBWjtBQUNEO0FBQ0Y7O0FBQ0QsV0FBT2pELE1BQVA7QUFDRDtBQXJCc0IsQ0FBekIsRSxDQXdCQTtBQUNBOztBQUNBLElBQUlrRCxtQkFBbUIsR0FBR2xDLGVBQWUsQ0FBQ2pHLE1BQWhCLEVBQTFCO0FBQ0FtSSxtQkFBbUIsQ0FBQzNELEdBQXBCLENBQXdCO0FBQ3RCcUMsVUFBUSxFQUFFLFVBQVV1QixHQUFWLEVBQWU7QUFDdkIsUUFBSUMsSUFBSSxHQUFHRCxHQUFHLENBQUN6RixLQUFmOztBQUNBLFFBQUkwRixJQUFJLENBQUM3SSxPQUFMLENBQWEsR0FBYixJQUFvQixDQUFwQixJQUF5QjZJLElBQUksQ0FBQzdJLE9BQUwsQ0FBYSxHQUFiLElBQW9CLENBQWpELEVBQW9EO0FBQ2xELGFBQU82SSxJQUFQO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsYUFBT0QsR0FBUDtBQUNEO0FBQ0Y7QUFScUIsQ0FBeEI7O0FBV08sU0FBUzlKLFFBQVQsQ0FBbUJnRyxJQUFuQixFQUF5QjtBQUM5QkEsTUFBSSxHQUFJLElBQUl1RCxpQkFBSixFQUFELENBQXdCM0MsS0FBeEIsQ0FBOEJaLElBQTlCLENBQVA7QUFDQUEsTUFBSSxHQUFJLElBQUkyRCxvQkFBSixFQUFELENBQTJCL0MsS0FBM0IsQ0FBaUNaLElBQWpDLENBQVA7QUFDQUEsTUFBSSxHQUFJLElBQUk2RCxtQkFBSixFQUFELENBQTBCakQsS0FBMUIsQ0FBZ0NaLElBQWhDLENBQVA7QUFDQSxTQUFPQSxJQUFQO0FBQ0QsQzs7Ozs7Ozs7Ozs7QUNqTUR4RyxNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDMkYsZ0NBQThCLEVBQUMsTUFBSUE7QUFBcEMsQ0FBZDtBQUFtRixJQUFJMUUsU0FBSjtBQUFjbEIsTUFBTSxDQUFDTSxJQUFQLENBQVksbUJBQVosRUFBZ0M7QUFBQ1ksV0FBUyxDQUFDWCxDQUFELEVBQUc7QUFBQ1csYUFBUyxHQUFDWCxDQUFWO0FBQVk7O0FBQTFCLENBQWhDLEVBQTRELENBQTVEO0FBQStELElBQUlZLElBQUo7QUFBU25CLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLGVBQVosRUFBNEI7QUFBQ2EsTUFBSSxDQUFDWixDQUFELEVBQUc7QUFBQ1ksUUFBSSxHQUFDWixDQUFMO0FBQU87O0FBQWhCLENBQTVCLEVBQThDLENBQTlDO0FBQWlELElBQUlhLFVBQUo7QUFBZXBCLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLG9CQUFaLEVBQWlDO0FBQUNjLFlBQVUsQ0FBQ2IsQ0FBRCxFQUFHO0FBQUNhLGNBQVUsR0FBQ2IsQ0FBWDtBQUFhOztBQUE1QixDQUFqQyxFQUErRCxDQUEvRDtBQVlsTyxNQUFNcUYsOEJBQThCLEdBQUd6RSxJQUFJLENBQUN1SCxPQUFMLENBQWF4RyxNQUFiLEVBQXZDO0FBQ1AwRCw4QkFBOEIsQ0FBQ2MsR0FBL0IsQ0FBbUM7QUFDakN1QyxZQUFVLEVBQUUsVUFBVWUsS0FBVixFQUFpQlEsU0FBakIsRUFBNEI7QUFDdEMsU0FBSyxJQUFJdEIsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR2MsS0FBSyxDQUFDOUcsTUFBMUIsRUFBa0NnRyxDQUFDLEVBQW5DLEVBQXVDO0FBQ3JDLFdBQUs5QixLQUFMLENBQVc0QyxLQUFLLENBQUNkLENBQUQsQ0FBaEIsRUFBcUJzQixTQUFyQjtBQUNEO0FBQ0YsR0FMZ0M7QUFNakM3RCxhQUFXLEVBQUUsVUFBVS9FLEdBQVYsRUFBZTRJLFNBQWYsRUFBMEI7QUFDckMsUUFBSTVJLEdBQUcsQ0FBQ2tCLElBQUosS0FBYSxXQUFiLElBQTRCbEIsR0FBRyxDQUFDZ0IsSUFBSixDQUFTTSxNQUFULEtBQW9CLENBQWhELElBQXFEdEIsR0FBRyxDQUFDZ0IsSUFBSixDQUFTLENBQVQsTUFBZ0IsT0FBekUsRUFBa0Y7QUFDaEYsVUFBSSxDQUFDNEgsU0FBTCxFQUFnQjtBQUNkLGNBQU0sSUFBSXJILEtBQUosQ0FDSixxREFDSyxLQUFLc0UsVUFBTCxHQUFtQixTQUFTLEtBQUtBLFVBQWpDLEdBQStDLEVBRHBELElBRU8sd0hBSEgsQ0FBTjtBQUlEOztBQUVELFVBQUlnRCxXQUFXLEdBQUcsQ0FBbEI7O0FBQ0EsV0FBSyxJQUFJdkIsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR3NCLFNBQVMsQ0FBQ2pCLFFBQVYsQ0FBbUJyRyxNQUF2QyxFQUErQ2dHLENBQUMsRUFBaEQsRUFBb0Q7QUFDbEQsWUFBSXdCLEtBQUssR0FBR0YsU0FBUyxDQUFDakIsUUFBVixDQUFtQkwsQ0FBbkIsQ0FBWjs7QUFDQSxZQUFJd0IsS0FBSyxLQUFLOUksR0FBVixJQUFpQixFQUFFLE9BQU84SSxLQUFQLEtBQWlCLFFBQWpCLElBQTZCQSxLQUFLLENBQUNDLEtBQU4sQ0FBWSxPQUFaLENBQS9CLENBQXJCLEVBQTJFO0FBQ3pFRixxQkFBVztBQUNaO0FBQ0Y7O0FBRUQsVUFBSUEsV0FBVyxHQUFHLENBQWxCLEVBQXFCO0FBQ25CLGNBQU0sSUFBSXRILEtBQUosQ0FDSix1RUFDSyxLQUFLc0UsVUFBTCxHQUFtQixTQUFTLEtBQUtBLFVBQWpDLEdBQStDLEVBRHBELElBRU8sd0hBSEgsQ0FBTjtBQUlEO0FBQ0Y7QUFDRixHQTlCZ0M7QUErQmpDMEIsVUFBUSxFQUFFLFVBQVU5RyxHQUFWLEVBQWU7QUFDdkIsU0FBSzRHLFVBQUwsQ0FBZ0I1RyxHQUFHLENBQUNrSCxRQUFwQixFQUE4QmxIO0FBQUk7QUFBbEM7QUFDRDtBQWpDZ0MsQ0FBbkMsRTs7Ozs7Ozs7Ozs7QUNiQXJDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjO0FBQUNhLGFBQVcsRUFBQyxNQUFJQTtBQUFqQixDQUFkO0FBQTZDLElBQUlJLFNBQUo7QUFBY2xCLE1BQU0sQ0FBQ00sSUFBUCxDQUFZLG1CQUFaLEVBQWdDO0FBQUNZLFdBQVMsQ0FBQ1gsQ0FBRCxFQUFHO0FBQUNXLGFBQVMsR0FBQ1gsQ0FBVjtBQUFZOztBQUExQixDQUFoQyxFQUE0RCxDQUE1RDtBQUErRCxJQUFJWSxJQUFKO0FBQVNuQixNQUFNLENBQUNNLElBQVAsQ0FBWSxlQUFaLEVBQTRCO0FBQUNhLE1BQUksQ0FBQ1osQ0FBRCxFQUFHO0FBQUNZLFFBQUksR0FBQ1osQ0FBTDtBQUFPOztBQUFoQixDQUE1QixFQUE4QyxDQUE5QztBQUFpRCxJQUFJYSxVQUFKO0FBQWVwQixNQUFNLENBQUNNLElBQVAsQ0FBWSxvQkFBWixFQUFpQztBQUFDYyxZQUFVLENBQUNiLENBQUQsRUFBRztBQUFDYSxjQUFVLEdBQUNiLENBQVg7QUFBYTs7QUFBNUIsQ0FBakMsRUFBK0QsQ0FBL0Q7QUFJbk07QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQSxJQUFJaUMscUJBQXFCLEdBQUd0QixTQUFTLENBQUNzQixxQkFBdEM7O0FBRU8sU0FBUzFCLFdBQVQsR0FBd0I7QUFDN0JJLFdBQVMsQ0FBQ0osV0FBVixDQUFzQitJLEtBQXRCLENBQTRCLElBQTVCLEVBQWtDQyxTQUFsQztBQUNEOztBQUVEaEosV0FBVyxDQUFDcUIsU0FBWixHQUF3QixJQUFJakIsU0FBUyxDQUFDSixXQUFkLEVBQXhCO0FBQ0FBLFdBQVcsQ0FBQ3FCLFNBQVosQ0FBc0J5SSxlQUF0QixHQUF3QywrQkFBeEM7O0FBRUEsSUFBSUMsdUJBQXVCLEdBQUcsVUFBVUMsQ0FBVixFQUFhO0FBQ3pDLFNBQU8sSUFBSUMsTUFBSixDQUFXRCxDQUFDLENBQUNFLE1BQUYsR0FBVyxjQUFjQSxNQUFwQyxFQUNXRixDQUFDLENBQUNHLFVBQUYsR0FBZSxHQUFmLEdBQXFCLEVBRGhDLENBQVA7QUFFRCxDQUhELEMsQ0FLQTtBQUNBO0FBQ0E7OztBQUNBLElBQUlDLE1BQU0sR0FBRztBQUNYQyxRQUFNLEVBQUUsZ0JBREc7QUFFWEMsTUFBSSxFQUFFUCx1QkFBdUIsQ0FBQyxrQ0FBRCxDQUZsQjtBQUdYUSxRQUFNLEVBQUVSLHVCQUF1QixDQUFDLGdCQUFELENBSHBCO0FBSVhTLFFBQU0sRUFBRVQsdUJBQXVCLENBQUMsa0JBQUQsQ0FKcEI7QUFLWFUsY0FBWSxFQUFFVix1QkFBdUIsQ0FBQyxhQUFELENBTDFCO0FBTVhXLFNBQU8sRUFBRVgsdUJBQXVCLENBQUMsV0FBRCxDQU5yQjtBQU9YWSxXQUFTLEVBQUVaLHVCQUF1QixDQUFDLG9CQUFELENBUHZCO0FBUVhhLFdBQVMsRUFBRWIsdUJBQXVCLENBQUMsb0JBQUQsQ0FSdkI7QUFTWGMsWUFBVSxFQUFFZCx1QkFBdUIsQ0FBQyxxQkFBRDtBQVR4QixDQUFiO0FBWUEsSUFBSWUsSUFBSSxHQUFHO0FBQ1RQLFFBQU0sRUFBRSxVQURDO0FBRVRDLFFBQU0sRUFBRSxZQUZDO0FBR1RPLE1BQUksRUFBRTtBQUhHLENBQVg7QUFNQSxJQUFJQyxVQUFVLEdBQUc7QUFDZlQsUUFBTSxFQUFFLElBRE87QUFFZkMsUUFBTSxFQUFFLEtBRk87QUFHZk8sTUFBSSxFQUFFO0FBSFMsQ0FBakIsQyxDQU1BO0FBQ0E7QUFDQTtBQUNBOztBQUNBL0ssV0FBVyxDQUFDTCxLQUFaLEdBQW9CLFVBQVVzTCxlQUFWLEVBQTJCO0FBQzdDLE1BQUlDLE9BQU8sR0FBR0QsZUFBZDtBQUNBLE1BQUksT0FBT0MsT0FBUCxLQUFtQixRQUF2QixFQUNFQSxPQUFPLEdBQUcsSUFBSTlLLFNBQVMsQ0FBQytLLE9BQWQsQ0FBc0JGLGVBQXRCLENBQVY7QUFFRixNQUFJLEVBQUdDLE9BQU8sQ0FBQ0UsSUFBUixPQUFtQixHQUFuQixJQUNDRixPQUFPLENBQUNHLElBQVIsRUFBRCxDQUFpQnhJLEtBQWpCLENBQXVCLENBQXZCLEVBQTBCLENBQTFCLE1BQWlDLElBRHBDLENBQUosRUFFRSxPQUFPLElBQVA7O0FBRUYsTUFBSXlJLEdBQUcsR0FBRyxVQUFVQyxLQUFWLEVBQWlCO0FBQ3pCO0FBQ0EsUUFBSWxGLE1BQU0sR0FBR2tGLEtBQUssQ0FBQ0MsSUFBTixDQUFXTixPQUFPLENBQUNHLElBQVIsRUFBWCxDQUFiO0FBQ0EsUUFBSSxDQUFFaEYsTUFBTixFQUNFLE9BQU8sSUFBUDtBQUNGLFFBQUlvRixHQUFHLEdBQUdwRixNQUFNLENBQUMsQ0FBRCxDQUFoQjtBQUNBNkUsV0FBTyxDQUFDUSxHQUFSLElBQWVELEdBQUcsQ0FBQ3JKLE1BQW5CO0FBQ0EsV0FBT3FKLEdBQVA7QUFDRCxHQVJEOztBQVVBLE1BQUlFLE9BQU8sR0FBRyxVQUFVQyxNQUFWLEVBQWtCO0FBQzlCVixXQUFPLENBQUNRLEdBQVIsSUFBZUUsTUFBZjtBQUNELEdBRkQ7O0FBSUEsTUFBSUMsY0FBYyxHQUFHLFVBQVVDLGFBQVYsRUFBeUI7QUFDNUMsUUFBSUMsRUFBRSxHQUFHekwsVUFBVSxDQUFDMEwsMkJBQVgsQ0FBdUNkLE9BQXZDLENBQVQ7O0FBQ0EsUUFBSSxDQUFFYSxFQUFOLEVBQVU7QUFDUkUsY0FBUSxDQUFDLFlBQUQsQ0FBUjtBQUNEOztBQUNELFFBQUlILGFBQWEsS0FDWkMsRUFBRSxLQUFLLE1BQVAsSUFBaUJBLEVBQUUsS0FBSyxNQUF4QixJQUFrQ0EsRUFBRSxLQUFLLE9BRDdCLENBQWpCLEVBRUViLE9BQU8sQ0FBQ2dCLEtBQVIsQ0FBYyxtRUFBZDtBQUVGLFdBQU9ILEVBQVA7QUFDRCxHQVZEOztBQVlBLE1BQUlJLFFBQVEsR0FBRyxZQUFZO0FBQ3pCLFFBQUlDLFFBQVEsR0FBRyxFQUFmLENBRHlCLENBR3pCOztBQUNBLFFBQUlDLElBQUo7O0FBQ0EsUUFBS0EsSUFBSSxHQUFHZixHQUFHLENBQUMsVUFBRCxDQUFmLEVBQThCO0FBQzVCLFVBQUlnQixXQUFXLEdBQUcsR0FBbEIsQ0FENEIsQ0FDTDs7QUFDdkIsVUFBSUMsYUFBYSxHQUFHLE1BQU1DLElBQU4sQ0FBV0gsSUFBWCxDQUFwQjtBQUVBLFVBQUlFLGFBQUosRUFDRUYsSUFBSSxHQUFHQSxJQUFJLENBQUN4SixLQUFMLENBQVcsQ0FBWCxFQUFjLENBQUMsQ0FBZixDQUFQOztBQUVGbEMsT0FBQyxDQUFDb0MsSUFBRixDQUFPc0osSUFBSSxDQUFDSSxLQUFMLENBQVcsR0FBWCxDQUFQLEVBQXdCLFVBQVNDLFNBQVQsRUFBb0JDLEtBQXBCLEVBQTJCO0FBQ2pELFlBQUlBLEtBQUssS0FBSyxDQUFkLEVBQWlCO0FBQ2YsY0FBSUQsU0FBUyxLQUFLLEdBQWQsSUFBcUJBLFNBQVMsS0FBSyxJQUF2QyxFQUNFVCxRQUFRLENBQUMsMEJBQUQsQ0FBUjtBQUNILFNBSEQsTUFHTztBQUNMLGNBQUlTLFNBQVMsS0FBSyxJQUFsQixFQUNFVCxRQUFRLENBQUMsZUFBRCxDQUFSO0FBQ0g7O0FBRUQsWUFBSVMsU0FBUyxLQUFLLElBQWxCLEVBQ0VKLFdBQVcsSUFBSSxHQUFmO0FBQ0gsT0FYRDs7QUFhQUYsY0FBUSxDQUFDbkwsSUFBVCxDQUFjcUwsV0FBZDtBQUVBLFVBQUksQ0FBQ0MsYUFBTCxFQUNFLE9BQU9ILFFBQVA7QUFDSDs7QUFFRCxXQUFPLElBQVAsRUFBYTtBQUNYO0FBRUEsVUFBSWQsR0FBRyxDQUFDLEtBQUQsQ0FBUCxFQUFnQjtBQUNkLFlBQUlzQixHQUFHLEdBQUd0QixHQUFHLENBQUMsYUFBRCxDQUFiO0FBQ0EsWUFBSSxDQUFFc0IsR0FBTixFQUNFQyxLQUFLLENBQUMsMkJBQUQsQ0FBTDtBQUNGRCxXQUFHLEdBQUdBLEdBQUcsQ0FBQy9KLEtBQUosQ0FBVSxDQUFWLEVBQWEsQ0FBQyxDQUFkLENBQU47QUFDQSxZQUFJLENBQUUrSixHQUFGLElBQVMsQ0FBRVIsUUFBUSxDQUFDaEssTUFBeEIsRUFDRXlLLEtBQUssQ0FBQyxvQ0FBRCxDQUFMO0FBQ0ZULGdCQUFRLENBQUNuTCxJQUFULENBQWMyTCxHQUFkO0FBQ0QsT0FSRCxNQVFPO0FBQ0wsWUFBSWIsRUFBRSxHQUFHRixjQUFjLENBQUMsQ0FBRU8sUUFBUSxDQUFDaEssTUFBWixDQUF2Qjs7QUFDQSxZQUFJMkosRUFBRSxLQUFLLE1BQVgsRUFBbUI7QUFDakIsY0FBSSxDQUFFSyxRQUFRLENBQUNoSyxNQUFmLEVBQXVCO0FBQ3JCO0FBQ0FnSyxvQkFBUSxDQUFDbkwsSUFBVCxDQUFjLEdBQWQ7QUFDRCxXQUhELE1BR087QUFDTDRMLGlCQUFLLENBQUMsZ0hBQUQsQ0FBTDtBQUNEO0FBQ0YsU0FQRCxNQU9PO0FBQ0xULGtCQUFRLENBQUNuTCxJQUFULENBQWM4SyxFQUFkO0FBQ0Q7QUFDRjs7QUFFRCxVQUFJZSxHQUFHLEdBQUd4QixHQUFHLENBQUMsU0FBRCxDQUFiO0FBQ0EsVUFBSSxDQUFFd0IsR0FBTixFQUNFO0FBQ0g7O0FBRUQsV0FBT1YsUUFBUDtBQUNELEdBOURELENBbkM2QyxDQW1HN0M7QUFDQTtBQUNBO0FBQ0E7OztBQUNBLE1BQUlXLGNBQWMsR0FBRyxZQUFZO0FBQy9CLFFBQUlsRCxLQUFLLEdBQUcscUNBQXFDMkIsSUFBckMsQ0FBMENOLE9BQU8sQ0FBQ0csSUFBUixFQUExQyxDQUFaOztBQUNBLFFBQUl4QixLQUFKLEVBQVc7QUFDVHFCLGFBQU8sQ0FBQ1EsR0FBUixJQUFlN0IsS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTekgsTUFBeEI7QUFDQSxhQUFPeUgsS0FBSyxDQUFDLENBQUQsQ0FBWjtBQUNELEtBSEQsTUFHTztBQUNMLGFBQU8sSUFBUDtBQUNEO0FBQ0YsR0FSRCxDQXZHNkMsQ0FpSDdDO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQSxNQUFJbUQsT0FBTyxHQUFHLFlBQVk7QUFDeEIsUUFBSUMsT0FBTyxHQUFHRixjQUFjLEVBQTVCLENBRHdCLENBQ1E7O0FBQ2hDLFFBQUloSixLQUFLLEdBQUdtSixZQUFZLEVBQXhCO0FBQ0EsV0FBT0QsT0FBTyxHQUFHbEosS0FBSyxDQUFDb0osTUFBTixDQUFhRixPQUFiLENBQUgsR0FBMkJsSixLQUF6QztBQUNELEdBSkQsQ0FySDZDLENBMkg3QztBQUNBOzs7QUFDQSxNQUFJbUosWUFBWSxHQUFHLFlBQVk7QUFDN0IsUUFBSUUsUUFBUSxHQUFHbEMsT0FBTyxDQUFDUSxHQUF2QjtBQUNBLFFBQUlyRixNQUFKOztBQUNBLFFBQUtBLE1BQU0sR0FBRy9GLFVBQVUsQ0FBQytNLFdBQVgsQ0FBdUJuQyxPQUF2QixDQUFkLEVBQWdEO0FBQzlDLGFBQU8sQ0FBQyxRQUFELEVBQVc3RSxNQUFNLENBQUN0QyxLQUFsQixDQUFQO0FBQ0QsS0FGRCxNQUVPLElBQUtzQyxNQUFNLEdBQUcvRixVQUFVLENBQUNnTixrQkFBWCxDQUE4QnBDLE9BQTlCLENBQWQsRUFBdUQ7QUFDNUQsYUFBTyxDQUFDLFFBQUQsRUFBVzdFLE1BQU0sQ0FBQ3RDLEtBQWxCLENBQVA7QUFDRCxLQUZNLE1BRUEsSUFBSSxVQUFVeUksSUFBVixDQUFldEIsT0FBTyxDQUFDRSxJQUFSLEVBQWYsQ0FBSixFQUFvQztBQUN6QyxhQUFPLENBQUMsTUFBRCxFQUFTZSxRQUFRLEVBQWpCLENBQVA7QUFDRCxLQUZNLE1BRUEsSUFBSWIsR0FBRyxDQUFDLEtBQUQsQ0FBUCxFQUFnQjtBQUNyQixhQUFPLENBQUMsTUFBRCxFQUFTaUMsUUFBUSxDQUFDLE1BQUQsQ0FBakIsQ0FBUDtBQUNELEtBRk0sTUFFQSxJQUFLbEgsTUFBTSxHQUFHL0YsVUFBVSxDQUFDMEwsMkJBQVgsQ0FBdUNkLE9BQXZDLENBQWQsRUFBZ0U7QUFDckUsVUFBSWEsRUFBRSxHQUFHMUYsTUFBVDs7QUFDQSxVQUFJMEYsRUFBRSxLQUFLLE1BQVgsRUFBbUI7QUFDakIsZUFBTyxDQUFDLE1BQUQsRUFBUyxJQUFULENBQVA7QUFDRCxPQUZELE1BRU8sSUFBSUEsRUFBRSxLQUFLLE1BQVAsSUFBaUJBLEVBQUUsS0FBSyxPQUE1QixFQUFxQztBQUMxQyxlQUFPLENBQUMsU0FBRCxFQUFZQSxFQUFFLEtBQUssTUFBbkIsQ0FBUDtBQUNELE9BRk0sTUFFQTtBQUNMYixlQUFPLENBQUNRLEdBQVIsR0FBYzBCLFFBQWQsQ0FESyxDQUNtQjs7QUFDeEIsZUFBTyxDQUFDLE1BQUQsRUFBU2pCLFFBQVEsRUFBakIsQ0FBUDtBQUNEO0FBQ0YsS0FWTSxNQVVBO0FBQ0xGLGNBQVEsQ0FBQyxxRkFBRCxDQUFSO0FBQ0Q7QUFDRixHQXhCRDs7QUEwQkEsTUFBSXNCLFFBQVEsR0FBRyxVQUFVdkwsSUFBVixFQUFnQjtBQUM3QixRQUFJd0wsT0FBTyxHQUFHeEwsSUFBZDtBQUNBLFFBQUlBLElBQUksS0FBSyxXQUFULElBQXdCQSxJQUFJLEtBQUssV0FBakMsSUFBZ0RBLElBQUksS0FBSyxNQUE3RCxFQUNFd0wsT0FBTyxHQUFHLFFBQVY7QUFFRixRQUFJak0sR0FBRyxHQUFHLElBQUl2QixXQUFKLEVBQVY7QUFDQXVCLE9BQUcsQ0FBQ1MsSUFBSixHQUFXQSxJQUFYO0FBQ0FULE9BQUcsQ0FBQ08sSUFBSixHQUFXcUssUUFBUSxFQUFuQjtBQUNBNUssT0FBRyxDQUFDUSxJQUFKLEdBQVcsRUFBWDtBQUNBLFFBQUkwTCxVQUFVLEdBQUcsS0FBakI7O0FBQ0EsV0FBTyxJQUFQLEVBQWE7QUFDWG5DLFNBQUcsQ0FBQyxNQUFELENBQUg7QUFDQSxVQUFJQSxHQUFHLENBQUNSLElBQUksQ0FBQzBDLE9BQUQsQ0FBTCxDQUFQLEVBQ0UsTUFERixLQUVLLElBQUksUUFBUWhCLElBQVIsQ0FBYXRCLE9BQU8sQ0FBQ0UsSUFBUixFQUFiLENBQUosRUFBa0M7QUFDckNhLGdCQUFRLENBQUMsTUFBTWpCLFVBQVUsQ0FBQ3dDLE9BQUQsQ0FBaEIsR0FBNEIsR0FBN0IsQ0FBUjtBQUNEO0FBQ0QsVUFBSUUsTUFBTSxHQUFHVixPQUFPLEVBQXBCOztBQUNBLFVBQUlVLE1BQU0sQ0FBQ3RMLE1BQVAsS0FBa0IsQ0FBdEIsRUFBeUI7QUFDdkJxTCxrQkFBVSxHQUFHLElBQWI7QUFDRCxPQUZELE1BRU87QUFDTCxZQUFJQSxVQUFKLEVBQ0VaLEtBQUssQ0FBQyw0REFBRCxDQUFMO0FBQ0g7O0FBQ0R0TCxTQUFHLENBQUNRLElBQUosQ0FBU2QsSUFBVCxDQUFjeU0sTUFBZCxFQWRXLENBZ0JYOztBQUNBLFVBQUlwQyxHQUFHLENBQUMsYUFBRCxDQUFILEtBQXVCLEVBQTNCLEVBQ0VXLFFBQVEsQ0FBQyxPQUFELENBQVI7QUFDSDs7QUFFRCxXQUFPMUssR0FBUDtBQUNELEdBaENEOztBQWtDQSxNQUFJUyxJQUFKOztBQUVBLE1BQUk2SyxLQUFLLEdBQUcsVUFBVWMsR0FBVixFQUFlO0FBQ3pCekMsV0FBTyxDQUFDZ0IsS0FBUixDQUFjeUIsR0FBZDtBQUNELEdBRkQ7O0FBSUEsTUFBSTFCLFFBQVEsR0FBRyxVQUFVMkIsSUFBVixFQUFnQjtBQUM3QmYsU0FBSyxDQUFDLGNBQWNlLElBQWYsQ0FBTDtBQUNELEdBRkQsQ0EvTDZDLENBbU03QztBQUNBOzs7QUFDQSxNQUFJdEMsR0FBRyxDQUFDbEIsTUFBTSxDQUFDQyxNQUFSLENBQVAsRUFBd0JySSxJQUFJLEdBQUcsUUFBUCxDQUF4QixLQUNLLElBQUlzSixHQUFHLENBQUNsQixNQUFNLENBQUNFLElBQVIsQ0FBUCxFQUFzQnRJLElBQUksR0FBRyxNQUFQLENBQXRCLEtBQ0EsSUFBSXNKLEdBQUcsQ0FBQ2xCLE1BQU0sQ0FBQ0csTUFBUixDQUFQLEVBQXdCdkksSUFBSSxHQUFHLFFBQVAsQ0FBeEIsS0FDQSxJQUFJc0osR0FBRyxDQUFDbEIsTUFBTSxDQUFDSSxNQUFSLENBQVAsRUFBd0J4SSxJQUFJLEdBQUcsUUFBUCxDQUF4QixLQUNBLElBQUlzSixHQUFHLENBQUNsQixNQUFNLENBQUNLLFlBQVIsQ0FBUCxFQUE4QnpJLElBQUksR0FBRyxjQUFQLENBQTlCLEtBQ0EsSUFBSXNKLEdBQUcsQ0FBQ2xCLE1BQU0sQ0FBQ00sT0FBUixDQUFQLEVBQXlCMUksSUFBSSxHQUFHLFNBQVAsQ0FBekIsS0FDQSxJQUFJc0osR0FBRyxDQUFDbEIsTUFBTSxDQUFDTyxTQUFSLENBQVAsRUFBMkIzSSxJQUFJLEdBQUcsV0FBUCxDQUEzQixLQUNBLElBQUlzSixHQUFHLENBQUNsQixNQUFNLENBQUNRLFNBQVIsQ0FBUCxFQUEyQjVJLElBQUksR0FBRyxXQUFQLENBQTNCLEtBQ0EsSUFBSXNKLEdBQUcsQ0FBQ2xCLE1BQU0sQ0FBQ1MsVUFBUixDQUFQLEVBQTRCN0ksSUFBSSxHQUFHLFlBQVAsQ0FBNUIsS0FFSDZLLEtBQUssQ0FBQyxvQkFBRCxDQUFMO0FBRUYsTUFBSXRMLEdBQUcsR0FBRyxJQUFJdkIsV0FBSixFQUFWO0FBQ0F1QixLQUFHLENBQUNTLElBQUosR0FBV0EsSUFBWDs7QUFFQSxNQUFJQSxJQUFJLEtBQUssY0FBYixFQUE2QjtBQUMzQixRQUFJcUUsTUFBTSxHQUFHaUYsR0FBRyxDQUFDLHFCQUFELENBQWhCO0FBQ0EsUUFBSSxDQUFFakYsTUFBTixFQUNFd0csS0FBSyxDQUFDLHdCQUFELENBQUw7QUFDRnRMLE9BQUcsQ0FBQ3dDLEtBQUosR0FBWXNDLE1BQU0sQ0FBQ3hELEtBQVAsQ0FBYSxDQUFiLEVBQWdCd0QsTUFBTSxDQUFDd0gsV0FBUCxDQUFtQixJQUFuQixDQUFoQixDQUFaO0FBQ0QsR0FMRCxNQUtPLElBQUk3TCxJQUFJLEtBQUssU0FBYixFQUF3QjtBQUM3QixRQUFJcUUsTUFBTSxHQUFHaUYsR0FBRyxDQUFDLGVBQUQsQ0FBaEI7QUFDQSxRQUFJLENBQUVqRixNQUFOLEVBQ0V3RyxLQUFLLENBQUMsa0JBQUQsQ0FBTDtBQUNGdEwsT0FBRyxDQUFDd0MsS0FBSixHQUFZc0MsTUFBTSxDQUFDeEQsS0FBUCxDQUFhLENBQWIsRUFBZ0IsQ0FBQyxDQUFqQixDQUFaO0FBQ0QsR0FMTSxNQUtBLElBQUliLElBQUksS0FBSyxZQUFiLEVBQTJCO0FBQ2hDVCxPQUFHLENBQUNPLElBQUosR0FBV3FLLFFBQVEsRUFBbkI7QUFDQSxRQUFJLENBQUViLEdBQUcsQ0FBQ1IsSUFBSSxDQUFDUCxNQUFOLENBQVQsRUFDRTBCLFFBQVEsQ0FBQyxNQUFELENBQVI7QUFDSCxHQUpNLE1BSUEsSUFBSWpLLElBQUksS0FBSyxNQUFiLEVBQXFCO0FBQzFCLFFBQUksQ0FBRXNKLEdBQUcsQ0FBQ1IsSUFBSSxDQUFDUCxNQUFOLENBQVQsRUFBd0I7QUFDdEJoSixTQUFHLEdBQUdnTSxRQUFRLENBQUN2TCxJQUFELENBQWQ7QUFDRDtBQUNGLEdBSk0sTUFJQSxJQUFJQSxJQUFJLEtBQUssUUFBYixFQUF1QjtBQUM1QixRQUFJcUUsTUFBTSxHQUFHaUYsR0FBRyxDQUFDLFFBQUQsQ0FBaEI7QUFDQS9KLE9BQUcsQ0FBQ3dDLEtBQUosR0FBWSxPQUFPc0MsTUFBTSxDQUFDeEQsS0FBUCxDQUFhLENBQWIsRUFBZ0IsQ0FBQyxDQUFqQixDQUFuQjtBQUNELEdBSE0sTUFHQTtBQUNMO0FBQ0F0QixPQUFHLEdBQUdnTSxRQUFRLENBQUN2TCxJQUFELENBQWQ7QUFDRDs7QUFFRCxTQUFPVCxHQUFQO0FBQ0QsQ0EvT0QsQyxDQWlQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQXZCLFdBQVcsQ0FBQ29MLElBQVosR0FBbUIsVUFBVUYsT0FBVixFQUFtQjtBQUNwQyxNQUFJa0MsUUFBUSxHQUFHbEMsT0FBTyxDQUFDUSxHQUF2QjtBQUNBLE1BQUlyRixNQUFNLEdBQUdyRyxXQUFXLENBQUNMLEtBQVosQ0FBa0J1TCxPQUFsQixDQUFiO0FBQ0FBLFNBQU8sQ0FBQ1EsR0FBUixHQUFjMEIsUUFBZDtBQUNBLFNBQU8vRyxNQUFQO0FBQ0QsQ0FMRCxDLENBT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQXJHLFdBQVcsQ0FBQ3dGLGdCQUFaLEdBQStCLFVBQVV5RixlQUFWLEVBQTJCeEosUUFBM0IsRUFBcUM7QUFDbEUsTUFBSXlKLE9BQU8sR0FBR0QsZUFBZDtBQUNBLE1BQUksT0FBT0MsT0FBUCxLQUFtQixRQUF2QixFQUNFQSxPQUFPLEdBQUcsSUFBSTlLLFNBQVMsQ0FBQytLLE9BQWQsQ0FBc0JGLGVBQXRCLENBQVY7QUFFRixNQUFJbUMsUUFBUSxHQUFHbEMsT0FBTyxDQUFDUSxHQUF2QixDQUxrRSxDQUt0Qzs7QUFDNUIsTUFBSXJGLE1BQU0sR0FBR3JHLFdBQVcsQ0FBQ0wsS0FBWixDQUFrQnNMLGVBQWxCLENBQWI7QUFDQSxNQUFJLENBQUU1RSxNQUFOLEVBQ0UsT0FBT0EsTUFBUDtBQUVGLE1BQUlBLE1BQU0sQ0FBQ3JFLElBQVAsS0FBZ0IsY0FBcEIsRUFDRSxPQUFPLElBQVA7QUFFRixNQUFJcUUsTUFBTSxDQUFDckUsSUFBUCxLQUFnQixTQUFwQixFQUNFLE9BQU8sSUFBUDtBQUVGLE1BQUlxRSxNQUFNLENBQUNyRSxJQUFQLEtBQWdCLE1BQXBCLEVBQ0VrSixPQUFPLENBQUNnQixLQUFSLENBQWMscUJBQWQ7QUFFRixNQUFJN0YsTUFBTSxDQUFDckUsSUFBUCxLQUFnQixZQUFwQixFQUNFa0osT0FBTyxDQUFDZ0IsS0FBUixDQUFjLGlDQUFkO0FBRUZ6SyxVQUFRLEdBQUlBLFFBQVEsSUFBSUMscUJBQXFCLENBQUNvTSxPQUE5QztBQUNBLE1BQUlyTSxRQUFRLEtBQUtDLHFCQUFxQixDQUFDb00sT0FBdkMsRUFDRXpILE1BQU0sQ0FBQzVFLFFBQVAsR0FBa0JBLFFBQWxCOztBQUVGLE1BQUk0RSxNQUFNLENBQUNyRSxJQUFQLEtBQWdCLFdBQXBCLEVBQWlDO0FBQy9CO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFJK0wsU0FBUyxHQUFHMUgsTUFBTSxDQUFDdkUsSUFBUCxDQUFZWCxJQUFaLENBQWlCLEdBQWpCLENBQWhCO0FBRUEsUUFBSTZNLFFBQVEsR0FBRyxJQUFmOztBQUNFLFFBQUlELFNBQVMsS0FBSyxVQUFkLElBQ0F0TSxRQUFRLEtBQUtDLHFCQUFxQixDQUFDdU0sVUFEdkMsRUFDbUQ7QUFDakRELGNBQVEsR0FBRzNOLElBQUksQ0FBQzZOLFFBQUwsQ0FBY0MsTUFBekI7QUFDRCxLQUhELE1BR08sSUFBSTFNLFFBQVEsS0FBS0MscUJBQXFCLENBQUMwTSxTQUFuQyxJQUNBM00sUUFBUSxLQUFLQyxxQkFBcUIsQ0FBQ1EsWUFEdkMsRUFDcUQ7QUFDMUQ4TCxjQUFRLEdBQUczTixJQUFJLENBQUM2TixRQUFMLENBQWNHLE1BQXpCO0FBQ0Q7O0FBQ0QsUUFBSUMsYUFBYSxHQUFHO0FBQ2xCL0ksb0JBQWMsRUFBRXZGLFdBQVcsQ0FBQ3dGLGdCQURWO0FBRWxCK0ksZ0JBQVUsRUFBRUMsb0JBRk07QUFHbEJSLGNBQVEsRUFBRUE7QUFIUSxLQUFwQjtBQUtGM0gsVUFBTSxDQUFDMkgsUUFBUCxHQUFrQkEsUUFBbEI7QUFDQTNILFVBQU0sQ0FBQy9DLE9BQVAsR0FBaUJsRCxTQUFTLENBQUNrRixhQUFWLENBQXdCNEYsT0FBeEIsRUFBaUNvRCxhQUFqQyxDQUFqQjtBQUVBLFFBQUlwRCxPQUFPLENBQUNHLElBQVIsR0FBZXhJLEtBQWYsQ0FBcUIsQ0FBckIsRUFBd0IsQ0FBeEIsTUFBK0IsSUFBbkMsRUFDRXFJLE9BQU8sQ0FBQ2dCLEtBQVIsQ0FBYywwQ0FBMEM2QixTQUF4RDtBQUVGLFFBQUlVLE9BQU8sR0FBR3ZELE9BQU8sQ0FBQ1EsR0FBdEIsQ0E1QitCLENBNEJKOztBQUMzQixRQUFJZ0QsT0FBTyxHQUFHMU8sV0FBVyxDQUFDTCxLQUFaLENBQWtCdUwsT0FBbEIsQ0FBZCxDQTdCK0IsQ0E2Qlc7O0FBRTFDLFFBQUl5RCxrQkFBa0IsR0FBR3RJLE1BQXpCOztBQUNBLFdBQU9xSSxPQUFPLENBQUMxTSxJQUFSLEtBQWlCLE1BQXhCLEVBQWdDO0FBQzlCLFVBQUkyTSxrQkFBa0IsS0FBSyxJQUEzQixFQUFpQztBQUMvQnpELGVBQU8sQ0FBQ2dCLEtBQVIsQ0FBYyxnQ0FBZDtBQUNEOztBQUVELFVBQUl3QyxPQUFPLENBQUM1TSxJQUFaLEVBQWtCO0FBQ2hCNk0sMEJBQWtCLENBQUNuTCxXQUFuQixHQUFpQyxJQUFJeEQsV0FBSixFQUFqQztBQUNBMk8sMEJBQWtCLENBQUNuTCxXQUFuQixDQUErQnhCLElBQS9CLEdBQXNDLFdBQXRDO0FBQ0EyTSwwQkFBa0IsQ0FBQ25MLFdBQW5CLENBQStCMUIsSUFBL0IsR0FBc0M0TSxPQUFPLENBQUM1TSxJQUE5QztBQUNBNk0sMEJBQWtCLENBQUNuTCxXQUFuQixDQUErQnpCLElBQS9CLEdBQXNDMk0sT0FBTyxDQUFDM00sSUFBOUM7QUFDQTRNLDBCQUFrQixDQUFDbkwsV0FBbkIsQ0FBK0J3SyxRQUEvQixHQUEwQ0EsUUFBMUM7QUFDQVcsMEJBQWtCLENBQUNuTCxXQUFuQixDQUErQkYsT0FBL0IsR0FBeUNsRCxTQUFTLENBQUNrRixhQUFWLENBQXdCNEYsT0FBeEIsRUFBaUNvRCxhQUFqQyxDQUF6QztBQUVBSywwQkFBa0IsR0FBR0Esa0JBQWtCLENBQUNuTCxXQUF4QztBQUNELE9BVEQsTUFVSztBQUNIO0FBQ0FtTCwwQkFBa0IsQ0FBQ25MLFdBQW5CLEdBQWlDcEQsU0FBUyxDQUFDa0YsYUFBVixDQUF3QjRGLE9BQXhCLEVBQWlDb0QsYUFBakMsQ0FBakM7QUFFQUssMEJBQWtCLEdBQUcsSUFBckI7QUFDRDs7QUFFRCxVQUFJekQsT0FBTyxDQUFDRyxJQUFSLEdBQWV4SSxLQUFmLENBQXFCLENBQXJCLEVBQXdCLENBQXhCLE1BQStCLElBQW5DLEVBQ0VxSSxPQUFPLENBQUNnQixLQUFSLENBQWMsOEJBQThCNkIsU0FBNUM7QUFFRlUsYUFBTyxHQUFHdkQsT0FBTyxDQUFDUSxHQUFsQjtBQUNBZ0QsYUFBTyxHQUFHMU8sV0FBVyxDQUFDTCxLQUFaLENBQWtCdUwsT0FBbEIsQ0FBVjtBQUNEOztBQUVELFFBQUl3RCxPQUFPLENBQUMxTSxJQUFSLEtBQWlCLFlBQXJCLEVBQW1DO0FBQ2pDLFVBQUk0TSxVQUFVLEdBQUdGLE9BQU8sQ0FBQzVNLElBQVIsQ0FBYVgsSUFBYixDQUFrQixHQUFsQixDQUFqQjs7QUFDQSxVQUFJNE0sU0FBUyxLQUFLYSxVQUFsQixFQUE4QjtBQUM1QjFELGVBQU8sQ0FBQ1EsR0FBUixHQUFjK0MsT0FBZDtBQUNBdkQsZUFBTyxDQUFDZ0IsS0FBUixDQUFjLDJCQUEyQjZCLFNBQTNCLEdBQXVDLFVBQXZDLEdBQ0FhLFVBRGQ7QUFFRDtBQUNGLEtBUEQsTUFPTztBQUNMMUQsYUFBTyxDQUFDUSxHQUFSLEdBQWMrQyxPQUFkO0FBQ0F2RCxhQUFPLENBQUNnQixLQUFSLENBQWMsMkJBQTJCNkIsU0FBM0IsR0FBdUMsVUFBdkMsR0FDQVcsT0FBTyxDQUFDMU0sSUFEdEI7QUFFRDtBQUNGOztBQUVELE1BQUk2TSxRQUFRLEdBQUczRCxPQUFPLENBQUNRLEdBQXZCO0FBQ0FSLFNBQU8sQ0FBQ1EsR0FBUixHQUFjMEIsUUFBZDtBQUNBMEIsYUFBVyxDQUFDekksTUFBRCxFQUFTNkUsT0FBVCxDQUFYO0FBQ0FBLFNBQU8sQ0FBQ1EsR0FBUixHQUFjbUQsUUFBZDtBQUVBLFNBQU94SSxNQUFQO0FBQ0QsQ0EzR0Q7O0FBNkdBLElBQUltSSxvQkFBb0IsR0FBRyxVQUFVdEQsT0FBVixFQUFtQjtBQUM1QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFJRyxJQUFKLEVBQVVySixJQUFWO0FBQ0EsU0FBUWtKLE9BQU8sQ0FBQ0UsSUFBUixPQUFtQixHQUFuQixJQUNBLENBQUNDLElBQUksR0FBR0gsT0FBTyxDQUFDRyxJQUFSLEVBQVIsRUFBd0J4SSxLQUF4QixDQUE4QixDQUE5QixFQUFpQyxDQUFqQyxNQUF3QyxJQUR4QyxJQUVBLHNCQUFzQjJKLElBQXRCLENBQTJCbkIsSUFBM0IsQ0FGQSxLQUdDckosSUFBSSxHQUFHaEMsV0FBVyxDQUFDb0wsSUFBWixDQUFpQkYsT0FBakIsRUFBMEJsSixJQUhsQyxNQUlDQSxJQUFJLEtBQUssWUFBVCxJQUF5QkEsSUFBSSxLQUFLLE1BSm5DLENBQVI7QUFLRCxDQWJELEMsQ0FlQTtBQUNBO0FBQ0E7OztBQUNBLElBQUk4TSxXQUFXLEdBQUcsVUFBVUMsSUFBVixFQUFnQjdELE9BQWhCLEVBQXlCO0FBRXpDLE1BQUk2RCxJQUFJLENBQUMvTSxJQUFMLEtBQWMsV0FBZCxJQUE2QitNLElBQUksQ0FBQy9NLElBQUwsS0FBYyxXQUEvQyxFQUE0RDtBQUMxRCxRQUFJRCxJQUFJLEdBQUdnTixJQUFJLENBQUNoTixJQUFoQjs7QUFDQSxRQUFJZ04sSUFBSSxDQUFDak4sSUFBTCxDQUFVLENBQVYsTUFBaUIsTUFBakIsSUFBMkJDLElBQUksQ0FBQyxDQUFELENBQS9CLElBQXNDQSxJQUFJLENBQUMsQ0FBRCxDQUFKLENBQVEsQ0FBUixNQUFlLE1BQXJELElBQ0FBLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUSxDQUFSLEVBQVcsQ0FBWCxNQUFrQixJQUR0QixFQUM0QixDQUMxQjtBQUNBO0FBQ0E7QUFDRCxLQUxELE1BS087QUFDTCxVQUFJQSxJQUFJLENBQUNLLE1BQUwsR0FBYyxDQUFkLElBQW1CTCxJQUFJLENBQUMsQ0FBRCxDQUFKLENBQVFLLE1BQVIsS0FBbUIsQ0FBdEMsSUFBMkNMLElBQUksQ0FBQyxDQUFELENBQUosQ0FBUSxDQUFSLE1BQWUsTUFBOUQsRUFBc0U7QUFDcEU7QUFDQTtBQUNBbUosZUFBTyxDQUFDZ0IsS0FBUixDQUFjLHdEQUNBLG1DQURBLEdBQ3NDbkssSUFBSSxDQUFDLENBQUQsQ0FBSixDQUFRLENBQVIsQ0FEcEQ7QUFFRDtBQUNGO0FBQ0Y7O0FBRUQsTUFBSU4sUUFBUSxHQUFHc04sSUFBSSxDQUFDdE4sUUFBTCxJQUFpQkMscUJBQXFCLENBQUNvTSxPQUF0RDs7QUFDQSxNQUFJck0sUUFBUSxLQUFLQyxxQkFBcUIsQ0FBQ1EsWUFBdkMsRUFBcUQ7QUFDbkQsUUFBSTZNLElBQUksQ0FBQy9NLElBQUwsS0FBYyxRQUFkLElBQTBCK00sSUFBSSxDQUFDL00sSUFBTCxLQUFjLFFBQTVDLEVBQXNEO0FBQ3BEO0FBQ0QsS0FGRCxNQUVPLElBQUkrTSxJQUFJLENBQUMvTSxJQUFMLEtBQWMsV0FBbEIsRUFBK0I7QUFDcEMsVUFBSUYsSUFBSSxHQUFHaU4sSUFBSSxDQUFDak4sSUFBaEI7QUFDQSxVQUFJa04sS0FBSyxHQUFHbE4sSUFBSSxDQUFDLENBQUQsQ0FBaEI7O0FBQ0EsVUFBSSxFQUFHQSxJQUFJLENBQUNNLE1BQUwsS0FBZ0IsQ0FBaEIsS0FBc0I0TSxLQUFLLEtBQUssSUFBVixJQUNBQSxLQUFLLEtBQUssUUFEVixJQUVBQSxLQUFLLEtBQUssTUFGVixJQUdBQSxLQUFLLEtBQUssTUFIaEMsQ0FBSCxDQUFKLEVBR2lEO0FBQy9DOUQsZUFBTyxDQUFDZ0IsS0FBUixDQUFjLGtHQUFkO0FBQ0Q7QUFDRixLQVRNLE1BU0E7QUFDTGhCLGFBQU8sQ0FBQ2dCLEtBQVIsQ0FBYzZDLElBQUksQ0FBQy9NLElBQUwsR0FBWSxtREFBMUI7QUFDRDtBQUNGLEdBZkQsTUFlTyxJQUFJUCxRQUFRLEtBQUtDLHFCQUFxQixDQUFDQyxZQUF2QyxFQUFxRDtBQUMxRCxRQUFJLEVBQUdvTixJQUFJLENBQUMvTSxJQUFMLEtBQWMsUUFBakIsQ0FBSixFQUFnQztBQUM5QmtKLGFBQU8sQ0FBQ2dCLEtBQVIsQ0FBYyxxS0FBcUs2QyxJQUFJLENBQUMvTSxJQUExSyxHQUFpTCx1QkFBL0w7QUFDRDs7QUFDRCxRQUFJa0osT0FBTyxDQUFDRSxJQUFSLE9BQW1CLEdBQXZCLEVBQTRCO0FBQzFCRixhQUFPLENBQUNnQixLQUFSLENBQWMsc0tBQWQ7QUFDRDtBQUNGO0FBRUYsQ0E1Q0QsQzs7Ozs7Ozs7Ozs7QUNyZUFoTixNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDNEYsa0JBQWdCLEVBQUMsTUFBSUE7QUFBdEIsQ0FBZDtBQUF1RCxJQUFJMUUsSUFBSjtBQUFTbkIsTUFBTSxDQUFDTSxJQUFQLENBQVksZUFBWixFQUE0QjtBQUFDYSxNQUFJLENBQUNaLENBQUQsRUFBRztBQUFDWSxRQUFJLEdBQUNaLENBQUw7QUFBTzs7QUFBaEIsQ0FBNUIsRUFBOEMsQ0FBOUM7QUFBaUQsSUFBSTRILGVBQUosRUFBb0JELEtBQXBCO0FBQTBCbEksTUFBTSxDQUFDTSxJQUFQLENBQVksYUFBWixFQUEwQjtBQUFDNkgsaUJBQWUsQ0FBQzVILENBQUQsRUFBRztBQUFDNEgsbUJBQWUsR0FBQzVILENBQWhCO0FBQWtCLEdBQXRDOztBQUF1QzJILE9BQUssQ0FBQzNILENBQUQsRUFBRztBQUFDMkgsU0FBSyxHQUFDM0gsQ0FBTjtBQUFROztBQUF4RCxDQUExQixFQUFvRixDQUFwRjs7QUFHM0ksU0FBU3dQLFVBQVQsQ0FBb0IvRixLQUFwQixFQUEwQjtBQUN4QixNQUFJN0MsTUFBTSxHQUFHLEVBQWI7O0FBQ0EsT0FBSyxJQUFJK0IsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR2MsS0FBSyxDQUFDOUcsTUFBMUIsRUFBa0NnRyxDQUFDLEVBQW5DLEVBQXVDO0FBQ3JDLFFBQUlrQixJQUFJLEdBQUdKLEtBQUssQ0FBQ2QsQ0FBRCxDQUFoQjs7QUFDQSxRQUFJa0IsSUFBSSxZQUFZakosSUFBSSxDQUFDd0ksR0FBekIsRUFBOEI7QUFDNUIsVUFBSSxDQUFDUyxJQUFJLENBQUN2RixLQUFWLEVBQWlCO0FBQ2Y7QUFDRDs7QUFDRCxVQUFJc0MsTUFBTSxDQUFDakUsTUFBUCxJQUNDaUUsTUFBTSxDQUFDQSxNQUFNLENBQUNqRSxNQUFQLEdBQWdCLENBQWpCLENBQU4sWUFBcUMvQixJQUFJLENBQUN3SSxHQUQvQyxFQUNvRDtBQUNsRHhDLGNBQU0sQ0FBQ0EsTUFBTSxDQUFDakUsTUFBUCxHQUFnQixDQUFqQixDQUFOLEdBQTRCL0IsSUFBSSxDQUFDd0ksR0FBTCxDQUMxQnhDLE1BQU0sQ0FBQ0EsTUFBTSxDQUFDakUsTUFBUCxHQUFnQixDQUFqQixDQUFOLENBQTBCMkIsS0FBMUIsR0FBa0N1RixJQUFJLENBQUN2RixLQURiLENBQTVCO0FBRUE7QUFDRDtBQUNGOztBQUNEc0MsVUFBTSxDQUFDcEYsSUFBUCxDQUFZcUksSUFBWjtBQUNEOztBQUNELFNBQU9qRCxNQUFQO0FBQ0Q7O0FBRUQsU0FBUzZJLHdCQUFULENBQWtDckYsS0FBbEMsRUFBeUM7QUFDdkMsTUFBSUEsS0FBSyxDQUFDakosT0FBTixDQUFjLElBQWQsS0FBdUIsQ0FBM0IsRUFBOEI7QUFDNUIsV0FBTyxFQUFQO0FBQ0Q7O0FBQ0QsU0FBT2lKLEtBQVA7QUFDRDs7QUFFRCxTQUFTc0YsZUFBVCxDQUF5QmpHLEtBQXpCLEVBQStCO0FBQzdCLE1BQUk3QyxNQUFNLEdBQUcsRUFBYjs7QUFDQSxPQUFLLElBQUkrQixDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHYyxLQUFLLENBQUM5RyxNQUExQixFQUFrQ2dHLENBQUMsRUFBbkMsRUFBdUM7QUFDckMsUUFBSWtCLElBQUksR0FBR0osS0FBSyxDQUFDZCxDQUFELENBQWhCOztBQUNBLFFBQUlrQixJQUFJLFlBQVlqSixJQUFJLENBQUN3SSxHQUF6QixFQUE4QjtBQUM1QjtBQUNBLFVBQUlTLElBQUksQ0FBQ3ZGLEtBQUwsQ0FBV25ELE9BQVgsQ0FBbUIsSUFBbkIsTUFBNkIsQ0FBQyxDQUE5QixJQUFtQyxDQUFDLEtBQUs0TCxJQUFMLENBQVVsRCxJQUFJLENBQUN2RixLQUFmLENBQXhDLEVBQStEO0FBQzdEO0FBQ0QsT0FKMkIsQ0FLNUI7OztBQUNBLFVBQUlxTCxNQUFNLEdBQUc5RixJQUFJLENBQUN2RixLQUFsQjtBQUNBcUwsWUFBTSxHQUFHQSxNQUFNLENBQUMxTSxPQUFQLENBQWUsTUFBZixFQUF1QndNLHdCQUF2QixDQUFUO0FBQ0FFLFlBQU0sR0FBR0EsTUFBTSxDQUFDMU0sT0FBUCxDQUFlLE1BQWYsRUFBdUJ3TSx3QkFBdkIsQ0FBVDtBQUNBNUYsVUFBSSxDQUFDdkYsS0FBTCxHQUFhcUwsTUFBYjtBQUNEOztBQUNEL0ksVUFBTSxDQUFDcEYsSUFBUCxDQUFZcUksSUFBWjtBQUNEOztBQUNELFNBQU9qRCxNQUFQO0FBQ0Q7O0FBRUQsSUFBSWdKLHlCQUF5QixHQUFHaEksZUFBZSxDQUFDakcsTUFBaEIsRUFBaEM7QUFDQWlPLHlCQUF5QixDQUFDekosR0FBMUIsQ0FBOEI7QUFDNUJpQyxXQUFTLEVBQUVULEtBRGlCO0FBRTVCVSxnQkFBYyxFQUFFVixLQUZZO0FBRzVCWSxjQUFZLEVBQUVaLEtBSGM7QUFJNUJlLFlBQVUsRUFBRSxVQUFTZSxLQUFULEVBQWU7QUFDekI7QUFDQSxRQUFJN0MsTUFBTSxHQUFHZ0IsZUFBZSxDQUFDaEcsU0FBaEIsQ0FBMEI4RyxVQUExQixDQUFxQ2xDLElBQXJDLENBQTBDLElBQTFDLEVBQWdEaUQsS0FBaEQsQ0FBYjtBQUNBN0MsVUFBTSxHQUFHNEksVUFBVSxDQUFDNUksTUFBRCxDQUFuQjtBQUNBQSxVQUFNLEdBQUc4SSxlQUFlLENBQUM5SSxNQUFELENBQXhCO0FBQ0EsV0FBT0EsTUFBUDtBQUNELEdBVjJCO0FBVzVCZ0MsVUFBUSxFQUFFLFVBQVU5RyxHQUFWLEVBQWU7QUFDdkIsUUFBSStHLE9BQU8sR0FBRy9HLEdBQUcsQ0FBQytHLE9BQWxCLENBRHVCLENBRXZCOztBQUNBLFFBQUlBLE9BQU8sS0FBSyxVQUFaLElBQTBCQSxPQUFPLEtBQUssUUFBdEMsSUFBa0RBLE9BQU8sS0FBSyxLQUE5RCxJQUNDLENBQUNqSSxJQUFJLENBQUNrSSxjQUFMLENBQW9CRCxPQUFwQixDQURGLElBQ2tDakksSUFBSSxDQUFDbUksaUJBQUwsQ0FBdUJGLE9BQXZCLENBRHRDLEVBQ3VFO0FBQ3JFLGFBQU8vRyxHQUFQO0FBQ0Q7O0FBQ0QsV0FBTzhGLGVBQWUsQ0FBQ2hHLFNBQWhCLENBQTBCZ0gsUUFBMUIsQ0FBbUNwQyxJQUFuQyxDQUF3QyxJQUF4QyxFQUE4QzFFLEdBQTlDLENBQVA7QUFDRCxHQW5CMkI7QUFvQjVCMkUsaUJBQWUsRUFBRSxVQUFVQyxLQUFWLEVBQWlCO0FBQ2hDLFdBQU9BLEtBQVA7QUFDRDtBQXRCMkIsQ0FBOUI7O0FBMEJPLFNBQVNwQixnQkFBVCxDQUEwQlcsSUFBMUIsRUFBZ0M7QUFDckNBLE1BQUksR0FBSSxJQUFJMkoseUJBQUosRUFBRCxDQUFnQy9JLEtBQWhDLENBQXNDWixJQUF0QyxDQUFQO0FBQ0EsU0FBT0EsSUFBUDtBQUNELEMiLCJmaWxlIjoiL3BhY2thZ2VzL3NwYWNlYmFycy1jb21waWxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvZGVHZW4sIGJ1aWx0SW5CbG9ja0hlbHBlcnMsIGlzUmVzZXJ2ZWROYW1lIH0gZnJvbSAnLi9jb2RlZ2VuJztcbmltcG9ydCB7IG9wdGltaXplIH0gZnJvbSAnLi9vcHRpbWl6ZXInO1xuaW1wb3J0IHsgcGFyc2UsIGNvbXBpbGUsIGNvZGVHZW4sIFRlbXBsYXRlVGFnUmVwbGFjZXIsIGJlYXV0aWZ5IH0gZnJvbSAnLi9jb21waWxlcic7XG5pbXBvcnQgeyBUZW1wbGF0ZVRhZyB9IGZyb20gJy4vdGVtcGxhdGV0YWcnO1xuXG5leHBvcnQgY29uc3QgU3BhY2ViYXJzQ29tcGlsZXIgPSB7XG4gIENvZGVHZW4sXG4gIF9idWlsdEluQmxvY2tIZWxwZXJzOiBidWlsdEluQmxvY2tIZWxwZXJzLFxuICBpc1Jlc2VydmVkTmFtZSxcbiAgb3B0aW1pemUsXG4gIHBhcnNlLFxuICBjb21waWxlLFxuICBjb2RlR2VuLFxuICBfVGVtcGxhdGVUYWdSZXBsYWNlcjogVGVtcGxhdGVUYWdSZXBsYWNlcixcbiAgX2JlYXV0aWZ5OiBiZWF1dGlmeSxcbiAgVGVtcGxhdGVUYWcsXG59O1xuIiwiaW1wb3J0IHsgSFRNTFRvb2xzIH0gZnJvbSAnbWV0ZW9yL2h0bWwtdG9vbHMnO1xuaW1wb3J0IHsgSFRNTCB9IGZyb20gJ21ldGVvci9odG1sanMnO1xuaW1wb3J0IHsgQmxhemVUb29scyB9IGZyb20gJ21ldGVvci9ibGF6ZS10b29scyc7XG5pbXBvcnQgeyBjb2RlR2VuIH0gZnJvbSAnLi9jb21waWxlcic7XG5cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb2RlLWdlbmVyYXRpb24gb2YgdGVtcGxhdGUgdGFnc1xuXG4vLyBUaGUgYENvZGVHZW5gIGNsYXNzIGN1cnJlbnRseSBoYXMgbm8gaW5zdGFuY2Ugc3RhdGUsIGJ1dCBpbiB0aGVvcnlcbi8vIGl0IGNvdWxkIGJlIHVzZWZ1bCB0byB0cmFjayBwZXItZnVuY3Rpb24gc3RhdGUsIGxpa2Ugd2hldGhlciB3ZVxuLy8gbmVlZCB0byBlbWl0IGB2YXIgc2VsZiA9IHRoaXNgIG9yIG5vdC5cbmV4cG9ydCBmdW5jdGlvbiBDb2RlR2VuKCkge31cblxuZXhwb3J0IGNvbnN0IGJ1aWx0SW5CbG9ja0hlbHBlcnMgPSB7XG4gICdpZic6ICdCbGF6ZS5JZicsXG4gICd1bmxlc3MnOiAnQmxhemUuVW5sZXNzJyxcbiAgJ3dpdGgnOiAnU3BhY2ViYXJzLldpdGgnLFxuICAnZWFjaCc6ICdCbGF6ZS5FYWNoJyxcbiAgJ2xldCc6ICdCbGF6ZS5MZXQnXG59O1xuXG5cbi8vIE1hcHBpbmcgb2YgXCJtYWNyb3NcIiB3aGljaCwgd2hlbiBwcmVjZWRlZCBieSBgVGVtcGxhdGUuYCwgZXhwYW5kXG4vLyB0byBzcGVjaWFsIGNvZGUgcmF0aGVyIHRoYW4gZm9sbG93aW5nIHRoZSBsb29rdXAgcnVsZXMgZm9yIGRvdHRlZFxuLy8gc3ltYm9scy5cbnZhciBidWlsdEluVGVtcGxhdGVNYWNyb3MgPSB7XG4gIC8vIGB2aWV3YCBpcyBhIGxvY2FsIHZhcmlhYmxlIGRlZmluZWQgaW4gdGhlIGdlbmVyYXRlZCByZW5kZXJcbiAgLy8gZnVuY3Rpb24gZm9yIHRoZSB0ZW1wbGF0ZSBpbiB3aGljaCBgVGVtcGxhdGUuY29udGVudEJsb2NrYCBvclxuICAvLyBgVGVtcGxhdGUuZWxzZUJsb2NrYCBpcyBpbnZva2VkLlxuICAnY29udGVudEJsb2NrJzogJ3ZpZXcudGVtcGxhdGVDb250ZW50QmxvY2snLFxuICAnZWxzZUJsb2NrJzogJ3ZpZXcudGVtcGxhdGVFbHNlQmxvY2snLFxuXG4gIC8vIENvbmZ1c2luZ2x5LCB0aGlzIG1ha2VzIGB7ez4gVGVtcGxhdGUuZHluYW1pY319YCBhbiBhbGlhc1xuICAvLyBmb3IgYHt7PiBfX2R5bmFtaWN9fWAsIHdoZXJlIFwiX19keW5hbWljXCIgaXMgdGhlIHRlbXBsYXRlIHRoYXRcbiAgLy8gaW1wbGVtZW50cyB0aGUgZHluYW1pYyB0ZW1wbGF0ZSBmZWF0dXJlLlxuICAnZHluYW1pYyc6ICdUZW1wbGF0ZS5fX2R5bmFtaWMnLFxuXG4gICdzdWJzY3JpcHRpb25zUmVhZHknOiAndmlldy50ZW1wbGF0ZUluc3RhbmNlKCkuc3Vic2NyaXB0aW9uc1JlYWR5KCknXG59O1xuXG52YXIgYWRkaXRpb25hbFJlc2VydmVkTmFtZXMgPSBbXCJib2R5XCIsIFwidG9TdHJpbmdcIiwgXCJpbnN0YW5jZVwiLCAgXCJjb25zdHJ1Y3RvclwiLFxuICBcInRvU3RyaW5nXCIsIFwidG9Mb2NhbGVTdHJpbmdcIiwgXCJ2YWx1ZU9mXCIsIFwiaGFzT3duUHJvcGVydHlcIiwgXCJpc1Byb3RvdHlwZU9mXCIsXG4gIFwicHJvcGVydHlJc0VudW1lcmFibGVcIiwgXCJfX2RlZmluZUdldHRlcl9fXCIsIFwiX19sb29rdXBHZXR0ZXJfX1wiLFxuICBcIl9fZGVmaW5lU2V0dGVyX19cIiwgXCJfX2xvb2t1cFNldHRlcl9fXCIsIFwiX19wcm90b19fXCIsIFwiZHluYW1pY1wiLFxuICBcInJlZ2lzdGVySGVscGVyXCIsIFwiY3VycmVudERhdGFcIiwgXCJwYXJlbnREYXRhXCIsIFwiX21pZ3JhdGVUZW1wbGF0ZVwiLFxuICBcIl9hcHBseUhtckNoYW5nZXNcIiwgXCJfX3BlbmRpbmdSZXBsYWNlbWVudFwiXG5dO1xuXG4vLyBBIFwicmVzZXJ2ZWQgbmFtZVwiIGNhbid0IGJlIHVzZWQgYXMgYSA8dGVtcGxhdGU+IG5hbWUuICBUaGlzXG4vLyBmdW5jdGlvbiBpcyB1c2VkIGJ5IHRoZSB0ZW1wbGF0ZSBmaWxlIHNjYW5uZXIuXG4vL1xuLy8gTm90ZSB0aGF0IHRoZSBydW50aW1lIGltcG9zZXMgYWRkaXRpb25hbCByZXN0cmljdGlvbnMsIGZvciBleGFtcGxlXG4vLyBiYW5uaW5nIHRoZSBuYW1lIFwiYm9keVwiIGFuZCBuYW1lcyBvZiBidWlsdC1pbiBvYmplY3QgcHJvcGVydGllc1xuLy8gbGlrZSBcInRvU3RyaW5nXCIuXG5leHBvcnQgZnVuY3Rpb24gaXNSZXNlcnZlZE5hbWUobmFtZSkge1xuICByZXR1cm4gYnVpbHRJbkJsb2NrSGVscGVycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSB8fFxuICAgIGJ1aWx0SW5UZW1wbGF0ZU1hY3Jvcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSB8fFxuICAgIF8uaW5kZXhPZihhZGRpdGlvbmFsUmVzZXJ2ZWROYW1lcywgbmFtZSkgPiAtMTtcbn1cblxudmFyIG1ha2VPYmplY3RMaXRlcmFsID0gZnVuY3Rpb24gKG9iaikge1xuICB2YXIgcGFydHMgPSBbXTtcbiAgZm9yICh2YXIgayBpbiBvYmopXG4gICAgcGFydHMucHVzaChCbGF6ZVRvb2xzLnRvT2JqZWN0TGl0ZXJhbEtleShrKSArICc6ICcgKyBvYmpba10pO1xuICByZXR1cm4gJ3snICsgcGFydHMuam9pbignLCAnKSArICd9Jztcbn07XG5cbl8uZXh0ZW5kKENvZGVHZW4ucHJvdG90eXBlLCB7XG4gIGNvZGVHZW5UZW1wbGF0ZVRhZzogZnVuY3Rpb24gKHRhZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGFnLnBvc2l0aW9uID09PSBIVE1MVG9vbHMuVEVNUExBVEVfVEFHX1BPU0lUSU9OLklOX1NUQVJUX1RBRykge1xuICAgICAgLy8gU3BlY2lhbCBkeW5hbWljIGF0dHJpYnV0ZXM6IGA8ZGl2IHt7YXR0cnN9fT4uLi5gXG4gICAgICAvLyBvbmx5IGB0YWcudHlwZSA9PT0gJ0RPVUJMRSdgIGFsbG93ZWQgKGJ5IGVhcmxpZXIgdmFsaWRhdGlvbilcbiAgICAgIHJldHVybiBCbGF6ZVRvb2xzLkVtaXRDb2RlKCdmdW5jdGlvbiAoKSB7IHJldHVybiAnICtcbiAgICAgICAgICBzZWxmLmNvZGVHZW5NdXN0YWNoZSh0YWcucGF0aCwgdGFnLmFyZ3MsICdhdHRyTXVzdGFjaGUnKVxuICAgICAgICAgICsgJzsgfScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGFnLnR5cGUgPT09ICdET1VCTEUnIHx8IHRhZy50eXBlID09PSAnVFJJUExFJykge1xuICAgICAgICB2YXIgY29kZSA9IHNlbGYuY29kZUdlbk11c3RhY2hlKHRhZy5wYXRoLCB0YWcuYXJncyk7XG4gICAgICAgIGlmICh0YWcudHlwZSA9PT0gJ1RSSVBMRScpIHtcbiAgICAgICAgICBjb2RlID0gJ1NwYWNlYmFycy5tYWtlUmF3KCcgKyBjb2RlICsgJyknO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0YWcucG9zaXRpb24gIT09IEhUTUxUb29scy5URU1QTEFURV9UQUdfUE9TSVRJT04uSU5fQVRUUklCVVRFKSB7XG4gICAgICAgICAgLy8gUmVhY3RpdmUgYXR0cmlidXRlcyBhcmUgYWxyZWFkeSB3cmFwcGVkIGluIGEgZnVuY3Rpb24sXG4gICAgICAgICAgLy8gYW5kIHRoZXJlJ3Mgbm8gZmluZS1ncmFpbmVkIHJlYWN0aXZpdHkuXG4gICAgICAgICAgLy8gQW55d2hlcmUgZWxzZSwgd2UgbmVlZCB0byBjcmVhdGUgYSBWaWV3LlxuICAgICAgICAgIGNvZGUgPSAnQmxhemUuVmlldygnICtcbiAgICAgICAgICAgIEJsYXplVG9vbHMudG9KU0xpdGVyYWwoJ2xvb2t1cDonICsgdGFnLnBhdGguam9pbignLicpKSArICcsICcgK1xuICAgICAgICAgICAgJ2Z1bmN0aW9uICgpIHsgcmV0dXJuICcgKyBjb2RlICsgJzsgfSknO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBCbGF6ZVRvb2xzLkVtaXRDb2RlKGNvZGUpO1xuICAgICAgfSBlbHNlIGlmICh0YWcudHlwZSA9PT0gJ0lOQ0xVU0lPTicgfHwgdGFnLnR5cGUgPT09ICdCTE9DS09QRU4nKSB7XG4gICAgICAgIHZhciBwYXRoID0gdGFnLnBhdGg7XG4gICAgICAgIHZhciBhcmdzID0gdGFnLmFyZ3M7XG5cbiAgICAgICAgaWYgKHRhZy50eXBlID09PSAnQkxPQ0tPUEVOJyAmJlxuICAgICAgICAgICAgYnVpbHRJbkJsb2NrSGVscGVycy5oYXNPd25Qcm9wZXJ0eShwYXRoWzBdKSkge1xuICAgICAgICAgIC8vIGlmLCB1bmxlc3MsIHdpdGgsIGVhY2guXG4gICAgICAgICAgLy9cbiAgICAgICAgICAvLyBJZiBzb21lb25lIHRyaWVzIHRvIGRvIGB7ez4gaWZ9fWAsIHdlIGRvbid0XG4gICAgICAgICAgLy8gZ2V0IGhlcmUsIGJ1dCBhbiBlcnJvciBpcyB0aHJvd24gd2hlbiB3ZSB0cnkgdG8gY29kZWdlbiB0aGUgcGF0aC5cblxuICAgICAgICAgIC8vIE5vdGU6IElmIHdlIGNhdWdodCB0aGVzZSBlcnJvcnMgZWFybGllciwgd2hpbGUgc2Nhbm5pbmcsIHdlJ2QgYmUgYWJsZSB0b1xuICAgICAgICAgIC8vIHByb3ZpZGUgbmljZSBsaW5lIG51bWJlcnMuXG4gICAgICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuZXhwZWN0ZWQgZG90dGVkIHBhdGggYmVnaW5uaW5nIHdpdGggXCIgKyBwYXRoWzBdKTtcbiAgICAgICAgICBpZiAoISBhcmdzLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIiNcIiArIHBhdGhbMF0gKyBcIiByZXF1aXJlcyBhbiBhcmd1bWVudFwiKTtcblxuICAgICAgICAgIHZhciBkYXRhQ29kZSA9IG51bGw7XG4gICAgICAgICAgLy8gI2VhY2ggaGFzIGEgc3BlY2lhbCB0cmVhdG1lbnQgYXMgaXQgZmVhdHVyZXMgdHdvIGRpZmZlcmVudCBmb3JtczpcbiAgICAgICAgICAvLyAtIHt7I2VhY2ggcGVvcGxlfX1cbiAgICAgICAgICAvLyAtIHt7I2VhY2ggcGVyc29uIGluIHBlb3BsZX19XG4gICAgICAgICAgaWYgKHBhdGhbMF0gPT09ICdlYWNoJyAmJiBhcmdzLmxlbmd0aCA+PSAyICYmIGFyZ3NbMV1bMF0gPT09ICdQQVRIJyAmJlxuICAgICAgICAgICAgICBhcmdzWzFdWzFdLmxlbmd0aCAmJiBhcmdzWzFdWzFdWzBdID09PSAnaW4nKSB7XG4gICAgICAgICAgICAvLyBtaW5pbXVtIGNvbmRpdGlvbnMgYXJlIG1ldCBmb3IgZWFjaC1pbi4gIG5vdyB2YWxpZGF0ZSB0aGlzXG4gICAgICAgICAgICAvLyBpc24ndCBzb21lIHdlaXJkIGNhc2UuXG4gICAgICAgICAgICB2YXIgZWFjaFVzYWdlID0gXCJVc2UgZWl0aGVyIHt7I2VhY2ggaXRlbXN9fSBvciBcIiArXG4gICAgICAgICAgICAgICAgICBcInt7I2VhY2ggaXRlbSBpbiBpdGVtc319IGZvcm0gb2YgI2VhY2guXCI7XG4gICAgICAgICAgICB2YXIgaW5BcmcgPSBhcmdzWzFdO1xuICAgICAgICAgICAgaWYgKCEgKGFyZ3MubGVuZ3RoID49IDMgJiYgaW5BcmdbMV0ubGVuZ3RoID09PSAxKSkge1xuICAgICAgICAgICAgICAvLyB3ZSBkb24ndCBoYXZlIGF0IGxlYXN0IDMgc3BhY2Utc2VwYXJhdGVkIHBhcnRzIGFmdGVyICNlYWNoLCBvclxuICAgICAgICAgICAgICAvLyBpbkFyZyBkb2Vzbid0IGxvb2sgbGlrZSBbJ1BBVEgnLFsnaW4nXV1cbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWFsZm9ybWVkICNlYWNoLiBcIiArIGVhY2hVc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBzcGxpdCBvdXQgdGhlIHZhcmlhYmxlIG5hbWUgYW5kIHNlcXVlbmNlIGFyZ3VtZW50c1xuICAgICAgICAgICAgdmFyIHZhcmlhYmxlQXJnID0gYXJnc1swXTtcbiAgICAgICAgICAgIGlmICghICh2YXJpYWJsZUFyZ1swXSA9PT0gXCJQQVRIXCIgJiYgdmFyaWFibGVBcmdbMV0ubGVuZ3RoID09PSAxICYmXG4gICAgICAgICAgICAgICAgICAgdmFyaWFibGVBcmdbMV1bMF0ucmVwbGFjZSgvXFwuL2csICcnKSkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFkIHZhcmlhYmxlIG5hbWUgaW4gI2VhY2hcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmFyaWFibGUgPSB2YXJpYWJsZUFyZ1sxXVswXTtcbiAgICAgICAgICAgIGRhdGFDb2RlID0gJ2Z1bmN0aW9uICgpIHsgcmV0dXJuIHsgX3NlcXVlbmNlOiAnICtcbiAgICAgICAgICAgICAgc2VsZi5jb2RlR2VuSW5jbHVzaW9uRGF0YShhcmdzLnNsaWNlKDIpKSArXG4gICAgICAgICAgICAgICcsIF92YXJpYWJsZTogJyArIEJsYXplVG9vbHMudG9KU0xpdGVyYWwodmFyaWFibGUpICsgJyB9OyB9JztcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhbMF0gPT09ICdsZXQnKSB7XG4gICAgICAgICAgICB2YXIgZGF0YVByb3BzID0ge307XG4gICAgICAgICAgICBfLmVhY2goYXJncywgZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgICBpZiAoYXJnLmxlbmd0aCAhPT0gMykge1xuICAgICAgICAgICAgICAgIC8vIG5vdCBhIGtleXdvcmQgYXJnICh4PXkpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5jb3JyZWN0IGZvcm0gb2YgI2xldFwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgYXJnS2V5ID0gYXJnWzJdO1xuICAgICAgICAgICAgICBkYXRhUHJvcHNbYXJnS2V5XSA9XG4gICAgICAgICAgICAgICAgJ2Z1bmN0aW9uICgpIHsgcmV0dXJuIFNwYWNlYmFycy5jYWxsKCcgK1xuICAgICAgICAgICAgICAgIHNlbGYuY29kZUdlbkFyZ1ZhbHVlKGFyZykgKyAnKTsgfSc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRhdGFDb2RlID0gbWFrZU9iamVjdExpdGVyYWwoZGF0YVByb3BzKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoISBkYXRhQ29kZSkge1xuICAgICAgICAgICAgLy8gYGFyZ3NgIG11c3QgZXhpc3QgKHRhZy5hcmdzLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBkYXRhQ29kZSA9IHNlbGYuY29kZUdlbkluY2x1c2lvbkRhdGFGdW5jKGFyZ3MpIHx8ICdudWxsJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBgY29udGVudGAgbXVzdCBleGlzdFxuICAgICAgICAgIHZhciBjb250ZW50QmxvY2sgPSAoKCdjb250ZW50JyBpbiB0YWcpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuY29kZUdlbkJsb2NrKHRhZy5jb250ZW50KSA6IG51bGwpO1xuICAgICAgICAgIC8vIGBlbHNlQ29udGVudGAgbWF5IG5vdCBleGlzdFxuICAgICAgICAgIHZhciBlbHNlQ29udGVudEJsb2NrID0gKCgnZWxzZUNvbnRlbnQnIGluIHRhZykgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuY29kZUdlbkJsb2NrKHRhZy5lbHNlQ29udGVudCkgOiBudWxsKTtcblxuICAgICAgICAgIHZhciBjYWxsQXJncyA9IFtkYXRhQ29kZSwgY29udGVudEJsb2NrXTtcbiAgICAgICAgICBpZiAoZWxzZUNvbnRlbnRCbG9jaylcbiAgICAgICAgICAgIGNhbGxBcmdzLnB1c2goZWxzZUNvbnRlbnRCbG9jayk7XG5cbiAgICAgICAgICByZXR1cm4gQmxhemVUb29scy5FbWl0Q29kZShcbiAgICAgICAgICAgIGJ1aWx0SW5CbG9ja0hlbHBlcnNbcGF0aFswXV0gKyAnKCcgKyBjYWxsQXJncy5qb2luKCcsICcpICsgJyknKTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBjb21wQ29kZSA9IHNlbGYuY29kZUdlblBhdGgocGF0aCwge2xvb2t1cFRlbXBsYXRlOiB0cnVlfSk7XG4gICAgICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgLy8gY2FwdHVyZSByZWFjdGl2aXR5XG4gICAgICAgICAgICBjb21wQ29kZSA9ICdmdW5jdGlvbiAoKSB7IHJldHVybiBTcGFjZWJhcnMuY2FsbCgnICsgY29tcENvZGUgK1xuICAgICAgICAgICAgICAnKTsgfSc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRhdGFDb2RlID0gc2VsZi5jb2RlR2VuSW5jbHVzaW9uRGF0YUZ1bmModGFnLmFyZ3MpO1xuICAgICAgICAgIHZhciBjb250ZW50ID0gKCgnY29udGVudCcgaW4gdGFnKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5jb2RlR2VuQmxvY2sodGFnLmNvbnRlbnQpIDogbnVsbCk7XG4gICAgICAgICAgdmFyIGVsc2VDb250ZW50ID0gKCgnZWxzZUNvbnRlbnQnIGluIHRhZykgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmNvZGVHZW5CbG9jayh0YWcuZWxzZUNvbnRlbnQpIDogbnVsbCk7XG5cbiAgICAgICAgICB2YXIgaW5jbHVkZUFyZ3MgPSBbY29tcENvZGVdO1xuICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICBpbmNsdWRlQXJncy5wdXNoKGNvbnRlbnQpO1xuICAgICAgICAgICAgaWYgKGVsc2VDb250ZW50KVxuICAgICAgICAgICAgICBpbmNsdWRlQXJncy5wdXNoKGVsc2VDb250ZW50KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgaW5jbHVkZUNvZGUgPVxuICAgICAgICAgICAgICAgICdTcGFjZWJhcnMuaW5jbHVkZSgnICsgaW5jbHVkZUFyZ3Muam9pbignLCAnKSArICcpJztcblxuICAgICAgICAgIC8vIGNhbGxpbmcgY29udmVudGlvbiBjb21wYXQgLS0gc2V0IHRoZSBkYXRhIGNvbnRleHQgYXJvdW5kIHRoZVxuICAgICAgICAgIC8vIGVudGlyZSBpbmNsdXNpb24sIHNvIHRoYXQgaWYgdGhlIG5hbWUgb2YgdGhlIGluY2x1c2lvbiBpc1xuICAgICAgICAgIC8vIGEgaGVscGVyIGZ1bmN0aW9uLCBpdCBnZXRzIHRoZSBkYXRhIGNvbnRleHQgaW4gYHRoaXNgLlxuICAgICAgICAgIC8vIFRoaXMgbWFrZXMgZm9yIGEgcHJldHR5IGNvbmZ1c2luZyBjYWxsaW5nIGNvbnZlbnRpb24gLS1cbiAgICAgICAgICAvLyBJbiBge3sjZm9vIGJhcn19YCwgYGZvb2AgaXMgZXZhbHVhdGVkIGluIHRoZSBjb250ZXh0IG9mIGBiYXJgXG4gICAgICAgICAgLy8gLS0gYnV0IGl0J3Mgd2hhdCB3ZSBzaGlwcGVkIGZvciAwLjguMC4gIFRoZSByYXRpb25hbGUgaXMgdGhhdFxuICAgICAgICAgIC8vIGB7eyNmb28gYmFyfX1gIGlzIHN1Z2FyIGZvciBge3sjd2l0aCBiYXJ9fXt7I2Zvb319Li4uYC5cbiAgICAgICAgICBpZiAoZGF0YUNvZGUpIHtcbiAgICAgICAgICAgIGluY2x1ZGVDb2RlID1cbiAgICAgICAgICAgICAgJ0JsYXplLl9UZW1wbGF0ZVdpdGgoJyArIGRhdGFDb2RlICsgJywgZnVuY3Rpb24gKCkgeyByZXR1cm4gJyArXG4gICAgICAgICAgICAgIGluY2x1ZGVDb2RlICsgJzsgfSknO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFhYWCBCQUNLIENPTVBBVCAtIFVJIGlzIHRoZSBvbGQgbmFtZSwgVGVtcGxhdGUgaXMgdGhlIG5ld1xuICAgICAgICAgIGlmICgocGF0aFswXSA9PT0gJ1VJJyB8fCBwYXRoWzBdID09PSAnVGVtcGxhdGUnKSAmJlxuICAgICAgICAgICAgICAocGF0aFsxXSA9PT0gJ2NvbnRlbnRCbG9jaycgfHwgcGF0aFsxXSA9PT0gJ2Vsc2VCbG9jaycpKSB7XG4gICAgICAgICAgICAvLyBDYWxsIGNvbnRlbnRCbG9jayBhbmQgZWxzZUJsb2NrIGluIHRoZSBhcHByb3ByaWF0ZSBzY29wZVxuICAgICAgICAgICAgaW5jbHVkZUNvZGUgPSAnQmxhemUuX0luT3V0ZXJUZW1wbGF0ZVNjb3BlKHZpZXcsIGZ1bmN0aW9uICgpIHsgcmV0dXJuICdcbiAgICAgICAgICAgICAgKyBpbmNsdWRlQ29kZSArICc7IH0pJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gQmxhemVUb29scy5FbWl0Q29kZShpbmNsdWRlQ29kZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGFnLnR5cGUgPT09ICdFU0NBUEUnKSB7XG4gICAgICAgIHJldHVybiB0YWcudmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDYW4ndCBnZXQgaGVyZTsgVGVtcGxhdGVUYWcgdmFsaWRhdGlvbiBzaG91bGQgY2F0Y2ggYW55XG4gICAgICAgIC8vIGluYXBwcm9wcmlhdGUgdGFnIHR5cGVzIHRoYXQgbWlnaHQgY29tZSBvdXQgb2YgdGhlIHBhcnNlci5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5leHBlY3RlZCB0ZW1wbGF0ZSB0YWcgdHlwZTogXCIgKyB0YWcudHlwZSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8vIGBwYXRoYCBpcyBhbiBhcnJheSBvZiBhdCBsZWFzdCBvbmUgc3RyaW5nLlxuICAvL1xuICAvLyBJZiBgcGF0aC5sZW5ndGggPiAxYCwgdGhlIGdlbmVyYXRlZCBjb2RlIG1heSBiZSByZWFjdGl2ZVxuICAvLyAoaS5lLiBpdCBtYXkgaW52YWxpZGF0ZSB0aGUgY3VycmVudCBjb21wdXRhdGlvbikuXG4gIC8vXG4gIC8vIE5vIGNvZGUgaXMgZ2VuZXJhdGVkIHRvIGNhbGwgdGhlIHJlc3VsdCBpZiBpdCdzIGEgZnVuY3Rpb24uXG4gIC8vXG4gIC8vIE9wdGlvbnM6XG4gIC8vXG4gIC8vIC0gbG9va3VwVGVtcGxhdGUge0Jvb2xlYW59IElmIHRydWUsIGdlbmVyYXRlZCBjb2RlIGFsc28gbG9va3MgaW5cbiAgLy8gICB0aGUgbGlzdCBvZiB0ZW1wbGF0ZXMuIChBZnRlciBoZWxwZXJzLCBiZWZvcmUgZGF0YSBjb250ZXh0KS5cbiAgLy8gICBVc2VkIHdoZW4gZ2VuZXJhdGluZyBjb2RlIGZvciBge3s+IGZvb319YCBvciBge3sjZm9vfX1gLiBPbmx5XG4gIC8vICAgdXNlZCBmb3Igbm9uLWRvdHRlZCBwYXRocy5cbiAgY29kZUdlblBhdGg6IGZ1bmN0aW9uIChwYXRoLCBvcHRzKSB7XG4gICAgaWYgKGJ1aWx0SW5CbG9ja0hlbHBlcnMuaGFzT3duUHJvcGVydHkocGF0aFswXSkpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCB1c2UgdGhlIGJ1aWx0LWluICdcIiArIHBhdGhbMF0gKyBcIicgaGVyZVwiKTtcbiAgICAvLyBMZXQgYHt7I2lmIFRlbXBsYXRlLmNvbnRlbnRCbG9ja319YCBjaGVjayB3aGV0aGVyIHRoaXMgdGVtcGxhdGUgd2FzXG4gICAgLy8gaW52b2tlZCB2aWEgaW5jbHVzaW9uIG9yIGFzIGEgYmxvY2sgaGVscGVyLCBpbiBhZGRpdGlvbiB0byBzdXBwb3J0aW5nXG4gICAgLy8gYHt7PiBUZW1wbGF0ZS5jb250ZW50QmxvY2t9fWAuXG4gICAgLy8gWFhYIEJBQ0sgQ09NUEFUIC0gVUkgaXMgdGhlIG9sZCBuYW1lLCBUZW1wbGF0ZSBpcyB0aGUgbmV3XG4gICAgaWYgKHBhdGgubGVuZ3RoID49IDIgJiZcbiAgICAgICAgKHBhdGhbMF0gPT09ICdVSScgfHwgcGF0aFswXSA9PT0gJ1RlbXBsYXRlJylcbiAgICAgICAgJiYgYnVpbHRJblRlbXBsYXRlTWFjcm9zLmhhc093blByb3BlcnR5KHBhdGhbMV0pKSB7XG4gICAgICBpZiAocGF0aC5sZW5ndGggPiAyKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGRvdHRlZCBwYXRoIGJlZ2lubmluZyB3aXRoIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGhbMF0gKyAnLicgKyBwYXRoWzFdKTtcbiAgICAgIHJldHVybiBidWlsdEluVGVtcGxhdGVNYWNyb3NbcGF0aFsxXV07XG4gICAgfVxuXG4gICAgdmFyIGZpcnN0UGF0aEl0ZW0gPSBCbGF6ZVRvb2xzLnRvSlNMaXRlcmFsKHBhdGhbMF0pO1xuICAgIHZhciBsb29rdXBNZXRob2QgPSAnbG9va3VwJztcbiAgICBpZiAob3B0cyAmJiBvcHRzLmxvb2t1cFRlbXBsYXRlICYmIHBhdGgubGVuZ3RoID09PSAxKVxuICAgICAgbG9va3VwTWV0aG9kID0gJ2xvb2t1cFRlbXBsYXRlJztcbiAgICB2YXIgY29kZSA9ICd2aWV3LicgKyBsb29rdXBNZXRob2QgKyAnKCcgKyBmaXJzdFBhdGhJdGVtICsgJyknO1xuXG4gICAgaWYgKHBhdGgubGVuZ3RoID4gMSkge1xuICAgICAgY29kZSA9ICdTcGFjZWJhcnMuZG90KCcgKyBjb2RlICsgJywgJyArXG4gICAgICAgIF8ubWFwKHBhdGguc2xpY2UoMSksIEJsYXplVG9vbHMudG9KU0xpdGVyYWwpLmpvaW4oJywgJykgKyAnKSc7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvZGU7XG4gIH0sXG5cbiAgLy8gR2VuZXJhdGVzIGNvZGUgZm9yIGFuIGBbYXJnVHlwZSwgYXJnVmFsdWVdYCBhcmd1bWVudCBzcGVjLFxuICAvLyBpZ25vcmluZyB0aGUgdGhpcmQgZWxlbWVudCAoa2V5d29yZCBhcmd1bWVudCBuYW1lKSBpZiBwcmVzZW50LlxuICAvL1xuICAvLyBUaGUgcmVzdWx0aW5nIGNvZGUgbWF5IGJlIHJlYWN0aXZlIChpbiB0aGUgY2FzZSBvZiBhIFBBVEggb2ZcbiAgLy8gbW9yZSB0aGFuIG9uZSBlbGVtZW50KSBhbmQgaXMgbm90IHdyYXBwZWQgaW4gYSBjbG9zdXJlLlxuICBjb2RlR2VuQXJnVmFsdWU6IGZ1bmN0aW9uIChhcmcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgYXJnVHlwZSA9IGFyZ1swXTtcbiAgICB2YXIgYXJnVmFsdWUgPSBhcmdbMV07XG5cbiAgICB2YXIgYXJnQ29kZTtcbiAgICBzd2l0Y2ggKGFyZ1R5cGUpIHtcbiAgICBjYXNlICdTVFJJTkcnOlxuICAgIGNhc2UgJ05VTUJFUic6XG4gICAgY2FzZSAnQk9PTEVBTic6XG4gICAgY2FzZSAnTlVMTCc6XG4gICAgICBhcmdDb2RlID0gQmxhemVUb29scy50b0pTTGl0ZXJhbChhcmdWYWx1ZSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdQQVRIJzpcbiAgICAgIGFyZ0NvZGUgPSBzZWxmLmNvZGVHZW5QYXRoKGFyZ1ZhbHVlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0VYUFInOlxuICAgICAgLy8gVGhlIGZvcm1hdCBvZiBFWFBSIGlzIFsnRVhQUicsIHsgdHlwZTogJ0VYUFInLCBwYXRoOiBbLi4uXSwgYXJnczogeyAuLi4gfSB9XVxuICAgICAgYXJnQ29kZSA9IHNlbGYuY29kZUdlbk11c3RhY2hlKGFyZ1ZhbHVlLnBhdGgsIGFyZ1ZhbHVlLmFyZ3MsICdkYXRhTXVzdGFjaGUnKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBjYW4ndCBnZXQgaGVyZVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5leHBlY3RlZCBhcmcgdHlwZTogXCIgKyBhcmdUeXBlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJnQ29kZTtcbiAgfSxcblxuICAvLyBHZW5lcmF0ZXMgYSBjYWxsIHRvIGBTcGFjZWJhcnMuZm9vTXVzdGFjaGVgIG9uIGV2YWx1YXRlZCBhcmd1bWVudHMuXG4gIC8vIFRoZSByZXN1bHRpbmcgY29kZSBoYXMgbm8gZnVuY3Rpb24gbGl0ZXJhbHMgYW5kIG11c3QgYmUgd3JhcHBlZCBpblxuICAvLyBvbmUgZm9yIGZpbmUtZ3JhaW5lZCByZWFjdGl2aXR5LlxuICBjb2RlR2VuTXVzdGFjaGU6IGZ1bmN0aW9uIChwYXRoLCBhcmdzLCBtdXN0YWNoZVR5cGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgbmFtZUNvZGUgPSBzZWxmLmNvZGVHZW5QYXRoKHBhdGgpO1xuICAgIHZhciBhcmdDb2RlID0gc2VsZi5jb2RlR2VuTXVzdGFjaGVBcmdzKGFyZ3MpO1xuICAgIHZhciBtdXN0YWNoZSA9IChtdXN0YWNoZVR5cGUgfHwgJ211c3RhY2hlJyk7XG5cbiAgICByZXR1cm4gJ1NwYWNlYmFycy4nICsgbXVzdGFjaGUgKyAnKCcgKyBuYW1lQ29kZSArXG4gICAgICAoYXJnQ29kZSA/ICcsICcgKyBhcmdDb2RlLmpvaW4oJywgJykgOiAnJykgKyAnKSc7XG4gIH0sXG5cbiAgLy8gcmV0dXJuczogYXJyYXkgb2Ygc291cmNlIHN0cmluZ3MsIG9yIG51bGwgaWYgbm9cbiAgLy8gYXJncyBhdCBhbGwuXG4gIGNvZGVHZW5NdXN0YWNoZUFyZ3M6IGZ1bmN0aW9uICh0YWdBcmdzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIGt3QXJncyA9IG51bGw7IC8vIHNvdXJjZSAtPiBzb3VyY2VcbiAgICB2YXIgYXJncyA9IG51bGw7IC8vIFtzb3VyY2VdXG5cbiAgICAvLyB0YWdBcmdzIG1heSBiZSBudWxsXG4gICAgXy5lYWNoKHRhZ0FyZ3MsIGZ1bmN0aW9uIChhcmcpIHtcbiAgICAgIHZhciBhcmdDb2RlID0gc2VsZi5jb2RlR2VuQXJnVmFsdWUoYXJnKTtcblxuICAgICAgaWYgKGFyZy5sZW5ndGggPiAyKSB7XG4gICAgICAgIC8vIGtleXdvcmQgYXJndW1lbnQgKHJlcHJlc2VudGVkIGFzIFt0eXBlLCB2YWx1ZSwgbmFtZV0pXG4gICAgICAgIGt3QXJncyA9IChrd0FyZ3MgfHwge30pO1xuICAgICAgICBrd0FyZ3NbYXJnWzJdXSA9IGFyZ0NvZGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBwb3NpdGlvbmFsIGFyZ3VtZW50XG4gICAgICAgIGFyZ3MgPSAoYXJncyB8fCBbXSk7XG4gICAgICAgIGFyZ3MucHVzaChhcmdDb2RlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIHB1dCBrd0FyZ3MgaW4gb3B0aW9ucyBkaWN0aW9uYXJ5IGF0IGVuZCBvZiBhcmdzXG4gICAgaWYgKGt3QXJncykge1xuICAgICAgYXJncyA9IChhcmdzIHx8IFtdKTtcbiAgICAgIGFyZ3MucHVzaCgnU3BhY2ViYXJzLmt3KCcgKyBtYWtlT2JqZWN0TGl0ZXJhbChrd0FyZ3MpICsgJyknKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJncztcbiAgfSxcblxuICBjb2RlR2VuQmxvY2s6IGZ1bmN0aW9uIChjb250ZW50KSB7XG4gICAgcmV0dXJuIGNvZGVHZW4oY29udGVudCk7XG4gIH0sXG5cbiAgY29kZUdlbkluY2x1c2lvbkRhdGE6IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKCEgYXJncy5sZW5ndGgpIHtcbiAgICAgIC8vIGUuZy4gYHt7I2Zvb319YFxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChhcmdzWzBdLmxlbmd0aCA9PT0gMykge1xuICAgICAgLy8ga2V5d29yZCBhcmd1bWVudHMgb25seSwgZS5nLiBge3s+IHBvaW50IHg9MSB5PTJ9fWBcbiAgICAgIHZhciBkYXRhUHJvcHMgPSB7fTtcbiAgICAgIF8uZWFjaChhcmdzLCBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgIHZhciBhcmdLZXkgPSBhcmdbMl07XG4gICAgICAgIGRhdGFQcm9wc1thcmdLZXldID0gJ1NwYWNlYmFycy5jYWxsKCcgKyBzZWxmLmNvZGVHZW5BcmdWYWx1ZShhcmcpICsgJyknO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gbWFrZU9iamVjdExpdGVyYWwoZGF0YVByb3BzKTtcbiAgICB9IGVsc2UgaWYgKGFyZ3NbMF1bMF0gIT09ICdQQVRIJykge1xuICAgICAgLy8gbGl0ZXJhbCBmaXJzdCBhcmd1bWVudCwgZS5nLiBge3s+IGZvbyBcImJsYWhcIn19YFxuICAgICAgLy9cbiAgICAgIC8vIHRhZyB2YWxpZGF0aW9uIGhhcyBjb25maXJtZWQsIGluIHRoaXMgY2FzZSwgdGhhdCB0aGVyZSBpcyBvbmx5XG4gICAgICAvLyBvbmUgYXJndW1lbnQgKGBhcmdzLmxlbmd0aCA9PT0gMWApXG4gICAgICByZXR1cm4gc2VsZi5jb2RlR2VuQXJnVmFsdWUoYXJnc1swXSk7XG4gICAgfSBlbHNlIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gb25lIGFyZ3VtZW50LCBtdXN0IGJlIGEgUEFUSFxuICAgICAgcmV0dXJuICdTcGFjZWJhcnMuY2FsbCgnICsgc2VsZi5jb2RlR2VuUGF0aChhcmdzWzBdWzFdKSArICcpJztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTXVsdGlwbGUgcG9zaXRpb25hbCBhcmd1bWVudHM7IHRyZWF0IHRoZW0gYXMgYSBuZXN0ZWRcbiAgICAgIC8vIFwiZGF0YSBtdXN0YWNoZVwiXG4gICAgICByZXR1cm4gc2VsZi5jb2RlR2VuTXVzdGFjaGUoYXJnc1swXVsxXSwgYXJncy5zbGljZSgxKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZGF0YU11c3RhY2hlJyk7XG4gICAgfVxuXG4gIH0sXG5cbiAgY29kZUdlbkluY2x1c2lvbkRhdGFGdW5jOiBmdW5jdGlvbiAoYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZGF0YUNvZGUgPSBzZWxmLmNvZGVHZW5JbmNsdXNpb25EYXRhKGFyZ3MpO1xuICAgIGlmIChkYXRhQ29kZSkge1xuICAgICAgcmV0dXJuICdmdW5jdGlvbiAoKSB7IHJldHVybiAnICsgZGF0YUNvZGUgKyAnOyB9JztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbn0pO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBIVE1MVG9vbHMgfSBmcm9tICdtZXRlb3IvaHRtbC10b29scyc7XG5pbXBvcnQgeyBIVE1MIH0gZnJvbSAnbWV0ZW9yL2h0bWxqcyc7XG5pbXBvcnQgeyBCbGF6ZVRvb2xzIH0gZnJvbSAnbWV0ZW9yL2JsYXplLXRvb2xzJztcbmltcG9ydCB7IENvZGVHZW4gfSBmcm9tICcuL2NvZGVnZW4nO1xuaW1wb3J0IHsgb3B0aW1pemUgfSBmcm9tICcuL29wdGltaXplcic7XG5pbXBvcnQgeyBSZWFjdENvbXBvbmVudFNpYmxpbmdGb3JiaWRkZXJ9IGZyb20gJy4vcmVhY3QnO1xuaW1wb3J0IHsgVGVtcGxhdGVUYWcgfSBmcm9tICcuL3RlbXBsYXRldGFnJztcbmltcG9ydCB7IHJlbW92ZVdoaXRlc3BhY2UgfSBmcm9tICcuL3doaXRlc3BhY2UnO1xuXG52YXIgVWdsaWZ5SlNNaW5pZnkgPSBudWxsO1xuaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICBVZ2xpZnlKU01pbmlmeSA9IE5wbS5yZXF1aXJlKCd1Z2xpZnktanMnKS5taW5pZnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShpbnB1dCkge1xuICByZXR1cm4gSFRNTFRvb2xzLnBhcnNlRnJhZ21lbnQoXG4gICAgaW5wdXQsXG4gICAgeyBnZXRUZW1wbGF0ZVRhZzogVGVtcGxhdGVUYWcucGFyc2VDb21wbGV0ZVRhZyB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGUoaW5wdXQsIG9wdGlvbnMpIHtcbiAgdmFyIHRyZWUgPSBwYXJzZShpbnB1dCk7XG4gIHJldHVybiBjb2RlR2VuKHRyZWUsIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgY29uc3QgVGVtcGxhdGVUYWdSZXBsYWNlciA9IEhUTUwuVHJhbnNmb3JtaW5nVmlzaXRvci5leHRlbmQoKTtcblRlbXBsYXRlVGFnUmVwbGFjZXIuZGVmKHtcbiAgdmlzaXRPYmplY3Q6IGZ1bmN0aW9uICh4KSB7XG4gICAgaWYgKHggaW5zdGFuY2VvZiBIVE1MVG9vbHMuVGVtcGxhdGVUYWcpIHtcblxuICAgICAgLy8gTWFrZSBzdXJlIGFsbCBUZW1wbGF0ZVRhZ3MgaW4gYXR0cmlidXRlcyBoYXZlIHRoZSByaWdodFxuICAgICAgLy8gYC5wb3NpdGlvbmAgc2V0IG9uIHRoZW0uICBUaGlzIGlzIGEgYml0IG9mIGEgaGFja1xuICAgICAgLy8gKHdlIHNob3VsZG4ndCBiZSBtdXRhdGluZyB0aGF0IGhlcmUpLCBidXQgaXQgYWxsb3dzXG4gICAgICAvLyBjbGVhbmVyIGNvZGVnZW4gb2YgXCJzeW50aGV0aWNcIiBhdHRyaWJ1dGVzIGxpa2UgVEVYVEFSRUEnc1xuICAgICAgLy8gXCJ2YWx1ZVwiLCB3aGVyZSB0aGUgdGVtcGxhdGUgdGFncyB3ZXJlIG9yaWdpbmFsbHkgbm90XG4gICAgICAvLyBpbiBhbiBhdHRyaWJ1dGUuXG4gICAgICBpZiAodGhpcy5pbkF0dHJpYnV0ZVZhbHVlKVxuICAgICAgICB4LnBvc2l0aW9uID0gSFRNTFRvb2xzLlRFTVBMQVRFX1RBR19QT1NJVElPTi5JTl9BVFRSSUJVVEU7XG5cbiAgICAgIHJldHVybiB0aGlzLmNvZGVnZW4uY29kZUdlblRlbXBsYXRlVGFnKHgpO1xuICAgIH1cblxuICAgIHJldHVybiBIVE1MLlRyYW5zZm9ybWluZ1Zpc2l0b3IucHJvdG90eXBlLnZpc2l0T2JqZWN0LmNhbGwodGhpcywgeCk7XG4gIH0sXG4gIHZpc2l0QXR0cmlidXRlczogZnVuY3Rpb24gKGF0dHJzKSB7XG4gICAgaWYgKGF0dHJzIGluc3RhbmNlb2YgSFRNTFRvb2xzLlRlbXBsYXRlVGFnKVxuICAgICAgcmV0dXJuIHRoaXMuY29kZWdlbi5jb2RlR2VuVGVtcGxhdGVUYWcoYXR0cnMpO1xuXG4gICAgLy8gY2FsbCBzdXBlciAoZS5nLiBmb3IgY2FzZSB3aGVyZSBgYXR0cnNgIGlzIGFuIGFycmF5KVxuICAgIHJldHVybiBIVE1MLlRyYW5zZm9ybWluZ1Zpc2l0b3IucHJvdG90eXBlLnZpc2l0QXR0cmlidXRlcy5jYWxsKHRoaXMsIGF0dHJzKTtcbiAgfSxcbiAgdmlzaXRBdHRyaWJ1dGU6IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSwgdGFnKSB7XG4gICAgdGhpcy5pbkF0dHJpYnV0ZVZhbHVlID0gdHJ1ZTtcbiAgICB2YXIgcmVzdWx0ID0gdGhpcy52aXNpdCh2YWx1ZSk7XG4gICAgdGhpcy5pbkF0dHJpYnV0ZVZhbHVlID0gZmFsc2U7XG5cbiAgICBpZiAocmVzdWx0ICE9PSB2YWx1ZSkge1xuICAgICAgLy8gc29tZSB0ZW1wbGF0ZSB0YWdzIG11c3QgaGF2ZSBiZWVuIHJlcGxhY2VkLCBiZWNhdXNlIG90aGVyd2lzZVxuICAgICAgLy8gd2UgdHJ5IHRvIGtlZXAgdGhpbmdzIGA9PT1gIHdoZW4gdHJhbnNmb3JtaW5nLiAgV3JhcCB0aGUgY29kZVxuICAgICAgLy8gaW4gYSBmdW5jdGlvbiBhcyBwZXIgdGhlIHJ1bGVzLiAgWW91IGNhbid0IGhhdmVcbiAgICAgIC8vIGB7aWQ6IEJsYXplLlZpZXcoLi4uKX1gIGFzIGFuIGF0dHJpYnV0ZXMgZGljdCBiZWNhdXNlIHRoZSBWaWV3XG4gICAgICAvLyB3b3VsZCBiZSByZW5kZXJlZCBtb3JlIHRoYW4gb25jZTsgeW91IG5lZWQgdG8gd3JhcCBpdCBpbiBhIGZ1bmN0aW9uXG4gICAgICAvLyBzbyB0aGF0IGl0J3MgYSBkaWZmZXJlbnQgVmlldyBlYWNoIHRpbWUuXG4gICAgICByZXR1cm4gQmxhemVUb29scy5FbWl0Q29kZSh0aGlzLmNvZGVnZW4uY29kZUdlbkJsb2NrKHJlc3VsdCkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNvZGVHZW4gKHBhcnNlVHJlZSwgb3B0aW9ucykge1xuICAvLyBpcyB0aGlzIGEgdGVtcGxhdGUsIHJhdGhlciB0aGFuIGEgYmxvY2sgcGFzc2VkIHRvXG4gIC8vIGEgYmxvY2sgaGVscGVyLCBzYXlcbiAgdmFyIGlzVGVtcGxhdGUgPSAob3B0aW9ucyAmJiBvcHRpb25zLmlzVGVtcGxhdGUpO1xuICB2YXIgaXNCb2R5ID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5pc0JvZHkpO1xuICB2YXIgd2hpdGVzcGFjZSA9IChvcHRpb25zICYmIG9wdGlvbnMud2hpdGVzcGFjZSlcbiAgdmFyIHNvdXJjZU5hbWUgPSAob3B0aW9ucyAmJiBvcHRpb25zLnNvdXJjZU5hbWUpO1xuXG4gIHZhciB0cmVlID0gcGFyc2VUcmVlO1xuXG4gIC8vIFRoZSBmbGFncyBgaXNUZW1wbGF0ZWAgYW5kIGBpc0JvZHlgIGFyZSBraW5kIG9mIGEgaGFjay5cbiAgaWYgKGlzVGVtcGxhdGUgfHwgaXNCb2R5KSB7XG4gICAgaWYgKHR5cGVvZiB3aGl0ZXNwYWNlID09PSAnc3RyaW5nJyAmJiB3aGl0ZXNwYWNlLnRvTG93ZXJDYXNlKCkgPT09ICdzdHJpcCcpIHtcbiAgICAgIHRyZWUgPSByZW1vdmVXaGl0ZXNwYWNlKHRyZWUpO1xuICAgIH1cbiAgICAvLyBvcHRpbWl6aW5nIGZyYWdtZW50cyB3b3VsZCByZXF1aXJlIGJlaW5nIHNtYXJ0ZXIgYWJvdXQgd2hldGhlciB3ZSBhcmVcbiAgICAvLyBpbiBhIFRFWFRBUkVBLCBzYXkuXG4gICAgdHJlZSA9IG9wdGltaXplKHRyZWUpO1xuICB9XG5cbiAgLy8gdGhyb3dzIGFuIGVycm9yIGlmIHVzaW5nIGB7ez4gUmVhY3R9fWAgd2l0aCBzaWJsaW5nc1xuICBuZXcgUmVhY3RDb21wb25lbnRTaWJsaW5nRm9yYmlkZGVyKHtzb3VyY2VOYW1lOiBzb3VyY2VOYW1lfSlcbiAgICAudmlzaXQodHJlZSk7XG5cbiAgdmFyIGNvZGVnZW4gPSBuZXcgQ29kZUdlbjtcbiAgdHJlZSA9IChuZXcgVGVtcGxhdGVUYWdSZXBsYWNlcihcbiAgICB7Y29kZWdlbjogY29kZWdlbn0pKS52aXNpdCh0cmVlKTtcblxuICB2YXIgY29kZSA9ICcoZnVuY3Rpb24gKCkgeyAnO1xuICBpZiAoaXNUZW1wbGF0ZSB8fCBpc0JvZHkpIHtcbiAgICBjb2RlICs9ICd2YXIgdmlldyA9IHRoaXM7ICc7XG4gIH1cbiAgY29kZSArPSAncmV0dXJuICc7XG4gIGNvZGUgKz0gQmxhemVUb29scy50b0pTKHRyZWUpO1xuICBjb2RlICs9ICc7IH0pJztcblxuICBjb2RlID0gYmVhdXRpZnkoY29kZSk7XG5cbiAgcmV0dXJuIGNvZGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBiZWF1dGlmeSAoY29kZSkge1xuICBpZiAoIVVnbGlmeUpTTWluaWZ5KSB7XG4gICAgcmV0dXJuIGNvZGU7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gVWdsaWZ5SlNNaW5pZnkoY29kZSwge1xuICAgIGZyb21TdHJpbmc6IHRydWUsXG4gICAgbWFuZ2xlOiBmYWxzZSxcbiAgICBjb21wcmVzczogZmFsc2UsXG4gICAgb3V0cHV0OiB7XG4gICAgICBiZWF1dGlmeTogdHJ1ZSxcbiAgICAgIGluZGVudF9sZXZlbDogMixcbiAgICAgIHdpZHRoOiA4MFxuICAgIH1cbiAgfSk7XG5cbiAgdmFyIG91dHB1dCA9IHJlc3VsdC5jb2RlO1xuICAvLyBVZ2xpZnkgaW50ZXJwcmV0cyBvdXIgZXhwcmVzc2lvbiBhcyBhIHN0YXRlbWVudCBhbmQgbWF5IGFkZCBhIHNlbWljb2xvbi5cbiAgLy8gU3RyaXAgdHJhaWxpbmcgc2VtaWNvbG9uLlxuICBvdXRwdXQgPSBvdXRwdXQucmVwbGFjZSgvOyQvLCAnJyk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG4iLCJpbXBvcnQgeyBIVE1MVG9vbHMgfSBmcm9tICdtZXRlb3IvaHRtbC10b29scyc7XG5pbXBvcnQgeyBIVE1MIH0gZnJvbSAnbWV0ZW9yL2h0bWxqcyc7XG5cbi8vIE9wdGltaXplIHBhcnRzIG9mIGFuIEhUTUxqcyB0cmVlIGludG8gcmF3IEhUTUwgc3RyaW5ncyB3aGVuIHRoZXkgZG9uJ3Rcbi8vIGNvbnRhaW4gdGVtcGxhdGUgdGFncy5cblxudmFyIGNvbnN0YW50ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7IHJldHVybiB2YWx1ZTsgfTtcbn07XG5cbnZhciBPUFRJTUlaQUJMRSA9IHtcbiAgTk9ORTogMCxcbiAgUEFSVFM6IDEsXG4gIEZVTEw6IDJcbn07XG5cbi8vIFdlIGNhbiBvbmx5IHR1cm4gY29udGVudCBpbnRvIGFuIEhUTUwgc3RyaW5nIGlmIGl0IGNvbnRhaW5zIG5vIHRlbXBsYXRlXG4vLyB0YWdzIGFuZCBubyBcInRyaWNreVwiIEhUTUwgdGFncy4gIElmIHdlIGNhbiBvcHRpbWl6ZSB0aGUgZW50aXJlIGNvbnRlbnRcbi8vIGludG8gYSBzdHJpbmcsIHdlIHJldHVybiBPUFRJTUlaQUJMRS5GVUxMLiAgSWYgdGhlIHdlIGFyZSBnaXZlbiBhblxuLy8gdW5vcHRpbWl6YWJsZSBub2RlLCB3ZSByZXR1cm4gT1BUSU1JWkFCTEUuTk9ORS4gIElmIHdlIGFyZSBnaXZlbiBhIHRyZWVcbi8vIHRoYXQgY29udGFpbnMgYW4gdW5vcHRpbWl6YWJsZSBub2RlIHNvbWV3aGVyZSwgd2UgcmV0dXJuIE9QVElNSVpBQkxFLlBBUlRTLlxuLy9cbi8vIEZvciBleGFtcGxlLCB3ZSBhbHdheXMgY3JlYXRlIFNWRyBlbGVtZW50cyBwcm9ncmFtbWF0aWNhbGx5LCBzaW5jZSBTVkdcbi8vIGRvZXNuJ3QgaGF2ZSBpbm5lckhUTUwuICBJZiB3ZSBhcmUgZ2l2ZW4gYW4gU1ZHIGVsZW1lbnQsIHdlIHJldHVybiBOT05FLlxuLy8gSG93ZXZlciwgaWYgd2UgYXJlIGdpdmVuIGEgYmlnIHRyZWUgdGhhdCBjb250YWlucyBTVkcgc29tZXdoZXJlLCB3ZVxuLy8gcmV0dXJuIFBBUlRTIHNvIHRoYXQgdGhlIG9wdGltaXplciBjYW4gZGVzY2VuZCBpbnRvIHRoZSB0cmVlIGFuZCBvcHRpbWl6ZVxuLy8gb3RoZXIgcGFydHMgb2YgaXQuXG52YXIgQ2FuT3B0aW1pemVWaXNpdG9yID0gSFRNTC5WaXNpdG9yLmV4dGVuZCgpO1xuQ2FuT3B0aW1pemVWaXNpdG9yLmRlZih7XG4gIHZpc2l0TnVsbDogY29uc3RhbnQoT1BUSU1JWkFCTEUuRlVMTCksXG4gIHZpc2l0UHJpbWl0aXZlOiBjb25zdGFudChPUFRJTUlaQUJMRS5GVUxMKSxcbiAgdmlzaXRDb21tZW50OiBjb25zdGFudChPUFRJTUlaQUJMRS5GVUxMKSxcbiAgdmlzaXRDaGFyUmVmOiBjb25zdGFudChPUFRJTUlaQUJMRS5GVUxMKSxcbiAgdmlzaXRSYXc6IGNvbnN0YW50KE9QVElNSVpBQkxFLkZVTEwpLFxuICB2aXNpdE9iamVjdDogY29uc3RhbnQoT1BUSU1JWkFCTEUuTk9ORSksXG4gIHZpc2l0RnVuY3Rpb246IGNvbnN0YW50KE9QVElNSVpBQkxFLk5PTkUpLFxuICB2aXNpdEFycmF5OiBmdW5jdGlvbiAoeCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkrKylcbiAgICAgIGlmICh0aGlzLnZpc2l0KHhbaV0pICE9PSBPUFRJTUlaQUJMRS5GVUxMKVxuICAgICAgICByZXR1cm4gT1BUSU1JWkFCTEUuUEFSVFM7XG4gICAgcmV0dXJuIE9QVElNSVpBQkxFLkZVTEw7XG4gIH0sXG4gIHZpc2l0VGFnOiBmdW5jdGlvbiAodGFnKSB7XG4gICAgdmFyIHRhZ05hbWUgPSB0YWcudGFnTmFtZTtcbiAgICBpZiAodGFnTmFtZSA9PT0gJ3RleHRhcmVhJykge1xuICAgICAgLy8gb3B0aW1pemluZyBpbnRvIGEgVEVYVEFSRUEncyBSQ0RBVEEgd291bGQgcmVxdWlyZSBiZWluZyBhIGxpdHRsZVxuICAgICAgLy8gbW9yZSBjbGV2ZXIuXG4gICAgICByZXR1cm4gT1BUSU1JWkFCTEUuTk9ORTtcbiAgICB9IGVsc2UgaWYgKHRhZ05hbWUgPT09ICdzY3JpcHQnKSB7XG4gICAgICAvLyBzY3JpcHQgdGFncyBkb24ndCB3b3JrIHdoZW4gcmVuZGVyZWQgZnJvbSBzdHJpbmdzXG4gICAgICByZXR1cm4gT1BUSU1JWkFCTEUuTk9ORTtcbiAgICB9IGVsc2UgaWYgKCEgKEhUTUwuaXNLbm93bkVsZW1lbnQodGFnTmFtZSkgJiZcbiAgICAgICAgICAgICAgICAgICEgSFRNTC5pc0tub3duU1ZHRWxlbWVudCh0YWdOYW1lKSkpIHtcbiAgICAgIC8vIGZvcmVpZ24gZWxlbWVudHMgbGlrZSBTVkcgY2FuJ3QgYmUgc3RyaW5naWZpZWQgZm9yIGlubmVySFRNTC5cbiAgICAgIHJldHVybiBPUFRJTUlaQUJMRS5OT05FO1xuICAgIH0gZWxzZSBpZiAodGFnTmFtZSA9PT0gJ3RhYmxlJykge1xuICAgICAgLy8gQXZvaWQgZXZlciBwcm9kdWNpbmcgSFRNTCBjb250YWluaW5nIGA8dGFibGU+PHRyPi4uLmAsIGJlY2F1c2UgdGhlXG4gICAgICAvLyBicm93c2VyIHdpbGwgaW5zZXJ0IGEgVEJPRFkuICBJZiB3ZSBqdXN0IGBjcmVhdGVFbGVtZW50KFwidGFibGVcIilgIGFuZFxuICAgICAgLy8gYGNyZWF0ZUVsZW1lbnQoXCJ0clwiKWAsIG9uIHRoZSBvdGhlciBoYW5kLCBubyBUQk9EWSBpcyBuZWNlc3NhcnlcbiAgICAgIC8vIChhc3N1bWluZyBJRSA4KykuXG4gICAgICByZXR1cm4gT1BUSU1JWkFCTEUuUEFSVFM7XG4gICAgfSBlbHNlIGlmICh0YWdOYW1lID09PSAndHInKXtcbiAgICAgIHJldHVybiBPUFRJTUlaQUJMRS5QQVJUUztcbiAgICB9XG5cbiAgICB2YXIgY2hpbGRyZW4gPSB0YWcuY2hpbGRyZW47XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKylcbiAgICAgIGlmICh0aGlzLnZpc2l0KGNoaWxkcmVuW2ldKSAhPT0gT1BUSU1JWkFCTEUuRlVMTClcbiAgICAgICAgcmV0dXJuIE9QVElNSVpBQkxFLlBBUlRTO1xuXG4gICAgaWYgKHRoaXMudmlzaXRBdHRyaWJ1dGVzKHRhZy5hdHRycykgIT09IE9QVElNSVpBQkxFLkZVTEwpXG4gICAgICByZXR1cm4gT1BUSU1JWkFCTEUuUEFSVFM7XG5cbiAgICByZXR1cm4gT1BUSU1JWkFCTEUuRlVMTDtcbiAgfSxcbiAgdmlzaXRBdHRyaWJ1dGVzOiBmdW5jdGlvbiAoYXR0cnMpIHtcbiAgICBpZiAoYXR0cnMpIHtcbiAgICAgIHZhciBpc0FycmF5ID0gSFRNTC5pc0FycmF5KGF0dHJzKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgKGlzQXJyYXkgPyBhdHRycy5sZW5ndGggOiAxKTsgaSsrKSB7XG4gICAgICAgIHZhciBhID0gKGlzQXJyYXkgPyBhdHRyc1tpXSA6IGF0dHJzKTtcbiAgICAgICAgaWYgKCh0eXBlb2YgYSAhPT0gJ29iamVjdCcpIHx8IChhIGluc3RhbmNlb2YgSFRNTFRvb2xzLlRlbXBsYXRlVGFnKSlcbiAgICAgICAgICByZXR1cm4gT1BUSU1JWkFCTEUuUEFSVFM7XG4gICAgICAgIGZvciAodmFyIGsgaW4gYSlcbiAgICAgICAgICBpZiAodGhpcy52aXNpdChhW2tdKSAhPT0gT1BUSU1JWkFCTEUuRlVMTClcbiAgICAgICAgICAgIHJldHVybiBPUFRJTUlaQUJMRS5QQVJUUztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIE9QVElNSVpBQkxFLkZVTEw7XG4gIH1cbn0pO1xuXG52YXIgZ2V0T3B0aW1pemFiaWxpdHkgPSBmdW5jdGlvbiAoY29udGVudCkge1xuICByZXR1cm4gKG5ldyBDYW5PcHRpbWl6ZVZpc2l0b3IpLnZpc2l0KGNvbnRlbnQpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRvUmF3KHgpIHtcbiAgcmV0dXJuIEhUTUwuUmF3KEhUTUwudG9IVE1MKHgpKTtcbn1cblxuZXhwb3J0IGNvbnN0IFRyZWVUcmFuc2Zvcm1lciA9IEhUTUwuVHJhbnNmb3JtaW5nVmlzaXRvci5leHRlbmQoKTtcblRyZWVUcmFuc2Zvcm1lci5kZWYoe1xuICB2aXNpdEF0dHJpYnV0ZXM6IGZ1bmN0aW9uIChhdHRycy8qLCAuLi4qLykge1xuICAgIC8vIHBhc3MgdGVtcGxhdGUgdGFncyB0aHJvdWdoIGJ5IGRlZmF1bHRcbiAgICBpZiAoYXR0cnMgaW5zdGFuY2VvZiBIVE1MVG9vbHMuVGVtcGxhdGVUYWcpXG4gICAgICByZXR1cm4gYXR0cnM7XG5cbiAgICByZXR1cm4gSFRNTC5UcmFuc2Zvcm1pbmdWaXNpdG9yLnByb3RvdHlwZS52aXNpdEF0dHJpYnV0ZXMuYXBwbHkoXG4gICAgICB0aGlzLCBhcmd1bWVudHMpO1xuICB9XG59KTtcblxuLy8gUmVwbGFjZSBwYXJ0cyBvZiB0aGUgSFRNTGpzIHRyZWUgdGhhdCBoYXZlIG5vIHRlbXBsYXRlIHRhZ3MgKG9yXG4vLyB0cmlja3kgSFRNTCB0YWdzKSB3aXRoIEhUTUwuUmF3IG9iamVjdHMgY29udGFpbmluZyByYXcgSFRNTC5cbnZhciBPcHRpbWl6aW5nVmlzaXRvciA9IFRyZWVUcmFuc2Zvcm1lci5leHRlbmQoKTtcbk9wdGltaXppbmdWaXNpdG9yLmRlZih7XG4gIHZpc2l0TnVsbDogdG9SYXcsXG4gIHZpc2l0UHJpbWl0aXZlOiB0b1JhdyxcbiAgdmlzaXRDb21tZW50OiB0b1JhdyxcbiAgdmlzaXRDaGFyUmVmOiB0b1JhdyxcbiAgdmlzaXRBcnJheTogZnVuY3Rpb24gKGFycmF5KSB7XG4gICAgdmFyIG9wdGltaXphYmlsaXR5ID0gZ2V0T3B0aW1pemFiaWxpdHkoYXJyYXkpO1xuICAgIGlmIChvcHRpbWl6YWJpbGl0eSA9PT0gT1BUSU1JWkFCTEUuRlVMTCkge1xuICAgICAgcmV0dXJuIHRvUmF3KGFycmF5KTtcbiAgICB9IGVsc2UgaWYgKG9wdGltaXphYmlsaXR5ID09PSBPUFRJTUlaQUJMRS5QQVJUUykge1xuICAgICAgcmV0dXJuIFRyZWVUcmFuc2Zvcm1lci5wcm90b3R5cGUudmlzaXRBcnJheS5jYWxsKHRoaXMsIGFycmF5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH1cbiAgfSxcbiAgdmlzaXRUYWc6IGZ1bmN0aW9uICh0YWcpIHtcbiAgICB2YXIgb3B0aW1pemFiaWxpdHkgPSBnZXRPcHRpbWl6YWJpbGl0eSh0YWcpO1xuICAgIGlmIChvcHRpbWl6YWJpbGl0eSA9PT0gT1BUSU1JWkFCTEUuRlVMTCkge1xuICAgICAgcmV0dXJuIHRvUmF3KHRhZyk7XG4gICAgfSBlbHNlIGlmIChvcHRpbWl6YWJpbGl0eSA9PT0gT1BUSU1JWkFCTEUuUEFSVFMpIHtcbiAgICAgIHJldHVybiBUcmVlVHJhbnNmb3JtZXIucHJvdG90eXBlLnZpc2l0VGFnLmNhbGwodGhpcywgdGFnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRhZztcbiAgICB9XG4gIH0sXG4gIHZpc2l0Q2hpbGRyZW46IGZ1bmN0aW9uIChjaGlsZHJlbikge1xuICAgIC8vIGRvbid0IG9wdGltaXplIHRoZSBjaGlsZHJlbiBhcnJheSBpbnRvIGEgUmF3IG9iamVjdCFcbiAgICByZXR1cm4gVHJlZVRyYW5zZm9ybWVyLnByb3RvdHlwZS52aXNpdEFycmF5LmNhbGwodGhpcywgY2hpbGRyZW4pO1xuICB9LFxuICB2aXNpdEF0dHJpYnV0ZXM6IGZ1bmN0aW9uIChhdHRycykge1xuICAgIHJldHVybiBhdHRycztcbiAgfVxufSk7XG5cbi8vIENvbWJpbmUgY29uc2VjdXRpdmUgSFRNTC5SYXdzLiAgUmVtb3ZlIGVtcHR5IG9uZXMuXG52YXIgUmF3Q29tcGFjdGluZ1Zpc2l0b3IgPSBUcmVlVHJhbnNmb3JtZXIuZXh0ZW5kKCk7XG5SYXdDb21wYWN0aW5nVmlzaXRvci5kZWYoe1xuICB2aXNpdEFycmF5OiBmdW5jdGlvbiAoYXJyYXkpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGl0ZW0gPSBhcnJheVtpXTtcbiAgICAgIGlmICgoaXRlbSBpbnN0YW5jZW9mIEhUTUwuUmF3KSAmJlxuICAgICAgICAgICgoISBpdGVtLnZhbHVlKSB8fFxuICAgICAgICAgICAocmVzdWx0Lmxlbmd0aCAmJlxuICAgICAgICAgICAgKHJlc3VsdFtyZXN1bHQubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBIVE1MLlJhdykpKSkge1xuICAgICAgICAvLyB0d28gY2FzZXM6IGl0ZW0gaXMgYW4gZW1wdHkgUmF3LCBvciBwcmV2aW91cyBpdGVtIGlzXG4gICAgICAgIC8vIGEgUmF3IGFzIHdlbGwuICBJbiB0aGUgbGF0dGVyIGNhc2UsIHJlcGxhY2UgdGhlIHByZXZpb3VzXG4gICAgICAgIC8vIFJhdyB3aXRoIGEgbG9uZ2VyIG9uZSB0aGF0IGluY2x1ZGVzIHRoZSBuZXcgUmF3LlxuICAgICAgICBpZiAoaXRlbS52YWx1ZSkge1xuICAgICAgICAgIHJlc3VsdFtyZXN1bHQubGVuZ3RoIC0gMV0gPSBIVE1MLlJhdyhcbiAgICAgICAgICAgIHJlc3VsdFtyZXN1bHQubGVuZ3RoIC0gMV0udmFsdWUgKyBpdGVtLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0LnB1c2godGhpcy52aXNpdChpdGVtKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn0pO1xuXG4vLyBSZXBsYWNlIHBvaW50bGVzcyBSYXdzIGxpa2UgYEhUTWwuUmF3KCdmb28nKWAgdGhhdCBjb250YWluIG5vIHNwZWNpYWxcbi8vIGNoYXJhY3RlcnMgd2l0aCBzaW1wbGUgc3RyaW5ncy5cbnZhciBSYXdSZXBsYWNpbmdWaXNpdG9yID0gVHJlZVRyYW5zZm9ybWVyLmV4dGVuZCgpO1xuUmF3UmVwbGFjaW5nVmlzaXRvci5kZWYoe1xuICB2aXNpdFJhdzogZnVuY3Rpb24gKHJhdykge1xuICAgIHZhciBodG1sID0gcmF3LnZhbHVlO1xuICAgIGlmIChodG1sLmluZGV4T2YoJyYnKSA8IDAgJiYgaHRtbC5pbmRleE9mKCc8JykgPCAwKSB7XG4gICAgICByZXR1cm4gaHRtbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHJhdztcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gb3B0aW1pemUgKHRyZWUpIHtcbiAgdHJlZSA9IChuZXcgT3B0aW1pemluZ1Zpc2l0b3IpLnZpc2l0KHRyZWUpO1xuICB0cmVlID0gKG5ldyBSYXdDb21wYWN0aW5nVmlzaXRvcikudmlzaXQodHJlZSk7XG4gIHRyZWUgPSAobmV3IFJhd1JlcGxhY2luZ1Zpc2l0b3IpLnZpc2l0KHRyZWUpO1xuICByZXR1cm4gdHJlZTtcbn1cbiIsImltcG9ydCB7IEhUTUxUb29scyB9IGZyb20gJ21ldGVvci9odG1sLXRvb2xzJztcbmltcG9ydCB7IEhUTUwgfSBmcm9tICdtZXRlb3IvaHRtbGpzJztcbmltcG9ydCB7IEJsYXplVG9vbHMgfSBmcm9tICdtZXRlb3IvYmxhemUtdG9vbHMnO1xuXG4vLyBBIHZpc2l0b3IgdG8gZW5zdXJlIHRoYXQgUmVhY3QgY29tcG9uZW50cyBpbmNsdWRlZCB2aWEgdGhlIGB7ez5cbi8vIFJlYWN0fX1gIHRlbXBsYXRlIGRlZmluZWQgaW4gdGhlIHJlYWN0LXRlbXBsYXRlLWhlbHBlciBwYWNrYWdlIGFyZVxuLy8gdGhlIG9ubHkgY2hpbGQgaW4gdGhlaXIgcGFyZW50IGNvbXBvbmVudC4gT3RoZXJ3aXNlIGBSZWFjdC5yZW5kZXJgXG4vLyB3b3VsZCBlbGltaW5hdGUgYWxsIG9mIHRoZWlyIHNpYmxpbmcgbm9kZXMuXG4vL1xuLy8gSXQncyBhIGxpdHRsZSBzdHJhbmdlIHRoYXQgdGhpcyBsb2dpYyBpcyBpbiBzcGFjZWJhcnMtY29tcGlsZXIgaWZcbi8vIGl0J3Mgb25seSByZWxldmFudCB0byBhIHNwZWNpZmljIHBhY2thZ2UgYnV0IHRoZXJlJ3Mgbm8gd2F5IHRvIGhhdmVcbi8vIGEgcGFja2FnZSBob29rIGludG8gYSBidWlsZCBwbHVnaW4uXG5leHBvcnQgY29uc3QgUmVhY3RDb21wb25lbnRTaWJsaW5nRm9yYmlkZGVyID0gSFRNTC5WaXNpdG9yLmV4dGVuZCgpO1xuUmVhY3RDb21wb25lbnRTaWJsaW5nRm9yYmlkZGVyLmRlZih7XG4gIHZpc2l0QXJyYXk6IGZ1bmN0aW9uIChhcnJheSwgcGFyZW50VGFnKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy52aXNpdChhcnJheVtpXSwgcGFyZW50VGFnKTtcbiAgICB9XG4gIH0sXG4gIHZpc2l0T2JqZWN0OiBmdW5jdGlvbiAob2JqLCBwYXJlbnRUYWcpIHtcbiAgICBpZiAob2JqLnR5cGUgPT09IFwiSU5DTFVTSU9OXCIgJiYgb2JqLnBhdGgubGVuZ3RoID09PSAxICYmIG9iai5wYXRoWzBdID09PSBcIlJlYWN0XCIpIHtcbiAgICAgIGlmICghcGFyZW50VGFnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBcInt7PiBSZWFjdH19IG11c3QgYmUgdXNlZCBpbiBhIGNvbnRhaW5lciBlbGVtZW50XCJcbiAgICAgICAgICAgICsgKHRoaXMuc291cmNlTmFtZSA/IChcIiBpbiBcIiArIHRoaXMuc291cmNlTmFtZSkgOiBcIlwiKVxuICAgICAgICAgICAgICAgKyBcIi4gTGVhcm4gbW9yZSBhdCBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci93aWtpL1JlYWN0LWNvbXBvbmVudHMtbXVzdC1iZS10aGUtb25seS10aGluZy1pbi10aGVpci13cmFwcGVyLWVsZW1lbnRcIik7XG4gICAgICB9XG5cbiAgICAgIHZhciBudW1TaWJsaW5ncyA9IDA7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmVudFRhZy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBwYXJlbnRUYWcuY2hpbGRyZW5baV07XG4gICAgICAgIGlmIChjaGlsZCAhPT0gb2JqICYmICEodHlwZW9mIGNoaWxkID09PSBcInN0cmluZ1wiICYmIGNoaWxkLm1hdGNoKC9eXFxzKiQvKSkpIHtcbiAgICAgICAgICBudW1TaWJsaW5ncysrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChudW1TaWJsaW5ncyA+IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwie3s+IFJlYWN0fX0gbXVzdCBiZSB1c2VkIGFzIHRoZSBvbmx5IGNoaWxkIGluIGEgY29udGFpbmVyIGVsZW1lbnRcIlxuICAgICAgICAgICAgKyAodGhpcy5zb3VyY2VOYW1lID8gKFwiIGluIFwiICsgdGhpcy5zb3VyY2VOYW1lKSA6IFwiXCIpXG4gICAgICAgICAgICAgICArIFwiLiBMZWFybiBtb3JlIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL3dpa2kvUmVhY3QtY29tcG9uZW50cy1tdXN0LWJlLXRoZS1vbmx5LXRoaW5nLWluLXRoZWlyLXdyYXBwZXItZWxlbWVudFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIHZpc2l0VGFnOiBmdW5jdGlvbiAodGFnKSB7XG4gICAgdGhpcy52aXNpdEFycmF5KHRhZy5jaGlsZHJlbiwgdGFnIC8qcGFyZW50VGFnKi8pO1xuICB9XG59KTtcbiIsImltcG9ydCB7IEhUTUxUb29scyB9IGZyb20gJ21ldGVvci9odG1sLXRvb2xzJztcbmltcG9ydCB7IEhUTUwgfSBmcm9tICdtZXRlb3IvaHRtbGpzJztcbmltcG9ydCB7IEJsYXplVG9vbHMgfSBmcm9tICdtZXRlb3IvYmxhemUtdG9vbHMnO1xuXG4vLyBBIFRlbXBsYXRlVGFnIGlzIHRoZSByZXN1bHQgb2YgcGFyc2luZyBhIHNpbmdsZSBge3suLi59fWAgdGFnLlxuLy9cbi8vIFRoZSBgLnR5cGVgIG9mIGEgVGVtcGxhdGVUYWcgaXMgb25lIG9mOlxuLy9cbi8vIC0gYFwiRE9VQkxFXCJgIC0gYHt7Zm9vfX1gXG4vLyAtIGBcIlRSSVBMRVwiYCAtIGB7e3tmb299fX1gXG4vLyAtIGBcIkVYUFJcImAgLSBgKGZvbylgXG4vLyAtIGBcIkNPTU1FTlRcImAgLSBge3shIGZvb319YFxuLy8gLSBgXCJCTE9DS0NPTU1FTlRcIiAtIGB7eyEtLSBmb28tLX19YFxuLy8gLSBgXCJJTkNMVVNJT05cImAgLSBge3s+IGZvb319YFxuLy8gLSBgXCJCTE9DS09QRU5cImAgLSBge3sjZm9vfX1gXG4vLyAtIGBcIkJMT0NLQ0xPU0VcImAgLSBge3svZm9vfX1gXG4vLyAtIGBcIkVMU0VcImAgLSBge3tlbHNlfX1gXG4vLyAtIGBcIkVTQ0FQRVwiYCAtIGB7e3xgLCBge3t7fGAsIGB7e3t7fGAgYW5kIHNvIG9uXG4vL1xuLy8gQmVzaWRlcyBgdHlwZWAsIHRoZSBtYW5kYXRvcnkgcHJvcGVydGllcyBvZiBhIFRlbXBsYXRlVGFnIGFyZTpcbi8vXG4vLyAtIGBwYXRoYCAtIEFuIGFycmF5IG9mIG9uZSBvciBtb3JlIHN0cmluZ3MuICBUaGUgcGF0aCBvZiBge3tmb28uYmFyfX1gXG4vLyAgIGlzIGBbXCJmb29cIiwgXCJiYXJcIl1gLiAgQXBwbGllcyB0byBET1VCTEUsIFRSSVBMRSwgSU5DTFVTSU9OLCBCTE9DS09QRU4sXG4vLyAgIEJMT0NLQ0xPU0UsIGFuZCBFTFNFLlxuLy9cbi8vIC0gYGFyZ3NgIC0gQW4gYXJyYXkgb2YgemVybyBvciBtb3JlIGFyZ3VtZW50IHNwZWNzLiAgQW4gYXJndW1lbnQgc3BlY1xuLy8gICBpcyBhIHR3byBvciB0aHJlZSBlbGVtZW50IGFycmF5LCBjb25zaXN0aW5nIG9mIGEgdHlwZSwgdmFsdWUsIGFuZFxuLy8gICBvcHRpb25hbCBrZXl3b3JkIG5hbWUuICBGb3IgZXhhbXBsZSwgdGhlIGBhcmdzYCBvZiBge3tmb28gXCJiYXJcIiB4PTN9fWBcbi8vICAgYXJlIGBbW1wiU1RSSU5HXCIsIFwiYmFyXCJdLCBbXCJOVU1CRVJcIiwgMywgXCJ4XCJdXWAuICBBcHBsaWVzIHRvIERPVUJMRSxcbi8vICAgVFJJUExFLCBJTkNMVVNJT04sIEJMT0NLT1BFTiwgYW5kIEVMU0UuXG4vL1xuLy8gLSBgdmFsdWVgIC0gQSBzdHJpbmcgb2YgdGhlIGNvbW1lbnQncyB0ZXh0LiBBcHBsaWVzIHRvIENPTU1FTlQgYW5kXG4vLyAgIEJMT0NLQ09NTUVOVC5cbi8vXG4vLyBUaGVzZSBhZGRpdGlvbmFsIGFyZSB0eXBpY2FsbHkgc2V0IGR1cmluZyBwYXJzaW5nOlxuLy9cbi8vIC0gYHBvc2l0aW9uYCAtIFRoZSBIVE1MVG9vbHMuVEVNUExBVEVfVEFHX1BPU0lUSU9OIHNwZWNpZnlpbmcgYXQgd2hhdCBzb3J0XG4vLyAgIG9mIHNpdGUgdGhlIFRlbXBsYXRlVGFnIHdhcyBlbmNvdW50ZXJlZCAoZS5nLiBhdCBlbGVtZW50IGxldmVsIG9yIGFzXG4vLyAgIHBhcnQgb2YgYW4gYXR0cmlidXRlIHZhbHVlKS4gSXRzIGFic2VuY2UgaW1wbGllc1xuLy8gICBURU1QTEFURV9UQUdfUE9TSVRJT04uRUxFTUVOVC5cbi8vXG4vLyAtIGBjb250ZW50YCBhbmQgYGVsc2VDb250ZW50YCAtIFdoZW4gYSBCTE9DS09QRU4gdGFnJ3MgY29udGVudHMgYXJlXG4vLyAgIHBhcnNlZCwgdGhleSBhcmUgcHV0IGhlcmUuICBgZWxzZUNvbnRlbnRgIHdpbGwgb25seSBiZSBwcmVzZW50IGlmXG4vLyAgIGFuIGB7e2Vsc2V9fWAgd2FzIGZvdW5kLlxuXG52YXIgVEVNUExBVEVfVEFHX1BPU0lUSU9OID0gSFRNTFRvb2xzLlRFTVBMQVRFX1RBR19QT1NJVElPTjtcblxuZXhwb3J0IGZ1bmN0aW9uIFRlbXBsYXRlVGFnICgpIHtcbiAgSFRNTFRvb2xzLlRlbXBsYXRlVGFnLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cblRlbXBsYXRlVGFnLnByb3RvdHlwZSA9IG5ldyBIVE1MVG9vbHMuVGVtcGxhdGVUYWc7XG5UZW1wbGF0ZVRhZy5wcm90b3R5cGUuY29uc3RydWN0b3JOYW1lID0gJ1NwYWNlYmFyc0NvbXBpbGVyLlRlbXBsYXRlVGFnJztcblxudmFyIG1ha2VTdGFjaGVUYWdTdGFydFJlZ2V4ID0gZnVuY3Rpb24gKHIpIHtcbiAgcmV0dXJuIG5ldyBSZWdFeHAoci5zb3VyY2UgKyAvKD8hW3s+ISMvXSkvLnNvdXJjZSxcbiAgICAgICAgICAgICAgICAgICAgci5pZ25vcmVDYXNlID8gJ2knIDogJycpO1xufTtcblxuLy8gXCJzdGFydHNcIiByZWdleGVzIGFyZSB1c2VkIHRvIHNlZSB3aGF0IHR5cGUgb2YgdGVtcGxhdGVcbi8vIHRhZyB0aGUgcGFyc2VyIGlzIGxvb2tpbmcgYXQuICBUaGV5IG11c3QgbWF0Y2ggYSBub24tZW1wdHlcbi8vIHJlc3VsdCwgYnV0IG5vdCB0aGUgaW50ZXJlc3RpbmcgcGFydCBvZiB0aGUgdGFnLlxudmFyIHN0YXJ0cyA9IHtcbiAgRVNDQVBFOiAvXlxce1xceyg/PVxceypcXHwpLyxcbiAgRUxTRTogbWFrZVN0YWNoZVRhZ1N0YXJ0UmVnZXgoL15cXHtcXHtcXHMqZWxzZShcXHMrKD8hXFxzKXwoPz1bfV0pKS9pKSxcbiAgRE9VQkxFOiBtYWtlU3RhY2hlVGFnU3RhcnRSZWdleCgvXlxce1xce1xccyooPyFcXHMpLyksXG4gIFRSSVBMRTogbWFrZVN0YWNoZVRhZ1N0YXJ0UmVnZXgoL15cXHtcXHtcXHtcXHMqKD8hXFxzKS8pLFxuICBCTE9DS0NPTU1FTlQ6IG1ha2VTdGFjaGVUYWdTdGFydFJlZ2V4KC9eXFx7XFx7XFxzKiEtLS8pLFxuICBDT01NRU5UOiBtYWtlU3RhY2hlVGFnU3RhcnRSZWdleCgvXlxce1xce1xccyohLyksXG4gIElOQ0xVU0lPTjogbWFrZVN0YWNoZVRhZ1N0YXJ0UmVnZXgoL15cXHtcXHtcXHMqPlxccyooPyFcXHMpLyksXG4gIEJMT0NLT1BFTjogbWFrZVN0YWNoZVRhZ1N0YXJ0UmVnZXgoL15cXHtcXHtcXHMqI1xccyooPyFcXHMpLyksXG4gIEJMT0NLQ0xPU0U6IG1ha2VTdGFjaGVUYWdTdGFydFJlZ2V4KC9eXFx7XFx7XFxzKlxcL1xccyooPyFcXHMpLylcbn07XG5cbnZhciBlbmRzID0ge1xuICBET1VCTEU6IC9eXFxzKlxcfVxcfS8sXG4gIFRSSVBMRTogL15cXHMqXFx9XFx9XFx9LyxcbiAgRVhQUjogL15cXHMqXFwpL1xufTtcblxudmFyIGVuZHNTdHJpbmcgPSB7XG4gIERPVUJMRTogJ319JyxcbiAgVFJJUExFOiAnfX19JyxcbiAgRVhQUjogJyknXG59O1xuXG4vLyBQYXJzZSBhIHRhZyBmcm9tIHRoZSBwcm92aWRlZCBzY2FubmVyIG9yIHN0cmluZy4gIElmIHRoZSBpbnB1dFxuLy8gZG9lc24ndCBzdGFydCB3aXRoIGB7e2AsIHJldHVybnMgbnVsbC4gIE90aGVyd2lzZSwgZWl0aGVyIHN1Y2NlZWRzXG4vLyBhbmQgcmV0dXJucyBhIFNwYWNlYmFyc0NvbXBpbGVyLlRlbXBsYXRlVGFnLCBvciB0aHJvd3MgYW4gZXJyb3IgKHVzaW5nXG4vLyBgc2Nhbm5lci5mYXRhbGAgaWYgYSBzY2FubmVyIGlzIHByb3ZpZGVkKS5cblRlbXBsYXRlVGFnLnBhcnNlID0gZnVuY3Rpb24gKHNjYW5uZXJPclN0cmluZykge1xuICB2YXIgc2Nhbm5lciA9IHNjYW5uZXJPclN0cmluZztcbiAgaWYgKHR5cGVvZiBzY2FubmVyID09PSAnc3RyaW5nJylcbiAgICBzY2FubmVyID0gbmV3IEhUTUxUb29scy5TY2FubmVyKHNjYW5uZXJPclN0cmluZyk7XG5cbiAgaWYgKCEgKHNjYW5uZXIucGVlaygpID09PSAneycgJiZcbiAgICAgICAgIChzY2FubmVyLnJlc3QoKSkuc2xpY2UoMCwgMikgPT09ICd7eycpKVxuICAgIHJldHVybiBudWxsO1xuXG4gIHZhciBydW4gPSBmdW5jdGlvbiAocmVnZXgpIHtcbiAgICAvLyByZWdleCBpcyBhc3N1bWVkIHRvIHN0YXJ0IHdpdGggYF5gXG4gICAgdmFyIHJlc3VsdCA9IHJlZ2V4LmV4ZWMoc2Nhbm5lci5yZXN0KCkpO1xuICAgIGlmICghIHJlc3VsdClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHZhciByZXQgPSByZXN1bHRbMF07XG4gICAgc2Nhbm5lci5wb3MgKz0gcmV0Lmxlbmd0aDtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIHZhciBhZHZhbmNlID0gZnVuY3Rpb24gKGFtb3VudCkge1xuICAgIHNjYW5uZXIucG9zICs9IGFtb3VudDtcbiAgfTtcblxuICB2YXIgc2NhbklkZW50aWZpZXIgPSBmdW5jdGlvbiAoaXNGaXJzdEluUGF0aCkge1xuICAgIHZhciBpZCA9IEJsYXplVG9vbHMucGFyc2VFeHRlbmRlZElkZW50aWZpZXJOYW1lKHNjYW5uZXIpO1xuICAgIGlmICghIGlkKSB7XG4gICAgICBleHBlY3RlZCgnSURFTlRJRklFUicpO1xuICAgIH1cbiAgICBpZiAoaXNGaXJzdEluUGF0aCAmJlxuICAgICAgICAoaWQgPT09ICdudWxsJyB8fCBpZCA9PT0gJ3RydWUnIHx8IGlkID09PSAnZmFsc2UnKSlcbiAgICAgIHNjYW5uZXIuZmF0YWwoXCJDYW4ndCB1c2UgbnVsbCwgdHJ1ZSwgb3IgZmFsc2UsIGFzIGFuIGlkZW50aWZpZXIgYXQgc3RhcnQgb2YgcGF0aFwiKTtcblxuICAgIHJldHVybiBpZDtcbiAgfTtcblxuICB2YXIgc2NhblBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlZ21lbnRzID0gW107XG5cbiAgICAvLyBoYW5kbGUgaW5pdGlhbCBgLmAsIGAuLmAsIGAuL2AsIGAuLi9gLCBgLi4vLi5gLCBgLi4vLi4vYCwgZXRjXG4gICAgdmFyIGRvdHM7XG4gICAgaWYgKChkb3RzID0gcnVuKC9eW1xcLlxcL10rLykpKSB7XG4gICAgICB2YXIgYW5jZXN0b3JTdHIgPSAnLic7IC8vIGVnIGAuLi8uLi8uLmAgbWFwcyB0byBgLi4uLmBcbiAgICAgIHZhciBlbmRzV2l0aFNsYXNoID0gL1xcLyQvLnRlc3QoZG90cyk7XG5cbiAgICAgIGlmIChlbmRzV2l0aFNsYXNoKVxuICAgICAgICBkb3RzID0gZG90cy5zbGljZSgwLCAtMSk7XG5cbiAgICAgIF8uZWFjaChkb3RzLnNwbGl0KCcvJyksIGZ1bmN0aW9uKGRvdENsYXVzZSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgaWYgKGRvdENsYXVzZSAhPT0gJy4nICYmIGRvdENsYXVzZSAhPT0gJy4uJylcbiAgICAgICAgICAgIGV4cGVjdGVkKFwiYC5gLCBgLi5gLCBgLi9gIG9yIGAuLi9gXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChkb3RDbGF1c2UgIT09ICcuLicpXG4gICAgICAgICAgICBleHBlY3RlZChcImAuLmAgb3IgYC4uL2BcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZG90Q2xhdXNlID09PSAnLi4nKVxuICAgICAgICAgIGFuY2VzdG9yU3RyICs9ICcuJztcbiAgICAgIH0pO1xuXG4gICAgICBzZWdtZW50cy5wdXNoKGFuY2VzdG9yU3RyKTtcblxuICAgICAgaWYgKCFlbmRzV2l0aFNsYXNoKVxuICAgICAgICByZXR1cm4gc2VnbWVudHM7XG4gICAgfVxuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8vIHNjYW4gYSBwYXRoIHNlZ21lbnRcblxuICAgICAgaWYgKHJ1bigvXlxcWy8pKSB7XG4gICAgICAgIHZhciBzZWcgPSBydW4oL15bXFxzXFxTXSo/XFxdLyk7XG4gICAgICAgIGlmICghIHNlZylcbiAgICAgICAgICBlcnJvcihcIlVudGVybWluYXRlZCBwYXRoIHNlZ21lbnRcIik7XG4gICAgICAgIHNlZyA9IHNlZy5zbGljZSgwLCAtMSk7XG4gICAgICAgIGlmICghIHNlZyAmJiAhIHNlZ21lbnRzLmxlbmd0aClcbiAgICAgICAgICBlcnJvcihcIlBhdGggY2FuJ3Qgc3RhcnQgd2l0aCBlbXB0eSBzdHJpbmdcIik7XG4gICAgICAgIHNlZ21lbnRzLnB1c2goc2VnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBpZCA9IHNjYW5JZGVudGlmaWVyKCEgc2VnbWVudHMubGVuZ3RoKTtcbiAgICAgICAgaWYgKGlkID09PSAndGhpcycpIHtcbiAgICAgICAgICBpZiAoISBzZWdtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGluaXRpYWwgYHRoaXNgXG4gICAgICAgICAgICBzZWdtZW50cy5wdXNoKCcuJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9yKFwiQ2FuIG9ubHkgdXNlIGB0aGlzYCBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgcGF0aC5cXG5JbnN0ZWFkIG9mIGBmb28udGhpc2Agb3IgYC4uL3RoaXNgLCBqdXN0IHdyaXRlIGBmb29gIG9yIGAuLmAuXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWdtZW50cy5wdXNoKGlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgc2VwID0gcnVuKC9eW1xcLlxcL10vKTtcbiAgICAgIGlmICghIHNlcClcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlZ21lbnRzO1xuICB9O1xuXG4gIC8vIHNjYW4gdGhlIGtleXdvcmQgcG9ydGlvbiBvZiBhIGtleXdvcmQgYXJndW1lbnRcbiAgLy8gKHRoZSBcImZvb1wiIHBvcnRpb24gaW4gXCJmb289YmFyXCIpLlxuICAvLyBSZXN1bHQgaXMgZWl0aGVyIHRoZSBrZXl3b3JkIG1hdGNoZWQsIG9yIG51bGxcbiAgLy8gaWYgd2UncmUgbm90IGF0IGEga2V5d29yZCBhcmd1bWVudCBwb3NpdGlvbi5cbiAgdmFyIHNjYW5BcmdLZXl3b3JkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBtYXRjaCA9IC9eKFteXFx7XFx9XFwoXFwpXFw+Iz1cXHNcIidcXFtcXF1dKylcXHMqPVxccyovLmV4ZWMoc2Nhbm5lci5yZXN0KCkpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgc2Nhbm5lci5wb3MgKz0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgcmV0dXJuIG1hdGNoWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH07XG5cbiAgLy8gc2NhbiBhbiBhcmd1bWVudDsgc3VjY2VlZHMgb3IgZXJyb3JzLlxuICAvLyBSZXN1bHQgaXMgYW4gYXJyYXkgb2YgdHdvIG9yIHRocmVlIGl0ZW1zOlxuICAvLyB0eXBlICwgdmFsdWUsIGFuZCAoaW5kaWNhdGluZyBhIGtleXdvcmQgYXJndW1lbnQpXG4gIC8vIGtleXdvcmQgbmFtZS5cbiAgdmFyIHNjYW5BcmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGtleXdvcmQgPSBzY2FuQXJnS2V5d29yZCgpOyAvLyBudWxsIGlmIG5vdCBwYXJzaW5nIGEga3dhcmdcbiAgICB2YXIgdmFsdWUgPSBzY2FuQXJnVmFsdWUoKTtcbiAgICByZXR1cm4ga2V5d29yZCA/IHZhbHVlLmNvbmNhdChrZXl3b3JkKSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIHNjYW4gYW4gYXJndW1lbnQgdmFsdWUgKGZvciBrZXl3b3JkIG9yIHBvc2l0aW9uYWwgYXJndW1lbnRzKTtcbiAgLy8gc3VjY2VlZHMgb3IgZXJyb3JzLiAgUmVzdWx0IGlzIGFuIGFycmF5IG9mIHR5cGUsIHZhbHVlLlxuICB2YXIgc2NhbkFyZ1ZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzdGFydFBvcyA9IHNjYW5uZXIucG9zO1xuICAgIHZhciByZXN1bHQ7XG4gICAgaWYgKChyZXN1bHQgPSBCbGF6ZVRvb2xzLnBhcnNlTnVtYmVyKHNjYW5uZXIpKSkge1xuICAgICAgcmV0dXJuIFsnTlVNQkVSJywgcmVzdWx0LnZhbHVlXTtcbiAgICB9IGVsc2UgaWYgKChyZXN1bHQgPSBCbGF6ZVRvb2xzLnBhcnNlU3RyaW5nTGl0ZXJhbChzY2FubmVyKSkpIHtcbiAgICAgIHJldHVybiBbJ1NUUklORycsIHJlc3VsdC52YWx1ZV07XG4gICAgfSBlbHNlIGlmICgvXltcXC5cXFtdLy50ZXN0KHNjYW5uZXIucGVlaygpKSkge1xuICAgICAgcmV0dXJuIFsnUEFUSCcsIHNjYW5QYXRoKCldO1xuICAgIH0gZWxzZSBpZiAocnVuKC9eXFwoLykpIHtcbiAgICAgIHJldHVybiBbJ0VYUFInLCBzY2FuRXhwcignRVhQUicpXTtcbiAgICB9IGVsc2UgaWYgKChyZXN1bHQgPSBCbGF6ZVRvb2xzLnBhcnNlRXh0ZW5kZWRJZGVudGlmaWVyTmFtZShzY2FubmVyKSkpIHtcbiAgICAgIHZhciBpZCA9IHJlc3VsdDtcbiAgICAgIGlmIChpZCA9PT0gJ251bGwnKSB7XG4gICAgICAgIHJldHVybiBbJ05VTEwnLCBudWxsXTtcbiAgICAgIH0gZWxzZSBpZiAoaWQgPT09ICd0cnVlJyB8fCBpZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICByZXR1cm4gWydCT09MRUFOJywgaWQgPT09ICd0cnVlJ107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzY2FubmVyLnBvcyA9IHN0YXJ0UG9zOyAvLyB1bmNvbnN1bWUgYGlkYFxuICAgICAgICByZXR1cm4gWydQQVRIJywgc2NhblBhdGgoKV07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cGVjdGVkKCdpZGVudGlmaWVyLCBudW1iZXIsIHN0cmluZywgYm9vbGVhbiwgbnVsbCwgb3IgYSBzdWIgZXhwcmVzc2lvbiBlbmNsb3NlZCBpbiBcIihcIiwgXCIpXCInKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIHNjYW5FeHByID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgZW5kVHlwZSA9IHR5cGU7XG4gICAgaWYgKHR5cGUgPT09ICdJTkNMVVNJT04nIHx8IHR5cGUgPT09ICdCTE9DS09QRU4nIHx8IHR5cGUgPT09ICdFTFNFJylcbiAgICAgIGVuZFR5cGUgPSAnRE9VQkxFJztcblxuICAgIHZhciB0YWcgPSBuZXcgVGVtcGxhdGVUYWc7XG4gICAgdGFnLnR5cGUgPSB0eXBlO1xuICAgIHRhZy5wYXRoID0gc2NhblBhdGgoKTtcbiAgICB0YWcuYXJncyA9IFtdO1xuICAgIHZhciBmb3VuZEt3QXJnID0gZmFsc2U7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHJ1bigvXlxccyovKTtcbiAgICAgIGlmIChydW4oZW5kc1tlbmRUeXBlXSkpXG4gICAgICAgIGJyZWFrO1xuICAgICAgZWxzZSBpZiAoL15bfSldLy50ZXN0KHNjYW5uZXIucGVlaygpKSkge1xuICAgICAgICBleHBlY3RlZCgnYCcgKyBlbmRzU3RyaW5nW2VuZFR5cGVdICsgJ2AnKTtcbiAgICAgIH1cbiAgICAgIHZhciBuZXdBcmcgPSBzY2FuQXJnKCk7XG4gICAgICBpZiAobmV3QXJnLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBmb3VuZEt3QXJnID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEt3QXJnKVxuICAgICAgICAgIGVycm9yKFwiQ2FuJ3QgaGF2ZSBhIG5vbi1rZXl3b3JkIGFyZ3VtZW50IGFmdGVyIGEga2V5d29yZCBhcmd1bWVudFwiKTtcbiAgICAgIH1cbiAgICAgIHRhZy5hcmdzLnB1c2gobmV3QXJnKTtcblxuICAgICAgLy8gZXhwZWN0IGEgd2hpdGVzcGFjZSBvciBhIGNsb3NpbmcgJyknIG9yICd9J1xuICAgICAgaWYgKHJ1bigvXig/PVtcXHN9KV0pLykgIT09ICcnKVxuICAgICAgICBleHBlY3RlZCgnc3BhY2UnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGFnO1xuICB9O1xuXG4gIHZhciB0eXBlO1xuXG4gIHZhciBlcnJvciA9IGZ1bmN0aW9uIChtc2cpIHtcbiAgICBzY2FubmVyLmZhdGFsKG1zZyk7XG4gIH07XG5cbiAgdmFyIGV4cGVjdGVkID0gZnVuY3Rpb24gKHdoYXQpIHtcbiAgICBlcnJvcignRXhwZWN0ZWQgJyArIHdoYXQpO1xuICB9O1xuXG4gIC8vIG11c3QgZG8gRVNDQVBFIGZpcnN0LCBpbW1lZGlhdGVseSBmb2xsb3dlZCBieSBFTFNFXG4gIC8vIG9yZGVyIG9mIG90aGVycyBkb2Vzbid0IG1hdHRlclxuICBpZiAocnVuKHN0YXJ0cy5FU0NBUEUpKSB0eXBlID0gJ0VTQ0FQRSc7XG4gIGVsc2UgaWYgKHJ1bihzdGFydHMuRUxTRSkpIHR5cGUgPSAnRUxTRSc7XG4gIGVsc2UgaWYgKHJ1bihzdGFydHMuRE9VQkxFKSkgdHlwZSA9ICdET1VCTEUnO1xuICBlbHNlIGlmIChydW4oc3RhcnRzLlRSSVBMRSkpIHR5cGUgPSAnVFJJUExFJztcbiAgZWxzZSBpZiAocnVuKHN0YXJ0cy5CTE9DS0NPTU1FTlQpKSB0eXBlID0gJ0JMT0NLQ09NTUVOVCc7XG4gIGVsc2UgaWYgKHJ1bihzdGFydHMuQ09NTUVOVCkpIHR5cGUgPSAnQ09NTUVOVCc7XG4gIGVsc2UgaWYgKHJ1bihzdGFydHMuSU5DTFVTSU9OKSkgdHlwZSA9ICdJTkNMVVNJT04nO1xuICBlbHNlIGlmIChydW4oc3RhcnRzLkJMT0NLT1BFTikpIHR5cGUgPSAnQkxPQ0tPUEVOJztcbiAgZWxzZSBpZiAocnVuKHN0YXJ0cy5CTE9DS0NMT1NFKSkgdHlwZSA9ICdCTE9DS0NMT1NFJztcbiAgZWxzZVxuICAgIGVycm9yKCdVbmtub3duIHN0YWNoZSB0YWcnKTtcblxuICB2YXIgdGFnID0gbmV3IFRlbXBsYXRlVGFnO1xuICB0YWcudHlwZSA9IHR5cGU7XG5cbiAgaWYgKHR5cGUgPT09ICdCTE9DS0NPTU1FTlQnKSB7XG4gICAgdmFyIHJlc3VsdCA9IHJ1bigvXltcXHNcXFNdKj8tLVxccyo/XFx9XFx9Lyk7XG4gICAgaWYgKCEgcmVzdWx0KVxuICAgICAgZXJyb3IoXCJVbmNsb3NlZCBibG9jayBjb21tZW50XCIpO1xuICAgIHRhZy52YWx1ZSA9IHJlc3VsdC5zbGljZSgwLCByZXN1bHQubGFzdEluZGV4T2YoJy0tJykpO1xuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdDT01NRU5UJykge1xuICAgIHZhciByZXN1bHQgPSBydW4oL15bXFxzXFxTXSo/XFx9XFx9Lyk7XG4gICAgaWYgKCEgcmVzdWx0KVxuICAgICAgZXJyb3IoXCJVbmNsb3NlZCBjb21tZW50XCIpO1xuICAgIHRhZy52YWx1ZSA9IHJlc3VsdC5zbGljZSgwLCAtMik7XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0JMT0NLQ0xPU0UnKSB7XG4gICAgdGFnLnBhdGggPSBzY2FuUGF0aCgpO1xuICAgIGlmICghIHJ1bihlbmRzLkRPVUJMRSkpXG4gICAgICBleHBlY3RlZCgnYH19YCcpO1xuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdFTFNFJykge1xuICAgIGlmICghIHJ1bihlbmRzLkRPVUJMRSkpIHtcbiAgICAgIHRhZyA9IHNjYW5FeHByKHR5cGUpO1xuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnRVNDQVBFJykge1xuICAgIHZhciByZXN1bHQgPSBydW4oL15cXHsqXFx8Lyk7XG4gICAgdGFnLnZhbHVlID0gJ3t7JyArIHJlc3VsdC5zbGljZSgwLCAtMSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRE9VQkxFLCBUUklQTEUsIEJMT0NLT1BFTiwgSU5DTFVTSU9OXG4gICAgdGFnID0gc2NhbkV4cHIodHlwZSk7XG4gIH1cblxuICByZXR1cm4gdGFnO1xufTtcblxuLy8gUmV0dXJucyBhIFNwYWNlYmFyc0NvbXBpbGVyLlRlbXBsYXRlVGFnIHBhcnNlZCBmcm9tIGBzY2FubmVyYCwgbGVhdmluZyBzY2FubmVyXG4vLyBhdCBpdHMgb3JpZ2luYWwgcG9zaXRpb24uXG4vL1xuLy8gQW4gZXJyb3Igd2lsbCBzdGlsbCBiZSB0aHJvd24gaWYgdGhlcmUgaXMgbm90IGEgdmFsaWQgdGVtcGxhdGUgdGFnIGF0XG4vLyB0aGUgY3VycmVudCBwb3NpdGlvbi5cblRlbXBsYXRlVGFnLnBlZWsgPSBmdW5jdGlvbiAoc2Nhbm5lcikge1xuICB2YXIgc3RhcnRQb3MgPSBzY2FubmVyLnBvcztcbiAgdmFyIHJlc3VsdCA9IFRlbXBsYXRlVGFnLnBhcnNlKHNjYW5uZXIpO1xuICBzY2FubmVyLnBvcyA9IHN0YXJ0UG9zO1xuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gTGlrZSBgVGVtcGxhdGVUYWcucGFyc2VgLCBidXQgaW4gdGhlIGNhc2Ugb2YgYmxvY2tzLCBwYXJzZSB0aGUgY29tcGxldGVcbi8vIGB7eyNmb299fS4uLnt7L2Zvb319YCB3aXRoIGBjb250ZW50YCBhbmQgcG9zc2libGUgYGVsc2VDb250ZW50YCwgcmF0aGVyXG4vLyB0aGFuIGp1c3QgdGhlIEJMT0NLT1BFTiB0YWcuXG4vL1xuLy8gSW4gYWRkaXRpb246XG4vL1xuLy8gLSBUaHJvd3MgYW4gZXJyb3IgaWYgYHt7ZWxzZX19YCBvciBge3svZm9vfX1gIHRhZyBpcyBlbmNvdW50ZXJlZC5cbi8vXG4vLyAtIFJldHVybnMgYG51bGxgIGZvciBhIENPTU1FTlQuICAoVGhpcyBjYXNlIGlzIGRpc3Rpbmd1aXNoYWJsZSBmcm9tXG4vLyAgIHBhcnNpbmcgbm8gdGFnIGJ5IHRoZSBmYWN0IHRoYXQgdGhlIHNjYW5uZXIgaXMgYWR2YW5jZWQuKVxuLy9cbi8vIC0gVGFrZXMgYW4gSFRNTFRvb2xzLlRFTVBMQVRFX1RBR19QT1NJVElPTiBgcG9zaXRpb25gIGFuZCBzZXRzIGl0IGFzIHRoZVxuLy8gICBUZW1wbGF0ZVRhZydzIGAucG9zaXRpb25gIHByb3BlcnR5LlxuLy9cbi8vIC0gVmFsaWRhdGVzIHRoZSB0YWcncyB3ZWxsLWZvcm1lZG5lc3MgYW5kIGxlZ2FsaXR5IGF0IGluIGl0cyBwb3NpdGlvbi5cblRlbXBsYXRlVGFnLnBhcnNlQ29tcGxldGVUYWcgPSBmdW5jdGlvbiAoc2Nhbm5lck9yU3RyaW5nLCBwb3NpdGlvbikge1xuICB2YXIgc2Nhbm5lciA9IHNjYW5uZXJPclN0cmluZztcbiAgaWYgKHR5cGVvZiBzY2FubmVyID09PSAnc3RyaW5nJylcbiAgICBzY2FubmVyID0gbmV3IEhUTUxUb29scy5TY2FubmVyKHNjYW5uZXJPclN0cmluZyk7XG5cbiAgdmFyIHN0YXJ0UG9zID0gc2Nhbm5lci5wb3M7IC8vIGZvciBlcnJvciBtZXNzYWdlc1xuICB2YXIgcmVzdWx0ID0gVGVtcGxhdGVUYWcucGFyc2Uoc2Nhbm5lck9yU3RyaW5nKTtcbiAgaWYgKCEgcmVzdWx0KVxuICAgIHJldHVybiByZXN1bHQ7XG5cbiAgaWYgKHJlc3VsdC50eXBlID09PSAnQkxPQ0tDT01NRU5UJylcbiAgICByZXR1cm4gbnVsbDtcblxuICBpZiAocmVzdWx0LnR5cGUgPT09ICdDT01NRU5UJylcbiAgICByZXR1cm4gbnVsbDtcblxuICBpZiAocmVzdWx0LnR5cGUgPT09ICdFTFNFJylcbiAgICBzY2FubmVyLmZhdGFsKFwiVW5leHBlY3RlZCB7e2Vsc2V9fVwiKTtcblxuICBpZiAocmVzdWx0LnR5cGUgPT09ICdCTE9DS0NMT1NFJylcbiAgICBzY2FubmVyLmZhdGFsKFwiVW5leHBlY3RlZCBjbG9zaW5nIHRlbXBsYXRlIHRhZ1wiKTtcblxuICBwb3NpdGlvbiA9IChwb3NpdGlvbiB8fCBURU1QTEFURV9UQUdfUE9TSVRJT04uRUxFTUVOVCk7XG4gIGlmIChwb3NpdGlvbiAhPT0gVEVNUExBVEVfVEFHX1BPU0lUSU9OLkVMRU1FTlQpXG4gICAgcmVzdWx0LnBvc2l0aW9uID0gcG9zaXRpb247XG5cbiAgaWYgKHJlc3VsdC50eXBlID09PSAnQkxPQ0tPUEVOJykge1xuICAgIC8vIHBhcnNlIGJsb2NrIGNvbnRlbnRzXG5cbiAgICAvLyBDb25zdHJ1Y3QgYSBzdHJpbmcgdmVyc2lvbiBvZiBgLnBhdGhgIGZvciBjb21wYXJpbmcgc3RhcnQgYW5kXG4gICAgLy8gZW5kIHRhZ3MuICBGb3IgZXhhbXBsZSwgYGZvby9bMF1gIHdhcyBwYXJzZWQgaW50byBgW1wiZm9vXCIsIFwiMFwiXWBcbiAgICAvLyBhbmQgbm93IGJlY29tZXMgYGZvbywwYC4gIFRoaXMgZm9ybSBtYXkgYWxzbyBzaG93IHVwIGluIGVycm9yXG4gICAgLy8gbWVzc2FnZXMuXG4gICAgdmFyIGJsb2NrTmFtZSA9IHJlc3VsdC5wYXRoLmpvaW4oJywnKTtcblxuICAgIHZhciB0ZXh0TW9kZSA9IG51bGw7XG4gICAgICBpZiAoYmxvY2tOYW1lID09PSAnbWFya2Rvd24nIHx8XG4gICAgICAgICAgcG9zaXRpb24gPT09IFRFTVBMQVRFX1RBR19QT1NJVElPTi5JTl9SQVdURVhUKSB7XG4gICAgICAgIHRleHRNb2RlID0gSFRNTC5URVhUTU9ERS5TVFJJTkc7XG4gICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSBURU1QTEFURV9UQUdfUE9TSVRJT04uSU5fUkNEQVRBIHx8XG4gICAgICAgICAgICAgICAgIHBvc2l0aW9uID09PSBURU1QTEFURV9UQUdfUE9TSVRJT04uSU5fQVRUUklCVVRFKSB7XG4gICAgICAgIHRleHRNb2RlID0gSFRNTC5URVhUTU9ERS5SQ0RBVEE7XG4gICAgICB9XG4gICAgICB2YXIgcGFyc2VyT3B0aW9ucyA9IHtcbiAgICAgICAgZ2V0VGVtcGxhdGVUYWc6IFRlbXBsYXRlVGFnLnBhcnNlQ29tcGxldGVUYWcsXG4gICAgICAgIHNob3VsZFN0b3A6IGlzQXRCbG9ja0Nsb3NlT3JFbHNlLFxuICAgICAgICB0ZXh0TW9kZTogdGV4dE1vZGVcbiAgICAgIH07XG4gICAgcmVzdWx0LnRleHRNb2RlID0gdGV4dE1vZGU7XG4gICAgcmVzdWx0LmNvbnRlbnQgPSBIVE1MVG9vbHMucGFyc2VGcmFnbWVudChzY2FubmVyLCBwYXJzZXJPcHRpb25zKTtcblxuICAgIGlmIChzY2FubmVyLnJlc3QoKS5zbGljZSgwLCAyKSAhPT0gJ3t7JylcbiAgICAgIHNjYW5uZXIuZmF0YWwoXCJFeHBlY3RlZCB7e2Vsc2V9fSBvciBibG9jayBjbG9zZSBmb3IgXCIgKyBibG9ja05hbWUpO1xuXG4gICAgdmFyIGxhc3RQb3MgPSBzY2FubmVyLnBvczsgLy8gc2F2ZSBmb3IgZXJyb3IgbWVzc2FnZXNcbiAgICB2YXIgdG1wbFRhZyA9IFRlbXBsYXRlVGFnLnBhcnNlKHNjYW5uZXIpOyAvLyB7e2Vsc2V9fSBvciB7ey9mb299fVxuXG4gICAgdmFyIGxhc3RFbHNlQ29udGVudFRhZyA9IHJlc3VsdDtcbiAgICB3aGlsZSAodG1wbFRhZy50eXBlID09PSAnRUxTRScpIHtcbiAgICAgIGlmIChsYXN0RWxzZUNvbnRlbnRUYWcgPT09IG51bGwpIHtcbiAgICAgICAgc2Nhbm5lci5mYXRhbChcIlVuZXhwZWN0ZWQgZWxzZSBhZnRlciB7e2Vsc2V9fVwiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRtcGxUYWcucGF0aCkge1xuICAgICAgICBsYXN0RWxzZUNvbnRlbnRUYWcuZWxzZUNvbnRlbnQgPSBuZXcgVGVtcGxhdGVUYWc7XG4gICAgICAgIGxhc3RFbHNlQ29udGVudFRhZy5lbHNlQ29udGVudC50eXBlID0gJ0JMT0NLT1BFTic7XG4gICAgICAgIGxhc3RFbHNlQ29udGVudFRhZy5lbHNlQ29udGVudC5wYXRoID0gdG1wbFRhZy5wYXRoO1xuICAgICAgICBsYXN0RWxzZUNvbnRlbnRUYWcuZWxzZUNvbnRlbnQuYXJncyA9IHRtcGxUYWcuYXJncztcbiAgICAgICAgbGFzdEVsc2VDb250ZW50VGFnLmVsc2VDb250ZW50LnRleHRNb2RlID0gdGV4dE1vZGU7XG4gICAgICAgIGxhc3RFbHNlQ29udGVudFRhZy5lbHNlQ29udGVudC5jb250ZW50ID0gSFRNTFRvb2xzLnBhcnNlRnJhZ21lbnQoc2Nhbm5lciwgcGFyc2VyT3B0aW9ucyk7XG5cbiAgICAgICAgbGFzdEVsc2VDb250ZW50VGFnID0gbGFzdEVsc2VDb250ZW50VGFnLmVsc2VDb250ZW50O1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIHBhcnNlIHt7ZWxzZX19IGFuZCBjb250ZW50IHVwIHRvIGNsb3NlIHRhZ1xuICAgICAgICBsYXN0RWxzZUNvbnRlbnRUYWcuZWxzZUNvbnRlbnQgPSBIVE1MVG9vbHMucGFyc2VGcmFnbWVudChzY2FubmVyLCBwYXJzZXJPcHRpb25zKTtcblxuICAgICAgICBsYXN0RWxzZUNvbnRlbnRUYWcgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2Nhbm5lci5yZXN0KCkuc2xpY2UoMCwgMikgIT09ICd7eycpXG4gICAgICAgIHNjYW5uZXIuZmF0YWwoXCJFeHBlY3RlZCBibG9jayBjbG9zZSBmb3IgXCIgKyBibG9ja05hbWUpO1xuXG4gICAgICBsYXN0UG9zID0gc2Nhbm5lci5wb3M7XG4gICAgICB0bXBsVGFnID0gVGVtcGxhdGVUYWcucGFyc2Uoc2Nhbm5lcik7XG4gICAgfVxuXG4gICAgaWYgKHRtcGxUYWcudHlwZSA9PT0gJ0JMT0NLQ0xPU0UnKSB7XG4gICAgICB2YXIgYmxvY2tOYW1lMiA9IHRtcGxUYWcucGF0aC5qb2luKCcsJyk7XG4gICAgICBpZiAoYmxvY2tOYW1lICE9PSBibG9ja05hbWUyKSB7XG4gICAgICAgIHNjYW5uZXIucG9zID0gbGFzdFBvcztcbiAgICAgICAgc2Nhbm5lci5mYXRhbCgnRXhwZWN0ZWQgdGFnIHRvIGNsb3NlICcgKyBibG9ja05hbWUgKyAnLCBmb3VuZCAnICtcbiAgICAgICAgICAgICAgICAgICAgICBibG9ja05hbWUyKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2Nhbm5lci5wb3MgPSBsYXN0UG9zO1xuICAgICAgc2Nhbm5lci5mYXRhbCgnRXhwZWN0ZWQgdGFnIHRvIGNsb3NlICcgKyBibG9ja05hbWUgKyAnLCBmb3VuZCAnICtcbiAgICAgICAgICAgICAgICAgICAgdG1wbFRhZy50eXBlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgZmluYWxQb3MgPSBzY2FubmVyLnBvcztcbiAgc2Nhbm5lci5wb3MgPSBzdGFydFBvcztcbiAgdmFsaWRhdGVUYWcocmVzdWx0LCBzY2FubmVyKTtcbiAgc2Nhbm5lci5wb3MgPSBmaW5hbFBvcztcblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxudmFyIGlzQXRCbG9ja0Nsb3NlT3JFbHNlID0gZnVuY3Rpb24gKHNjYW5uZXIpIHtcbiAgLy8gRGV0ZWN0IGB7e2Vsc2V9fWAgb3IgYHt7L2Zvb319YC5cbiAgLy9cbiAgLy8gV2UgZG8gYXMgbXVjaCB3b3JrIG91cnNlbHZlcyBiZWZvcmUgZGVmZXJyaW5nIHRvIGBUZW1wbGF0ZVRhZy5wZWVrYCxcbiAgLy8gZm9yIGVmZmljaWVuY3kgKHdlJ3JlIGNhbGxlZCBmb3IgZXZlcnkgaW5wdXQgdG9rZW4pIGFuZCB0byBiZVxuICAvLyBsZXNzIG9idHJ1c2l2ZSwgYmVjYXVzZSBgVGVtcGxhdGVUYWcucGVla2Agd2lsbCB0aHJvdyBhbiBlcnJvciBpZiBpdFxuICAvLyBzZWVzIGB7e2AgZm9sbG93ZWQgYnkgYSBtYWxmb3JtZWQgdGFnLlxuICB2YXIgcmVzdCwgdHlwZTtcbiAgcmV0dXJuIChzY2FubmVyLnBlZWsoKSA9PT0gJ3snICYmXG4gICAgICAgICAgKHJlc3QgPSBzY2FubmVyLnJlc3QoKSkuc2xpY2UoMCwgMikgPT09ICd7eycgJiZcbiAgICAgICAgICAvXlxce1xce1xccyooXFwvfGVsc2VcXGIpLy50ZXN0KHJlc3QpICYmXG4gICAgICAgICAgKHR5cGUgPSBUZW1wbGF0ZVRhZy5wZWVrKHNjYW5uZXIpLnR5cGUpICYmXG4gICAgICAgICAgKHR5cGUgPT09ICdCTE9DS0NMT1NFJyB8fCB0eXBlID09PSAnRUxTRScpKTtcbn07XG5cbi8vIFZhbGlkYXRlIHRoYXQgYHRlbXBsYXRlVGFnYCBpcyBjb3JyZWN0bHkgZm9ybWVkIGFuZCBsZWdhbCBmb3IgaXRzXG4vLyBIVE1MIHBvc2l0aW9uLiAgVXNlIGBzY2FubmVyYCB0byByZXBvcnQgZXJyb3JzLiBPbiBzdWNjZXNzLCBkb2VzXG4vLyBub3RoaW5nLlxudmFyIHZhbGlkYXRlVGFnID0gZnVuY3Rpb24gKHR0YWcsIHNjYW5uZXIpIHtcblxuICBpZiAodHRhZy50eXBlID09PSAnSU5DTFVTSU9OJyB8fCB0dGFnLnR5cGUgPT09ICdCTE9DS09QRU4nKSB7XG4gICAgdmFyIGFyZ3MgPSB0dGFnLmFyZ3M7XG4gICAgaWYgKHR0YWcucGF0aFswXSA9PT0gJ2VhY2gnICYmIGFyZ3NbMV0gJiYgYXJnc1sxXVswXSA9PT0gJ1BBVEgnICYmXG4gICAgICAgIGFyZ3NbMV1bMV1bMF0gPT09ICdpbicpIHtcbiAgICAgIC8vIEZvciBzbGlnaHRseSBiZXR0ZXIgZXJyb3IgbWVzc2FnZXMsIHdlIGRldGVjdCB0aGUgZWFjaC1pbiBjYXNlXG4gICAgICAvLyBoZXJlIGluIG9yZGVyIG5vdCB0byBjb21wbGFpbiBpZiB0aGUgdXNlciB3cml0ZXMgYHt7I2VhY2ggMyBpbiB4fX1gXG4gICAgICAvLyB0aGF0IFwiMyBpcyBub3QgYSBmdW5jdGlvblwiXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEgJiYgYXJnc1swXS5sZW5ndGggPT09IDIgJiYgYXJnc1swXVswXSAhPT0gJ1BBVEgnKSB7XG4gICAgICAgIC8vIHdlIGhhdmUgYSBwb3NpdGlvbmFsIGFyZ3VtZW50IHRoYXQgaXMgbm90IGEgUEFUSCBmb2xsb3dlZCBieVxuICAgICAgICAvLyBvdGhlciBhcmd1bWVudHNcbiAgICAgICAgc2Nhbm5lci5mYXRhbChcIkZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbiwgdG8gYmUgY2FsbGVkIG9uIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcInRoZSByZXN0IG9mIHRoZSBhcmd1bWVudHM7IGZvdW5kIFwiICsgYXJnc1swXVswXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmFyIHBvc2l0aW9uID0gdHRhZy5wb3NpdGlvbiB8fCBURU1QTEFURV9UQUdfUE9TSVRJT04uRUxFTUVOVDtcbiAgaWYgKHBvc2l0aW9uID09PSBURU1QTEFURV9UQUdfUE9TSVRJT04uSU5fQVRUUklCVVRFKSB7XG4gICAgaWYgKHR0YWcudHlwZSA9PT0gJ0RPVUJMRScgfHwgdHRhZy50eXBlID09PSAnRVNDQVBFJykge1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAodHRhZy50eXBlID09PSAnQkxPQ0tPUEVOJykge1xuICAgICAgdmFyIHBhdGggPSB0dGFnLnBhdGg7XG4gICAgICB2YXIgcGF0aDAgPSBwYXRoWzBdO1xuICAgICAgaWYgKCEgKHBhdGgubGVuZ3RoID09PSAxICYmIChwYXRoMCA9PT0gJ2lmJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoMCA9PT0gJ3VubGVzcycgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDAgPT09ICd3aXRoJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoMCA9PT0gJ2VhY2gnKSkpIHtcbiAgICAgICAgc2Nhbm5lci5mYXRhbChcIkN1c3RvbSBibG9jayBoZWxwZXJzIGFyZSBub3QgYWxsb3dlZCBpbiBhbiBIVE1MIGF0dHJpYnV0ZSwgb25seSBidWlsdC1pbiBvbmVzIGxpa2UgI2VhY2ggYW5kICNpZlwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2Nhbm5lci5mYXRhbCh0dGFnLnR5cGUgKyBcIiB0ZW1wbGF0ZSB0YWcgaXMgbm90IGFsbG93ZWQgaW4gYW4gSFRNTCBhdHRyaWJ1dGVcIik7XG4gICAgfVxuICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSBURU1QTEFURV9UQUdfUE9TSVRJT04uSU5fU1RBUlRfVEFHKSB7XG4gICAgaWYgKCEgKHR0YWcudHlwZSA9PT0gJ0RPVUJMRScpKSB7XG4gICAgICBzY2FubmVyLmZhdGFsKFwiUmVhY3RpdmUgSFRNTCBhdHRyaWJ1dGVzIG11c3QgZWl0aGVyIGhhdmUgYSBjb25zdGFudCBuYW1lIG9yIGNvbnNpc3Qgb2YgYSBzaW5nbGUge3toZWxwZXJ9fSBwcm92aWRpbmcgYSBkaWN0aW9uYXJ5IG9mIG5hbWVzIGFuZCB2YWx1ZXMuICBBIHRlbXBsYXRlIHRhZyBvZiB0eXBlIFwiICsgdHRhZy50eXBlICsgXCIgaXMgbm90IGFsbG93ZWQgaGVyZS5cIik7XG4gICAgfVxuICAgIGlmIChzY2FubmVyLnBlZWsoKSA9PT0gJz0nKSB7XG4gICAgICBzY2FubmVyLmZhdGFsKFwiVGVtcGxhdGUgdGFncyBhcmUgbm90IGFsbG93ZWQgaW4gYXR0cmlidXRlIG5hbWVzLCBvbmx5IGluIGF0dHJpYnV0ZSB2YWx1ZXMgb3IgaW4gdGhlIGZvcm0gb2YgYSBzaW5nbGUge3toZWxwZXJ9fSB0aGF0IGV2YWx1YXRlcyB0byBhIGRpY3Rpb25hcnkgb2YgbmFtZT12YWx1ZSBwYWlycy5cIik7XG4gICAgfVxuICB9XG5cbn07XG4iLCJpbXBvcnQgeyBIVE1MIH0gZnJvbSAnbWV0ZW9yL2h0bWxqcyc7XG5pbXBvcnQgeyBUcmVlVHJhbnNmb3JtZXIsIHRvUmF3IH0gZnJvbSAnLi9vcHRpbWl6ZXInO1xuXG5mdW5jdGlvbiBjb21wYWN0UmF3KGFycmF5KXtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBhcnJheVtpXTtcbiAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEhUTUwuUmF3KSB7XG4gICAgICBpZiAoIWl0ZW0udmFsdWUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0Lmxlbmd0aCAmJlxuICAgICAgICAgIChyZXN1bHRbcmVzdWx0Lmxlbmd0aCAtIDFdIGluc3RhbmNlb2YgSFRNTC5SYXcpKXtcbiAgICAgICAgcmVzdWx0W3Jlc3VsdC5sZW5ndGggLSAxXSA9IEhUTUwuUmF3KFxuICAgICAgICAgIHJlc3VsdFtyZXN1bHQubGVuZ3RoIC0gMV0udmFsdWUgKyBpdGVtLnZhbHVlKTtcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICB9XG4gICAgcmVzdWx0LnB1c2goaXRlbSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZUlmQ29udGFpbnNOZXdsaW5lKG1hdGNoKSB7XG4gIGlmIChtYXRjaC5pbmRleE9mKCdcXG4nKSA+PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cbiAgcmV0dXJuIG1hdGNoO1xufVxuXG5mdW5jdGlvbiBzdHJpcFdoaXRlc3BhY2UoYXJyYXkpe1xuICB2YXIgcmVzdWx0ID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGFycmF5W2ldO1xuICAgIGlmIChpdGVtIGluc3RhbmNlb2YgSFRNTC5SYXcpIHtcbiAgICAgIC8vIHJlbW92ZSBub2RlcyB0aGF0IGNvbnRhaW4gb25seSB3aGl0ZXNwYWNlICYgYSBuZXdsaW5lXG4gICAgICBpZiAoaXRlbS52YWx1ZS5pbmRleE9mKCdcXG4nKSAhPT0gLTEgJiYgIS9cXFMvLnRlc3QoaXRlbS52YWx1ZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBUcmltIGFueSBwcmVjZWRpbmcgd2hpdGVzcGFjZSwgaWYgaXQgY29udGFpbnMgYSBuZXdsaW5lXG4gICAgICB2YXIgbmV3U3RyID0gaXRlbS52YWx1ZTtcbiAgICAgIG5ld1N0ciA9IG5ld1N0ci5yZXBsYWNlKC9eXFxzKy8sIHJlcGxhY2VJZkNvbnRhaW5zTmV3bGluZSk7XG4gICAgICBuZXdTdHIgPSBuZXdTdHIucmVwbGFjZSgvXFxzKyQvLCByZXBsYWNlSWZDb250YWluc05ld2xpbmUpO1xuICAgICAgaXRlbS52YWx1ZSA9IG5ld1N0cjtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goaXRlbSlcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG52YXIgV2hpdGVzcGFjZVJlbW92aW5nVmlzaXRvciA9IFRyZWVUcmFuc2Zvcm1lci5leHRlbmQoKTtcbldoaXRlc3BhY2VSZW1vdmluZ1Zpc2l0b3IuZGVmKHtcbiAgdmlzaXROdWxsOiB0b1JhdyxcbiAgdmlzaXRQcmltaXRpdmU6IHRvUmF3LFxuICB2aXNpdENoYXJSZWY6IHRvUmF3LFxuICB2aXNpdEFycmF5OiBmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gdGhpcy5zdXBlcihhcnJheSlcbiAgICB2YXIgcmVzdWx0ID0gVHJlZVRyYW5zZm9ybWVyLnByb3RvdHlwZS52aXNpdEFycmF5LmNhbGwodGhpcywgYXJyYXkpO1xuICAgIHJlc3VsdCA9IGNvbXBhY3RSYXcocmVzdWx0KTtcbiAgICByZXN1bHQgPSBzdHJpcFdoaXRlc3BhY2UocmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICB2aXNpdFRhZzogZnVuY3Rpb24gKHRhZykge1xuICAgIHZhciB0YWdOYW1lID0gdGFnLnRhZ05hbWU7XG4gICAgLy8gVE9ETyAtIExpc3QgdGFncyB0aGF0IHdlIGRvbid0IHdhbnQgdG8gc3RyaXAgd2hpdGVzcGFjZSBmb3IuXG4gICAgaWYgKHRhZ05hbWUgPT09ICd0ZXh0YXJlYScgfHwgdGFnTmFtZSA9PT0gJ3NjcmlwdCcgfHwgdGFnTmFtZSA9PT0gJ3ByZSdcbiAgICAgIHx8ICFIVE1MLmlzS25vd25FbGVtZW50KHRhZ05hbWUpIHx8IEhUTUwuaXNLbm93blNWR0VsZW1lbnQodGFnTmFtZSkpIHtcbiAgICAgIHJldHVybiB0YWc7XG4gICAgfVxuICAgIHJldHVybiBUcmVlVHJhbnNmb3JtZXIucHJvdG90eXBlLnZpc2l0VGFnLmNhbGwodGhpcywgdGFnKVxuICB9LFxuICB2aXNpdEF0dHJpYnV0ZXM6IGZ1bmN0aW9uIChhdHRycykge1xuICAgIHJldHVybiBhdHRycztcbiAgfVxufSk7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZVdoaXRlc3BhY2UodHJlZSkge1xuICB0cmVlID0gKG5ldyBXaGl0ZXNwYWNlUmVtb3ZpbmdWaXNpdG9yKS52aXNpdCh0cmVlKTtcbiAgcmV0dXJuIHRyZWU7XG59XG4iXX0=
