// Create the requireConfig variable if it doesn't already exist
if ((typeof process !== 'undefined'  && process.versions && !!process.versions.node) || typeof require === 'undefined') {
    var requireConfig = {};
} else if (typeof require !== 'undefined') {
    var requireConfig = require;
}

(function(customGlobalConfig) {

    var definitionTempQueue = [];

    /**
     *
     */
    function _require(arg1, arg2, arg3, arg4) {
        // Figure out what the arguments are
        var config, dependencies, callback, errorback;
        if (!(arg1 instanceof Array)) {
            config = arg1, dependencies = arg2, callback = arg3, errorback = arg4;
        } else {
            dependencies = arg1, callback = arg2, errorback = arg3;
        }

        config = config? _require.config(config) : _require.s.contexts["_"].config;

        // Handle all of the defines before this require call, and then load scripts
        completeScriptLoad(config, "", errorback, function() {
            loadDependencyScripts(config, "", dependencies, errorback, function() {
                loadDependencyInstances(config, "",dependencies, callback);
            });
        });
    }

    /**
     *
     */
    _require.config = function(config) {
        // Parse packages and translate them all first
        if (config.packages) {
            for (var i = 0; i < config.packages.length; i++) {
                var packageObj = config.packages[i];
                if (typeof packageObj === 'string') {
                    config.packages[i] = {name: packageObj, location: packageObj, main: "main"}
                } else {
                    packageObj.location = packageObj.location || packageObj.name;
                    packageObj.main = packageObj.main || "main";
                }
            }
        }

        // test for the context
        var contextObj = _require.s.contexts[config.context || "_"];

        // If it exists, merge existing context config with new config
        if (contextObj) {
            contextObj.config = merge(contextObj.config, config);
        } else {
            _require.s.contexts[config.context] = contextObj = createContext(config);
        }

        return contextObj.config;
    }

    /**
     *
     */
    function merge(obj1, obj2) {
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname in obj2) {
            if (typeof obj2[attrname] === "object" && !(obj2[attrname] instanceof Array)) {
                obj3[attrname] = merge(obj1[attrname], obj2[attrname]);
            } else {
                obj3[attrname] = obj2[attrname];
            }
        }
        return obj3;
    }

    /**
     *  Figures out the arguments, and adds to the definition queue
     */
    function define(arg1, arg2, arg3) {
        var name = typeof arg1 === "string"? arg1 : undefined;
        var dependencies = arg1 instanceof Array? arg1 : arg2 instanceof Array? arg2 : [];
        var callbackTest = function(subject) {
            return !(subject instanceof Array) && (typeof subject === "object" || typeof subject === "function");
        }
        var callback = callbackTest(arg1)? arg1 : callbackTest(arg2)? arg2 : arg3;

        definitionTempQueue.push({
            name: name,
            dependencies: dependencies,
            callback: callback
        });
    }

    /**
     * Takes a path, and compares it against paths defined in require configuration.
     * A translation is done if the path starts with any of the keys in the paths config.
     */
    function translatePath(pathToTranslate, config) {

        function __tt(test, replacement) {
            var regex = new RegExp("^("+test+")(/.*|$|!)");
            var matches = pathToTranslate.match(regex);
            if (matches) {
                return pathToTranslate.replace(regex, replacement+"$2");
            }
        }

        if (config.paths !== undefined) {
            if (config.paths[pathToTranslate]) {
                return __tt(pathToTranslate, config.paths[pathToTranslate]);
            }
            for (var path in config.paths) {
                var result = __tt(path, config.paths[path]);
                if (result) return result;
            }
        }
        if (config.packages !== undefined) {
            for (var i = 0; i < config.packages.length; i++) {
                var packageObj = config.packages[i];
                var result = __tt(packageObj.name, packageObj.location);
                if (result) return result;
            }
        }

        return pathToTranslate;
    }

    function checkIfPackageAndGetMain(name, config) {
        var target = name;
        if (config.packages) {
            for (var i = 0; i < config.packages.length; i++) {
                var packageObj = config.packages[i];
                if (target === packageObj.name) {
                    target = packageObj.name + "/" + packageObj.main;
                    break;
                }
            }
        }
        return target;
    }

    /**
     * Takes the current module path, and the target path (dependency) and resolves it relatively.
     * If the target path does not start with ../ or ./, it's assumed to be relative to root.
     * A translation using the paths require configuration is also done, so a real url is returned.
     */
    function resolvePath(currentPath, targetPath, config) {
        currentPath = currentPath == ""? "" : currentPath.substring(0, currentPath.lastIndexOf("/"));
        var resultPath;

        var prefixIndex = targetPath.indexOf("!");
        var prefix = "";
        if (prefixIndex > -1) {
            prefix = targetPath.substring(0, prefixIndex) + "!";
            targetPath = targetPath.substring(prefixIndex + 1, targetPath.length);
        }

        if (targetPath.indexOf("./") === 0 || targetPath.indexOf("../") === 0) {
            var currentPathParts = currentPath === ""? [] : currentPath.split("/");
            var targetPathParts = targetPath.split("/");
            for (var i = 0; i < targetPathParts.length; i++) {
                if (targetPathParts[i] == "..") {
                    currentPathParts.splice(-1, 1);
                } else if (targetPathParts[i] !== "." && targetPathParts[i] !== "") {
                    currentPathParts.push(targetPathParts[i]);
                }
            }
            resultPath = currentPathParts.join("/");
        } else {
            resultPath = checkIfPackageAndGetMain(targetPath, config);
        }

        return prefix + resultPath;
    }

    function createContext(config) {
        var context = {
            config: merge({baseUrl: "./", context: "_"}, config),
            instances: {},
            definitions: {},
            listeners: {}
        };

        _require.s.contexts[context.config.context] = context;
        updateContextDefinition(context.config, "require", {name: "require", callback: {config: function(){return context.config}}});
        updateContextDefinition(context.config, "exports", {name: "exports", callback: {}});
        updateContextDefinition(context.config, "module", {name: "module", callback: {config: function() {return context.config;}}});

        return context;
    }

    /**
     * Loads the scripts and executes it. Once loaded, the onload callback is executed.
     */
    function importScript(config, name, requester, errorback, onload) {

        if (config.mocks) {
            for (var i = 0; i < config.mocks.length; i++) {
                var mock = config.mocks[i];
                if (name === mock.name) {
                    define(mock.name, mock.dependencies || [], mock.callback);
                    onload();
                    return;
                }
            }
        }

        if (typeof process !== "undefined" && process.versions && !!process.versions.node) {
            _require.nodeRequire = require;
            var fs = require("fs");
            var translatedPath = translatePath(name, config);
            var script = fs.readFileSync((config.baseUrl + "/" + translatedPath + ".js").replace("//", "/"), "utf8");

            if (config.isBuild) {
                var matches = script.match(/\/\*\![\s\S]+?\*\//g); //license
                if (matches) {
                    _require.s.contexts[config.context].definitions[name].licenses = matches;
                }
            }

            eval(script);
            onload();
        } else {
            var tag = document.createElement("script");
            tag.type = "text\/javascript";
            tag.setAttribute("async", "");
            tag.setAttribute("data-context", config.context);
            tag.setAttribute("data-modulename", name);
            tag.setAttribute("charset", "utf-8");
            tag.src = ((name.indexOf("/") === 0? "./" : config.baseUrl) + "/" + translatePath(name, config) + ".js").replace("//", "/");
            tag.onerror = function(e) {
                if (errorback) {
                    errorback(e);
                } else {
                    throw new Error("\n  Missing: " + e.target.src + "\n  Requester: " + requester);
                }
            }
            tag.onload = onload;

            document.getElementsByTagName("head")[0].appendChild(tag);
            return tag;
        }

    }

    /**
     * If the definition doesn't exist, one is created with referenceCount and isLoading.
     * If a definition is passed, it is merged, and isLoading is deleted.
     */
    function updateContextDefinition(config, name, definition) {
        var contextDefinitions = _require.s.contexts[config.context].definitions;

        if (!contextDefinitions[name]) {
            contextDefinitions[name] = {
                referenceCount: 1,
                isLoading: true
            }
        }

        if (definition) {
            contextDefinitions[name] = merge(definition, contextDefinitions[name]);
            delete contextDefinitions[name].isLoading;
        }
    }

    /**
     * Executed after a script has loaded. Iterates over the dependency queue and loads their dependencies.
     */
    function completeScriptLoad(config, name, errorback, callback) {
        var definitionTemp, notCompleted = definitionTempQueue.length, queue = definitionTempQueue.slice();
        definitionTempQueue = [];
        if (notCompleted === 0) {
            callback();
        }

        for (var i = 0; i < queue.length; i++) {
            definitionTemp = queue[i];
            definitionTemp.name = checkIfPackageAndGetMain(definitionTemp.name || name, config);
            updateContextDefinition(config, definitionTemp.name, definitionTemp);
        }


        while (definitionTemp = queue.pop()) {
            loadDependencyScripts(config, definitionTemp.name, definitionTemp.dependencies, errorback, function() {
                if (--notCompleted === 0) {
                    callback();
                }
            });
        }
    }

    /**
     * Executes the plugin. Mimics require.js plugin structure.
     */
    function callPlugin(config, currentPath, dependencyPath, errorback, callback) {
        // Get the full names
        var pathParts = dependencyPath.split("!");
        var name = resolvePath(currentPath, dependencyPath, config);
        var fileName = resolvePath(currentPath, pathParts[1], config);
        var pluginName = resolvePath(currentPath, pathParts[0], config);
        var definitions = _require.s.contexts[config.context].definitions;
        var pluginObj = definitions[pluginName];

        // Iterate over the dependencies for the plugin and instantiate them
        var args = [];
        pluginObj.dependencies.forEach(function(dependency) {
            var dependencyObj = _require.s.contexts[config.context].definitions[dependency];
            if (typeof dependencyObj.callback === "function") {
                args.push(dependencyObj.callback());
            } else if (dependencyObj.callback) {
                args.push(dependencyObj.callback)
            } else {
                args.push(dependencyObj);
            }
        })

        // Prepare the plugin API
        var pluginInstance = pluginObj.callback.apply(config, args);
        var localRequire = function(dependencies, callback) {
            require(config, dependencies, callback);
        }
        localRequire.toUrl = function(path){return (config.baseUrl + "/" + resolvePath(currentPath, path, config)).replace("//", "/");};

        var onLoad = function(content) {
            updateContextDefinition(config, name, {callback: function() {
                return content;
            }});
            callback();
        }

        onLoad.fromText = function(content) {
            updateContextDefinition(config, name, {callback: function() {
                return eval(content);
            }});
            callback();
        }

        onLoad.error = function(err) {
            if (errorback) {
                errorback(err);
            } else {
                throw err;
            }
        }

        var write = function(content) {}

        write.asModule = function(moduleName, moduleFilename, moduleContent) {
            eval(moduleContent);
            completeScriptLoad(config, resolvePath(currentPath, moduleName, config), errorback, function() {
                callback();
            });
        }

        // Set up the context definition for this import
        if ((config.isBuild && pluginInstance.writeFile) || !config.isBuild) {
            updateContextDefinition(config, name);
        }

        // Call the plugin with the API
        if (config.isBuild && pluginInstance.writeFile) {
            pluginInstance.writeFile(pluginObj.name, fileName, localRequire, write, config);
        } else if (!config.isBuild) {
            pluginInstance.load(fileName, localRequire, onLoad, config);
        }

    }

    /**
     * Iterates over the passed dependencies, and will load their scripts.
     */
    function loadDependencyScripts(config, currentPath, dependencies, errorback, callback) {
        var definitions = _require.s.contexts[config.context].definitions;
        var listeners = _require.s.contexts[config.context].listeners;

        var notCompleted = dependencies.length;
        if (notCompleted === 0) {
            return callback();
        }

        for (var i = 0; i < dependencies.length; i++) {
            (function(dependencyPath) {

                // Parse the name into a plugin and into the full name (which includes plugin prefix)
                var prefixIndex = dependencyPath.indexOf("!");
                var pluginName = prefixIndex > -1? resolvePath(currentPath, dependencyPath.substring(0, prefixIndex), config) : undefined;
                var fullName = resolvePath(currentPath, dependencyPath, config);

                // When all dependencies have been loaded, call the callback
                var finish = function() {
                    --notCompleted === 0 && callback();
                }

                // Activated when a script has loaded
                var triggerListeners = function(name) {
                    if (listeners[name]) {
                        listeners[name].forEach(function(listener) {
                            listener();
                        });
                        delete listeners[name];
                    }
                }

                var triggerPlugin = function() {
                    callPlugin(config, currentPath, dependencyPath, errorback, function() {
                        triggerListeners(fullName);
                        finish();
                    });
                }

                var addListener = function(name, fn) {
                    definitions[name].referenceCount++;
                    !listeners[name] && (listeners[name] = []);
                    listeners[name].push(fn);
                }

                var loadScript = function(name, fn) {
                    updateContextDefinition(config, name);
                    importScript(config, name, currentPath, errorback, function() {
                        completeScriptLoad(config, name, errorback, function() {
                            triggerListeners(name);
                            fn();
                        });
                    });
                }

                // Ignore anything that translates to empty
                if (config.isBuild && translatePath(dependencyPath, config).indexOf("empty:") === 0) {
                    finish();
                } else if (pluginName && !definitions[fullName] && definitions[pluginName] && definitions[pluginName].isLoading) {
                    addListener(pluginName, triggerPlugin);
                } else if (pluginName && !definitions[fullName] && !definitions[pluginName]) {
                    loadScript(pluginName, triggerPlugin);
                } else if (pluginName && !definitions[fullName]) {
                    triggerPlugin(fullName);
                } else if (definitions[fullName] && definitions[fullName].isLoading) {
                    addListener(fullName, finish);
                } else if (!definitions[fullName]) {
                    loadScript(fullName, finish);
                } else {
                    finish();
                }

            })(dependencies[i]);
        }

    }

    /**
     * Iterates over the list of passed dependencies, and instantiates a copy of the dependency for the context if one hasn't been already. Once the dependency tree has been iterated through, the callback is executed passing those instances.
     */
    function loadDependencyInstances(config, currentPath, dependencies, callback) {

        // This should be skipped in a build since it's pointless
        if (!config.isBuild) {
            var definitions = _require.s.contexts[config.context].definitions;
            var instances = _require.s.contexts[config.context].instances;
            var args = [];

            function executeDefinitionCallback(name, definition, theArguments) {
                if (typeof definition.callback === "function") {
                    instances[name] = definition.callback.apply(config, theArguments);
                } else {
                    instances[name] = definition.callback;
                }
            }

            // Recursively iterate through the dependencies and instantiate them for the context
            dependencies.forEach(function(dependencyPath) {
                var name = resolvePath(currentPath, dependencyPath, config);

                if (!instances[name]) {
                    var definition = definitions[name];
                    if (definition.dependencies) {
                        loadDependencyInstances(config, name, definition.dependencies, function() {
                            executeDefinitionCallback(name, definition, arguments);
                        });
                    } else {
                        executeDefinitionCallback(name, definition);
                    }
                }

                args.push(instances[name]);
            });

            // Once everything has been instantiated, call the require callback
            if (callback) {
                callback.apply(config, args);
            }
        }

    }

    _require.reset = function() {
        _require.s = {contexts:{}};
        createContext(customGlobalConfig || {})
        _require.config(customGlobalConfig);
        define.amd = true;
    }

    _require.reset();

    if (typeof process !== "undefined" && process.versions && !!process.versions.node) {
        module.exports = {
            require: _require,
            define: define,
            merge: merge,
            translatePath: translatePath,
            resolvePath: resolvePath,
            createContext: createContext
        };
    } else if (typeof module === 'undefined') {
        window.require = _require;
        window.define = define;
    }

})(requireConfig);