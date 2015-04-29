var webserver = require('webserver');
var webPage = require('webpage');
var system = require('system');

var settings = {
  pageUrl: system.env.PAGE_URL || system.args[1],
  outputPath: '/var/phantomjs/output.jpeg',
  outputFormat: {
    format: 'jpeg',
    quality: '100'
  },
  port: 80,
  requestTimeout: 3000
};

var page = (function createPage() {
  var p = webPage.create();
  return p;
})();

var ResponseHelper = function(response) {
  var that = this;
  var timeoutId = setTimeout(function() {
    that.error('Request timed out', 408);
  }, settings.requestTimeout);

  this.error = function(message, status) {
    status = status || 500;
    message = message || "Unknonw error occured";
    console.error(message, status);
    this.write(message, status);
  };

  this.json = function(data, status) {
    this.write(JSON.stringify(data), status);
  };

  this.write = function(rawData, status) {
    clearTimeout(timeoutId);
    status = status || 200;
    response.write(rawData, status);
    response.statusCode = status;
    response.close();
  };
};

page.open(settings.pageUrl, function(status) {
  if (status !== 'success') {
    console.log('Failed to load the address', settings.pageUrl);
    phantom.exit(1);
  }

  var phantomRunnerDefinition = page.evaluate(function() {
    return getPhantomRunnerDefinition();
  });

  if(!phantomRunnerDefinition) {
    console.error("Unable to get runner definition from page.");
    phantom.exit(2);
  }

  console.log('Opened page', settings.pageUrl, JSON.stringify(phantomRunnerDefinition));

  var server = webserver.create();
  var service = server.listen(settings.port, function(request, response) {
    var responseHelper = new ResponseHelper(response);

    var returnValue = null;

    try {
      page.onCallback = function(data) {
        if(data.status === "success") {
          var base64 = null;

          if(data.base64) {
            base64 = data.base64;
          }

          responseHelper.write(base64);
        } else {
          responseHelper.error(data.message);
        }
      };

      returnValue = page.evaluate(function(request) {
        return execute(request);
      }, request);

      if(!!returnValue && !returnValue.async) {
        responseHelper.json(returnValue);
      }
    } catch(e) {
      responseHelper.error(e);
    }
  });
  console.log('PhantomJs server instance is running.');
});

page.onConsoleMessage = function(msg, lineNum, sourceId) {
  console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
};



