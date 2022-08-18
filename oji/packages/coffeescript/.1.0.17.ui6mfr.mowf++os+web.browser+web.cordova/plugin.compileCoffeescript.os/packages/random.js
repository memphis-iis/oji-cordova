(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Random;

var require = meteorInstall({"node_modules":{"meteor":{"random":{"random.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/random/random.js                                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// We use cryptographically strong PRNGs (crypto.getRandomBytes() on the server,                                       //
// window.crypto.getRandomValues() in the browser) when available. If these                                            //
// PRNGs fail, we fall back to the Alea PRNG, which is not cryptographically                                           //
// strong, and we seed it with various sources such as the date, Math.random,                                          //
// and window size on the client.  When using crypto.getRandomValues(), our                                            //
// primitive is hexString(), from which we construct fraction(). When using                                            //
// window.crypto.getRandomValues() or alea, the primitive is fraction and we use                                       //
// that to construct hex string.                                                                                       //
                                                                                                                       //
if (Meteor.isServer) var nodeCrypto = Npm.require('crypto');                                                           // 10
                                                                                                                       //
// see http://baagoe.org/en/wiki/Better_random_numbers_for_javascript                                                  //
// for a full discussion and Alea implementation.                                                                      //
var Alea = function Alea() {                                                                                           // 15
  function Mash() {                                                                                                    // 16
    var n = 0xefc8249d;                                                                                                // 17
                                                                                                                       //
    var mash = function mash(data) {                                                                                   // 19
      data = data.toString();                                                                                          // 20
      for (var i = 0; i < data.length; i++) {                                                                          // 21
        n += data.charCodeAt(i);                                                                                       // 22
        var h = 0.02519603282416938 * n;                                                                               // 23
        n = h >>> 0;                                                                                                   // 24
        h -= n;                                                                                                        // 25
        h *= n;                                                                                                        // 26
        n = h >>> 0;                                                                                                   // 27
        h -= n;                                                                                                        // 28
        n += h * 0x100000000; // 2^32                                                                                  // 29
      }                                                                                                                // 21
      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32                                                              // 31
    };                                                                                                                 // 19
                                                                                                                       //
    mash.version = 'Mash 0.9';                                                                                         // 34
    return mash;                                                                                                       // 35
  }                                                                                                                    //
                                                                                                                       //
  return function (args) {                                                                                             // 38
    var s0 = 0;                                                                                                        // 39
    var s1 = 0;                                                                                                        // 40
    var s2 = 0;                                                                                                        // 41
    var c = 1;                                                                                                         // 42
                                                                                                                       //
    if (args.length == 0) {                                                                                            // 44
      args = [+new Date()];                                                                                            // 45
    }                                                                                                                  //
    var mash = Mash();                                                                                                 // 47
    s0 = mash(' ');                                                                                                    // 48
    s1 = mash(' ');                                                                                                    // 49
    s2 = mash(' ');                                                                                                    // 50
                                                                                                                       //
    for (var i = 0; i < args.length; i++) {                                                                            // 52
      s0 -= mash(args[i]);                                                                                             // 53
      if (s0 < 0) {                                                                                                    // 54
        s0 += 1;                                                                                                       // 55
      }                                                                                                                //
      s1 -= mash(args[i]);                                                                                             // 57
      if (s1 < 0) {                                                                                                    // 58
        s1 += 1;                                                                                                       // 59
      }                                                                                                                //
      s2 -= mash(args[i]);                                                                                             // 61
      if (s2 < 0) {                                                                                                    // 62
        s2 += 1;                                                                                                       // 63
      }                                                                                                                //
    }                                                                                                                  //
    mash = null;                                                                                                       // 66
                                                                                                                       //
    var random = function random() {                                                                                   // 68
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32                                                      // 69
      s0 = s1;                                                                                                         // 68
      s1 = s2;                                                                                                         // 71
      return s2 = t - (c = t | 0);                                                                                     // 72
    };                                                                                                                 //
    random.uint32 = function () {                                                                                      // 74
      return random() * 0x100000000; // 2^32                                                                           // 75
    };                                                                                                                 // 74
    random.fract53 = function () {                                                                                     // 77
      return random() + (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53                                   // 78
    };                                                                                                                 // 77
    random.version = 'Alea 0.9';                                                                                       // 81
    random.args = args;                                                                                                // 82
    return random;                                                                                                     // 83
  }(Array.prototype.slice.call(arguments));                                                                            //
};                                                                                                                     //
                                                                                                                       //
var UNMISTAKABLE_CHARS = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz";                                    // 88
var BASE64_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" + "0123456789-_";                            // 89
                                                                                                                       //
// `type` is one of `RandomGenerator.Type` as defined below.                                                           //
//                                                                                                                     //
// options:                                                                                                            //
// - seeds: (required, only for RandomGenerator.Type.ALEA) an array                                                    //
//   whose items will be `toString`ed and used as the seed to the Alea                                                 //
//   algorithm                                                                                                         //
var RandomGenerator = function RandomGenerator(type, options) {                                                        // 98
  var self = this;                                                                                                     // 99
  self.type = type;                                                                                                    // 100
                                                                                                                       //
  if (!RandomGenerator.Type[type]) {                                                                                   // 102
    throw new Error("Unknown random generator type: " + type);                                                         // 103
  }                                                                                                                    //
                                                                                                                       //
  if (type === RandomGenerator.Type.ALEA) {                                                                            // 106
    if (!options.seeds) {                                                                                              // 107
      throw new Error("No seeds were provided for Alea PRNG");                                                         // 108
    }                                                                                                                  //
    self.alea = Alea.apply(null, options.seeds);                                                                       // 110
  }                                                                                                                    //
};                                                                                                                     //
                                                                                                                       //
// Types of PRNGs supported by the `RandomGenerator` class                                                             //
RandomGenerator.Type = {                                                                                               // 115
  // Use Node's built-in `crypto.getRandomBytes` (cryptographically                                                    //
  // secure but not seedable, runs only on the server). Reverts to                                                     //
  // `crypto.getPseudoRandomBytes` in the extremely uncommon case that                                                 //
  // there isn't enough entropy yet                                                                                    //
  NODE_CRYPTO: "NODE_CRYPTO",                                                                                          // 120
                                                                                                                       //
  // Use non-IE browser's built-in `window.crypto.getRandomValues`                                                     //
  // (cryptographically secure but not seedable, runs only in the                                                      //
  // browser).                                                                                                         //
  BROWSER_CRYPTO: "BROWSER_CRYPTO",                                                                                    // 125
                                                                                                                       //
  // Use the *fast*, seedaable and not cryptographically secure                                                        //
  // Alea algorithm                                                                                                    //
  ALEA: "ALEA"                                                                                                         // 129
};                                                                                                                     //
                                                                                                                       //
RandomGenerator.prototype.fraction = function () {                                                                     // 132
  var self = this;                                                                                                     // 133
  if (self.type === RandomGenerator.Type.ALEA) {                                                                       // 134
    return self.alea();                                                                                                // 135
  } else if (self.type === RandomGenerator.Type.NODE_CRYPTO) {                                                         //
    var numerator = parseInt(self.hexString(8), 16);                                                                   // 137
    return numerator * 2.3283064365386963e-10; // 2^-32                                                                // 138
  } else if (self.type === RandomGenerator.Type.BROWSER_CRYPTO) {                                                      // 136
      var array = new Uint32Array(1);                                                                                  // 140
      window.crypto.getRandomValues(array);                                                                            // 141
      return array[0] * 2.3283064365386963e-10; // 2^-32                                                               // 142
    } else {                                                                                                           // 139
        throw new Error('Unknown random generator type: ' + self.type);                                                // 144
      }                                                                                                                //
};                                                                                                                     //
                                                                                                                       //
RandomGenerator.prototype.hexString = function (digits) {                                                              // 148
  var self = this;                                                                                                     // 149
  if (self.type === RandomGenerator.Type.NODE_CRYPTO) {                                                                // 150
    var numBytes = Math.ceil(digits / 2);                                                                              // 151
    var bytes;                                                                                                         // 152
    // Try to get cryptographically strong randomness. Fall back to                                                    //
    // non-cryptographically strong if not available.                                                                  //
    try {                                                                                                              // 150
      bytes = nodeCrypto.randomBytes(numBytes);                                                                        // 156
    } catch (e) {                                                                                                      //
      // XXX should re-throw any error except insufficient entropy                                                     //
      bytes = nodeCrypto.pseudoRandomBytes(numBytes);                                                                  // 159
    }                                                                                                                  //
    var result = bytes.toString("hex");                                                                                // 161
    // If the number of digits is odd, we'll have generated an extra 4 bits                                            //
    // of randomness, so we need to trim the last digit.                                                               //
    return result.substring(0, digits);                                                                                // 150
  } else {                                                                                                             //
    return this._randomString(digits, "0123456789abcdef");                                                             // 166
  }                                                                                                                    //
};                                                                                                                     //
                                                                                                                       //
RandomGenerator.prototype._randomString = function (charsCount, alphabet) {                                            // 170
  var self = this;                                                                                                     // 172
  var digits = [];                                                                                                     // 173
  for (var i = 0; i < charsCount; i++) {                                                                               // 174
    digits[i] = self.choice(alphabet);                                                                                 // 175
  }                                                                                                                    //
  return digits.join("");                                                                                              // 177
};                                                                                                                     //
                                                                                                                       //
RandomGenerator.prototype.id = function (charsCount) {                                                                 // 180
  var self = this;                                                                                                     // 181
  // 17 characters is around 96 bits of entropy, which is the amount of                                                //
  // state in the Alea PRNG.                                                                                           //
  if (charsCount === undefined) charsCount = 17;                                                                       // 180
                                                                                                                       //
  return self._randomString(charsCount, UNMISTAKABLE_CHARS);                                                           // 187
};                                                                                                                     //
                                                                                                                       //
RandomGenerator.prototype.secret = function (charsCount) {                                                             // 190
  var self = this;                                                                                                     // 191
  // Default to 256 bits of entropy, or 43 characters at 6 bits per                                                    //
  // character.                                                                                                        //
  if (charsCount === undefined) charsCount = 43;                                                                       // 190
  return self._randomString(charsCount, BASE64_CHARS);                                                                 // 196
};                                                                                                                     //
                                                                                                                       //
RandomGenerator.prototype.choice = function (arrayOrString) {                                                          // 199
  var index = Math.floor(this.fraction() * arrayOrString.length);                                                      // 200
  if (typeof arrayOrString === "string") return arrayOrString.substr(index, 1);else return arrayOrString[index];       // 201
};                                                                                                                     //
                                                                                                                       //
// instantiate RNG.  Heuristically collect entropy from various sources when a                                         //
// cryptographic PRNG isn't available.                                                                                 //
                                                                                                                       //
// client sources                                                                                                      //
var height = typeof window !== 'undefined' && window.innerHeight || typeof document !== 'undefined' && document.documentElement && document.documentElement.clientHeight || typeof document !== 'undefined' && document.body && document.body.clientHeight || 1;
                                                                                                                       //
var width = typeof window !== 'undefined' && window.innerWidth || typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth || typeof document !== 'undefined' && document.body && document.body.clientWidth || 1;
                                                                                                                       //
var agent = typeof navigator !== 'undefined' && navigator.userAgent || "";                                             // 229
                                                                                                                       //
function createAleaGeneratorWithGeneratedSeed() {                                                                      // 231
  return new RandomGenerator(RandomGenerator.Type.ALEA, { seeds: [new Date(), height, width, agent, Math.random()] });
};                                                                                                                     //
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 // 237
  Random = new RandomGenerator(RandomGenerator.Type.NODE_CRYPTO);                                                      // 238
} else {                                                                                                               //
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {                               // 240
    Random = new RandomGenerator(RandomGenerator.Type.BROWSER_CRYPTO);                                                 // 242
  } else {                                                                                                             //
    // On IE 10 and below, there's no browser crypto API                                                               //
    // available. Fall back to Alea                                                                                    //
    //                                                                                                                 //
    // XXX looks like at the moment, we use Alea in IE 11 as well,                                                     //
    // which has `window.msCrypto` instead of `window.crypto`.                                                         //
    Random = createAleaGeneratorWithGeneratedSeed();                                                                   // 249
  }                                                                                                                    //
}                                                                                                                      //
                                                                                                                       //
// Create a non-cryptographically secure PRNG with a given seed (using                                                 //
// the Alea algorithm)                                                                                                 //
Random.createWithSeeds = function () {                                                                                 // 255
  for (var _len = arguments.length, seeds = Array(_len), _key = 0; _key < _len; _key++) {                              //
    seeds[_key] = arguments[_key];                                                                                     //
  }                                                                                                                    //
                                                                                                                       //
  if (seeds.length === 0) {                                                                                            // 256
    throw new Error("No seeds were provided");                                                                         // 257
  }                                                                                                                    //
  return new RandomGenerator(RandomGenerator.Type.ALEA, { seeds: seeds });                                             // 259
};                                                                                                                     //
                                                                                                                       //
// Used like `Random`, but much faster and not cryptographically                                                       //
// secure                                                                                                              //
Random.insecure = createAleaGeneratorWithGeneratedSeed();                                                              // 264
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deprecated.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/random/deprecated.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Before this package existed, we used to use this Meteor.uuid()                                                      //
// implementing the RFC 4122 v4 UUID. It is no longer documented                                                       //
// and will go away.                                                                                                   //
// XXX COMPAT WITH 0.5.6                                                                                               //
Meteor.uuid = function () {                                                                                            // 5
  var HEX_DIGITS = "0123456789abcdef";                                                                                 // 6
  var s = [];                                                                                                          // 7
  for (var i = 0; i < 36; i++) {                                                                                       // 8
    s[i] = Random.choice(HEX_DIGITS);                                                                                  // 9
  }                                                                                                                    //
  s[14] = "4";                                                                                                         // 11
  s[19] = HEX_DIGITS.substr(parseInt(s[19], 16) & 0x3 | 0x8, 1);                                                       // 12
  s[8] = s[13] = s[18] = s[23] = "-";                                                                                  // 13
                                                                                                                       //
  var uuid = s.join("");                                                                                               // 15
  return uuid;                                                                                                         // 16
};                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{"extensions":[".js",".json"]});
require("./node_modules/meteor/random/random.js");
require("./node_modules/meteor/random/deprecated.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.random = {}, {
  Random: Random
});

})();



//# sourceURL=meteor://💻app/packages/random.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcmFuZG9tL3JhbmRvbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcmFuZG9tL2RlcHJlY2F0ZWQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVNBLElBQUksT0FBTyxRQUFQLEVBQ0YsSUFBSSxhQUFhLElBQUksT0FBSixDQUFZLFFBQVosQ0FBYixDQUROOzs7O0FBS0EsSUFBSSxPQUFPLFNBQVAsSUFBTyxHQUFZO0FBQ3JCLFdBQVMsSUFBVCxHQUFnQjtBQUNkLFFBQUksSUFBSSxVQUFKLENBRFU7O0FBR2QsUUFBSSxPQUFPLFNBQVAsSUFBTyxDQUFTLElBQVQsRUFBZTtBQUN4QixhQUFPLEtBQUssUUFBTCxFQUFQLENBRHdCO0FBRXhCLFdBQUssSUFBSSxJQUFJLENBQUosRUFBTyxJQUFJLEtBQUssTUFBTCxFQUFhLEdBQWpDLEVBQXNDO0FBQ3BDLGFBQUssS0FBSyxVQUFMLENBQWdCLENBQWhCLENBQUwsQ0FEb0M7QUFFcEMsWUFBSSxJQUFJLHNCQUFzQixDQUF0QixDQUY0QjtBQUdwQyxZQUFJLE1BQU0sQ0FBTixDQUhnQztBQUlwQyxhQUFLLENBQUwsQ0FKb0M7QUFLcEMsYUFBSyxDQUFMLENBTG9DO0FBTXBDLFlBQUksTUFBTSxDQUFOLENBTmdDO0FBT3BDLGFBQUssQ0FBTCxDQVBvQztBQVFwQyxhQUFLLElBQUksV0FBSjtBQVIrQixPQUF0QztBQVVBLGFBQU8sQ0FBQyxNQUFNLENBQU4sQ0FBRCxHQUFZLHNCQUFaO0FBWmlCLEtBQWYsQ0FIRzs7QUFrQmQsU0FBSyxPQUFMLEdBQWUsVUFBZixDQWxCYztBQW1CZCxXQUFPLElBQVAsQ0FuQmM7R0FBaEI7O0FBc0JBLFNBQVEsVUFBVSxJQUFWLEVBQWdCO0FBQ3RCLFFBQUksS0FBSyxDQUFMLENBRGtCO0FBRXRCLFFBQUksS0FBSyxDQUFMLENBRmtCO0FBR3RCLFFB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QUFJLE9BQU8sRUFBRSxJQUFGLENBQU8sRUFBUCxDQUFQLENBVm9CO0FBV3hCLFNBQU8sSUFBUCxDQVh3QjtDQUFaLHdIIiwiZmlsZSI6Ii9wYWNrYWdlcy9yYW5kb20uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBXZSB1c2UgY3J5cHRvZ3JhcGhpY2FsbHkgc3Ryb25nIFBSTkdzIChjcnlwdG8uZ2V0UmFuZG9tQnl0ZXMoKSBvbiB0aGUgc2VydmVyLFxuLy8gd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMoKSBpbiB0aGUgYnJvd3Nlcikgd2hlbiBhdmFpbGFibGUuIElmIHRoZXNlXG4vLyBQUk5HcyBmYWlsLCB3ZSBmYWxsIGJhY2sgdG8gdGhlIEFsZWEgUFJORywgd2hpY2ggaXMgbm90IGNyeXB0b2dyYXBoaWNhbGx5XG4vLyBzdHJvbmcsIGFuZCB3ZSBzZWVkIGl0IHdpdGggdmFyaW91cyBzb3VyY2VzIHN1Y2ggYXMgdGhlIGRhdGUsIE1hdGgucmFuZG9tLFxuLy8gYW5kIHdpbmRvdyBzaXplIG9uIHRoZSBjbGllbnQuICBXaGVuIHVzaW5nIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMoKSwgb3VyXG4vLyBwcmltaXRpdmUgaXMgaGV4U3RyaW5nKCksIGZyb20gd2hpY2ggd2UgY29uc3RydWN0IGZyYWN0aW9uKCkuIFdoZW4gdXNpbmdcbi8vIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKCkgb3IgYWxlYSwgdGhlIHByaW1pdGl2ZSBpcyBmcmFjdGlvbiBhbmQgd2UgdXNlXG4vLyB0aGF0IHRvIGNvbnN0cnVjdCBoZXggc3RyaW5nLlxuXG5pZiAoTWV0ZW9yLmlzU2VydmVyKVxuICB2YXIgbm9kZUNyeXB0byA9IE5wbS5yZXF1aXJlKCdjcnlwdG8nKTtcblxuLy8gc2VlIGh0dHA6Ly9iYWFnb2Uub3JnL2VuL3dpa2kvQmV0dGVyX3JhbmRvbV9udW1iZXJzX2Zvcl9qYXZhc2NyaXB0XG4vLyBmb3IgYSBmdWxsIGRpc2N1c3Npb24gYW5kIEFsZWEgaW1wbGVtZW50YXRpb24uXG52YXIgQWxlYSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gTWFzaCgpIHtcbiAgICB2YXIgbiA9IDB4ZWZjODI0OWQ7XG5cbiAgICB2YXIgbWFzaCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGRhdGEgPSBkYXRhLnRvU3RyaW5nKCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbiArPSBkYXRhLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgIHZhciBoID0gMC4wMjUxOTYwMzI4MjQxNjkzOCAqIG47XG4gICAgICAgIG4gPSBoID4+PiAwO1xuICAgICAgICBoIC09IG47XG4gICAgICAgIGggKj0gbjtcbiAgICAgICAgbiA9IGggPj4+IDA7XG4gICAgICAgIGggLT0gbjtcbiAgICAgICAgbiArPSBoICogMHgxMDAwMDAwMDA7IC8vIDJeMzJcbiAgICAgIH1cbiAgICAgIHJldHVybiAobiA+Pj4gMCkgKiAyLjMyODMwNjQzNjUzODY5NjNlLTEwOyAvLyAyXi0zMlxuICAgIH07XG5cbiAgICBtYXNoLnZlcnNpb24gPSAnTWFzaCAwLjknO1xuICAgIHJldHVybiBtYXNoO1xuICB9XG5cbiAgcmV0dXJuIChmdW5jdGlvbiAoYXJncykge1xuICAgIHZhciBzMCA9IDA7XG4gICAgdmFyIHMxID0gMDtcbiAgICB2YXIgczIgPSAwO1xuICAgIHZhciBjID0gMTtcblxuICAgIGlmIChhcmdzLmxlbmd0aCA9PSAwKSB7XG4gICAgICBhcmdzID0gWytuZXcgRGF0ZV07XG4gICAgfVxuICAgIHZhciBtYXNoID0gTWFzaCgpO1xuICAgIHMwID0gbWFzaCgnICcpO1xuICAgIHMxID0gbWFzaCgnICcpO1xuICAgIHMyID0gbWFzaCgnICcpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBzMCAtPSBtYXNoKGFyZ3NbaV0pO1xuICAgICAgaWYgKHMwIDwgMCkge1xuICAgICAgICBzMCArPSAxO1xuICAgICAgfVxuICAgICAgczEgLT0gbWFzaChhcmdzW2ldKTtcbiAgICAgIGlmIChzMSA8IDApIHtcbiAgICAgICAgczEgKz0gMTtcbiAgICAgIH1cbiAgICAgIHMyIC09IG1hc2goYXJnc1tpXSk7XG4gICAgICBpZiAoczIgPCAwKSB7XG4gICAgICAgIHMyICs9IDE7XG4gICAgICB9XG4gICAgfVxuICAgIG1hc2ggPSBudWxsO1xuXG4gICAgdmFyIHJhbmRvbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHQgPSAyMDkxNjM5ICogczAgKyBjICogMi4zMjgzMDY0MzY1Mzg2OTYzZS0xMDsgLy8gMl4tMzJcbiAgICAgIHMwID0gczE7XG4gICAgICBzMSA9IHMyO1xuICAgICAgcmV0dXJuIHMyID0gdCAtIChjID0gdCB8IDApO1xuICAgIH07XG4gICAgcmFuZG9tLnVpbnQzMiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJhbmRvbSgpICogMHgxMDAwMDAwMDA7IC8vIDJeMzJcbiAgICB9O1xuICAgIHJhbmRvbS5mcmFjdDUzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmFuZG9tKCkgK1xuICAgICAgICAocmFuZG9tKCkgKiAweDIwMDAwMCB8IDApICogMS4xMTAyMjMwMjQ2MjUxNTY1ZS0xNjsgLy8gMl4tNTNcbiAgICB9O1xuICAgIHJhbmRvbS52ZXJzaW9uID0gJ0FsZWEgMC45JztcbiAgICByYW5kb20uYXJncyA9IGFyZ3M7XG4gICAgcmV0dXJuIHJhbmRvbTtcblxuICB9IChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG59O1xuXG52YXIgVU5NSVNUQUtBQkxFX0NIQVJTID0gXCIyMzQ1Njc4OUFCQ0RFRkdISktMTU5QUVJTVFdYWVphYmNkZWZnaGlqa21ub3BxcnN0dXZ3eHl6XCI7XG52YXIgQkFTRTY0X0NIQVJTID0gXCJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaXCIgK1xuICBcIjAxMjM0NTY3ODktX1wiO1xuXG4vLyBgdHlwZWAgaXMgb25lIG9mIGBSYW5kb21HZW5lcmF0b3IuVHlwZWAgYXMgZGVmaW5lZCBiZWxvdy5cbi8vXG4vLyBvcHRpb25zOlxuLy8gLSBzZWVkczogKHJlcXVpcmVkLCBvbmx5IGZvciBSYW5kb21HZW5lcmF0b3IuVHlwZS5BTEVBKSBhbiBhcnJheVxuLy8gICB3aG9zZSBpdGVtcyB3aWxsIGJlIGB0b1N0cmluZ2BlZCBhbmQgdXNlZCBhcyB0aGUgc2VlZCB0byB0aGUgQWxlYVxuLy8gICBhbGdvcml0aG1cbnZhciBSYW5kb21HZW5lcmF0b3IgPSBmdW5jdGlvbiAodHlwZSwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYudHlwZSA9IHR5cGU7XG5cbiAgaWYgKCFSYW5kb21HZW5lcmF0b3IuVHlwZVt0eXBlXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gcmFuZG9tIGdlbmVyYXRvciB0eXBlOiBcIiArIHR5cGUpO1xuICB9XG5cbiAgaWYgKHR5cGUgPT09IFJhbmRvbUdlbmVyYXRvci5UeXBlLkFMRUEpIHtcbiAgICBpZiAoIW9wdGlvbnMuc2VlZHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIHNlZWRzIHdlcmUgcHJvdmlkZWQgZm9yIEFsZWEgUFJOR1wiKTtcbiAgICB9XG4gICAgc2VsZi5hbGVhID0gQWxlYS5hcHBseShudWxsLCBvcHRpb25zLnNlZWRzKTtcbiAgfVxufTtcblxuLy8gVHlwZXMgb2YgUFJOR3Mgc3VwcG9ydGVkIGJ5IHRoZSBgUmFuZG9tR2VuZXJhdG9yYCBjbGFzc1xuUmFuZG9tR2VuZXJhdG9yLlR5cGUgPSB7XG4gIC8vIFVzZSBOb2RlJ3MgYnVpbHQtaW4gYGNyeXB0by5nZXRSYW5kb21CeXRlc2AgKGNyeXB0b2dyYXBoaWNhbGx5XG4gIC8vIHNlY3VyZSBidXQgbm90IHNlZWRhYmxlLCBydW5zIG9ubHkgb24gdGhlIHNlcnZlcikuIFJldmVydHMgdG9cbiAgLy8gYGNyeXB0by5nZXRQc2V1ZG9SYW5kb21CeXRlc2AgaW4gdGhlIGV4dHJlbWVseSB1bmNvbW1vbiBjYXNlIHRoYXRcbiAgLy8gdGhlcmUgaXNuJ3QgZW5vdWdoIGVudHJvcHkgeWV0XG4gIE5PREVfQ1JZUFRPOiBcIk5PREVfQ1JZUFRPXCIsXG5cbiAgLy8gVXNlIG5vbi1JRSBicm93c2VyJ3MgYnVpbHQtaW4gYHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzYFxuICAvLyAoY3J5cHRvZ3JhcGhpY2FsbHkgc2VjdXJlIGJ1dCBub3Qgc2VlZGFibGUsIHJ1bnMgb25seSBpbiB0aGVcbiAgLy8gYnJvd3NlcikuXG4gIEJST1dTRVJfQ1JZUFRPOiBcIkJST1dTRVJfQ1JZUFRPXCIsXG5cbiAgLy8gVXNlIHRoZSAqZmFzdCosIHNlZWRhYWJsZSBhbmQgbm90IGNyeXB0b2dyYXBoaWNhbGx5IHNlY3VyZVxuICAvLyBBbGVhIGFsZ29yaXRobVxuICBBTEVBOiBcIkFMRUFcIixcbn07XG5cblJhbmRvbUdlbmVyYXRvci5wcm90b3R5cGUuZnJhY3Rpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYudHlwZSA9PT0gUmFuZG9tR2VuZXJhdG9yLlR5cGUuQUxFQSkge1xuICAgIHJldHVybiBzZWxmLmFsZWEoKTtcbiAgfSBlbHNlIGlmIChzZWxmLnR5cGUgPT09IFJhbmRvbUdlbmVyYXRvci5UeXBlLk5PREVfQ1JZUFRPKSB7XG4gICAgdmFyIG51bWVyYXRvciA9IHBhcnNlSW50KHNlbGYuaGV4U3RyaW5nKDgpLCAxNik7XG4gICAgcmV0dXJuIG51bWVyYXRvciAqIDIuMzI4MzA2NDM2NTM4Njk2M2UtMTA7IC8vIDJeLTMyXG4gIH0gZWxzZSBpZiAoc2VsZi50eXBlID09PSBSYW5kb21HZW5lcmF0b3IuVHlwZS5CUk9XU0VSX0NSWVBUTykge1xuICAgIHZhciBhcnJheSA9IG5ldyBVaW50MzJBcnJheSgxKTtcbiAgICB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhhcnJheSk7XG4gICAgcmV0dXJuIGFycmF5WzBdICogMi4zMjgzMDY0MzY1Mzg2OTYzZS0xMDsgLy8gMl4tMzJcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gcmFuZG9tIGdlbmVyYXRvciB0eXBlOiAnICsgc2VsZi50eXBlKTtcbiAgfVxufTtcblxuUmFuZG9tR2VuZXJhdG9yLnByb3RvdHlwZS5oZXhTdHJpbmcgPSBmdW5jdGlvbiAoZGlnaXRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYudHlwZSA9PT0gUmFuZG9tR2VuZXJhdG9yLlR5cGUuTk9ERV9DUllQVE8pIHtcbiAgICB2YXIgbnVtQnl0ZXMgPSBNYXRoLmNlaWwoZGlnaXRzIC8gMik7XG4gICAgdmFyIGJ5dGVzO1xuICAgIC8vIFRyeSB0byBnZXQgY3J5cHRvZ3JhcGhpY2FsbHkgc3Ryb25nIHJhbmRvbW5lc3MuIEZhbGwgYmFjayB0b1xuICAgIC8vIG5vbi1jcnlwdG9ncmFwaGljYWxseSBzdHJvbmcgaWYgbm90IGF2YWlsYWJsZS5cbiAgICB0cnkge1xuICAgICAgYnl0ZXMgPSBub2RlQ3J5cHRvLnJhbmRvbUJ5dGVzKG51bUJ5dGVzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBYWFggc2hvdWxkIHJlLXRocm93IGFueSBlcnJvciBleGNlcHQgaW5zdWZmaWNpZW50IGVudHJvcHlcbiAgICAgIGJ5dGVzID0gbm9kZUNyeXB0by5wc2V1ZG9SYW5kb21CeXRlcyhudW1CeXRlcyk7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBieXRlcy50b1N0cmluZyhcImhleFwiKTtcbiAgICAvLyBJZiB0aGUgbnVtYmVyIG9mIGRpZ2l0cyBpcyBvZGQsIHdlJ2xsIGhhdmUgZ2VuZXJhdGVkIGFuIGV4dHJhIDQgYml0c1xuICAgIC8vIG9mIHJhbmRvbW5lc3MsIHNvIHdlIG5lZWQgdG8gdHJpbSB0aGUgbGFzdCBkaWdpdC5cbiAgICByZXR1cm4gcmVzdWx0LnN1YnN0cmluZygwLCBkaWdpdHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLl9yYW5kb21TdHJpbmcoZGlnaXRzLCBcIjAxMjM0NTY3ODlhYmNkZWZcIik7XG4gIH1cbn07XG5cblJhbmRvbUdlbmVyYXRvci5wcm90b3R5cGUuX3JhbmRvbVN0cmluZyA9IGZ1bmN0aW9uIChjaGFyc0NvdW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFscGhhYmV0KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGRpZ2l0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoYXJzQ291bnQ7IGkrKykge1xuICAgIGRpZ2l0c1tpXSA9IHNlbGYuY2hvaWNlKGFscGhhYmV0KTtcbiAgfVxuICByZXR1cm4gZGlnaXRzLmpvaW4oXCJcIik7XG59O1xuXG5SYW5kb21HZW5lcmF0b3IucHJvdG90eXBlLmlkID0gZnVuY3Rpb24gKGNoYXJzQ291bnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyAxNyBjaGFyYWN0ZXJzIGlzIGFyb3VuZCA5NiBiaXRzIG9mIGVudHJvcHksIHdoaWNoIGlzIHRoZSBhbW91bnQgb2ZcbiAgLy8gc3RhdGUgaW4gdGhlIEFsZWEgUFJORy5cbiAgaWYgKGNoYXJzQ291bnQgPT09IHVuZGVmaW5lZClcbiAgICBjaGFyc0NvdW50ID0gMTc7XG5cbiAgcmV0dXJuIHNlbGYuX3JhbmRvbVN0cmluZyhjaGFyc0NvdW50LCBVTk1JU1RBS0FCTEVfQ0hBUlMpO1xufTtcblxuUmFuZG9tR2VuZXJhdG9yLnByb3RvdHlwZS5zZWNyZXQgPSBmdW5jdGlvbiAoY2hhcnNDb3VudCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIERlZmF1bHQgdG8gMjU2IGJpdHMgb2YgZW50cm9weSwgb3IgNDMgY2hhcmFjdGVycyBhdCA2IGJpdHMgcGVyXG4gIC8vIGNoYXJhY3Rlci5cbiAgaWYgKGNoYXJzQ291bnQgPT09IHVuZGVmaW5lZClcbiAgICBjaGFyc0NvdW50ID0gNDM7XG4gIHJldHVybiBzZWxmLl9yYW5kb21TdHJpbmcoY2hhcnNDb3VudCwgQkFTRTY0X0NIQVJTKTtcbn07XG5cblJhbmRvbUdlbmVyYXRvci5wcm90b3R5cGUuY2hvaWNlID0gZnVuY3Rpb24gKGFycmF5T3JTdHJpbmcpIHtcbiAgdmFyIGluZGV4ID0gTWF0aC5mbG9vcih0aGlzLmZyYWN0aW9uKCkgKiBhcnJheU9yU3RyaW5nLmxlbmd0aCk7XG4gIGlmICh0eXBlb2YgYXJyYXlPclN0cmluZyA9PT0gXCJzdHJpbmdcIilcbiAgICByZXR1cm4gYXJyYXlPclN0cmluZy5zdWJzdHIoaW5kZXgsIDEpO1xuICBlbHNlXG4gICAgcmV0dXJuIGFycmF5T3JTdHJpbmdbaW5kZXhdO1xufTtcblxuLy8gaW5zdGFudGlhdGUgUk5HLiAgSGV1cmlzdGljYWxseSBjb2xsZWN0IGVudHJvcHkgZnJvbSB2YXJpb3VzIHNvdXJjZXMgd2hlbiBhXG4vLyBjcnlwdG9ncmFwaGljIFBSTkcgaXNuJ3QgYXZhaWxhYmxlLlxuXG4vLyBjbGllbnQgc291cmNlc1xudmFyIGhlaWdodCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuaW5uZXJIZWlnaHQpIHx8XG4gICAgICAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgICAgICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpIHx8XG4gICAgICAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICYmIGRvY3VtZW50LmJvZHlcbiAgICAgICAmJiBkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodCkgfHxcbiAgICAgIDE7XG5cbnZhciB3aWR0aCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuaW5uZXJXaWR0aCkgfHxcbiAgICAgICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnXG4gICAgICAgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XG4gICAgICAgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSB8fFxuICAgICAgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAmJiBkb2N1bWVudC5ib2R5XG4gICAgICAgJiYgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgfHxcbiAgICAgIDE7XG5cbnZhciBhZ2VudCA9ICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IudXNlckFnZW50KSB8fCBcIlwiO1xuXG5mdW5jdGlvbiBjcmVhdGVBbGVhR2VuZXJhdG9yV2l0aEdlbmVyYXRlZFNlZWQoKSB7XG4gIHJldHVybiBuZXcgUmFuZG9tR2VuZXJhdG9yKFxuICAgIFJhbmRvbUdlbmVyYXRvci5UeXBlLkFMRUEsXG4gICAge3NlZWRzOiBbbmV3IERhdGUsIGhlaWdodCwgd2lkdGgsIGFnZW50LCBNYXRoLnJhbmRvbSgpXX0pO1xufTtcblxuaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICBSYW5kb20gPSBuZXcgUmFuZG9tR2VuZXJhdG9yKFJhbmRvbUdlbmVyYXRvci5UeXBlLk5PREVfQ1JZUFRPKTtcbn0gZWxzZSB7XG4gIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvdy5jcnlwdG8gJiZcbiAgICAgIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKSB7XG4gICAgUmFuZG9tID0gbmV3IFJhbmRvbUdlbmVyYXRvcihSYW5kb21HZW5lcmF0b3IuVHlwZS5CUk9XU0VSX0NSWVBUTyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gT24gSUUgMTAgYW5kIGJlbG93LCB0aGVyZSdzIG5vIGJyb3dzZXIgY3J5cHRvIEFQSVxuICAgIC8vIGF2YWlsYWJsZS4gRmFsbCBiYWNrIHRvIEFsZWFcbiAgICAvL1xuICAgIC8vIFhYWCBsb29rcyBsaWtlIGF0IHRoZSBtb21lbnQsIHdlIHVzZSBBbGVhIGluIElFIDExIGFzIHdlbGwsXG4gICAgLy8gd2hpY2ggaGFzIGB3aW5kb3cubXNDcnlwdG9gIGluc3RlYWQgb2YgYHdpbmRvdy5jcnlwdG9gLlxuICAgIFJhbmRvbSA9IGNyZWF0ZUFsZWFHZW5lcmF0b3JXaXRoR2VuZXJhdGVkU2VlZCgpO1xuICB9XG59XG5cbi8vIENyZWF0ZSBhIG5vbi1jcnlwdG9ncmFwaGljYWxseSBzZWN1cmUgUFJORyB3aXRoIGEgZ2l2ZW4gc2VlZCAodXNpbmdcbi8vIHRoZSBBbGVhIGFsZ29yaXRobSlcblJhbmRvbS5jcmVhdGVXaXRoU2VlZHMgPSBmdW5jdGlvbiAoLi4uc2VlZHMpIHtcbiAgaWYgKHNlZWRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vIHNlZWRzIHdlcmUgcHJvdmlkZWRcIik7XG4gIH1cbiAgcmV0dXJuIG5ldyBSYW5kb21HZW5lcmF0b3IoUmFuZG9tR2VuZXJhdG9yLlR5cGUuQUxFQSwge3NlZWRzOiBzZWVkc30pO1xufTtcblxuLy8gVXNlZCBsaWtlIGBSYW5kb21gLCBidXQgbXVjaCBmYXN0ZXIgYW5kIG5vdCBjcnlwdG9ncmFwaGljYWxseVxuLy8gc2VjdXJlXG5SYW5kb20uaW5zZWN1cmUgPSBjcmVhdGVBbGVhR2VuZXJhdG9yV2l0aEdlbmVyYXRlZFNlZWQoKTtcbiIsIi8vIEJlZm9yZSB0aGlzIHBhY2thZ2UgZXhpc3RlZCwgd2UgdXNlZCB0byB1c2UgdGhpcyBNZXRlb3IudXVpZCgpXG4vLyBpbXBsZW1lbnRpbmcgdGhlIFJGQyA0MTIyIHY0IFVVSUQuIEl0IGlzIG5vIGxvbmdlciBkb2N1bWVudGVkXG4vLyBhbmQgd2lsbCBnbyBhd2F5LlxuLy8gWFhYIENPTVBBVCBXSVRIIDAuNS42XG5NZXRlb3IudXVpZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIEhFWF9ESUdJVFMgPSBcIjAxMjM0NTY3ODlhYmNkZWZcIjtcbiAgdmFyIHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAzNjsgaSsrKSB7XG4gICAgc1tpXSA9IFJhbmRvbS5jaG9pY2UoSEVYX0RJR0lUUyk7XG4gIH1cbiAgc1sxNF0gPSBcIjRcIjtcbiAgc1sxOV0gPSBIRVhfRElHSVRTLnN1YnN0cigocGFyc2VJbnQoc1sxOV0sMTYpICYgMHgzKSB8IDB4OCwgMSk7XG4gIHNbOF0gPSBzWzEzXSA9IHNbMThdID0gc1syM10gPSBcIi1cIjtcblxuICB2YXIgdXVpZCA9IHMuam9pbihcIlwiKTtcbiAgcmV0dXJuIHV1aWQ7XG59O1xuIl19
