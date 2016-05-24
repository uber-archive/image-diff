var assert = require('assert');
var ImageDiff = require('../lib/image-diff.js').ImageDiff;

describe('An image-diff output with no difference', function () {
  describe('when extracted via `extractDifference`', function () {
    it('extracts no difference', function () {
      var difference = ImageDiff.extractDifference('all: 0 (0)');
      assert.strictEqual(difference.total, 0);
      assert.strictEqual(difference.percentage, 0);
    });
  });
});

describe('An image-diff output with a significant difference', function () {
  describe('when extracted via `extractDifference`', function () {
    it('extracts the significant difference', function () {
      var difference = ImageDiff.extractDifference('all: 40131.8 (0.612372)');
      assert.strictEqual(difference.total, 40131.8);
      assert.strictEqual(difference.percentage, 0.612372);
    });
  });
});

describe('An image-diff output with a fractional difference', function () {
  describe('when extracted via `extractDifference`', function () {
    it('extracts the fractional difference', function () {
      var difference = ImageDiff.extractDifference('all: 0.460961 (7.03381e-06)');
      assert.strictEqual(difference.total, 0.460961);
      assert.strictEqual(difference.percentage, 7.03381e-06);
    });
  });
});

// DEV: This is an edge case we haven't encountered but want to be extra safe
describe('An image-diff output with a super fractional difference', function () {
  describe('when extracted via `extractDifference`', function () {
    it('extracts the fractional difference', function () {
      var difference = ImageDiff.extractDifference('all: 7.03381e-06 (7.03381e-06)');
      assert.strictEqual(difference.total, 7.03381e-06);
      assert.strictEqual(difference.percentage, 7.03381e-06);
    });
  });
});
