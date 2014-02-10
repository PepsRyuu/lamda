(function(requireGlobalConfig) {

	var globalConfig = {};
	if (requireGlobalConfig) {
		globalConfig = requireGlobalConfig;
	}
	
	var definitionTempQueue = []; // It's a queue because there could be multiple defines in one file
	var moduleDefinitions = {};

	
	/**
	 * Attaches a script tag.
	 *
	 * @method importScript
	 * @param {String} source
	 * @param {String} requester
	 * @param {Object] config
	 * @param {Function} onLoadCallback
	 */
	var importScript = (function (oHead) {
		return function (sSrc, requester, config, fOnload) {
			var oScript = document.createElement("script");
			oScript.type = "text\/javascript";
			oScript.src = (config.baseUrl + "/" + sSrc + ".js").replace("//", "/");
			oScript.onerror = function(e) {
				throw new Error("\n  Missing: " + e.target.src + "\n  Requester: " + requester);
			}
			oScript.onload = fOnload;
			oScript.setAttribute("async", "");
			oHead.appendChild(oScript);  
			return oScript;
		}
	})(document.getElementsByTagName("head")[0]);
	
	/**
	 * Figures out default require configuration and loads dependencies.
	 *
	 * @method require
	 */
	var require = function(args1, args2, args3) {
		var config, dependencies, callback;
	
		if (!(args1 instanceof Array)) {
			config = args1, dependencies = args2, callback = args3;
		} else {
			dependencies = args1, callback = args2;
		}
		
		config = config || globalConfig;
		config.context = config.context || "_";
		config.baseUrl = config.baseUrl || "./";
		
		require.s.contexts[config.context] = {};
		require.s.contexts[config.context].config = config;
		require.s.contexts[config.context].modules = {};
		completeScriptLoad("", "", config, function() {
			loadDependencyScripts("", config, dependencies, function() {
				loadDependencyInstances("", config, dependencies, callback);
			});
		
		});
	}
	
	require.s = {};
	require.s.contexts = {};
	
	require.config = function(config) {
		globalConfig = merge(globalConfig, config);
	}
	
	/**
	 * Merges two configurations together.
	 *
	 * @method merge
	 * @param {Object} obj1
	 * @param {Object} obj2
	 * @return {Object} mergedObject
	 */
	function merge(obj1,obj2){
		var obj3 = {};
		for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
		for (var attrname in obj2) { 
			if (typeof obj2[attrname] === "object") {
				obj3[attrname] = merge(obj1[attrname], obj2[attrname]);
			} else {
				obj3[attrname] = obj2[attrname]; 
			}
		}
		return obj3;
	}
	
	/**
	 * Define a module and puts module info into a queue
	 *
	 * @method define
	 */
	var define = function(args1, args2, args3) {
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
	}

	/**
	 * Iterates over the definition queue. Stores the definition with the origin + module name as a key.
	 * If there's dependencies, those scripts are fetched. The callback is triggered once that's complete.
	 *
	 * @method completeScriptLoad
	 * @param {String} moduleName
	 * @param {String} originUrl
	 * @param {Object} config
	 * @param {Function} callback
	 */
	var completeScriptLoad = function(moduleName, originUrl, config, callback) {
		var definitionTemp;
		var notCompleted = definitionTempQueue.length;
		for (var i = 0; i < definitionTempQueue.length; i++) {
			definitionTemp = definitionTempQueue[i];
			var name = definitionTemp.name || moduleName;
			moduleDefinitions[name] = definitionTemp;
			moduleDefinitions[resolvePath(originUrl, name, config)] = definitionTemp;
			
			loadDependencyScripts(name, config, definitionTemp.dependencies, function() {
				if (--notCompleted === 0) {
					callback();
				}
			});
		}
		
		definitionTempQueue = [];
	}
	
	/**
	 * Executes the plugin. Mimics require.js plugin structure.
	 *
	 * @method callPlugin
	 * @param {String} currentPath
	 * @param {String} dependencyPath
	 * @param {Object} config
	 * @param {Function} callback
	 */
	var callPlugin = function(currentPath, dependencyPath, config, callback) {
		var pathParts = dependencyPath.split("!");
		var pluginUrl = resolvePath(currentPath, pathParts[0], config);
		var pluginObj = moduleDefinitions[pathParts[0]]? moduleDefinitions[pathParts[0]] : moduleDefinitions[pluginUrl];
		var pluginInstance = pluginObj.callback.call(config);
		var localRequire = {toUrl:function(path){return config.baseUrl + "/" + resolvePath(currentPath, path, config);}};
		
		var onLoad = function(content) {
			moduleDefinitions[resolvePath(currentPath, dependencyPath, config)] = {callback: function() {
				return content;
			}}
			callback();
		}
		
		onLoad.fromText = function(content) {
			moduleDefinitions[resolvePath(currentPath, dependencyPath, config)] = {callback: function() {
				return eval(content);
			}}
			callback();
		}
		
		onLoad.error = function(err) {
			throw err;
		}
		
		pluginInstance.load(pathParts[1], localRequire, onLoad, config); 
	}
	
	/**
	 * Iterates over dependencies. If it's a plugin, it's parsed and called. If the script is not loaded, it will import the script. If a another file is looking for a script that's already loading, the request is ignored.
	 *
	 * @method loadDependencyScripts
	 * @param {String} currentPath
	 * @param {Object} config
	 * @param {Array<String>} dependencies
	 * @param {Function} callback
	 */
	var loadDependencyScripts = function(currentPath, config, dependencies, callback) {
		var notCompleted = dependencies.length;
		if (notCompleted === 0) {
			callback();
		}
		
		for (var i = 0; i < dependencies.length; i++) {
			(function(dependencyPath) {
				var prefixIndex = dependencyPath.indexOf("!");
				var url;
				if (prefixIndex > -1) {
					url = resolvePath(currentPath, dependencyPath.substring(0, prefixIndex), config);
				} else {
					url = resolvePath(currentPath, dependencyPath, config);
				}
				
				var finish = function() {
					if (prefixIndex > -1 && !moduleDefinitions[resolvePath(currentPath, dependencyPath, config)]) {
						callPlugin(currentPath, dependencyPath, config, function() {
							if (--notCompleted === 0) {
								callback();
							}
						});
					} else if (--notCompleted === 0) {
						callback();
					}
				}
				
				if (!moduleDefinitions[dependencyPath] && !moduleDefinitions[url]) {
					moduleDefinitions[url] = "Pending";
					importScript(url, currentPath, config, function() {
						completeScriptLoad(url, translatePath(currentPath, config), config, function() {
							finish();
						});
					});
				} else {
					finish();
				}
			})(dependencies[i]);
		}
	
	}
	
	/**
	 * Iterates over the list of passed dependencies, and instantiates a copy of the dependency for the context if one hasn't been already. Once the dependency tree has been iterated through, the callback is executed passing those instances.
	 *
	 * @method loadDependencyInstances
	 * @param {String} currentPath
	 * @param {Object} config
	 * @param {Array<String>} dependencies
	 * @param {Function} callback
	 */
	var loadDependencyInstances = function(currentPath, config, dependencies, callback) {
		var contextModules = require.s.contexts[config.context].modules;
		var args = [];
		
		function executeDependencyCallback(name, definition, theArguments) {
			if (typeof definition.callback === "function") {
				contextModules[name] = definition.callback.apply(config, theArguments );
			} else {
				contextModules[name] = definition.callback;
			}
		}
		
		dependencies.forEach(function(dependencyPath) {
			var name = resolvePath(currentPath, dependencyPath, config);	
			
			if (!contextModules[name]) {
				var definition = moduleDefinitions[name];
				if (definition.dependencies) {
					loadDependencyInstances(name, config, definition.dependencies, function() {
						executeDependencyCallback(name, definition, arguments);
					});
				} else {
					executeDependencyCallback(name, definition);
				}	
			}

			args.push(contextModules[name]);
			
		});
		
		if (callback) {
			callback.apply(config, args);
		}
	}
	
	/**
	 * Takes a path, and compares it against paths defined in require configuration.
	 * A translation is done if the path starts with any of the keys in the paths config. 
	 *
	 * @method translatePath
	 * @param {String} pathToTranslate
	 * @param {Object} config
	 * @return {String} realPath
	 */
	var translatePath = function (pathToTranslate, config) {
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
		return pathToTranslate;
	}
	
	/**
	 * Takes the current module path, and the target path (dependency) and resolves it relatively.
	 * If the target path does not start with ../ or ./, it's assumed to be relative to root.
	 * A translation using the paths require configuration is also done, so a real url is returned.
	 *
	 * @method resolvePath
	 * @param {String} currentPath
	 * @param {String} targetPath
	 * @param {Object} config
	 * @return {String} realPath
	 */
	var resolvePath = function(currentPath, targetPath, config) {
		currentPath = currentPath == ""? "" : currentPath.substring(0, currentPath.lastIndexOf("/"));
		var resultPath;
		
		var prefixIndex = targetPath.indexOf("!");
		var prefix = "";
		if (prefixIndex > -1) {
			prefix = targetPath.substring(0, prefixIndex) + "!";
			targetPath = targetPath.substring(prefixIndex + 1, targetPath.length);
		}

		if (targetPath.indexOf("./") === 0 || targetPath.indexOf("../") === 0) {
			var currentPathParts = currentPath.split("/");
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
		
		resultPath = (translatePath(resultPath, config)).replace("//", "/");
		
		return prefix + resultPath;
	}

	// Expose global variables
	window.require = require;
	window.define = define;
	define.amd = true;

})(require);