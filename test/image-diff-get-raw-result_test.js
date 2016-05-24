var assert = require('assert');
var imageDiff = require('../lib/image-diff.js');

function getRawResult(options) {
  before(function (done) {
    var that = this;
    imageDiff.getRawResult(options, function (err, rawResult) {
      that.err = err;
      that.rawResult = rawResult;
      done();
    });
  });
  after(function cleanup () {
    delete this.err;
    delete this.rawResult;
  });
}

describe('imageDiff.getRawResult', function () {
  describe('diffing different images', function () {
    getRawResult({
      actualImage: __dirname + '/test-files/checkerboard.png',
      expectedImage: __dirname + '/test-files/white.png',
      diffImage: __dirname + '/actual-files/different.png'
    });

    it('calls back with differences in the raw result', function () {
      assert(this.rawResult.indexOf('all: 46340.2 (0.707107)') !== -1);
    });
  });

  describe('diffing the same image', function () {
    getRawResult({
      actualImage: __dirname + '/test-files/checkerboard.png',
      expectedImage: __dirname + '/test-files/checkerboard.png',
      diffImage: __dirname + '/actual-files/same.png'
    });

    it('calls back with no differences in the raw result', function () {
      assert(this.rawResult.indexOf('all: 0 (0)') !== -1);
    });
  });
});
