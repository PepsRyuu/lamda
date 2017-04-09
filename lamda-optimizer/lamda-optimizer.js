exports = module.exports = function(config, outputdir, callback) {

    var Path = require("path");
    var fs = require("fs");
    var UglifyJS = require("uglify-js");
    var lamda = require("lamda");
    var uneval = require("uneval");
    var currentModule;
    var currentConfig;

    lamda.setTransport(function(name, src, onload) {
        var script = require('fs').readFileSync(src, 'utf8');

        var matches = script.match(/\/\*\![\s\S]+?\*\//g); //license
        if (matches) {
            lamda.require.s.contexts[currentConfig.context].definitions[name].licenses = matches;
        }

        eval(script);
        onload();
    });

    // Some plugins use these nodeRequire imports during build.
    require.nodeRequire = require;
    global.define = lamda.define;
    lamda.require.nodeRequire = require;
    global.nodeRequire = require;

    function decreaseDependencyReferenceCounts(config, module, dependencies) {
        var context = lamda.require.s.contexts[currentModule.name];
        var definitions = context.definitions;
        if (dependencies) {
            for (var i = 0; i < dependencies.length; i++) {
                var fullDependencyName = lamda.resolvePath(config, module, dependencies[i]);

                var definition = definitions[fullDependencyName];
                if (definition) {
                    definition.referenceCount--;

                    if (definition.referenceCount <= 0) {
                        decreaseDependencyReferenceCounts(config, definition.name, definition.dependencies);
                        delete definitions[fullDependencyName];
                    }
                }
            }
        }
    }

    function excludeDefinitions(config, definitions) {
        for (var exportDef in definitions) {
            if (currentModule.exclude.indexOf(exportDef) > -1) {
                definitions[exportDef].referenceCount = 0;
                decreaseDependencyReferenceCounts(config, exportDef, definitions[exportDef].dependencies)
            }
        }

        // Must be done separately, so that references are substracted correctly
        for (var exportDef in definitions) {
            if (currentModule.exclude.indexOf(exportDef) > -1) {
                delete definitions[exportDef];
            }
        }

        // Remove the stubs from compilation
        delete definitions["require"];
        delete definitions["module"];
    }

    function write(module, definitions) {
        var output = "";
        var licenses = [];

        Object.keys(definitions).reverse().forEach(function(defName){
            console.log("\t"+defName);
            var definition = definitions[defName];

            if (definition.output) {
                output += definition.output;
            } else {
                if (typeof definition === "string") {
                    output += definition;
                    return;
                }

                if (definition.name === undefined) {
                    console.log("ERROR: " + defName + " is undefined.\n Confirm file is wrapped as an AMD module and that any defined name matches the file name.");
                    process.exit(1);
                }

                if (definition.licenses) {
                    licenses = licenses.concat(definition.licenses);
                }

                output += "define('"+definition.name+"',";
                if (definition.dependencies) {
                    var dependencies = definition.dependencies;
                    output += "[";
                    for (var i = 0; i < dependencies.length; i++) {
                        output += "'"+dependencies[i]+"'";
                        if (i !== dependencies.length - 1) {
                            output += ",";
                        }
                    }
                    output += "]";
                }

                if (definition.callback && typeof definition.callback === "function") {
                    output += "," + definition.callback.toString();
                } else if (definition.callback && typeof definition.callback === "object") {
                    output += "," + uneval(definition.callback, []);
                }
                output += ");\n\n";
            }
        });

        var outputFile = module.name;

        recursiveMkdir(outputdir + "/" + outputFile.substring(0, outputFile.lastIndexOf("/")));
        if (config.minify) {
            output = UglifyJS.minify(output, {fromString: true}).code;
        }

        if (licenses.length > 0) {
            output = licenses.join("\n") + "\n" + output;
        }

        if (config.header) {
            output = config.header + "\n" + output;
        }

        fs.writeFileSync(outputdir + "/" + outputFile +".js", output, "utf8");
    }

    function optimize(module) {
        module.location = module.location || module.name;
        module.exclude = module.exclude || [];

        lamda.require.reset();
        currentModule = module;
        currentConfig = lamda.merge(config, {
            context: module.name,
            isBuild: true,
            inlineText: true
        });

        lamda.createContext(currentConfig);

        // We iterate over all of the modules incase that any of the exported
        // modules are referring to an importing other exported modules.
        config.modules.forEach(function(mod) {
            if (mod.location && mod.name !== mod.location) {
                lamda.require.s.contexts[currentConfig.context].definitions[mod.name] = {
                    name: mod.name,
                    dependencies: [mod.location],
                    callback: function(main) {
                        return main;
                    }
                }

                // This will prevent the module being included in the final
                // compiled output, but we also don't want to accidentally
                // make a module exclude itself from its own output!
                if (mod.name !== module.name) {
                    module.exclude.push(mod.name);
                }
            }
        });

        console.log("\n\t"+module.name+"\n\t----------------------");
        lamda.require(currentConfig, [module.location])

        excludeDefinitions(currentConfig, lamda.require.s.contexts[module.name].definitions);

        write(module, lamda.require.s.contexts[module.name].definitions);
        console.log("\n");
    }

    function recursiveMkdir(path, position) {
        var delimiter = process.platform === 'win32' ? '\\' : '/';
        var parts = Path.normalize(path).split(delimiter);
        position = position || 0;

        if (position >= parts.length) {
            return true;
        }

        var directory = parts.slice(0, position + 1).join(delimiter) || delimiter;
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
        recursiveMkdir(path, position + 1);
    }

    config.modules.forEach(optimize);

    if (callback) {
        callback();
    }

}
