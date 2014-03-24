// Create the requireConfig variable if it doesn't already exist
if (typeof process !== 'undefined' || typeof require === 'undefined') {
    var requireConfig = {};
} else if (typeof require !== 'undefined') {
    var requireConfig = require;
}

(function(customGlobalConfig) {

    var definitionTempQueue = [];

    /**
     *  Class that's returned when this file is imported
     */
    var core = {

        /**
         *  Apply configurations, create context, and start loading the dependencies
         */
        require: function(args1, args2, args3) {

            // Figure out what the arguments are
            var config, dependencies, callback;
            if (!(args1 instanceof Array)) {
                config = args1, dependencies = args2, callback = args3;
            } else {
                dependencies = args1, callback = args2;
            }

            // Set up defaults
            config = core.merge(globalConfig, config || {});
            core.require.s = core.require.s || {contexts: {}};

            // If the context doesn't already exist, create it
            if (!core.require.s.contexts[config.context]) {
                core.require.s.contexts[config.context] = {
                    config: config,
                    instances: {},
                    definitions: {},
                    definitionListeners: {}
                };

                // Some default definitions that are required to exist by plugins
                updateContextDefinition(config, "require", {name: "require", callback: {}});
                updateContextDefinition(config, "exports", {name: "exports", callback: {}});
                updateContextDefinition(config, "module", {name: "module", callback: {config: function() {return config;}}});
            }

            // Parse packages
            if (config.packages) {
                for (var i = 0; i < config.packages.length; i++) {
                    var packageObj = config.packages[i];
                    if (typeof packageObj === 'string') {
                        config.packages[i] = {name: packageObj, location: packageObj, main: "main"}
                    } else {
                        if (packageObj.location === undefined) {
                            packageObj.location = packageObj.name;
                        }
                        if (packageObj.main === undefined) {
                            packageObj.main = "main";
                        }
                    }
                }
            }

            // Handle all of the defines before this require call, and then load scripts
            completeScriptLoad(config, "", function() {
                loadDependencyScripts(config, "", dependencies, function() {
                    loadDependencyInstances(config, "",dependencies, callback);
                });
            });
        },

        /**
         *  Merge the global configuration with the passed configuration
         */
        config: function(configuration) {
            globalConfig = core.merge(globalConfig, configuration || {});
            return globalConfig;
        },

        /**
         *  Merges the two objects together to create a new third object
         */
        merge: function(obj1,obj2){
            var obj3 = {};
            for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
            for (var attrname in obj2) {
                if (typeof obj2[attrname] === "object" && !(obj2[attrname] instanceof Array)) {
                    obj3[attrname] = core.merge(obj1[attrname], obj2[attrname]);
                } else {
                    obj3[attrname] = obj2[attrname];
                }
            }
            return obj3;
        },

        /**
         *  Figures out the arguments, and adds to the definition queue
         */
        define: function(args1, args2, args3) {
            var name = typeof args1 === "string"? args1 : undefined;
            var dependencies = args1 instanceof Array? args1 : args2 instanceof Array? args2 : [];
            var callbackTest = function(subject) {
                return !(subject instanceof Array) && (typeof subject === "object" || typeof subject === "function");
            }
            var callback = callbackTest(args1)? args1 : callbackTest(args2)? args2 : args3;

            definitionTempQueue.push({
                name: name,
                dependencies: dependencies,
                callback: callback
            });
        },

        /**
         * Takes a path, and compares it against paths defined in require configuration.
         * A translation is done if the path starts with any of the keys in the paths config.
         */
        translatePath: function (pathToTranslate, config) {
            if (config.paths !== undefined) {
                for (var path in config.paths) {
                    var regex1 = new RegExp("^"+path+"/");
                    var regex2 = new RegExp("^"+path+"$");
                    if (regex1.test(pathToTranslate) || regex2.test(pathToTranslate)) {
                        return  pathToTranslate
                                    .replace(regex1, config.paths[path] + "/")
                                    .replace(regex2, config.paths[path]);
                    }
                }
            }
            if (config.packages !== undefined) {
                for (var i = 0; i < config.packages.length; i++) {
                    var packageObj = config.packages[i];
                    var regex1 = new RegExp("^"+packageObj.name+"/");
                    if (regex1.test(pathToTranslate)) {
                        return pathToTranslate.replace(regex1, packageObj.location + "/");
                    }
                    var regex2 = new RegExp("^"+packageObj.name+"$");
                    if (regex2.test(pathToTranslate)) {
                        return pathToTranslate.replace(regex2, packageObj.location + "/" + packageObj.main);
                    }
                }
            }

            return pathToTranslate;
        },

        /**
         * Takes the current module path, and the target path (dependency) and resolves it relatively.
         * If the target path does not start with ../ or ./, it's assumed to be relative to root.
         * A translation using the paths require configuration is also done, so a real url is returned.
         */
        resolvePath: function(currentPath, targetPath, config) {
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
                resultPath = targetPath;
            }

            return prefix + resultPath.replace("//", "/");
        }
    }

    /**
     * Loads the scripts and executes it. Once loaded, the onload callback is executed.
     */
    function importScript(config, name, requester, onload) {
        if (typeof process !== "undefined") {
            require.nodeRequire = require;
            var fs = require("fs");
            var translatedPath = core.translatePath(name, config);
            var script = fs.readFileSync((config.baseUrl + "/" + translatedPath + ".js").replace("//", "/")).toString();
            eval(script);
            onload();
        } else {
            var tag = document.createElement("script");
            tag.type = "text\/javascript";
            tag.setAttribute("async", "");
            tag.setAttribute("data-context", config.context);
            tag.setAttribute("data-modulename", name);
            tag.src = (config.baseUrl + "/" + core.translatePath(name, config) + ".js").replace("//", "/");
            tag.onerror = function(e) {
                throw new Error("\n  Missing: " + e.target.src + "\n  Requester: " + requester);
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
        var contextDefinitions = core.require.s.contexts[config.context].definitions;

        if (!contextDefinitions[name]) {
            contextDefinitions[name] = {
                referenceCount: 1,
                isLoading: true
            }
        }

        if (definition) {
            contextDefinitions[name] = core.merge(definition, contextDefinitions[name]);
            delete contextDefinitions[name].isLoading;
        }
    }

    /**
     * Executed after a script has loaded. Iterates over the dependency queue and loads their dependencies.
     */
    function completeScriptLoad(config, name, callback) {

        var definitionTemp, notCompleted = definitionTempQueue.length;
        if (notCompleted === 0) {
            callback();
        }

        // Update all of the context definitions first
        for (var i = 0; i < definitionTempQueue.length; i++) {
            definitionTemp = definitionTempQueue[i];
            definitionTemp.name = definitionTemp.name || name;
            updateContextDefinition(config, definitionTemp.name, definitionTemp);
        }

        // Once everything has been defined, then parse the dependencies
        while (definitionTemp = definitionTempQueue.pop()) {
            loadDependencyScripts(config, name, definitionTemp.dependencies, function() {
                if (--notCompleted === 0) {
                    callback();
                }
            });
        }
    }

    /**
     * Executes the plugin. Mimics require.js plugin structure.
     */
    function callPlugin(config, currentPath, dependencyPath, callback) {
        // Get the full names
        var contextDefinitions = core.require.s.contexts[config.context].definitions;
        var pathParts = dependencyPath.split("!");
        var name = core.resolvePath(currentPath, dependencyPath, config);
        var fileName = core.resolvePath(currentPath, pathParts[1], config);
        var pluginName = core.resolvePath(currentPath, pathParts[0], config);
        var pluginObj = contextDefinitions[pluginName];

        // Iterate over the dependencies for the plugin and instantiate them
        var args = [];
        pluginObj.dependencies.forEach(function(dependency) {
            var dependencyObj = contextDefinitions[dependency];
            if (typeof dependencyObj.callback === "function") {
                args.push(dependencyObj.callback());
            } else if (dependencyObj.callback) {
                args.push(dependencyObj.callback)
            } else {
                args.push(dependencyObj);
            }
        })

        // Set up the context definition for this import
        updateContextDefinition(config, name);

        // Prepare the plugin API
        var pluginInstance = pluginObj.callback.apply(config, args);
        var localRequire = {toUrl:function(path){return (config.baseUrl + "/" + core.resolvePath(currentPath, path, config)).replace("//", "/");}};

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
            throw err;
        }

        var write = function(content) {}

        write.asModule = function(moduleName, moduleFilename, moduleContent) {
            eval(moduleContent);
            completeScriptLoad(config, core.resolvePath(currentPath, moduleName), function() {
                callback();
            });
        }

        // Call the plugin with the API
        if (config.isBuild) {
            pluginInstance.writeFile(pluginObj.name, fileName, localRequire, write, config);
        } else {
            pluginInstance.load(fileName, localRequire, onLoad, config);
        }
    }

    /**
     * Iterates over the passed dependencies, and will load their scripts.
     */
    function loadDependencyScripts(config, currentPath, dependencies, callback) {
        var definitions = core.require.s.contexts[config.context].definitions;
        var definitionListeners = core.require.s.contexts[config.context].definitionListeners;

        var notCompleted = dependencies.length;
        if (notCompleted === 0) {
            callback();
        }

        for (var i = 0; i < dependencies.length; i++) {
            (function(dependencyPath) {
                var pluginName;
                var name = core.resolvePath(currentPath, dependencyPath, config);
                var prefixIndex = dependencyPath.indexOf("!");

                // If plugin has been detected, translate it's name
                if (prefixIndex > -1) {
                    pluginName = core.resolvePath(currentPath, dependencyPath.substring(0, prefixIndex), config);
                }

                // Called whenever a script has finished loading
                var finish =  function() {
                    if (prefixIndex > -1 && !definitions[name]) {
                        callPlugin(config, currentPath, dependencyPath, function() {
                            if (--notCompleted === 0) {
                                callback();
                            }
                        });
                    } else if (--notCompleted === 0) {
                        callback();
                    }
                }

                // Increases the reference count and adds finish as a listener
                var incrementReference = function(name) {
                    definitions[name].referenceCount++;
                    if (!definitionListeners[name]) {
                        definitionListeners[name] = [];
                    }
                    definitionListeners[name].push(finish);
                }

                // Imports the scripts and calls all of the listeners
                var loadScript = function(name) {
                    updateContextDefinition(config, name);
                    importScript(config, name, currentPath, function() {
                        completeScriptLoad(config, name, function() {
                            finish();
                            if (definitionListeners[name]) {
                                definitionListeners[name].forEach(function(listener) {
                                    listener();
                                });
                                delete definitionListeners[name];
                            }
                        });
                    });
                }

                // If something translates to empty:, it should be skipped completely
                var ignore = false;
                if (config.isBuild && core.translatePath(dependencyPath, config).indexOf("empty:") === 0) {
                    ignore = true;
                }

                // Go through the different possible scenarios with resolving the dependency
                if (pluginName && definitions[pluginName] && definitions[pluginName].isLoading) {
                    incrementReference(pluginName);
                } else if (pluginName && !definitions[name] && !definitions[pluginName]) {
                    loadScript(pluginName);
                } else if (pluginName && !definitions[name]) {
                    finish();
                } else if (definitions[name] && definitions[name].isLoading && !ignore) {
                    incrementReference(name);
                } else {
                    if (!definitions[name] && !ignore) {
                        loadScript(name);
                    } else {
                        finish();
                    }
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
            var definitions = core.require.s.contexts[config.context].definitions;
            var instances = core.require.s.contexts[config.context].instances;
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
                var name = core.resolvePath(currentPath, dependencyPath, config);

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

    // Set up the require API
    if (!core.require.s) {
        core.require.config = core.config;
        core.require.s = {
            contexts: {}
        }
        core.define.amd = true;
    }

    // Default configurations
    var globalConfig = core.merge({
        baseUrl: "./",
        context: "_"
    }, customGlobalConfig || {});

    // Node JS and Browser support
    if (typeof process !== "undefined" && process.versions && !!process.versions.node) {
        module.exports = core;
    } else if (typeof module === 'undefined') {
        window.require = core.require;
        window.define = core.define;
    }

})(requireConfig);