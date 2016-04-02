define([
    "./ComplexModule1Dependency",
    "../common-dependency/CommonDependency"
], function() {
    
    return {
        name: "ComplexModule1",
        dependencies: arguments
    }

})