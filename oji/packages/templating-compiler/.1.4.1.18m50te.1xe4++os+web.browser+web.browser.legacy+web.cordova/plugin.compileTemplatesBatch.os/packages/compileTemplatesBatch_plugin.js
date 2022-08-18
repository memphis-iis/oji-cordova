(function () {

/* Imports */
var ECMAScript = Package.ecmascript.ECMAScript;
var CachingHtmlCompiler = Package['caching-html-compiler'].CachingHtmlCompiler;
var TemplatingTools = Package['templating-tools'].TemplatingTools;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"compileTemplatesBatch":{"compile-templates.js":function module(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/compileTemplatesBatch/compile-templates.js               //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
Plugin.registerCompiler({
  extensions: ['html'],
  archMatching: 'web',
  isTemplate: true
}, () => new CachingHtmlCompiler("templating", TemplatingTools.scanHtmlForTags, TemplatingTools.compileTagsWithSpacebars));
///////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/compileTemplatesBatch/compile-templates.js");

/* Exports */
Package._define("compileTemplatesBatch");

})();




//# sourceURL=meteor://💻app/packages/compileTemplatesBatch_plugin.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvY29tcGlsZVRlbXBsYXRlc0JhdGNoL2NvbXBpbGUtdGVtcGxhdGVzLmpzIl0sIm5hbWVzIjpbIlBsdWdpbiIsInJlZ2lzdGVyQ29tcGlsZXIiLCJleHRlbnNpb25zIiwiYXJjaE1hdGNoaW5nIiwiaXNUZW1wbGF0ZSIsIkNhY2hpbmdIdG1sQ29tcGlsZXIiLCJUZW1wbGF0aW5nVG9vbHMiLCJzY2FuSHRtbEZvclRhZ3MiLCJjb21waWxlVGFnc1dpdGhTcGFjZWJhcnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0I7QUFDdEJDLFlBQVUsRUFBRSxDQUFDLE1BQUQsQ0FEVTtBQUV0QkMsY0FBWSxFQUFFLEtBRlE7QUFHdEJDLFlBQVUsRUFBRTtBQUhVLENBQXhCLEVBSUcsTUFBTSxJQUFJQyxtQkFBSixDQUNQLFlBRE8sRUFFUEMsZUFBZSxDQUFDQyxlQUZULEVBR1BELGVBQWUsQ0FBQ0Usd0JBSFQsQ0FKVCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9jb21waWxlVGVtcGxhdGVzQmF0Y2hfcGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiUGx1Z2luLnJlZ2lzdGVyQ29tcGlsZXIoe1xuICBleHRlbnNpb25zOiBbJ2h0bWwnXSxcbiAgYXJjaE1hdGNoaW5nOiAnd2ViJyxcbiAgaXNUZW1wbGF0ZTogdHJ1ZVxufSwgKCkgPT4gbmV3IENhY2hpbmdIdG1sQ29tcGlsZXIoXG4gIFwidGVtcGxhdGluZ1wiLFxuICBUZW1wbGF0aW5nVG9vbHMuc2Nhbkh0bWxGb3JUYWdzLFxuICBUZW1wbGF0aW5nVG9vbHMuY29tcGlsZVRhZ3NXaXRoU3BhY2ViYXJzXG4pKTtcbiJdfQ==
