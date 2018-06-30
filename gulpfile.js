var gulp = require('gulp');
var NwBuilder = require('nw-builder');
var os = require('os');
var argv = require('yargs')
    .alias('p', 'platforms')
    .argv;
var del = require('del');
var detectCurrentPlatform = require('nw-builder/lib/detectCurrentPlatform.js');
var zip = require('gulp-zip');
var gzip = require('gulp-gzip');
var tar = require('gulp-tar');
var package = require('./package.json');

var nwVersion = '0.20.1';
var buildDownloadUrl = 'https://get.popcorntime.sh/repo/nw/';
var buildplatforms = argv.p ? argv.p.split(',') : [detectCurrentPlatform()];

//Platform specific overrides if needed

if (buildplatforms.indexOf("linuxarm") >=0 ) {
    nwVersion = '0.31.2';
}

if (buildplatforms.indexOf("linuxarm") >= 0) {
    buildDownloadUrl = 'https://dl.nwjs.io/';
}

var nw = new NwBuilder({
    files: ['./src/**', './node_modules/**', './package.json', './install', 'LICENSE.txt', 'CHANGELOG.md', 'README.md'],
    version: nwVersion,
    zip: false,
    downloadUrl: buildDownloadUrl,
    platforms: buildplatforms,
}).on('log', console.log);

gulp.task('run', function() {
    nw.options.files = './**';
    return nw.run().catch(function(error) {
        console.error(error);
    });
});

gulp.task('build', ['clean'], function() {
    return nw.build().catch(function(error) {
        console.error(error);
    });
});

gulp.task('clean', function() {
    return del('build/');
});

gulp.task('zip', function() {

    gulp.src('./build/Popcorn-Time-CE/osx64/**/*')
        .pipe(tar('popcorn-time-ce_osx64_' + package.version + '.tar'))
        .pipe(gzip())
        .pipe(gulp.dest('./dist'));
    gulp.src('./build/Popcorn-Time-CE/win32/**')
        .pipe(zip('popcorn-time-ce_win32_' + package.version + '.zip'))
        .pipe(gulp.dest('./dist'));
    gulp.src('./build/Popcorn-Time-CE/win64/**')
        .pipe(zip('popcorn-time-ce_win64_' + package.version + '.zip'))
        .pipe(gulp.dest('./dist'));
    gulp.src('./build/Popcorn-Time-CE/linux32/**')
        .pipe(tar('popcorn-time-ce_linux32_' + package.version + '.tar'))
        .pipe(gzip())
        .pipe(gulp.dest('./dist'));
    return gulp.src('./build/Popcorn-Time-CE/linux64/**')
        .pipe(tar('popcorn-time-ce_linux64_' + package.version + '.tar'))
        .pipe(gzip())
        .pipe(gulp.dest('./dist'));
});

gulp.task('default', function() {
    // place code for your default task here
});