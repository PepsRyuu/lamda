# lamda.js

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
* Plugins (Plugin API not fully implemented, just onLoad and toUrl())
* Path configuration

## What will not be supported?

* Common JS packages
* Modules
* Shims