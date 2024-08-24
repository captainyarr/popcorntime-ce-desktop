var gulp = require('gulp');
var NwBuilder = require('nw-builder');
var os = require('os');
var del = require('del');
var zip = require('gulp-zip');
var unzip = require('gulp-unzip');
var gzip = require('gulp-gzip');
var tar = require('gulp-tar');
var download = require('gulp-download');
var package = require('./package.json');
var merge2 = require('merge2');

//Write function to detect current platform
function detectCurrentPlatform() {
    if (os.platform() === 'win32') {
        return 'win32';
    } else if (os.platform() === 'linux') {
        return 'linux64';
    } else if (os.platform() === 'darwin') {
        return 'mac64';
    }
}

//Commandline 
var argv = require('yargs')
    .alias('p', 'platforms')
    .options({
        'nwversion': {
            alias: 'nwv',
            describe: 'Set nw.js version'
        },
        'nwdownloadurl': {
            alias: 'nwurl',
            describe: 'Provide an alt download URL'
        }
    })
    .help()
    .argv;

//Set Default nw.js version
var nwVersion = '0.44.1';
var buildDownloadUrl = "https://dl.nwjs.io";

nwVersion = argv.nwv ? argv.nwv : nwVersion;
buildDownloadUrl = argv.nwurl ? argv.nwurl : buildDownloadUrl;

var buildplatforms = argv.p ? argv.p.split(',') : [detectCurrentPlatform()];

//Example URL FFMPEG Location:
//https://github.com/iteufel/nwjs-ffmpeg-prebuilt/releases/download/0.31.4/0.31.4-osx-x64.zip
var ffmpegDownloadurl = 'https://github.com/iteufel/nwjs-ffmpeg-prebuilt/releases/download/' + nwVersion;

//Platform specific overrides if needed

if (buildplatforms.indexOf("linuxarm") >= 0) {
    nwVersion = '0.31.2';
}

if (buildplatforms.indexOf("linuxarm") >= 0) {
    buildDownloadUrl = 'https://github.com/LeonardLaszlo/nw.js-armv7-binaries/releases/download/v0.27.6/nwjs-sdk-v0.27.6-linux-arm-chrome-branding.tar.gz';
}

var nw = new NwBuilder({
    files: ['./src/**', './node_modules/**', './package.json', './install', 'LICENSE.txt', 'CHANGELOG.md', 'README.md'],
    version: nwVersion,
    zip: false,
    downloadUrl: buildDownloadUrl,
    platforms: buildplatforms,
})


gulp.task('run', function run() {
    nw.options.files = './**';
    return nw.run().catch(function (error) {
        console.error(error);
    });
});

var buildTask = function () {
    return nw.build().catch(function (error) {
        console.error(error);
    });
};

var cleanTask = function () {
    var item = 0;

    buildplatforms.forEach(item => {
        del('build/Popcorn-Time-CE/'+item+'/');
    });
    return del('build/Popcorn-Time-CE/'+item+'/');
}

var ffmpegcacheTask = function () {
    var cacheDir = './cache/' + nwVersion + '-sdk';
    var downloadArray = merge2();
    var item = 0;

    buildplatforms.forEach(item => {
        switch (item) {
            case "linux64":
                //Copy updated FFMPEG into the cache directory before building
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-linux-x64.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest(cacheDir + '/' + item + "/lib")));
                break;
            case "linux32":
                //Copy updated FFMPEG into the cache directory before building
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-linux-ia32.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest(cacheDir + '/' + item + "/lib")));
                break;
            case "win32":
                //Copy updated FFMPEG into the cache directory before building
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-win-ia32.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest(cacheDir + '/' + item)));
                break;
            case "win64":
                //Copy updated FFMPEG into the cache directory before building
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-win-x64.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest(cacheDir + '/' + item)));
                break;
            case "osx64":
                var fs = require("fs");
                var osxCachedir = './cache/' + nwVersion + '-sdk/osx64/nwjs.app/Contents/Versions/';
                var files = fs.readdirSync(osxCachedir);
                if (files.length > 0) {
                    osxCachedir = './cache/' + nwVersion + '-sdk/osx64/nwjs.app/Contents/Versions/' + files[0];
                }
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-osx-x64.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest(osxCachedir)));
                break;
        }
    });

    return downloadArray;
}

var ffmpegbuildTask = function () {
    var downloadArray = merge2();
    var item = 0;
    buildplatforms.forEach(item => {
        switch (item) {
            case "linux64":
                //Copy updated FFMPEG into the cache directory before building
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-linux-x64.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest("./pre/" + item))
                    .pipe(gulp.dest("./build/Popcorn-Time-CE/" + item + "/lib")));
                break;
            case "linux32":
                //Copy updated FFMPEG into the cache directory before building
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-linux-ia32.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest("./pre/" + item))
                    .pipe(gulp.dest("./build/Popcorn-Time-CE/" + item + "/lib")));
                break;
            case "win32":
                //Copy updated FFMPEG into the cache directory before building
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-win-ia32.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest("./pre/" + item))
                    .pipe(gulp.dest("./build/Popcorn-Time-CE/" + item)));
                break;
            case "win64":
                //Copy updated FFMPEG into the cache directory before building
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-win-x64.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest("./pre/" + item))
                    .pipe(gulp.dest("./build/Popcorn-Time-CE/" + item)));
                break;
            case "osx64":
                var fs = require("fs");
                var osxBuilddir = "./build/Popcorn-Time-CE/" + item + '/' + 'Popcorn-Time-CE.app/Contents/Versions/';
                var files = fs.readdirSync(osxBuilddir);
                if (files.length > 0) {
                    //osxCachedir = './cache/' + nwVersion + '-sdk/osx64/nwjs.app/Contents/Versions/' + files[0];
                    osxBuilddir = "./build/Popcorn-Time-CE/" + item + '/' + 'Popcorn-Time-CE.app/Contents/Versions/' + files[0];
                }
                //Copy updated FFMPEG into the cache directory before building
                //https://github.com/iteufel/nwjs-ffmpeg-prebuilt/releases/download/0.31.4/0.31.4-osx-x64.zip
                downloadArray.add(download(ffmpegDownloadurl + '/' + nwVersion + '-osx-x64.zip')
                    .pipe(unzip())
                    .pipe(gulp.dest("./pre/" + item))
                    .pipe(gulp.dest(osxBuilddir)));
                break;
        }
    });
    return downloadArray;
}

var zipTask = function () {
    var zipArray = merge2();

    buildplatforms.forEach(item => {
        switch (item) {
            case "linux64":
                zipArray.add(gulp.src('./build/Popcorn-Time-CE/linux64/**')
                    .pipe(tar('popcorn-time-ce_linux64_' + package.version + '.tar'))
                    .pipe(gzip())
                    .pipe(gulp.dest('./dist'))
                    .on('end', function() { 
                        console.log('Build Zip Complete: ' + item);
                      })
                    );
                break;
            case "linux32":
                zipArray.add(gulp.src('./build/Popcorn-Time-CE/linux32/**')
                    .pipe(tar('popcorn-time-ce_linux32_' + package.version + '.tar'))
                    .pipe(gzip())
                    .pipe(gulp.dest('./dist'))
                    .on('end', function() { 
                        console.log('Build Zip Complete: ' + item);
                    }));
                break;
            case "win32":
                zipArray.add(gulp.src('./build/Popcorn-Time-CE/win32/**')
                    .pipe(zip('popcorn-time-ce_win32_' + package.version + '.zip'))
                    .pipe(gulp.dest('./dist'))
                    .on('end', function() { 
                        console.log('Build Zip Complete: ' + item);
                    }));
                break;
            case "win64":
                zipArray.add(gulp.src('./build/Popcorn-Time-CE/win64/**')
                    .pipe(zip('popcorn-time-ce_win64_' + package.version + '.zip'))
                    .pipe(gulp.dest('./dist'))
                    .on('end', function() { 
                        console.log('Build Zip Complete: ' + item);
                    }));
                break;
            case "osx64":
                zipArray.add(gulp.src('./build/Popcorn-Time-CE/osx64/**')
                    .pipe(zip('popcorn-time-ce_osx64_' + package.version + '.zip'))
                    //.pipe(gzip())
                    .pipe(gulp.dest('./dist'))
                    .on('end', function() { 
                        console.log('Build Zip Complete: ' + item);
                    }));
                break;
        }
    });

    return zipArray;
}

gulp.task('build', gulp.series(cleanTask, buildTask));

gulp.task('clean', cleanTask);

gulp.task('ffmpegbuild', ffmpegbuildTask);

gulp.task('ffmpegcache', ffmpegcacheTask);

gulp.task('zip', gulp.series(ffmpegbuildTask, zipTask));

gulp.task('default', function defaultTask() {
    // place code for your default task here
    console.log(nwVersion);
});