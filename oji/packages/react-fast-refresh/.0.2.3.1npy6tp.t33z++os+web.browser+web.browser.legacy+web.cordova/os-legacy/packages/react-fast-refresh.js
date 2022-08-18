(function(){

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages/react-fast-refresh/server.js                                         //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
let enabled = !process.env.DISABLE_REACT_FAST_REFRESH;

if (enabled) {
  try {
    // React fast refresh requires react 16.9.0 or newer
    const semverGte = require('semver/functions/gte');
    const pkg = require('react/package.json');

    enabled = pkg && pkg.version &&
      semverGte(pkg.version, '16.9.0');
  } catch (e) {
    // If the app doesn't directly depend on react, leave react-refresh
    // enabled in case a package or indirect dependency uses react.
  }
}

// Needed for compatibility when build plugins use ReactFastRefresh.babelPlugin
if (typeof __meteor_runtime_config__ === 'object') {
  __meteor_runtime_config__.reactFastRefreshEnabled = enabled;
}

const babelPlugin = enabled ?
  require('react-refresh/babel') :
  null;

// Babel plugin that adds a call to global.___INIT_METEOR_FAST_REFRESH()
// at the start of every file compiled with react-refresh to ensure the runtime
// is enabled if it is used.
function enableReactRefreshBabelPlugin(babel) {
  const { types: t } = babel;

  return {
    name: "meteor-enable-react-fast-refresh",
    post(state) {
      // This is the path for the Program node
      let path = state.path;
      let method = t.identifier("___INIT_METEOR_FAST_REFRESH");
      let call = t.callExpression(
        method,
        [t.identifier("module")]
      );
      path.unshiftContainer("body", t.expressionStatement(call));
    },
  };
}

let deprecationWarned = false;

ReactFastRefresh = {
  get babelPlugin() {
    if (!deprecationWarned) {
      console.warn(
        'ReactFastRefresh.babelPlugin is deprecated and is incompatible with HMR on Cordova. Use ReactFastRefresh.getBabelPluginConfig() instead.'
      );
      deprecationWarned = true;
    }

    return babelPlugin;
  },
  getBabelPluginConfig() {
    if (!babelPlugin) {
      return [];
    }

    return [
      [babelPlugin, { skipEnvCheck: true }],
      enableReactRefreshBabelPlugin,
    ]
  }
};

///////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages/react-fast-refresh/client-runtime.js                                 //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
const runtime = require('react-refresh/runtime');

let timeout = null;
function scheduleRefresh() {
  if (!timeout) {
    timeout = setTimeout(function () {
      timeout = null;
      runtime.performReactRefresh();
    }, 0);
  }
}

// The react refresh babel plugin only registers functions. For react
// to update other types of exports (such as classes), we have to
// register them
function registerExportsForReactRefresh(moduleId, moduleExports) {
  runtime.register(moduleExports, moduleId + ' %exports%');

  if (moduleExports == null || typeof moduleExports !== 'object') {
    // Exit if we can't iterate over exports.
    return;
  }

  for (var key in moduleExports) {
    var desc = Object.getOwnPropertyDescriptor(moduleExports, key);
    if (desc && desc.get) {
      // Don't invoke getters as they may have side effects.
      continue;
    }

    var exportValue = moduleExports[key];
    var typeID = moduleId + ' %exports% ' + key;
    runtime.register(exportValue, typeID);
  }
};

// Modules that only export components become React Refresh boundaries.
function isReactRefreshBoundary(moduleExports) {
  if (runtime.isLikelyComponentType(moduleExports)) {
    return true;
  }
  if (moduleExports == null || typeof moduleExports !== 'object') {
    // Exit if we can't iterate over exports.
    return false;
  }

  // Is a DOM element. If we iterate its properties, we might cause the
  // browser to show warnings when accessing depreciated getters on its
  // prototype
  if (moduleExports instanceof Element) {
    return false;
  }

  var hasExports = false;
  var onlyExportComponents = true;

  for (var key in moduleExports) {
    hasExports = true;

    var desc = Object.getOwnPropertyDescriptor(moduleExports, key);
    if (desc && desc.get) {
      // Don't invoke getters as they may have side effects.
      return false;
    }

    try {
      if (!runtime.isLikelyComponentType(moduleExports[key])) {
        onlyExportComponents = false;
      }
    } catch (e) {
      if (e.name === 'SecurityError') {
        // Not a component. Could be a cross-origin object or something else
        // we don't have access to
        return false;
      }

      throw e;
    }
  }

  return hasExports && onlyExportComponents;
};

runtime.injectIntoGlobalHook(window);

window.$RefreshReg$ = function () { };
window.$RefreshSig$ = function () {
  return function (type) { return type; };
};

const moduleInitialState = new WeakMap();

module.hot.onRequire({
  after: function (module) {
    // TODO: handle modules with errors

    const beforeStates = moduleInitialState.get(module);
    const beforeState = beforeStates && beforeStates.pop();
    if (!beforeState) {
      return;
    }

    window.$RefreshReg$ = beforeState.prevRefreshReg;
    window.$RefreshSig$ = beforeState.prevRefreshSig;
    if (isReactRefreshBoundary(module.exports)) {
      registerExportsForReactRefresh(module.id, module.exports);
      module.hot.accept();

      scheduleRefresh();
    }
  }
});

module.exports = function setupModule (module) {
  if (module.loaded) {
    // The module was already executed
    return;
  }

  let beforeStates = moduleInitialState.get(module);

  if (beforeStates === undefined) {
    beforeStates = [];
    moduleInitialState.set(module, beforeStates);
  }

  var prevRefreshReg = window.$RefreshReg$;
  var prevRefreshSig = window.$RefreshSig$;

  window.RefreshRuntime = runtime;
  window.$RefreshReg$ = function (type, _id) {
    const fullId = module.id + ' ' + _id;
    RefreshRuntime.register(type, fullId);
  }
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;

  beforeStates.push({
    prevRefreshReg: prevRefreshReg,
    prevRefreshSig: prevRefreshSig
  });
}

///////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

///////////////////////////////////////////////////////////////////////////////////
//                                                                               //
// packages/react-fast-refresh/client.js                                         //
//                                                                               //
///////////////////////////////////////////////////////////////////////////////////
                                                                                 //
let enabled = __meteor_runtime_config__ &&
  __meteor_runtime_config__.reactFastRefreshEnabled;
let hmrEnabled = !!module.hot;
var setupModule;

function init(module) {
  if (!hmrEnabled) {
    return;
  }

  setupModule = setupModule || require('./client-runtime.js');
  setupModule(module);
}

if (
  hmrEnabled &&
  enabled
) {
  let inBefore = false;
  module.hot.onRequire({
    before: function (module) {
      if (inBefore) {
        // This is a module required while loading the react refresh runtime
        // Do not initialize it to avoid an infinite loop 
        return;
      }

      inBefore = true;
      init(module);
      inBefore = false;
    }
  });

  window.___INIT_METEOR_FAST_REFRESH = function () {};
} else {
  window.___INIT_METEOR_FAST_REFRESH = init;
}

///////////////////////////////////////////////////////////////////////////////////

}).call(this);
