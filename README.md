# lamda.js [![Build Status](https://travis-ci.org/Dremora/lamda.svg?branch=master)](https://travis-ci.org/Dremora/lamda)

Light Asynchronous Module Definition Alternative

## Why lamda.js?

* Very light alternative to [require.js](http://requirejs.org/).
* Designed to work with modern browsers, less complicated source.
* More meaningful error messages (for example, which file requested a file that is missing).
* Plans for useful helper functions (such as getting context configuration), as well as a pipeline mechanism where you can validate imported JavaScript files (useful for when working with multiple teams).
* Currently 4KB when compressed versus require.js 19KB

## Browser Support

Tested with the below browsers (anything that fires script onload event immediately after script execution):

* Internet Explorer 10+
* Firefox 17+
* Chrome 32+

## What's supported?

* Context for require calls
* Plugins (Plugin API not fully implemented)
* Path configuration
* Packages

## What will not be supported?

* Common JS
* Shims

# lamda-optimizer.js

Optimiser for NodeJS. No binary, just an API.

## How to use lamda-optimizer.js?

require("lamda-optimizer")(requireConfig, outputdir, callback);

## Additional require configurations for lamda-optimizer.js

* modules (Array<Object>), modules to be exported. Specify "name" (String), "location" (String), and "exclude" (Array<String>). Excludes work off a reference count mechanism. The dependencies of an exclude are only excluded if there is nothing else referencing those dependencies.
* header (String), string to appear on top of every exported module. Useful for licenses.
