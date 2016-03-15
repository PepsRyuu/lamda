define([
    "./A",
    "./B",
    "./C"
], function(A, B, C) {
    return {
        name: "ModuleTree",
        dependencies: arguments
    };

});