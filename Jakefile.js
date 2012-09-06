var smoosh = require('smoosh');

// ## BUILD
// run `jake build`   
// will build the projects clientsources.
desc('Builds the scripts');
task('build', [], function(debug) {
    
    // a basic smoosh configuration object
    smoosh.config({
      "VERSION": "0.5.5",
      "JAVASCRIPT": {
        "DIST_DIR": "./",
        "backboneCQRS": [
          "src/backboneCQRS.js"
        ]
      }
    });

    // run smoosh to get minified version of the js file
    smoosh.build().analyze();
    
    console.log('+ written files successfully'.green);

});
