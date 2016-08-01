# image-diff changelog
1.6.3 - Fixed word splitting in `release.sh` via @andlrc in #47

1.6.2 - Updated Travis CI badge from PNG to SVG via @amilajack in #44

1.6.1 - Updated Node.js versions in Travis CI via @amilajack in #42

1.6.0 - Added `getFullResult` and `getRawResult` methods

1.5.1 - Upgraded to `gm@1.21.1` to resolve security advisory via @jacobp100 in #38

1.5.0 - Added `image-diff` executable

1.4.0 - Moved from `crop` to `extent`. Fixes #32 indirectly

1.3.0 - Fixed support for fractional differences via @jacobp100 in #29

1.2.0 - Added support for showing shadow image in diff image via @064678147 in #25

1.1.0 - Added support for no output image

1.0.3 - Repaired Travis CI tests by dropping `node@0.8` and adding `node@0.12`/`iojs`

1.0.2 - Added release script and documentation

1.0.1 - Added example image to README

1.0.0 - Moved to consistently use ImageMagick and fixed scaling regression (#11)

0.5.0 - Added assert that `compare's stderr` contains 'all'

0.4.0 - Added shell quoting and assertions to simplify debugging

0.3.0 - Moved from `temporary` to `tmp` to stop creation of excess tempfiles

0.2.0 - Fixed regression for passing through error on machines without graphicsmagick

0.1.2 - Removed listing of PhantomJS as a dependency

0.1.1 - Corrected Travis CI badge

0.1.0 - Initial release
