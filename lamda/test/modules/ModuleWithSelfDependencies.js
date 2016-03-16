define("self-dependencies/SubSelfDep", function() {
    return {
        name: "SubSelfDep"
    };
});

define("self-dependencies/SelfDep", ["./SubSelfDep"], function() {
    return {
        name: "SelfDep",
        dependencies: arguments
    };
});

define([
    "self-dependencies/SelfDep"
], function() {
    return {
        name: "ModuleWithSelfDependencies",
        dependencies: arguments
    }
})