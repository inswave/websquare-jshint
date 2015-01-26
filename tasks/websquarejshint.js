/*
 * websquare-min
 * https://github.com/inswave/websquare-min
 *
 * Copyright (c) 2013 inswave
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
    'use strict';

    var pd          = require('pretty-data').pd,
        maxmin      = require('maxmin'),
        _s          = require('underscore.string'),
        path        = require('path'),
        chalk       = require('chalk'),
        fs          = require('fs'),
        Iconv       = require('iconv').Iconv,
        utf82euckr  = new Iconv( 'UTF-8', 'EUC-KR'),
        euckr2utf8  = new Iconv( 'EUC-KR', 'UTF-8'),
        Buffer      = require('buffer').Buffer;

    grunt.registerMultiTask('websquarejshint', 'JSHint for WebSquare XML', function() {
        var options = this.options({
              force: false,
              reporterOutput: null
            }),
            jshintOptions  = options.jshint || {},
            encoding = ( options.encoding || 'UTF-8' ).toLowerCase(),
            ast,
            compressor,
            dest,
            isExpandedPair,
            fileType,
            tally = {
                dirs: 0,
                xml: 0,
                js: 0,
                css: 0,
                png: 0,
                jpg: 0
            },
            scriptRegex = /(<script[\s]*?type=[\"\']javascript[\"\'][\s\S]*?>[\s]*<!\[CDATA\[)([\s\S]*?)(\]\]>[\s]*<\/script>)/ig,
            exceptRegex = /return\s*/,
            eventRegex  = /ev\:event/,
            pseudoFunc  = ['(function(){', '})'],
            min = '',
            max = '',
            checkFilter = function ( source ) {
                if ( options.filter instanceof RegExp ) {
                    if ( options.filter.test( source ) ) {
                        return false;
                    }
                } else if ( typeof options.filter === 'function' ) {
                    return options.filter( source );
                }
                return true;
            },
            detectDestType = function ( dest ) {
                if( _s.endsWith( dest, '/' ) ) {
                    return 'directory';
                } else {
                    return 'file';
                }
            },
            detectFileType = function ( src ) {
                if( _s.endsWith( src, '.xml' ) ) {
                    return 'XML';
                } else if( _s.endsWith( src, '.js' ) ) {
//                    return 'JS';
                    return '';
                } else if( _s.endsWith( src, '.css' ) ) {
//                    return 'CSS';
                    return '';
                } else if( _s.endsWith( src, '.png' ) ) {
//                    return 'PNG';
                    return '';
                } else if( _s.endsWith( src, '.jpg' ) ) {
//                    return 'JPG';
                    return '';
                } else {
                    return '';
                }
            },
            countWithFileType = function ( fileType ) {
                if( fileType === 'XML' ) {
                    tally.xml++;
                } else if( fileType === 'JS' ) {
                    tally.js++;
                } else if( fileType === 'CSS' ) {
                    tally.css++;
                } else if( fileType === 'PNG' ) {
                    tally.png++;
                } else if( fileType === 'JPG' ) {
                    tally.jpg++;
                }
            },
            unixifyPath = function ( filepath ) {
                if( process.platform === 'win32' ) {
                    return filepath.replace( /\\/g, '/' );
                } else {
                    return filepath;
                }
            },
            jsHint = function ( source, options, startTag ) {
                return "__HINT__";
            },
            printSummary = function () {
                var isWrite = false;

                if( tally.dirs ) {
                    grunt.log.write( 'Created ' + chalk.green(tally.dirs) + ' directories' );
                    isWrite = true;
                }

                if( tally.xml ) {
                    grunt.log.write( ( isWrite ? ', do jslint ' : 'do jslint ' ) + chalk.green(tally.xml) + ' xml' );
                    isWrite = true;
                }

                grunt.log.writeln();
            };


            var force = options.force;
            delete options.force;

            // Whether to output the report to a file
            var reporterOutput = options.reporterOutput;

            // Hook into stdout to capture report
            var output = '';
            if (reporterOutput) {
              hooker.hook(process.stdout, 'write', {
                pre: function(out) {
                  output += out;
                  return hooker.preempt();
                }
              });
            }

        grunt.verbose.writeflags( options, 'Options' );

        this.files.forEach( function( filePair ) {
            isExpandedPair = filePair.orig.expand || false;

            filePair.src.forEach( function( src ) {

                if( checkFilter( src ) ) {
                    if( detectDestType( filePair.dest ) === 'directory' ) {
                        dest = (isExpandedPair) ? filePair.dest : unixifyPath( path.join( filePair.dest, src ) );
                    } else {
                        dest = filePair.dest;
                    }

                    if( grunt.file.isDir( src ) ) {
                        grunt.verbose.writeln( 'Creating ' + dest.cyan );
                        grunt.file.mkdir( dest );
                        tally.dirs++;
                    } else {
                        fileType = detectFileType( src );

                        if( fileType ) {
                            grunt.verbose.writeln( fileType + ' do jslint ' + src.cyan + ' -> ' + dest.cyan );

                            if ( encoding === 'euc-kr' ) {
                                max = fs.readFileSync( src );
                                grunt.verbose.writeln( 'contents ' + max );
                                max = euckr2utf8.convert(max).toString('UTF-8');
                                max += grunt.util.normalizelf( grunt.util.linefeed );
                                grunt.verbose.writeln( 'convert ' + max );
                            } else {
                                max = grunt.file.read( src ) + grunt.util.normalizelf( grunt.util.linefeed );
                            }

                            try {
                                if( fileType === 'XML' ) {
                                    max = max.replace( scriptRegex, function( all, g1, g2, g3 ) {
                                        return g1 + jsHint( g2, jshintOptions, g1 ) + g3;
                                    });

                                    min = max;
                                }
                            } catch( err ) {
                                grunt.warn( src + '\n' + err );
                            }

                            if( min.length < 1 ) {
                                grunt.log.warn( 'Destination not written because folder ' + src.cyan + ' was empty.' );
                            } else {
                                if ( encoding === 'euc-kr' ) {
                                    min = utf82euckr.convert( new Buffer( min ) );
                                }

                                grunt.file.write( dest, min );
                                grunt.verbose.writeln( fileType + ' jshint ' + src.cyan + ' -> ' + dest.cyan );
                                grunt.verbose.writeln( maxmin( max, min ) );
                                countWithFileType( fileType );
                            }
                        } else {
                            grunt.verbose.writeln( src.cyan + ' is skiped' );
                        }
                    }
                } else {
                    grunt.verbose.writeln( filePair.src[0] + ' is filtered.' );
                }
            });
        });

        printSummary();
    });
};
