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
            tests: ['tmp', 'result'],
            traverse: ['dest', 'result']
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
                },
                files: {
                    'tmp/sample.xml': ['test/sample.xml']
                },
                results:'result/result.txt'
            },
            traverse: {
                options: {
                },
                files: [
                    {expand: true, cwd: 'src/', src: ['**'], dest: 'dest/'}
                ],
                result:'result/result.txt'
            },
            options: {
                jshintrc: 'jshintrc',
            }
        }
    });

    grunt.loadTasks('tasks');
    grunt.registerTask('test', ['clean:tests', 'websquarejshint:compile']);
    grunt.registerTask('traverse', ['clean:traverse', 'websquarejshint:traverse']);
    grunt.registerTask('default', ['traverse']);
};
