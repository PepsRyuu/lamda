/*!
 * Copyright (c) 2016 Paul Sweeney.
 * Licenced under MIT.
 *
 * http://github.com/PepsRyuu/lamda
 */
(function(requireConfig) {

    var definitionTempQueue = [];

    // Transport is separated into a separate function because it can be
    // overrided by the lamda-optimizer tool to use NodeJS functions instead.
    var Transport = function(name, src, onload, requester, errorback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", src, true);
        var onerror = function(e) {
            if (errorback) {
                errorback({
                    src: src,
                    requester: requester
                });
            } else {
                throw new Error('\n  Missing: ' + src + '\n  Requester: ' + requester);
            }
        };
        xhr.onerror = onerror;
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                eval(xhr.responseText);
                onload();
            } else {
                onerror();
            }
        };
        xhr.send();
    };

    function require(arg1, arg2, arg3, arg4) {
        var config, dependencies, callback, errorback;

        // First argument is an optional context object.
        // If it's not the first argument, then the second argument is dependencies.
        if (!Array.isArray(arg1)) {
            config = arg1, dependencies = arg2, callback = arg3, errorback = arg4;
        } else {
            dependencies = arg1, callback = arg2, errorback = arg3;
        }

        // If a config was passed in, fetch the config requested, else use global config.
        config = config ? require.config(config) : require.s.contexts['_'].config;

        // Handle all of the defines before this require call, and then load scripts
        completeScriptLoad(config, '', errorback, function() {
            loadDependencyScripts(config, '', dependencies, errorback, function() {
                loadDependencyInstances(config, '', dependencies, callback);
            });
        });
    }

    require.config = function(config) {
        if (config.packages) {
            config.packages.forEach(function(packageObj, index) {
                if (typeof packageObj === 'string') {
                    config.packages[index] = {
                        name: packageObj,
                        location: packageObj,
                        main: 'main'
                    }
                } else {
                    packageObj.location = packageObj.location || packageObj.name;
                    packageObj.main = packageObj.main || 'main';
                }
            });
        }

        var context = require.s.contexts[config.context || '_'] || createContext(config);
        context.config = merge(context.config, config);
        return context.config;
    }

    function createContext(config) {
        var context = {
            config: {
                baseUrl: './',
                context: config.context
            },
            instances: {},
            definitions: {},
            listeners: {}
        };

        require.s.contexts[config.context] = context;

        // Stub for require import, it's not used, just avoids having to put in checks for it
        updateContextDefinition(context.config, 'require', {
            name: 'require',
            callback: {}
        }, false);

        return context;
    }

    function updateContextDefinition(config, name, definition, isLoading) {
        var contextDefinitions = require.s.contexts[config.context].definitions;

        if (!contextDefinitions[name]) {
            contextDefinitions[name] = {
                referenceCount: 0,
                isLoading: isLoading !== undefined ? isLoading : true
            }
        }

        if (definition) {
            contextDefinitions[name] = merge(definition, contextDefinitions[name]);
        }
    }

    function merge(obj1, obj2) {
        var output = {};

        for (var attrname in obj1) {
            output[attrname] = obj1[attrname];
        }

        for (var attrname in obj2) {
            if (typeof obj2[attrname] === 'object' && !(obj2[attrname] instanceof Array)) {
                output[attrname] = merge(obj1[attrname], obj2[attrname]);
            } else {
                output[attrname] = obj2[attrname];
            }
        }

        return output;
    }

    function define(arg1, arg2, arg3) {
        var name = typeof arg1 === 'string' ? arg1 : undefined;
        var dependencies = arg1 instanceof Array ? arg1 : arg2 instanceof Array ? arg2 : [];
        var callbackTest = function(subject) {
            return !(subject instanceof Array) && (typeof subject === 'object' || typeof subject === 'function');
        }
        var callback = callbackTest(arg1) ? arg1 : callbackTest(arg2) ? arg2 : arg3;

        definitionTempQueue.push({
            name: name,
            dependencies: dependencies,
            callback: callback
        });
    }

    function translatePath(config, pathToTranslate) {

        function __tt(test, replacement) {
            var regex = new RegExp('^(' + test + ')(/.*|$|!)');
            var matches = pathToTranslate.match(regex);
            if (matches) {
                return pathToTranslate.replace(regex, replacement + '$2');
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

    function checkIfPackageAndGetMain(config, name) {
        var target = name;
        if (config.packages) {
            for (var i = 0; i < config.packages.length; i++) {
                var packageObj = config.packages[i];
                if (target === packageObj.name) {
                    return packageObj.name + '/' + packageObj.main;
                }
            }
        }
        return target;
    }

    function resolvePath(config, currentPath, targetPath) {
        currentPath = currentPath == "" ? "" : currentPath.substring(0, currentPath.lastIndexOf("/"));
        var resultPath;

        var prefixIndex = targetPath.indexOf("!");
        var prefix = "";
        if (prefixIndex > -1) {
            prefix = targetPath.substring(0, prefixIndex) + "!";
            targetPath = targetPath.substring(prefixIndex + 1, targetPath.length);
        }

        if (targetPath.indexOf("./") === 0 || targetPath.indexOf("../") === 0) {
            var currentPathParts = currentPath === "" ? [] : currentPath.split("/");
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
            // We have to check for main files here instead of in translation so that we can 
            // use this to record the module in memory locally. Otherwise a developer could
            // import "pkg" and "pkg/main" as two separate modules even though they're the same.
            resultPath = checkIfPackageAndGetMain(config, targetPath);
        }
        return prefix + resultPath;
    }

    function completeScriptLoad(config, name, errorback, callback, ignoreDependencies) {
        var definitionTemp, notCompleted = definitionTempQueue.length,
            queue = definitionTempQueue.slice();
        definitionTempQueue = [];

        if (notCompleted === 0) {
            return callback();
        }

        for (var i = 0; i < queue.length; i++) {
            definitionTemp = queue[i];
            // Some main modules could compile as "pkg" instead of "pkg/main". This ensures
            // that when we read a compiled module that it will be treated the same. If the module
            // has no name then we assign it the name that was passed into this function instead. This would
            // be assigned to the anonymous module in the queue, which there should only be one.
            definitionTemp.name = checkIfPackageAndGetMain(config, definitionTemp.name || name);
            updateContextDefinition(config, definitionTemp.name, definitionTemp);
        }

        while (definitionTemp = queue.pop()) {
            (function(localDef) {
                loadDependencyScripts(config, localDef.name, localDef.dependencies, errorback, function() {
                    require.s.contexts[config.context].definitions[localDef.name].isLoading = false;
                    triggerListeners(localDef.name, config);

                    if (--notCompleted === 0) {
                        callback();
                    }
                }, ignoreDependencies);
            })(definitionTemp)
        }
    }

    function callPlugin(config, currentPath, dependencyPath, errorback, callback) {
        // Get the full names
        var pathParts = dependencyPath.split('!');
        var name = resolvePath(config, currentPath, dependencyPath);
        var fileName = resolvePath(config, currentPath, pathParts[1]);
        var pluginName = resolvePath(config, currentPath, pathParts[0]);
        var definitions = require.s.contexts[config.context].definitions;
        var pluginObj = definitions[pluginName];

        var localRequireConfig = merge(config, {
            isPlugin: true
        });

        loadDependencyInstances(localRequireConfig, currentPath, pluginObj.dependencies, function() {
            var dependencyInstances = arguments;
            loadDependencyInstances(localRequireConfig, currentPath, ["require"], function(localRequire) {
                var pluginInstance = pluginObj.callback.apply(null, dependencyInstances);

                var onLoad = function(content) {
                    define(name, [], function() {
                        return content;
                    })
                    callback();
                }

                onLoad.error = function(err) {
                    if (errorback) {
                        errorback(err);
                    } else {
                        throw err;
                    }
                }

                var write = {
                    asModule: function(moduleName, moduleFilename, moduleContent) {
                        callback(moduleContent);
                    }
                };

                if (config.isBuild && pluginInstance.writeFile) {
                    pluginInstance.writeFile(pluginObj.name, fileName, localRequire, write, config);
                } else if (!config.isBuild) {
                    pluginInstance.load(fileName, localRequire, onLoad, config);
                }
            });
        })
    }

    var triggerListeners = function(name, config) {
        var listeners = require.s.contexts[config.context].listeners;
        if (listeners[name]) {
            listeners[name].forEach(function(listener) {
                listener();
            });
            delete listeners[name];
        }
    }

    function loadDependencyScripts(config, currentPath, dependencies, errorback, callback, ignoreDependencies) {
        var definitions = require.s.contexts[config.context].definitions;
        var listeners = require.s.contexts[config.context].listeners;

        var notCompleted = dependencies.length;
        if (notCompleted === 0 || ignoreDependencies) {
            return callback();
        }

        for (var i = 0; i < dependencies.length; i++) {
            (function(dependencyPath) {

                var prefixIndex = dependencyPath.indexOf('!');
                var pluginName = prefixIndex > -1 ? resolvePath(config, currentPath, dependencyPath.substring(0, prefixIndex)) : undefined;
                var fullName = resolvePath(config, currentPath, dependencyPath);

                var increaseReferenceCount = function(name) {
                    if (definitions[name]) {
                        if (definitions[name].dependencies) {
                            definitions[name].dependencies.forEach(function(dep) {
                                var depName = resolvePath(config, name, dep);
                                if (definitions[depName]) {
                                    definitions[resolvePath(config, name, dep)].referenceCount++;
                                }
                            });
                        }
                    }
                }

                var finish = function() {
                    increaseReferenceCount(fullName);
                    --notCompleted === 0 && callback();
                }

                var triggerPlugin = function() {
                    callPlugin(config, currentPath, dependencyPath, errorback, function(writeContent) {
                        if (config.isBuild && writeContent) {
                            updateContextDefinition(config, fullName, {
                                name: fullName,
                                referenceCount: 1,
                                output: writeContent.replace('define(', 'define(\'' + fullName + '\',')
                            }, false);
                            finish();
                        } else {
                            completeScriptLoad(config, fullName, errorback, function() {
                                finish();
                            }, true);
                        }
                    });
                }

                var addListener = function(name, fn) {
                    !listeners[name] && (listeners[name] = []);
                    listeners[name].push(fn);
                }

                var loadScript = function(name, fn) {
                    updateContextDefinition(config, name);
                    var src = ((name.indexOf('/') === 0 ? './' : config.baseUrl) + '/' + translatePath(config, name) + '.js').replace('//', '/');
                    Transport(name, src, function() {
                        completeScriptLoad(config, name, errorback, function() {
                            fn();
                        });
                    }, currentPath, errorback);
                }

                if (config.isBuild && translatePath(config, dependencyPath).indexOf('empty:') === 0) {
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

    function loadDependencyInstances(config, currentPath, dependencies, callback) {

        if (!config.isBuild || config.isPlugin) {
            var definitions = require.s.contexts[config.context].definitions;
            var instances = require.s.contexts[config.context].instances;
            var args = [];

            function executeDefinitionCallback(name, definition, theArguments) {
                if (typeof definition.callback === 'function') {
                    instances[name] = definition.callback.apply(null, theArguments);
                } else {
                    instances[name] = definition.callback;
                }
            }

            dependencies.forEach(function(dependencyPath) {
                var name = resolvePath(config, currentPath, dependencyPath);

                if (dependencyPath === "require") {
                    var localRequire = function(dependencies, callback) {
                        require({
                            context: config.context
                        }, dependencies, callback);
                    };

                    localRequire.config = function() {
                        return config;
                    };

                    localRequire.toUrl = function(targetPath) {
                        return (config.baseUrl + '/' + translatePath(config, resolvePath(config, currentPath, targetPath))).replace('//', '/');
                    };
                    args.push(localRequire)
                } else {
                    if (!instances[name]) {
                        var definition = definitions[name];

                        if (definition) {
                            if (definition.dependencies) {
                                loadDependencyInstances(config, name, definition.dependencies, function() {
                                    executeDefinitionCallback(name, definition, arguments);
                                });
                            } else {
                                executeDefinitionCallback(name, definition);
                            }
                        }
                    }

                    args.push(instances[name]);
                }
            });

            if (callback) {
                callback.apply(null, args);
            }
        }

    }

    require.reset = function() {
        require.s = {
            contexts: {}
        };
        createContext({
            context: "_"
        });
        require.config(requireConfig);
    }

    require.reset();
    define.amd = true;

    if (typeof process !== 'undefined' && process.versions && !!process.versions.node) {
        module.exports = {
            require: require,
            define: define,
            merge: merge,
            translatePath: translatePath,
            resolvePath: resolvePath,
            createContext: createContext,
            setTransport: function(fn) {
                Transport = fn;
            }
        };
    } else if (typeof module === 'undefined') {
        window.require = require;
        window.define = define;
    }

})(typeof require === 'object' ? require : {});