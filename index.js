var spawn = require('child_process').spawn;
var slang = require('slang');
var _ = require('lodash');
var debug = require('debug');

function quote(val) {
  // escape and quote the value if it is a string and this isn't windows
  if (typeof val === 'string' && process.platform !== 'win32')
    val = '"' + val.replace(/(["\\$`])/g, '\\$1') + '"';

  return val;
}

function wkhtmltopdf(input, options, callback) {
  if (!options) {
    options = {};
  } else if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  var output = options.output;
  delete options.output;

  // make sure the special keys are last
  var extraKeys = [];

  //cookies come in an object of key values.
  //like cookies: {"auth_token":"asdfasga", "beardamus":"foobar"}
  var cookieKeys = [];

  var keys = Object.keys(options).filter(function (key) {
    if (key === 'toc' || key === 'cover' || key === 'page') {
      extraKeys.push(key);
      return false;
    }

    if (key === 'cookies') {
      return false;
    }

    return true;
  }).concat(extraKeys);

  var args = [wkhtmltopdf.command, '--quiet'];

  keys.forEach(function (key) {
    var val = options[key];
    if (key !== 'toc' && key !== 'cover' && key !== 'page')
      key = key.length === 1 ? '-' + key : '--' + slang.dasherize(key);

    if (val !== false)
      args.push(key);

    if (typeof val !== 'boolean')
      args.push(quote(val));
  });

  _.each(options.cookies, function (cookie_val, cookie_name) {
    args.push("--cookie");
    args.push(quote(cookie_name));
    args.push(quote(cookie_val));
  });

  debug("args are:", args);

  var isUrl = /^(https?|file):\/\//.test(input);

  args.push(isUrl ? quote(input) : '-'); // stdin if HTML given directly
  args.push(output ? quote(output) : '-'); // stdout if no output file

  if (process.platform === 'win32') {
    var child = spawn(args[0], args.slice(1));
  } else {
    // this nasty business prevents piping problems on linux
    var child = spawn('/bin/sh', ['-c', args.join(' ') + ' | cat']);
    console.log("arg line is:", ['-c', args.join(' ') + ' | cat']);
  }

  // call the callback with null error when the process exits successfully
  if (callback)
    child.on('exit', function () {
      callback(null);
    });

  // setup error handling
  var stream = child.stdout;

  // write input to stdin if it isn't a url
  if (!isUrl)
    child.stdin.end(input);

  // return stdout stream so we can pipe
  return stream;
}

wkhtmltopdf.command = 'wkhtmltopdf';
module.exports = wkhtmltopdf;
