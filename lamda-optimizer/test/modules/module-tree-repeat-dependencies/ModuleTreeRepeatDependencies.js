define([
    "./A",
    "./B"
], function(A, B) {
    
    return {
        name: "ModuleTreeRepeatDependencies",
        dependencies: arguments
    }

})