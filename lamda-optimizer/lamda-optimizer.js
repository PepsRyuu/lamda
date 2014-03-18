exports = module.exports = function(config, outputdir, callback) {

    var Path = require("path");
    var fs = require("fs");
    var UglifyJS = require("uglify-js");
    var lamda = require("lamda");
    var currentModule;

    GLOBAL.define = lamda.define;
    lamda.require.nodeRequire = require;
    GLOBAL.nodeRequire = require;

    function decreaseDependencyReferenceCounts(config, module, dependencies) {
        var context = lamda.require.s.contexts[currentModule.location];
        var definitions = context.definitions;
        if (dependencies) {
            for (var i = 0; i < dependencies.length; i++) {
                var fullDependencyName = lamda.resolvePath(module, dependencies[i], config);
                if (definitions[fullDependencyName]) {
                   definitions[fullDependencyName].referenceCount--;
                    decreaseDependencyReferenceCounts(config, fullDependencyName, definitions[fullDependencyName].dependencies);

                    if (definitions[fullDependencyName].referenceCount === 0) {
                        delete definitions[fullDependencyName];
                    }
                }
            }
        }
    }

    function excludeDefinitions(config, definitions) {
        for (var exportDef in definitions) {
            if (currentModule.exclude.indexOf(exportDef) > -1) {
                decreaseDependencyReferenceCounts(config, exportDef, definitions[exportDef].dependencies)
                delete definitions[exportDef];
            }
        }
        delete definitions["require"];
        delete definitions["exports"];
        delete definitions["module"];
    }

    function write(module, definitions) {
        var output = "";
        Object.keys(definitions).sort().reverse().forEach(function(defName){
            console.log("\t"+defName);
            var definition = definitions[defName];
            if (typeof definition === "string") {
                output += definition;
                return;
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

            if (definition.callback) {
                output += "," + definition.callback.toString();
            }
            output += ");\n\n";
        });

        if (module.name !== module.location)
            output += "define('"+module.name+"', ['"+module.location+"'], function(main) {return main;});";

        recursiveMkdir(outputdir + "/" + module.name.substring(0, module.name.lastIndexOf("/")));
        if (config.minify) {
            output = UglifyJS.minify(output, {fromString: true}).code;
        }

        if (config.header) {
            output = config.header + "\n" + output;
        }

        fs.writeFileSync(outputdir + "/" + module.name +".js", output);
    }

    function optimize(module) {
        module.location = module.location || module.name;
        module.exclude = module.exclude || [];

        currentModule = module;
        var localConfig = lamda.merge(config, {
            context: module.location,
            isBuild: true,
            inlineText: true
        });

        console.log("\n\t"+module.name+"\n\t----------------------");
        lamda.require(localConfig, [module.location])

        excludeDefinitions(localConfig, lamda.require.s.contexts[module.location].definitions);
        write(module, lamda.require.s.contexts[module.location].definitions);
        console.log("\n");
    }

    function recursiveMkdir(path, position) {
        var osSep = process.platform === 'win32' ? '\\' : '/';
        var parts = Path.normalize(path).split(osSep);
        position = position || 0;

        if (position >= parts.length) {
            return true;
        }

        var directory = parts.slice(0, position + 1).join(osSep) || osSep;
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
        recursiveMkdir(path, position + 1);
    }

    // Begin
    config.modules.forEach(optimize);
    callback();

}