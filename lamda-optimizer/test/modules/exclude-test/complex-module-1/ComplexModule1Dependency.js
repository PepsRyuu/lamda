define([
    "exclude-test/complex-module-2/ComplexModule2"
], function(ComplexModule2) {
    
    return {
        name: "ComplexModule1Dependency",
        dependencies: arguments
    }

})