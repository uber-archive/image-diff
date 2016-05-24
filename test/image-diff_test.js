var assert = require('assert');
var fs = require('fs');
var os = require('os');
var rimraf = require('rimraf');
var imageUtils = require('./utils/image.js');
var imageDiff = require('../lib/image-diff.js');

function runImageDiff(options) {
  before(function (done) {
    var that = this;
    imageDiff(options, function (err, imagesAreSame) {
      that.err = err;
      that.imagesAreSame = imagesAreSame;
      done();
    });
  });
  after(function cleanup () {
    delete this.err;
    delete this.imagesAreSame;
  });
}

// Clean up actual-files
rimraf.sync(__dirname + '/actual-files');

// Start of tests
// DEV: This is re-used at end to make sure we clean up tmp files
var tmpDir = os.tmpdir ? os.tmpdir() : '/tmp';
before(function () {
  this.expectedTmpFiles = fs.readdirSync(tmpDir);
});

describe('image-diff', function () {
  describe('diffing different images', function () {
    runImageDiff({
      actualImage: __dirname + '/test-files/checkerboard.png',
      expectedImage: __dirname + '/test-files/white.png',
      diffImage: __dirname + '/actual-files/different.png'
    });
    imageUtils.loadActual('different.png');
    imageUtils.loadExpected('different.png');

    it('asserts images are different', function () {
      assert.strictEqual(this.imagesAreSame, false);
    });

    it('writes a highlighted image diff to disk', function () {
      assert.deepEqual(this.actualPixels, this.expectedPixels);
    });
  });

  describe('diffing the same image', function () {
    runImageDiff({
      actualImage: __dirname + '/test-files/checkerboard.png',
      expectedImage: __dirname + '/test-files/checkerboard.png',
      diffImage: __dirname + '/actual-files/same.png'
    });
    imageUtils.loadActual('same.png');
    imageUtils.loadExpected('same.png');

    it('asserts images are the same', function () {
      assert.strictEqual(this.imagesAreSame, true);
    });

    it('writes a clean image diff to disk', function () {
      assert.deepEqual(this.actualPixels, this.expectedPixels);
    });
  });

  describe('diffing different sizes images', function () {
    runImageDiff({
      actualImage: __dirname + '/test-files/checkerboard-excess.png',
      expectedImage: __dirname + '/test-files/checkerboard.png',
      diffImage: __dirname + '/actual-files/different-size.png'
    });
    imageUtils.loadActual('different-size.png');
    imageUtils.loadExpected('different-size.png');

    it('asserts images are different', function () {
      assert.strictEqual(this.err, null);
      assert.strictEqual(this.imagesAreSame, false);
    });

    it('writes a highlighted image diff to disk', function () {
      assert.deepEqual(this.actualPixels, this.expectedPixels);
    });
  });

  describe('diffing different images without an output image', function () {
    runImageDiff({
      actualImage: __dirname + '/test-files/checkerboard.png',
      expectedImage: __dirname + '/test-files/white.png'
    });

    it('asserts images are different', function () {
      assert.strictEqual(this.err, null);
      assert.strictEqual(this.imagesAreSame, false);
    });
  });

  // DEV: This is a regression test for https://github.com/uber/image-diff/pull/10
  describe('diffing images which cannot scale into each other', function () {
    var diffImage = __dirname + '/actual-files/horizontal-vertical.png';
    runImageDiff({
      actualImage: __dirname + '/test-files/horizontal.png',
      expectedImage: __dirname + '/test-files/vertical.png',
      diffImage: diffImage
    });
    imageUtils.loadActual('horizontal-vertical.png');
    imageUtils.loadExpected('horizontal-vertical.png');

    it('asserts images are different', function () {
      assert.strictEqual(this.err, null);
      assert.strictEqual(this.imagesAreSame, false);
    });

    it('writes an image diff to disk', function () {
      var diffExists = fs.existsSync(diffImage);
      assert.strictEqual(diffExists, true);
      assert.deepEqual(this.actualPixels, this.expectedPixels);
    });
  });

  describe('diffing the same image where 1 has a transparent background', function () {
    runImageDiff({
      actualImage: __dirname + '/test-files/checkerboard-transparent.png',
      expectedImage: __dirname + '/test-files/checkerboard.png',
      diffImage: __dirname + '/actual-files/different-transparent.png'
    });

    it('asserts images are the different', function () {
      assert.strictEqual(this.imagesAreSame, false);
    });
  });

  describe('diffing images with shadow on', function() {
    runImageDiff({
      actualImage: __dirname + '/test-files/checkerboard-excess.png',
      expectedImage: __dirname + '/test-files/checkerboard.png',
      diffImage: __dirname + '/actual-files/different-size-shadow.png',
      shadow: true
    });
    imageUtils.loadActual('different-size-shadow.png');
    imageUtils.loadExpected('different-size-shadow.png');

    it('asserts images are different', function () {
      assert.strictEqual(this.err, null);
      assert.strictEqual(this.imagesAreSame, false);
    });

    it('writes a highlighted image diff to disk', function () {
      assert.deepEqual(this.actualPixels, this.expectedPixels);
    });
  });
});

describe('After running the tests', function () {
  it('cleans up the temporary directory', function () {
    var actualTmpFiles = fs.readdirSync(tmpDir);
    assert.deepEqual(actualTmpFiles, this.expectedTmpFiles);
  });
});
