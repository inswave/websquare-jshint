/*
 * websquare-min
 * https://github.com/inswave/websquare-min
 *
 * Copyright (c) 2013 inswave
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
    'use strict';

    var path = require('path');
    var hooker = require('hooker');
    var jshint = require('jshint').JSHINT;
    var jshintcli = require('jshint/src/cli');
//    var jshint = require('grunt-contrib-jshint/tasks/lib/jshint').init(grunt);
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
    var DOMParser = require('xmldom').DOMParser;

    grunt.registerMultiTask('websquarejshint', 'JSHint for WebSquare XML', function() {
        var options = this.options({
              force: false,
              reporterOutput: null
            }),
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
            scriptRegex = /(<script[\s]*?type=[\"\']javascript[\"\'][\s]*?>[\s]*<!\[CDATA\[)([\s\S]*?)(\]\]>[\s]*<\/script>)/ig,
            exceptRegex = /return\s*/,
            eventRegex  = /ev\:event/,
            pseudoFunc  = ['(function(){', '})'],
            min = '',
            sourceStr = '',
            logMsg = '',
            globalStr = '',
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
                    return 'JS';
//                    return '';
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
            jsHint = function ( file, options, globalObj ) {
                var cliOptions = {
                  verbose: grunt.option('verbose'),
                  extensions: '',
                };

                // A list of non-dot-js extensions to check
                if (options.extensions) {
                  cliOptions.extensions = options.extensions;
                  delete options.extensions;
                }

                // A list ignored files
                if (options.ignores) {
                  if (typeof options.ignores === 'string') {
                    options.ignores = [options.ignores];
                  }
                  cliOptions.ignores = options.ignores;
                  delete options.ignores;
                }

                // Option to extract JS from HTML file
                if (options.extract) {
                  cliOptions.extract = options.extract;
                  delete options.extract;
                }

                // Get reporter output directory for relative paths in reporters
                if (options.hasOwnProperty('reporterOutput')) {
                  var reporterOutputDir = path.dirname(options.reporterOutput);
                  delete options.reporterOutput;
                }

                if (options.jshintrc === true) {
                  // let jshint find the options itself
                  delete cliOptions.config;
                } else if (options.jshintrc) {
                  // Read JSHint options from a specified jshintrc file.
                  cliOptions.config = jshintcli.loadConfig(options.jshintrc);
                } else {
                  // Enable/disable debugging if option explicitly set.
                  if (grunt.option('debug') !== undefined) {
                    options.devel = options.debug = grunt.option('debug');
                    // Tweak a few things.
                    if (grunt.option('debug')) {
                      options.sourceStrerr = Infinity;
                    }
                  }
                  // pass all of the remaining options directly to jshint
                  cliOptions.config = options;
                }

                if(globalObj) {
                    if(!cliOptions.config) cliOptions.config = {'globals':[]};
                    if( !cliOptions.config.globals ) cliOptions.config.globals = [];
                    for(var prop in globalObj) {
                        if(globalObj.hasOwnProperty(prop)) {
                            cliOptions.config.globals[prop] = globalObj[prop];
                        }
                    }
                    logMsg += '    global object : ';
                    var first = true;
                    for(var prop in cliOptions.config.globals) {
                        if(cliOptions.config.globals.hasOwnProperty(prop)) {
                            if(first) {
                                first = false;
                                logMsg += prop;
                            } else {
                                logMsg += ', ' + prop;
                            }
                        }
                    }
                    logMsg += '\n\n';
                    grunt.verbose.writeln(JSON.stringify(cliOptions.config));
                }

                // Run JSHint on all file and collect results/data
                var allResults = [];
                var allData = [];
                cliOptions.args = [file];
                cliOptions.reporter = function(results, data) {
                  results.forEach(function(datum) {
                    datum.file = reporterOutputDir ? path.relative(reporterOutputDir, datum.file) : datum.file;
                  });
                  reporter(results, data, options);
                  allResults = allResults.concat(results);
                  allData = allData.concat(data);
                };
                jshintcli.run(cliOptions);
            },
            reporter = function(results, data) {
                // Dont report empty data as its an ignored file
                if (data.length < 1) {
                  grunt.log.error('0 files linted. Please check your ignored files.');
                  return;
                }

                if (results.length === 0) {
                  // Success!
                  grunt.verbose.ok();
                  return;
                }

                var options = data[0].options;

                grunt.log.writeln();

                var lastfile = null;
                // Iterate over all errors.
                results.forEach(function(result) {

                  // Only print file name once per error
                  if (result.file !== lastfile) {
                    grunt.log.writeln((result.file ? '   ' + result.file.substring(result.file.indexOf("/"), result.file.lastIndexOf(".") ) : '').bold  + ' | ' + results.length + ' lints found.')
                    grunt.log.write(logMsg);
                    fs.appendFileSync(resultFile, '\n\n' + (result.file ? '   ' + result.file.substring(result.file.indexOf("/"), result.file.lastIndexOf(".") ) : '')  + ' | ' + results.length + ' lints found.' +'\n');
                    fs.appendFileSync(resultFile, logMsg);
                  }
                  lastfile = result.file;

                  var e = result.error;

                  // Sometimes there's no error object.
                  if (!e) { return; }

                  if (e.evidence) {
                    // Manually increment errorcount since we're not using grunt.log.error().
                    grunt.fail.errorcount++;

                    // No idea why JSHint treats tabs as options.indent # characters wide, but it
                    // does. See issue: https://github.com/jshint/jshint/issues/430
                    // Replacing tabs with appropriate spaces (i.e. columns) ensures that
                    // caret will line up correctly.
                    var evidence = e.evidence.replace(/\t/g,grunt.util.repeat(options.indent,' '));

                    grunt.log.writeln((pad(e.line.toString(),7) + ' |') + evidence.grey);
                    grunt.log.write(grunt.util.repeat(9,' ') + grunt.util.repeat(e.character -1,' ') + '^ ');
                    grunt.log.write('[' + e.code + '] ');
                    grunt.log.writeln(e.reason);

                    fs.appendFileSync(resultFile, (pad(e.line.toString(),7) + ' |') + evidence +'\n');
                    fs.appendFileSync(resultFile, grunt.util.repeat(9,' ') + grunt.util.repeat(e.character -1,' ') + '^ ');
                    fs.appendFileSync(resultFile, '[' + e.code + '] ');
                    fs.appendFileSync(resultFile, e.reason +'\n');

                  } else {
                    // Generic "Whoops, too many errors" error.
                    grunt.log.error(e.reason);
                  }
                });
                grunt.log.writeln();
            },
            pad = function(msg,length) {
                while (msg.length < length) {
                  msg = ' ' + msg;
                }
                return msg;
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

                if( tally.js ) {
                    grunt.log.write( ( isWrite ? ', do jslint ' : 'do jslint ' ) + chalk.green(tally.js) + ' js' );
                    isWrite = true;
                }

                grunt.log.writeln();
            },
            extractWebSquareID = function(str) {
                var globalObj = {};
                try {
                    var parser = new DOMParser();
                    var dom = parser.parseFromString( str , "text/xml" );
                    dom.async = false;
                    var node = dom.documentElement;
                    traverse(globalObj, node);
                } catch(e) {
                    grunt.log.warn("    XML Parsing exception\n");
                    logMsg += "    XML Parsing exception\n";
                }
                return globalObj;
            },
            traverse = function(globalObj, node) {
                if( node.nodeType == 1 ) {
                    if(node.getAttribute("id") && !skipNode(node.nodeName)) {
                        grunt.verbose.writeln("detect global object from " + node.nodeName + ", variable : " + node.getAttribute("id"));
                        globalObj[node.getAttribute("id")] = true;
                    }
                    if( stopNode(node.nodeName) ) {
                        return;
                    }
                    var childList = node.childNodes;
                    for( var i = 0 ; i < childList.length ; i++ ) {
                        var child = childList.item(i);
                        grunt.verbose.writeln("node info : " + child.nodeName );
                        traverse(globalObj, child);
                    }
                }
            },
            stopNode = function (nodeName) {
                var nameList = ["w2:dataMap", "w2:dataList", "xf:instance", "w2:gridView", "w2:grid", "xf:submission"];
                for (var i = nameList.length - 1; i >= 0; i--) {
                    if( nameList[i] == nodeName ) return true;
                };
                return false;
            },
            skipNode = function (nodeName) {
                var nameList = ["w2:tabs", "w2:content"];
                for (var i = nameList.length - 1; i >= 0; i--) {
                    if( nameList[i] == nodeName ) return true;
                };
                return false;
            }
            ;


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
        var resultFile = this.result;
        var globalObj = {};
        if( !resultFile ) {
            resultFile = 'result/result.txt';
        }
        var pathIdx = resultFile.lastIndexOf('/')
        grunt.file.mkdir( resultFile.substring(0, pathIdx) );
        grunt.log.warn('result : ' + resultFile + '\n');

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
                        globalObj = {};
                        logMsg = '';
                        fileType = detectFileType( src );

                        if( fileType ) {
                            try {
                                grunt.verbose.writeln( fileType + ' do jslint ' + src.cyan + ' -> ' + dest.cyan );

                                sourceStr = fs.readFileSync( src );
                                if( fileType === 'XML' ) {
                                    var sourceStr1 =  sourceStr + "";
                                    var strIdx = sourceStr1.indexOf('\n')
                                    grunt.log.warn( fileType + ' do jslint ' + src.cyan + ' -> ' + dest.cyan + ', contents : ' + (strIdx > 0 ? sourceStr1.substring(0,strIdx) : sourceStr1) );
                                    if(sourceStr1.toLowerCase().indexOf("euc-kr") > 0 ) {
                                        try {
                                            grunt.log.warn('convert euc-kr to utf-8');
                                            sourceStr = euckr2utf8.convert(sourceStr).toString('UTF-8');
                                            sourceStr = sourceStr.replace( /EUC[-]KR/, 'UTF-8' );
                                        } catch(e) {
                                            logMsg += "exception occured. use original : " + src + "\n";
                                            grunt.log.warn('exception occured. use original');
                                            sourceStr = sourceStr1;
                                        }
                                    }
                                    sourceStr += grunt.util.normalizelf( grunt.util.linefeed );
                                    grunt.verbose.writeln( 'convert ' + sourceStr );

                                    dest = dest + ".js";
                                    var myArray;
                                    var retStr = "";
                                    var startPoint = 0;
                                    while ((myArray = scriptRegex.exec(sourceStr)) !== null) {
                                        var len = sourceStr.substring(startPoint, myArray.index).split("\n").length;
                                        startPoint = scriptRegex.lastIndex;
                                        var arr = [];
                                        for(var idx1 = 0 ; idx1 < len - 1; idx1++) {
                                            arr.push("\n");
                                        }
                                        retStr += arr.join("") + myArray[2];
                                    }

                                    globalObj = extractWebSquareID(sourceStr, src);
                                    globalStr = '/*global';
                                    var first = true;
                                    for(var prop in globalObj) {
                                        if(globalObj.hasOwnProperty(prop)) {
                                            globalStr += ' ' + prop + ':true'
                                        }
                                    }
                                    globalStr += '*/';

                                    min = globalStr + retStr;


                                } else if( fileType === "JS" ) {
                                    grunt.log.warn( fileType + ' do jslint ' + src.cyan + ' -> ' + dest.cyan );
                                    try {
                                        grunt.log.warn('convert euc-kr to utf-8');
                                        sourceStr = euckr2utf8.convert(sourceStr).toString('UTF-8');
                                    } catch(e) {
                                        logMsg += "exception occured during convert euc-kr to utf-8. use original : " + src + "\n";
                                        grunt.log.warn('exception occured. use original');
                                        sourceStr = sourceStr1;
                                    }
                                    sourceStr += grunt.util.normalizelf( grunt.util.linefeed );
                                    grunt.verbose.writeln( 'convert ' + sourceStr );

                                    min = sourceStr;
                                }
                            } catch( err ) {
                                grunt.warn( src + '\n' + err );
                            }

                            if( min.length < 1 ) {
                                grunt.log.warn( 'Destination not written because folder ' + src.cyan + ' was empty.' );
                            } else {
                                grunt.log.warn(dest);
                                grunt.file.write( dest, min );
                                grunt.verbose.writeln( fileType + ' jshint ' + src.cyan + ' -> ' + dest.cyan );
                                grunt.verbose.writeln( maxmin( sourceStr, min ) );
                                countWithFileType( fileType );
                                jsHint(dest, options, globalObj);
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
