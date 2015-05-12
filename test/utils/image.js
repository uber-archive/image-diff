var path = require('path');
var getPixels = require('get-pixels');

exports.loadActual = function (filename) {
  before(function (done) {
    var that = this;
    getPixels(path.join(__dirname, '/../actual-files/' + filename), function (err, pixels) {
      that.actualPixels = pixels;
      done(err);
    });
  });
};

exports.loadExpected = function (filename) {
  before(function (done) {
    var that = this;
    getPixels(path.join(__dirname, '/../expected-files/' + filename), function (err, pixels) {
      that.expectedPixels = pixels;
      done(err);
    });
  });
};
