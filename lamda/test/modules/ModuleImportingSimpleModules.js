define([
    "./SimpleModule1",
    "./SimpleModule2"
], function(Dep1, Dep2) {
    return {
        name: "ModuleImportingSimpleModules",
        dependencies: arguments
    };
});