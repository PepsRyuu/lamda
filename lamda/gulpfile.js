var gulp = require('gulp'),
    clean = require('gulp-clean'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    karma = require('gulp-karma');

var dist = 'dist';

gulp.task('clean', function() {
    gulp.src(dist, {read: false})
        .pipe(clean());
});

gulp.task('source', function () {
    gulp.src('lamda.js')
        .pipe(gulp.dest(dist))
        .pipe(uglify())
        .pipe(rename('lamda.min.js'))
        .pipe(gulp.dest(dist));
});

gulp.task('test', function () {
    return gulp.src('foo')
        .pipe(karma({
            configFile: 'karma.conf.js',
            action: 'run'
        }))
        .on('error', function (error) {
            throw error;
        });
});

gulp.task('default', ['source', 'test']);
