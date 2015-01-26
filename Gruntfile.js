/*
 * websquare-min
 * https://github.com/inswave/websquare-min
 *
 * Copyright (c) 2013 inswave
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
    'use strict';

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        clean: {
            tests: ['tmp'],
            traverse: ['dest']
        },
        copy: {
            main: {
                files: [
                    {expand: true, src: ['src/**'], dest: 'dest/'}
                ]
            },
            cwd: {
                files: [
                    {expand: true, cwd: 'src/', src: ['**'], dest: 'dest/'}
                ]
            }
        },
        websquarejshint: {
            compile: {
                options: {
                    encoding: 'EUC-KR'
                },
                files: {
                    'tmp/sample.xml': ['test/sample.xml']
                }
            },
            traverse: {
                files: [
                    {expand: true, cwd: 'src/', src: ['**'], dest: 'dest/'}
                ]
            },
            traverse_option: {
                options: {
                    js: {
                        compress: {
                            booleans: false
                        },
                        mangle: {
                            except: ['returnValue']
                        }
                    }
                },
                files: [
                    {expand: true, cwd: 'src/', src: ['**'], dest: 'dest/'}
                ]
            },
            traverse_encoding: {
                options: {
                    encoding: 'EUC-KR'
                },
                files: [
                    {expand: true, cwd: 'src/', src: ['**'], dest: 'dest/'}
                ]
            },
            options: {
                jshintrc: 'jshintrc',
            }
        }
    });

    grunt.loadTasks('tasks');
    grunt.registerTask('test', ['clean:tests', 'websquarejshint:compile']);
    grunt.registerTask('traverse', ['clean:traverse', 'websquarejshint:traverse']);
    grunt.registerTask('traverse_option', ['clean:traverse', 'websquarejshint:traverse_option']);
    grunt.registerTask('traverse_encoding', ['clean:traverse', 'websquarejshint:traverse_encoding']);
    grunt.registerTask('default', ['test']);
};
