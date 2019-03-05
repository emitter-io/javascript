module.exports = function(grunt) {

    // Project configuration. 
    grunt.initConfig({
        browserify: {
            options: {
                alias: {
                    'emitter': '.'
                }
            },
            js: {
                src: '.',
                dest: 'build/emitter.js',
            }
        },

        concat: {
            dist: {
                src: ['build/emitter.js', 'lib/browser.js'],
                dest: 'build/emitter.js',
            },
        },


        uglify: {
            options: {
                mangle: true,
                compress: {
                    sequences: true,
                    dead_code: true,
                    conditionals: true,
                    booleans: true,
                    unused: true,
                    if_return: true,
                    join_vars: true,
                    drop_console: true
                }

            },
            js: {
                files: { 'build/emitter.min.js': ['build/emitter.js'] }
            }
        },

        watch: {
            scripts: {
                files: ['lib/*.js'],
                tasks: ['default'],
                options: { spawn: false },
            },
        },

        compress: {
            main: {
                options: {
                    mode: 'gzip'
                },
                files: [

                    { expand: true, src: ['build/*.min.js'], dest: '', ext: '.gz.js' }
                ]
            }
        },

        copy: {
            js: {
                files: [
                    { 
                        cwd: 'build/',
                        src: 'emitter.js',
                        dest: 'sample/',
                        expand: true }
                ]
            }
        }

    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('default', ['browserify', 'concat', 'uglify', 'compress', 'copy:js']);
};