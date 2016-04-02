define([
    "./SimpleModule1",
    "./SimpleModule2"
], function() {
    return {
        name: "ModuleImportingSimpleModules",
        dependencies: arguments
    }
});