(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Babel = Package['babel-compiler'].Babel;
var BabelCompiler = Package['babel-compiler'].BabelCompiler;

/* Package-scope variables */
var ECMAScript;

(function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/ecmascript/ecmascript.js                                                                //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
ECMAScript = {                                                                                      // 1
  compileForShell: function compileForShell(command) {                                              // 2
    var babelOptions = Babel.getDefaultOptions();                                                   // 3
    babelOptions.sourceMap = false;                                                                 // 4
    babelOptions.ast = false;                                                                       // 5
    return Babel.compile(command, babelOptions).code;                                               // 6
  }                                                                                                 //
};                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.ecmascript = {}, {
  ECMAScript: ECMAScript
});

})();



//# sourceURL=meteor://💻app/packages/ecmascript.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZWNtYXNjcmlwdC9lY21hc2NyaXB0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsYUFBYTtBQUNYLDRDQUFnQixTQUFTO0FBQ3ZCLFFBQU0sZUFBZSxNQUFNLGlCQUFOLEVBQWYsQ0FEaUI7QUFFdkIsaUJBQWEsU0FBYixHQUF5QixLQUF6QixDQUZ1QjtBQUd2QixpQkFBYSxHQUFiLEdBQW1CLEtBQW5CLENBSHVCO0FBSXZCLFdBQU8sTUFBTSxPQUFOLENBQWMsT0FBZCxFQUF1QixZQUF2QixFQUFxQyxJQUFyQyxDQUpnQjtHQURkO0NBQWIscUciLCJmaWxlIjoiL3BhY2thZ2VzL2VjbWFzY3JpcHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJFQ01BU2NyaXB0ID0ge1xuICBjb21waWxlRm9yU2hlbGwoY29tbWFuZCkge1xuICAgIGNvbnN0IGJhYmVsT3B0aW9ucyA9IEJhYmVsLmdldERlZmF1bHRPcHRpb25zKCk7XG4gICAgYmFiZWxPcHRpb25zLnNvdXJjZU1hcCA9IGZhbHNlO1xuICAgIGJhYmVsT3B0aW9ucy5hc3QgPSBmYWxzZTtcbiAgICByZXR1cm4gQmFiZWwuY29tcGlsZShjb21tYW5kLCBiYWJlbE9wdGlvbnMpLmNvZGU7XG4gIH1cbn07XG4iXX0=
