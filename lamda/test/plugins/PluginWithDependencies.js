define("SubDependency", function() {
    return {
        name: "SubDependency"
    }
})

define("Dependency", ["SubDependency"], function(SubDependency) {
    return {
        name: "Dependency",
        dependencies: arguments
    }
})

define("PluginWithDependencies", ["Dependency"], function(Dependency) {
    return {
        load: function(fileName, req, onload, config) {
            onload(Dependency.dependencies[0].name);
        }
    }
});