(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
/**
 * @module audio-demo
 */
var Emitter = require('events').EventEmitter;
var inherits = require('inherits');
var extend = require('xtend/mutable');
var sf = 0;
var className = ((require('insert-css')("._4105589f {\r\n\tmin-height: 100vh;\r\n\tmargin: 0;\r\n\tfont-family: sans-serif;\r\n\tbox-sizing: border-box;\r\n}\r\n\r\n._4105589f * {\r\n\tbox-sizing: border-box;\r\n}\r\n\r\n._4105589f a {\r\n\tcolor: inherit;\r\n}\r\n\r\n._4105589f [hidden] {\r\n\tdisplay: none!important;\r\n}\r\n\r\n._4105589f:after {\r\n\tcontent: '';\r\n}\r\n._4105589f.dragover:after {\r\n\tcontent: '⎗';\r\n\tposition: fixed;\r\n\ttop: 0;\r\n\tbottom: 0;\r\n\tleft: 0;\r\n\tright: 0;\r\n\tmargin: auto;\r\n\twidth: 20vh;\r\n\theight: 20vh;\r\n\tz-index: 2;\r\n\tfont-size: 20vh;\r\n\ttext-align: center;\r\n\tline-height: 20vh;\r\n\tdisplay: block;\r\n}\r\n\r\n._4105589f.dragover:before {\r\n\tcontent: '';\r\n\tposition: fixed;\r\n\ttop: 0;\r\n\tleft: 0;\r\n\tright: 0;\r\n\tbottom: 0;\r\n\tmargin: 0;\r\n\tborder: .2rem dashed;\r\n\tz-index: 1;\r\n\tdisplay: block;\r\n}\r\n\r\n._4105589f.dragover .source {\r\n}\r\n\r\n._4105589f.dragover .audio-stop,._4105589f.dragover .audio-playback {\r\n\tdisplay: none;\r\n}\r\n\r\n._4105589f .source, ._4105589f .status {\r\n\tmargin: 0;\r\n\tpadding: 0;\r\n\tposition: fixed;\r\n\ttop: .75rem;\r\n\tleft: .75rem;\r\n\tdisplay: block;\r\n\tline-height: 1.5rem;\r\n\tfont-size: .9rem;\r\n\tmax-width: 100%;\r\n\tborder: none;\r\n\tbox-shadow: none;\r\n\toutline: none;\r\n\tfill: currentColor;\r\n\tz-index: 999;\r\n}\r\n._4105589f .source-input {\r\n\tmargin: 0;\r\n\tpadding: 0;\r\n\tborder: 0;\r\n\tdisplay: inline;\r\n\tvertical-align: baseline;\r\n\tline-height: 1rem;\r\n\theight: 1rem;\r\n\tfont-size: .9rem;\r\n\tmax-width: 100%;\r\n\twidth: 82%;\r\n\tborder: none;\r\n\tbox-shadow: none;\r\n\tfont-weight: bolder;\r\n\toutline: none;\r\n\tbackground: none;\r\n\t-webkit-appearance: none;\r\n\tappearance: none;\r\n\tborder-radius: 0;\r\n\tbox-shadow: 0 2px;\r\n\tcolor: inherit;\r\n}\r\n._4105589f .source-input:focus{\r\n\toutline: none;\r\n}\r\n._4105589f .source-input-file {\r\n\tposition: fixed;\r\n\ttop: 0;\r\n\tleft: 0;\r\n\tbottom: 0;\r\n\tright: 0;\r\n\topacity: 0;\r\n\tborder: none;\r\n\tcursor: pointer;\r\n}\r\n._4105589f .source-input-url {\r\n\tfont-family: sans-serif;\r\n\tfont-weight: bold;\r\n\tmin-width: 40vw;\r\n}\r\n._4105589f .source-input-url:focus {\r\n}\r\n._4105589f input[type=file],\r\n._4105589f input[type=file]::-webkit-file-upload-button {\r\n\tcursor: pointer;\r\n}\r\n._4105589f i {\r\n\tfill: currentColor;\r\n\twidth: 1.5rem;\r\n\theight: 1.5rem;\r\n\tposition: relative;\r\n\tdisplay: inline-block;\r\n\tfont-style: normal;\r\n\tvertical-align: top;\r\n}\r\n._4105589f .source i {\r\n}\r\n._4105589f .source i svg {\r\n\tmargin-bottom: -.52rem;\r\n}\r\n._4105589f i svg {\r\n\tmax-width: 100%;\r\n\tmax-height: 100%;\r\n}\r\n._4105589f .source-link {\r\n\tposition: relative;\r\n\tfont-weight: bold;\r\n\ttext-decoration: none;\r\n\tbox-shadow: 0px 2px;\r\n\twhite-space: nowrap;\r\n\tcursor: pointer;\r\n}\r\n\r\n._4105589f .text-length-limiter {\r\n\tdisplay: inline-block;\r\n\tmax-width: 40vw;\r\n\tvertical-align: top;\r\n\twhite-space: nowrap;\r\n\ttext-overflow: ellipsis;\r\n\toverflow: hidden;\r\n}\r\n._4105589f .source-title {\r\n\tdisplay: inline;\r\n\tword-break: break-all;\r\n}\r\n\r\n._4105589f .status {\r\n\tleft: auto;\r\n\tright: .75rem;\r\n}\r\n\r\n._4105589f .fps {\r\n\tdisplay: inline-block;\r\n}\r\n\r\n._4105589f .fps-canvas {\r\n\theight: 1rem;\r\n\twidth: 2rem;\r\n\tdisplay: inline-block;\r\n\tmargin-right: .15rem;\r\n\tmargin-bottom: -.15rem;\r\n}\r\n\r\n._4105589f .fps-text {\r\n}\r\n\r\n._4105589f .fps-value {\r\n}\r\n\r\n._4105589f .params-button {\r\n    position: relative;\r\n    display: inline-block;\r\n    margin-left: .5rem;\r\n}\r\n._4105589f .github-link {\r\n    position: fixed;\r\n    bottom: .75rem;\r\n    right: .75rem;\r\n    width: 1.5rem;\r\n    height: 1.5rem;\r\n    line-height: 1.5rem;\r\n}\r\n\r\n._4105589f .audio-playback, ._4105589f .audio-stop {\r\n\tdisplay: inline-block;\r\n}\r\n\r\n._4105589f .progress {\r\n\tposition: fixed;\r\n\ttop: 0;\r\n\tleft: 0;\r\n\theight: .2rem;\r\n\tbackground: currentColor;\r\n\ttransition: .1s linear width;\r\n\tz-index: 999;\r\n}\r\n\r\n@media (max-width: 42rem) {\r\n\t._4105589f .text-length-limiter {\r\n\t\tmax-width: 30%;\r\n\t}\r\n\t._4105589f .source {\r\n\t\tright: .75rem;\r\n\t\ttext-align: center;\r\n\t}\r\n\t._4105589f .status {\r\n\t\ttop: auto;\r\n\t\tbottom: .75rem;\r\n\t\tright: .75rem;\r\n\t\tleft: .75rem;\r\n\t\ttext-align: center;\r\n\t}\r\n}\r\n\r\n\r\n._4105589f .params {\r\n\tbackground: linear-gradient(to bottom, rgba(255,255,255,.75), white);\r\n\tposition: fixed;\r\n\tbottom: 0;\r\n\tright: 0;\r\n\tleft: 0;\r\n\tmargin: auto;\r\n\tpadding: .5rem 0 .5rem .75rem;\r\n\tline-height: 1.5;\r\n\tmax-height: 82vh;\r\n\tmax-width: 100%;\r\n\tz-index: 999;\r\n}\r\n._4105589f .params-close {\r\n\tposition: absolute;\r\n\ttop: 0;\r\n\tright: 0;\r\n\theight: 2rem;\r\n\twidth: 2rem;\r\n\ttext-align: center;\r\n\tline-height: 2rem;\r\n\tfont-size: 1rem;\r\n}\r\n\r\n._4105589f .param {\r\n\theight: 2rem;\r\n\twidth: 15rem;\r\n\tmargin-right: 2.25rem;\r\n\tfloat: left;\r\n}\r\n\r\n@media (max-width: 42rem) {\r\n\t._4105589f .params {\r\n\t\tbottom: 2.5rem;\r\n\t\tpadding-right: 2.25rem;\r\n\t}\r\n\t._4105589f .param {\r\n\t\tmargin-right: 0;\r\n\t\twidth: 100%;\r\n\t\tfloat: none;\r\n\t}\r\n}\r\n\r\n._4105589f .param-label {\r\n\tfont-size: .75rem;\r\n\tdisplay: inline-block;\r\n\twidth: 33.3%;\r\n\tline-height: 2rem;\r\n\theight: 2rem;\r\n\tvertical-align: top;\r\n\ttext-align: right;\r\n\tpadding-right: 1rem;\r\n}\r\n._4105589f .param-input {\r\n\twidth: 66.6%;\r\n\theight: 2rem;\r\n\tcolor: inherit;\r\n\tborder: 0;\r\n\tpadding: 0 0;\r\n\tmargin: 0;\r\n\tfont-size: 1rem;\r\n\tbackground: none;\r\n\t/*border-radius: 0;*/\r\n\t/*appearance: none;*/\r\n\t/*-webkit-appearance: none;*/\r\n}\r\n._4105589f .param-range::-webkit-slider-thumb,\r\n._4105589f .param-range::-moz-range-thumb {\r\n\twidth: 2rem;\r\n\theight: 2rem;\r\n}\r\n._4105589f .param-checkbox {\r\n\twidth: 1.5rem;\r\n\theight: 1.5rem;\r\n\tmargin-top: .25rem;\r\n}\r\n@media (max-width: 42rem) {\r\n\t._4105589f .param-checkbox {\r\n\t\tborder: 1px solid;\r\n\t}\r\n}\r\n\r\n._4105589f .param-select {\r\n}\r\n\r\n._4105589f .param-range {\r\n}") || true) && "_4105589f");

var raf = require('raf');
var now = require('right-now');
var colorParse = require('color-parse');
var hsl = require('color-space/hsl');
var pad = require('left-pad');
var isMobile = require('is-mobile')();
var xhr = require('xhr');
var isUrl = require('is-url');
var ctx = require('audio-context');
var isPlainObject = require('mutype/is-object');
var createPlayer = require('web-audio-player');
require('get-float-time-domain-data');

module.exports = StartApp;



/**
 * @constructor
 */
function StartApp (opts, cb) {
	var this$1 = this;

	if (!(this instanceof StartApp)) return new StartApp(opts, cb);

	var self = this;

	extend(this, opts);

	//ensure container
	if (!this.container) this.container = document.body || document.documentElement;
	this.container.classList.add(className);

	//create container
	this.sourceEl = document.createElement('div');
	this.sourceEl.classList.add('source');
	this.container.appendChild(this.sourceEl);

	//create dynamic style
	this.styleEl = document.createElement('style');
	(document.head || document.documentElement).appendChild(this.styleEl);

	if (!this.color) this.color = getComputedStyle(this.container).color;
	this.setColor(this.color);

	//add mobile metas
	if (isMobile && this.mobile) {
		var metaEl = document.createElement('meta');
		metaEl.setAttribute('name', 'viewport');
		metaEl.setAttribute('content', 'width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no');
		(document.head || document.documentElement).appendChild(metaEl);

		metaEl = document.createElement('meta');
		metaEl.setAttribute('name', 'apple-mobile-web-app-capable');
		metaEl.setAttribute('content', 'yes');
		(document.head || document.documentElement).appendChild(metaEl);

		// setTimeout(() => {
		// 	window.scrollTo(0, 0);
		// }, 0);
	}

	//create layout
	this.sourceEl.innerHTML = "\n\t\t<i class=\"source-icon\" hidden>" + (this.icons.loading) + "</i>\n\t\t<span class=\"source-text\"></span>\n\t\t<a href=\"#audio\" class=\"audio-playback\" hidden><i class=\"audio-icon\">" + (this.icons.play) + "</i></a><a href=\"#stop\" class=\"audio-stop\" title=\"Reset\" hidden><i class=\"audio-icon\">" + (this.icons.eject) + "</i></a>\n\t";
	this.sourceIcon = this.sourceEl.querySelector('.source-icon');
	this.sourceContent = this.sourceEl.querySelector('.source-text');
	this.sourceIcon.innerHTML = this.file ? this.icons.open : this.url ? this.icons.url : this.mic ? this.icons.mic : this.icons.open;

	this.sourceContent.innerHTML = "\n\t\t<span class=\"source-links\">\n\t\t\t<a href=\"#open-file\" " + (this.file ? '' : 'hidden') + " class=\"source-link source-link-file\">Open file</a>" + (this.file && this.url && this.mic ? ',' : this.file && (this.url || this.mic) ? ' or' : '') + "\n\t\t\t<a href=\"#enter-url\" " + (this.url ? '' : 'hidden') + " class=\"source-link source-link-url\">enter URL</a>\n\t\t\t" + (this.url && this.mic ? ' or' : '') + "\n\t\t\t<a href=\"#enable-mic\" " + (this.mic ? '' : 'hidden') + " class=\"source-link source-link-mic\">\n\t\t\t\tenable microphone\n\t\t\t</a>\n\t\t</span>\n\t\t<input class=\"source-input source-input-file\" hidden type=\"file\"/>\n\t\t<input placeholder=\"https://soundcloud.com/user/track\" hidden class=\"source-input source-input-url\" type=\"url\" value=\"" + (this.source || '') + "\"/>\n\t\t<strong class=\"source-title\" hidden></strong>\n\t";
	this.sourceTitle = this.sourceEl.querySelector('.source-title');
	this.sourceLinks = this.sourceEl.querySelector('.source-links');
	this.sourceInputFile = this.sourceEl.querySelector('.source-input-file');
	this.sourceEl.querySelector('.source-link-file').addEventListener('click', function (e) {
		e.preventDefault();
		this$1.sourceInputFile.click();
	});
	this.sourceInputFile.addEventListener('change', function (e) {
		if (!this$1.sourceInputFile.files.length) return this$1;
		this$1.setSource(this$1.sourceInputFile.files);
	});
	this.sourceInputURL = this.sourceEl.querySelector('.source-input-url');
	var lastURL;
	this.sourceInputURL.addEventListener('focus', function (e) {
		lastURL = this$1.sourceInputURL.value;
	});
	this.sourceInputURL.addEventListener('blur', function (e) {
		//if nothing changed - blur
		if (lastURL === this$1.sourceInputURL.value) {
			this$1.showInput();
		}
	});
	this.sourceInputURL.addEventListener('change', function (e) {
		e.preventDefault();
		this$1.hideInput();
		this$1.sourceIcon.innerHTML = this$1.icons.loading;
		this$1.sourceTitle.innerHTML = "loading";
		this$1.sourceIcon.setAttribute('title', this$1.sourceTitle.textContent);
		this$1.sourceInputURL.setAttribute('hidden', true);
		this$1.setSource(this$1.sourceInputURL.value, function (err) {
			this$1.hideInput();
			//in case of error allow second chance
			if (err) {
				this$1.sourceTitle.innerHTML = "";
				this$1.sourceIcon.setAttribute('title', this$1.sourceTitle.textContent);
				this$1.sourceIcon.innerHTML = this$1.icons.url;
				this$1.sourceInputURL.removeAttribute('hidden');
				this$1.sourceInputURL.focus();

				return;
			}
		});
	});
	this.sourceEl.querySelector('.source-link-url').addEventListener('click', function (e) {
		e.preventDefault();
		this$1.hideInput();
		this$1.sourceInputURL.removeAttribute('hidden');
		this$1.sourceInputURL.focus();
		this$1.sourceIcon.innerHTML = this$1.icons.url;
	});
	this.sourceInputMic = this.sourceEl.querySelector('.source-link-mic');
	this.sourceInputMic.addEventListener('click', function (e) {
		e.preventDefault();

		if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({audio: true, video: false})
			.then(enableMic).catch(errMic);
		}
		else {
			try {
				navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
				navigator.getUserMedia({audio: true, video: false}, enableMic, errMic);
			} catch (e) {
				errMic(e);
			}
		}

		function enableMic(stream) {
			self.hideInput();
			self.sourceTitle.innerHTML = "Microphone";
			self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
			self.sourceIcon.innerHTML = self.icons.mic;

			//an alternative way to start media stream - do not work in chrome
			var streamUrl = URL.createObjectURL(stream);
			// self.audio.src = streamUrl;
			// self.play();

			//create media stream source node
			self.micNode = self.context.createMediaStreamSource(stream);
			self.micNode.connect(self.context.destination);

			self.audioStop.querySelector('i').innerHTML = self.icons.stop;
			self.stop && self.audioStop.removeAttribute('hidden');

			self.emit('ready', self.micNode);
			self.emit('source', self.micNode, streamUrl);
			self.emit('play', self.micNode);
		}
		function errMic (err) {
			self.hideInput();
			self.sourceTitle.innerHTML = err;//`microphone is not allowed`;
			self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
			self.sourceIcon.innerHTML = self.icons.error;
			setTimeout(function () {
				if (!self.source) self.showInput();
				cb && cb(new Error('Microphone is not allowed'));
			}, 1000);
		}
	});


	this.audioEl = this.sourceEl.querySelector('.audio-playback');
	this.audioStop = this.sourceEl.querySelector('.audio-stop');
	this.audioIcon = this.sourceEl.querySelector('.audio-icon');


	this.playPause && this.audioEl.addEventListener('click', function (e) {
		e.preventDefault();
		if (!this$1.player) throw Error('Set audio source');

		if (!this$1.player.playing) {
			this$1.play();
		}
		else {
			this$1.pause();
		}
	});
	this.stop && this.audioStop.addEventListener('click', function (e) {
		this$1.reset();
	});

	//init progress bar
	var progress = this.progressEl = document.createElement('div');
	this.progressEl.classList.add('progress');
	if (!this.progress) this.progressEl.setAttribute('hidden', true);
	this.progressEl.setAttribute('title', '00:00');
	this.container.appendChild(progress);

	setInterval(function () {
		var currentTime = this$1.player && this$1.player.currentTime || this$1.player && this$1.player.element && this$1.player.element.currentTime || 0;
		if (this$1.player && this$1.player.currentTime) {
			progress.style.width = ((currentTime / this$1.player.duration * 100) || 0) + '%';
			progress.setAttribute('title', ((this$1.getTime(currentTime)) + " / " + (this$1.getTime(this$1.player.duration)) + " played"));
		}
	}, 100);


	//technical element for fps, params, info etc
	this.statusEl = document.createElement('div');
	this.statusEl.classList.add('status');
	this.container.appendChild(this.statusEl);

	//init fps
	this.fpsEl = document.createElement('div');
	this.fpsEl.classList.add('fps');
	this.fpsEl.setAttribute('hidden', true);
	this.fpsEl.innerHTML = "\n\t\t<canvas class=\"fps-canvas\"></canvas>\n\t\t<span class=\"fps-text\">\n\t\t\tfps <span class=\"fps-value\">60.0</span>\n\t\t</span>\n\t";
	this.fpsCanvas = this.fpsEl.querySelector('.fps-canvas');
	var fpsValue = this.fpsValue = this.fpsEl.querySelector('.fps-value');
	this.statusEl.appendChild(this.fpsEl);

	var w = this.fpsCanvas.width = parseInt(getComputedStyle(this.fpsCanvas).width) || 1;
	var h = this.fpsCanvas.height = parseInt(getComputedStyle(this.fpsCanvas).height) || 1;

	var ctx = this.fpsCanvas.getContext('2d');
	var count = 0;
	var last = 0;
	var len = this.fpsCanvas.width;
	var values = Array(len).fill(0);
	var updatePeriod = 1000;
	var maxFPS = 100;
	var that = this;


	//create params template
	if (isPlainObject(this.params)) {
		var params = [];
		for (var name in this.params) {
			if (!isPlainObject(this$1.params[name])) {
				this$1.params[name] = {value: this$1.params[name]};
			}
			this$1.params[name].name = name;
			params.push(this$1.params[name]);
		}
		this.params = true;
		this.paramsCollection = params;
	}
	else if (Array.isArray(this.params)){
		this.paramsCollection = this.params;
		this.params = true;
	}
	else {
		this.paramsCollection = [];
	}
	this.paramsEl = document.createElement('div');
	this.paramsEl.classList.add('params');
	this.paramsEl.setAttribute('hidden', true);
	this.paramsEl.innerHTML = "<a class=\"params-close\" href=\"#close-params\"><i class=\"icon-close\">✕</i></a>";
	this.paramsCollection.forEach(function (opts) { return this$1.addParam(opts); });
	this.container.appendChild(this.paramsEl);

	//params button
	this.paramsBtn = document.createElement('a');
	this.paramsBtn.classList.add('params-button');
	this.paramsBtn.href = '#params';
	this.paramsBtn.innerHTML = "<i>" + (this.icons.settings) + "</i>";
	this.paramsBtn.setAttribute('hidden', true);
	this.statusEl.appendChild(this.paramsBtn);

	this.paramsBtn.addEventListener('click', function () {
		if (this$1.paramsEl.hasAttribute('hidden')) {
			this$1.paramsEl.removeAttribute('hidden');
		}
		else {
			this$1.paramsEl.setAttribute('hidden', true);
		}
	});
	this.paramsEl.querySelector('.params-close').addEventListener('click', function () {
		if (this$1.paramsEl.hasAttribute('hidden')) {
			this$1.paramsEl.removeAttribute('hidden');
		}
		else {
			this$1.paramsEl.setAttribute('hidden', true);
		}
	});


	//add gh link
	if (this.github) {
		this.ghLink = document.createElement('a');
		this.ghLink.classList.add('github-link');
		this.ghLink.href = isUrl(this.github) ? this.github : '//github.com/' + this.github;
		this.ghLink.innerHTML = "<i>" + (this.icons.github) + "</i>";
		this.container.appendChild(this.ghLink);
	}


	//enable update routine
	raf(function measure () {
		count++;
		var t = now();
		if (t - last > updatePeriod) {
			var color = that.color;
			var transparentColor = that.transparentColor;
			last = t;
			values.push((count) / (maxFPS * updatePeriod * 0.001));
			values = values.slice(-len);
			count = 0;

			ctx.clearRect(0, 0, w, h);
			ctx.fillStyle = color;
			for (var i = 0; i < len; i++) {
				ctx.fillRect(i, h - h * values[i], 1, h * values[i]);
			}

			fpsValue.innerHTML = (values[values.length - 1]*maxFPS).toFixed(1);
		}

		raf(measure);
	});


	this.update();

	setTimeout(function () {
		if (this$1.source) {
			this$1.setSource(this$1.source, function (err) {
				if (err) this$1.showInput();
				cb && cb(null, this$1.source);
			});
		}
		else {
			cb && cb(null, this$1.source);
		}
	});
}

inherits(StartApp, Emitter);

//Allow dropping files to browser
StartApp.prototype.dragAndDrop = true;

//show playpayse buttons
StartApp.prototype.playPause = true;

//show stop button
StartApp.prototype.stop = true;

//show title of track/status messages
StartApp.prototype.title = true;

//show icon
StartApp.prototype.icon = true;

//Enable file select
StartApp.prototype.file = true;

//Enable url select
StartApp.prototype.url = true;

//Default audio context
StartApp.prototype.context = ctx;

//Enable mic input
StartApp.prototype.mic = !!(navigator.mediaDevices || navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia);

//Default (my) soundcloud API token
StartApp.prototype.token = {
	soundcloud: '6b7ae5b9df6a0eb3fcca34cc3bb0ef14',
	youtube: 'AIzaSyBPxsJRzvSSz_LOpejJhOGPyEzlRxU062M'
};

//display micro fps counter
StartApp.prototype.fps = true;

//autostart play
StartApp.prototype.autoplay = !isMobile;
StartApp.prototype.loop = true;


//enable progress indicator
StartApp.prototype.progress = true;

//icon paths
StartApp.prototype.icons = {
	record: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M757.76 818.347h-696.32c-29.013 0-52.907-23.893-52.907-52.907v-532.48c0-29.013 23.893-52.907 52.907-52.907h696.32c29.013 0 52.907 23.893 52.907 52.907v532.48c0 29.013-23.893 52.907-52.907 52.907zM75.093 751.787h669.013v-505.173h-669.013v505.173z\"></path>\n<path d=\"M574.293 636.588c-69.973 0-128-56.32-128-126.293s56.32-126.293 128-126.293c69.973 0 128 56.32 128 126.293s-58.027 126.293-128 126.293zM574.293 450.561c-32.427 0-59.733 27.307-59.733 59.733s27.307 59.733 59.733 59.733 59.733-27.307 59.733-59.733-27.307-59.733-59.733-59.733z\"></path>\n<path d=\"M241.493 636.588c-69.973 0-128-56.32-128-126.293s56.32-126.293 128-126.293c69.973 0 128 56.32 128 126.293s-58.027 126.293-128 126.293zM241.493 450.561c-32.427 0-59.733 27.307-59.733 59.733s27.307 59.733 59.733 59.733c32.427 0 59.733-27.307 59.733-59.733s-27.307-59.733-59.733-59.733z\"></path>\n<path d=\"M572.607 450.113h-332.8c-18.773 0-34.133-14.88-34.133-33.067s15.36-33.067 34.133-33.067h332.8c18.773 0 34.133 14.88 34.133 33.067s-17.067 33.067-34.133 33.067z\"></path>\n</svg>\n",
	error: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M807.303 756.637l-351.17-607.966c-9.601-16.582-27.188-26.702-46.308-26.702-0.074 0-0.143 0-0.208 0s-0.143 0-0.208 0c-19.112 0-36.699 10.12-46.308 26.702l-351.186 607.966c-9.564 16.643-9.564 37.104 0 53.706 9.511 16.61 27.209 26.775 46.525 26.775h702.348c19.308 0 37.014-10.165 46.525-26.775 9.564-16.598 9.564-37.087-0.008-53.706zM89.419 765.556l320.193-554.297 320.193 554.297h-640.382z\"></path>\n<path d=\"M540.178 663.195l-72.859-74.216 70.995-71.763-57.871-57.242-70.161 70.926-70.746-72.058-58.075 57.025 71.584 72.904-73.991 74.804 57.863 57.242 73.157-73.946 72.033 73.353z\"></path>\n</svg>\n",
	soundcloud: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"1206\" height=\"1024\" viewBox=\"0 0 1206 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M54.937 674.845c0 13.601 4.925 23.883 14.799 30.861 9.861 6.973 20.4 9.443 31.63 7.391 10.545-2.033 17.938-5.785 22.187-11.229 4.246-5.445 6.37-14.459 6.37-27.037v-147.916c0-10.545-3.66-19.475-10.963-26.771-7.315-7.315-16.244-10.963-26.771-10.963-10.203 0-18.954 3.66-26.276 10.963s-10.963 16.244-10.963 26.771v147.916zM172.25 738.092c0 9.861 3.479 17.261 10.461 22.187s15.903 7.391 26.771 7.391c11.229 0 20.311-2.463 27.292-7.391 6.973-4.924 10.461-12.331 10.461-22.187v-344.801c0-10.203-3.662-18.956-10.963-26.276-7.315-7.315-16.245-10.963-26.771-10.963-10.203 0-18.956 3.662-26.276 10.963-7.315 7.315-10.963 16.062-10.963 26.276v344.801zM289.060 754.417c0 9.861 3.569 17.261 10.708 22.187 7.139 4.924 16.321 7.391 27.541 7.391 10.887 0 19.813-2.463 26.771-7.391 6.973-4.925 10.462-12.331 10.462-22.187v-314.708c0-10.545-3.662-19.551-10.963-27.037-7.315-7.477-16.062-11.228-26.276-11.228-10.545 0-19.551 3.743-27.037 11.228s-11.229 16.493-11.229 27.037v314.708zM406.369 755.939c0 18.708 12.584 28.062 37.752 28.062s37.751-9.354 37.751-28.062v-510.062c0-28.557-8.676-44.708-26.011-48.461-11.229-2.717-22.277 0.513-33.155 9.692s-16.321 22.097-16.321 38.769v510.062zM525.728 770.737v-554.954c0-17.689 5.263-28.216 15.815-31.63 22.781-5.445 45.391-8.155 67.845-8.155 52.028 0 100.491 12.245 145.37 36.727 44.891 24.491 81.187 57.893 108.893 100.226 27.721 42.34 43.785 89.014 48.203 140.012 20.739-8.835 42.845-13.262 66.306-13.262 47.602 0 88.331 16.831 122.155 50.493 33.839 33.664 50.749 74.125 50.749 121.392 0 47.602-16.923 88.245-50.749 121.907s-74.385 50.493-121.658 50.493l-443.755-0.513c-3.059-1.016-5.356-2.893-6.893-5.605s-2.299-5.11-2.299-7.142z\"></path>\n</svg>\n",
	open: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M799.019 413.071c-13.274-16.986-33.621-26.933-55.195-26.933v-140.089c0-38.664-31.379-70.045-70.045-70.045h-140.089c-38.664 0-70.045 31.379-70.045 70.045h-350.222c-38.664 0-70.045 31.379-70.045 70.045v420.267c0 38.664 31.379 70.045 70.045 70.045h560.355c32.466 0 59.503-22.205 67.453-52.149 0.105-0.315 0.456-0.595 0.525-0.875l70.045-280.178c5.218-20.944 0.49-43.147-12.783-60.133zM113.424 316.095h420.267v-70.045h140.089v140.089h-490.311c-32.15 0-60.168 21.889-67.943 53.059l-2.101 8.336v-131.438zM673.781 736.361h-560.355l70.045-280.178h560.355l-70.045 280.178z\"></path>\n</svg>\n",
	loading: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M640.327 412.161c-45.569 0-82.591 37.025-82.591 85.44s37.025 85.44 82.591 85.44c45.569 0 82.591-37.025 82.591-85.44s-37.025-85.44-82.591-85.44zM409.639 412.161c-45.569 0-82.591 37.025-82.591 85.44s37.025 85.44 82.591 85.44c45.569 0 82.591-37.025 82.591-85.44s-37.025-85.44-82.591-85.44zM178.951 412.161c-45.569 0-82.591 37.025-82.591 85.44s37.025 85.44 82.591 85.44c45.569 0 82.591-37.025 82.591-85.44s-37.025-85.44-82.591-85.44z\"></path>\n</svg>\n",
	url: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M407.776 122.436c-199.872 0-362.496 162.624-362.496 362.496s162.624 362.496 362.496 362.496 362.496-162.624 362.496-362.496-162.624-362.496-362.496-362.496zM407.776 791.652c-39.826 0-83.1-74.988-101.902-187.459 32.351-4.849 66.514-7.709 101.902-7.709s69.551 2.9 101.902 7.709c-18.801 112.471-62.075 187.459-101.902 187.459zM407.776 540.708c-37.837 0-74.271 2.989-108.846 8.152-1.764-20.485-2.674-41.864-2.674-63.896s0.91-43.411 2.674-63.896c34.574 5.164 71.009 8.152 108.846 8.152s74.271-2.989 108.846-8.152c1.764 20.485 2.674 41.864 2.674 63.896s-0.91 43.411-2.674 63.896c-34.574-5.164-71.009-8.152-108.846-8.152zM101.056 484.932c0-42.775 8.797-83.471 24.738-120.445 32.174 19.486 72.596 34.896 117.948 45.9-2.175 23.885-3.262 48.848-3.262 74.586s1.087 50.612 3.262 74.586c-45.409 11.052-85.775 26.374-117.948 45.9-15.91-37.023-24.738-77.751-24.738-120.526zM407.776 178.212c39.826 0 83.1 74.988 101.902 187.459-32.351 4.809-66.474 7.709-101.902 7.709s-69.551-2.9-101.902-7.709c18.801-112.471 62.075-187.459 101.902-187.459zM571.842 410.346c45.409-11.052 85.726-26.374 117.948-45.9 15.853 36.886 24.738 77.614 24.738 120.389s-8.797 83.471-24.738 120.437c-32.222-19.478-72.596-34.977-117.948-45.9 2.175-23.876 3.262-48.848 3.262-74.586s-1.087-50.476-3.262-74.408zM663.102 315.276c-26.188 16.361-59.852 29.813-98.51 39.609-10.69-63.936-29.137-118.222-53.198-158.314 62.349 22.515 115.499 64.387 151.709 118.673zM304.191 196.603c-24.062 40.060-42.509 94.346-53.198 158.314-38.69-9.828-72.322-23.248-98.51-39.609 36.209-54.286 89.359-96.158 151.709-118.673zM152.482 654.661c26.188-16.401 59.852-29.821 98.51-39.649 10.69 63.936 29.137 118.222 53.198 158.322-62.349-22.563-115.499-64.436-151.709-118.673zM511.361 773.334c24.062-40.1 42.509-94.386 53.198-158.322 38.69 9.828 72.322 23.248 98.51 39.649-36.209 54.237-89.359 96.11-151.709 118.673z\"></path>\n</svg>\n",
	mic: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M409.618 681.692c114.138 0 206.667-92.529 206.667-206.667v-165.333c0-114.138-92.529-206.667-206.667-206.667s-206.667 92.529-206.667 206.667v165.333c0 114.138 92.529 206.667 206.667 206.667z\"></path>\n<path d=\"M368.285 844.589v85.104h82.667v-85.104c185.707-20.667 330.667-178.44 330.667-369.563v-82.667h-82.667v82.667c0 159.547-129.83 289.333-289.333 289.333s-289.333-129.787-289.333-289.333v-82.667h-82.667v82.667c0 191.124 144.96 348.94 330.667 369.563z\"></path>\n</svg>\n",
	play: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M213.308 275.971c0-29.549 23.948-53.504 53.497-53.504 9.185 0 14.999 2.398 25.225 6.47l375.259 218.333c17.454 10.348 25.533 26.969 28.647 46.117v5.376c-3.122 19.144-11.203 35.769-28.647 46.117l-375.251 218.325c-10.245 4.080-16.055 6.462-25.225 6.462-29.549 0-53.497-23.955-53.497-53.504v-440.211z\"></path>\n</svg>\n",
	pause: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M147.010 267.438c0-29.495 23.924-53.417 53.432-53.417h112.295c29.495 0 53.432 23.924 53.432 53.417v424.358c0 29.505-23.924 53.425-53.432 53.425h-112.295c-29.495 0-53.432-23.924-53.432-53.425v-424.358z\"></path>\n<path d=\"M452.99 267.438c0-29.495 23.924-53.417 53.399-53.417h112.302c29.495 0 53.409 23.924 53.409 53.417v424.358c0 29.505-23.912 53.425-53.409 53.425h-112.302c-29.49 0-53.409-23.924-53.409-53.425v-424.358z\"></path>\n</svg>\n",
	stop: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M151.962 291.772c0-32.96 26.713-59.665 59.673-59.665h395.855c32.96 0 59.673 26.713 59.673 59.665v395.863c0 32.96-26.713 59.673-59.673 59.673h-395.855c-32.96 0-59.673-26.714-59.673-59.673v-395.863z\"></path>\n</svg>\n",
	eject: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M654.044 263.724l-342.638 220.083c-9.624 6.419-14.116 16.043-14.116 26.306s4.492 19.886 14.116 26.306l343.277 220.722c20.535 13.477 48.12-1.283 48.12-26.306v-440.804c-0.639-25.025-27.594-39.783-48.77-26.306z\"></path>\n<path d=\"M233.766 257.946h-44.915c-34.655 0-62.885 28.233-62.885 62.885v378.568c0 34.655 28.233 62.885 62.885 62.885h44.915c34.655 0 62.885-28.233 62.885-62.885v-378.568c0-34.655-28.233-62.885-62.885-62.885z\"></path>\n</svg>\n",
	settings: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"819\" height=\"1024\" viewBox=\"0 0 819 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M195.945 218.371h452.727c35.966 0 64.683 28.663 64.683 64.104 0 35.449-28.717 63.734-64.683 63.734h-452.727c-35.587 0-64.683-28.285-64.683-63.734s29.082-64.104 64.683-64.104v0z\"></path>\n<path d=\"M197.089 431.455h452.727c35.587 0 64.683 28.286 64.683 63.726 0 35.449-29.088 64.129-64.683 64.129h-452.727c-35.968 0-64.675-28.67-64.675-64.129 0-35.449 28.705-63.726 64.675-63.726v0z\"></path>\n<path d=\"M196.324 644.158h452.727c35.966 0 64.683 28.663 64.683 64.1 0 35.068-28.717 63.754-64.683 63.754h-452.727c-35.968 0-64.675-28.682-64.675-63.754 0-35.439 28.705-64.1 64.675-64.1v0z\"></path>\n</svg>\n",
	github: "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<!-- Generated by IcoMoon.io -->\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\n<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"784\" height=\"1024\" viewBox=\"0 0 784 1024\">\n<g id=\"icomoon-ignore\">\n</g>\n<path d=\"M4.168 480.005q0 107.053 52.114 194.314 52.114 90.085 141.399 141.799t194.314 51.714q105.441 0 195.126-51.714 89.685-52.114 141.199-141.599t51.514-194.514q0-106.652-51.714-195.126-52.114-89.685-141.599-141.199t-194.514-51.514q-107.053 0-194.314 52.114-90.085 52.114-141.799 141.399t-51.714 194.314zM68.802 480.005q0-64.634 25.451-124.832t69.482-103.828q44.031-44.031 103.828-69.282t124.432-25.251 124.832 25.251 104.229 69.282q43.631 43.631 68.882 103.828t25.251 124.832q0 69.482-28.487 132.504t-79.989 108.876-117.76 66.458v-113.924q0-42.419-34.747-66.257 85.238-7.672 124.632-43.23t39.383-112.712q0-59.786-36.759-100.593 7.272-21.815 7.272-42.018 0-29.899-13.732-54.939-27.063 0-48.478 8.884t-52.515 30.699q-37.571-8.484-77.565-8.484-45.654 0-85.238 9.295-30.299-22.216-52.314-31.311t-49.891-9.084q-13.332 25.451-13.332 54.939 0 21.004 6.871 42.419-36.759 39.594-36.759 100.192 0 77.165 39.183 112.312t125.644 43.23q-23.027 15.355-31.911 44.843-19.792 6.871-41.207 6.871-16.156 0-27.875-7.272-3.636-2.024-6.66-4.236t-6.26-5.448-5.248-5.048-5.248-6.26-4.236-5.659-4.848-6.46-4.236-5.659q-18.991-25.051-45.243-25.051-14.143 0-14.143 6.060 0 2.424 6.871 8.083 12.931 11.308 13.732 12.12 9.696 7.672 10.908 9.696 11.719 14.544 17.779 31.911 22.627 50.502 77.565 50.502 8.884 0 34.747-4.036v85.649q-66.257-20.603-117.76-66.458t-79.989-108.876-28.487-132.504z\"></path>\n</svg>\n"
};

//do mobile routines like meta, splashscreen etc
StartApp.prototype.mobile = true;

//show params button
StartApp.prototype.params = true;

StartApp.prototype.github = 'dfcreative/start-app';

/**
 * Init settings
 */
StartApp.prototype.update = function (opts) {
	var this$1 = this;

	extend(this, opts);

	if (this.color) {
		this.setColor(this.color);
	}

	if (this.dragAndDrop && !this.isDnD) {
		this.isDnD = true;
		var title, icon, target;

		this.container.addEventListener('dragstart', function (e) {
			//ignore dragging the container
			//FIXME: maybe we need a bit more specifics here, by components
			e.preventDefault();
			return false;
		}, false);
		this.container.addEventListener('dragenter', function (e) {
			if (target) return;
			target = e.target;
			// if (e.target != this.container) return;

			this$1.container.classList.add('dragover');
			e.dataTransfer.dropEffect = 'copy';

			//save initial values
			title = this$1.sourceTitle.innerHTML;
			icon = this$1.sourceIcon.innerHTML;

			var dt = e.dataTransfer;
			var list = dt.files, src;

			this$1.hideInput();
			this$1.sourceTitle.innerHTML = "drop audio file";
			this$1.sourceIcon.setAttribute('title', this$1.sourceTitle.textContent);
			this$1.sourceIcon.innerHTML = this$1.icons.record;
		});

		this.container.addEventListener('dragleave', function (e) {
			if (e.target != this$1.container) return;

			target = null;
			this$1.container.classList.remove('dragover');
			if (this$1.source) {
				this$1.sourceTitle.innerHTML = title;
				this$1.sourceIcon.setAttribute('title', this$1.sourceTitle.textContent);
				this$1.sourceIcon.innerHTML = icon;
			}
			else {
				this$1.showInput();
			}
		}, false);

		this.container.addEventListener('drop', function (e) {
			e.preventDefault();
			this$1.container.classList.remove('dragover');
			target = null;

			var dt = e.dataTransfer;
			this$1.setSource(dt.files, function (err, data) {
				if (err) {
					this$1.sourceTitle.innerHTML = title;
					this$1.sourceIcon.setAttribute('title', this$1.sourceTitle.textContent);
					this$1.sourceIcon.innerHTML = icon;
				}
			});
		}, false);

		this.container.addEventListener('dragover', function (e) {
			e.preventDefault();
		}, false);
	}

	if (this.fps) {
		this.fpsEl.removeAttribute('hidden');
	}
	else {
		this.fpsEl.setAttribute('hidden', true);
	}

	if (this.title) {
		this.sourceTitle.removeAttribute('hidden');
	} else {
		this.sourceTitle.setAttribute('hidden', true);
	}

	if (this.icon) {
		this.sourceIcon.removeAttribute('hidden');
	} else {
		this.sourceIcon.setAttribute('hidden', true);
	}

	if (this.params) {
		this.paramsBtn.removeAttribute('hidden');
	} else {
		this.paramsBtn.setAttribute('hidden', true);
	}

	return this;
};


//inner method for setting color
StartApp.prototype.setColor = function (color) {
	this.color = color = color || this.color;

	var parsed = colorParse(color);

	if (parsed.space === 'hsl') {
		var values = hsl.rgb(parsed.values);
	}
	else {
		var values = parsed.values;
	}
	this.colorValues = values;

	var yiq = (values[0] * 299 + values[1] * 587 + values[2] * 114) / (1000);
	var isDark = yiq < 128;

	var inverseValues = values.map(function (v) { return 255 - v; }).map(function (v) { return v * ( !isDark ? .2 : 1.8); }).map(function (v) { return Math.max(Math.min(v, 255), 0); }).map(function (v) { return !isDark ? v*.2 : 255*.8+v*.2; });
	this.color = "rgba(" + (values.join(', ')) + ", " + (parsed.alpha) + ")";
	this.inverseColor = "rgba(" + (inverseValues.map(function (v) { return v.toFixed(0); }).join(', ')) + ", " + (parsed.alpha) + ")";
	this.transparentColor = "rgba(" + (values.join(', ')) + ", 0.1)";
	this.semiTransparentColor = "rgba(" + (values.join(', ')) + ", 0.25)";

	var semiTransparentInverseColor = "rgba(" + (inverseValues.map(function (v) { return v.toFixed(0); }).join(', ')) + ", .75)";

	this.styleEl.innerHTML = "\n\t\t." + className + " {\n\t\t\tcolor: " + (this.color) + ";\n\t\t}\n\t\t." + className + " .source-input,\n\t\t." + className + " .source-link\n\t\t{\n\t\t\tbox-shadow: 0 2px " + (this.semiTransparentColor) + ";\n\t\t}\n\t\t." + className + " .source-input:focus,\n\t\t." + className + " .source-link:hover\n\t\t{\n\t\t\tbox-shadow: 0 2px " + (this.color) + ";\n\t\t}\n\n\t\t." + className + " .params {\n\t\t\tbackground: linear-gradient(to bottom, rgba(" + (inverseValues.map(function (v) { return v.toFixed(0); }).join(', ')) + ", .5), rgba(" + (inverseValues.map(function (v) { return v.toFixed(0); }).join(', ')) + ", .75));\n\t\t}\n\n\t\t." + className + " .params-button {\n\t\t\tcolor: " + (this.color) + "\n\t\t}\n\n\t\t::selection{\n\t\t\tbackground: " + (this.semiTransparentColor) + ";\n\t\t\tcolor: " + (this.inverseColor) + ";\n\t\t}\n\t\t::-moz-selection{\n\t\t\tbackground: " + (this.semiTransparentColor) + ";\n\t\t\tcolor: " + (this.inverseColor) + ";\n\t\t}\n\n\t\t." + className + " .fps-canvas { background:" + (this.transparentColor) + "; }\n\n\t\t::-moz-placeholder { color:" + (this.semiTransparentColor) + "; }\n\t\tinput:-moz-placeholder { color:" + (this.semiTransparentColor) + "; }\n\t\t:-ms-input-placeholder { color:" + (this.semiTransparentColor) + "; }\n\t\t::-webkit-input-placeholder { color:" + (this.semiTransparentColor) + "; }\n\t";

	return this;
};


/**
 * Set source to play
 */
StartApp.prototype.setSource = function (src, cb) {
	var this$1 = this;

	var self = this;

	//Undefined source - no action
	if (!src) {
		return this;
	}

	this.hideInput();

	//find first audio file from the list
	if (src instanceof FileList) {
		var list = src;
		src = null;

		for (var i = 0; i < list.length; i++) {
			if (/audio/.test(list[i].type)) {
				src = list[i];
				break;
			}
		}

		if (!src) {
			this.sourceTitle.innerHTML = "not an audio";
			this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
			this.sourceIcon.innerHTML = this.icons.error;
			setTimeout(function () {
				if (!this$1.source) this$1.showInput();
				cb && cb(new Error('Not an audio'));
			}, 1000);
			return this;
		}
	}

	//File instance case
	if (src instanceof File) {
		var url = URL.createObjectURL(src);
		this.sourceIcon.innerHTML = this.icons.record;
		this.sourceTitle.innerHTML = "<a class=\"source-link\" href=\"" + url + "\" target=\"_blank\" title=\"" + (src.name) + "\"><span class=\"text-length-limiter\">" + (src.name) + "</span></a>";
		this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);

		this.source = url;

		this.player = createPlayer(url, {
			context: this.context,
			loop: this.loop,
			buffer: isMobile,
			crossOrigin: 'Anonymous'
		}).on('load', function () {
			this$1.emit('source', this$1.player.node, url);
			cb && cb(null, url);
			this$1.autoplay && this$1.play();
		});

		this.playPause && this.audioEl.removeAttribute('hidden');
		this.stop && this.audioStop.removeAttribute('hidden');


		return this;
	}


	if (/soundcloud/.test(src)) {
		this.sourceIcon.innerHTML = this.icons.loading;
		this.sourceTitle.innerHTML = 'connecting to soundcloud';
		this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
		var token = this.token.soundcloud || this.token;

		//sad ios workaround
		if (isMobile) {
			xhr({
				uri: ("https://api.soundcloud.com/resolve.json?client_id=" + (this.token.soundcloud || this.token) + "&url=" + src + "&format=json"),
				method: 'GET'
			}, function () {
				xhr({
					uri: ("https://api.soundcloud.com/resolve.json?client_id=" + (this$1.token.soundcloud || this$1.token) + "&url=" + src + "&_status_code_map[302]=200&format=json"),
					method: 'GET'
				}, function (err, response) {
					if (err) return showError(err);

					var obj = JSON.parse(response.body);
					xhr({
						uri: obj.location,
						method: 'GET'
					}, function (err, response) {
						if (err) return showError(err);

						var json = JSON.parse(response.body);

						setSoundcloud(json);
					});
				});
			});
		}

		else {
			xhr({
				uri: ("https://api.soundcloud.com/resolve.json?client_id=" + (this.token.soundcloud || this.token) + "&url=" + src),
				method: 'GET'
			}, function (err, response) {
				if (err) {
					return showError(err);
				}

				var json = JSON.parse(response.body);

				setSoundcloud(json);
			});
		}

		function setSoundcloud (json) {
			var streamUrl = json.stream_url + '?client_id=' + token;

			//FIXME: play list of tracks properly
			if (json.tracks) {
				var id = Math.floor(Math.random() * json.tracks.length);
				return self.setSource(json.tracks[id].permalink_url, cb);
			}

			self.source = streamUrl;

			var titleHtml = "<a class=\"source-link\" href=\"" + (json.permalink_url) + "\" target=\"_blank\" title=\"" + (json.title) + "\"><span class=\"text-length-limiter\">" + (json.title) + "</span></a>";
			if (json.user) {
				titleHtml += " by <a class=\"source-link\" href=\"" + (json.user.permalink_url) + "\" target=\"_blank\" title=\"" + (json.user.username) + "\"><span class=\"text-length-limiter\">" + (json.user.username) + "</span></a>\n\t\t\t\t";
			}

			// self.audio.src = streamUrl;
			self.player = createPlayer(streamUrl, {
				context: self.context,
				loop: self.loop,
				buffer: isMobile,
				crossOrigin: 'Anonymous'
			})
			.on('load', function () {
				self.sourceIcon.innerHTML = self.icons.soundcloud;
				self.sourceTitle.innerHTML = titleHtml;
				self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
				self.emit('source', self.player.node, streamUrl);
				cb && cb(null, self.player.node, streamUrl);
				self.autoplay && self.play();

				self.playPause && self.audioEl.removeAttribute('hidden');
				self.stop && self.audioStop.removeAttribute('hidden');
			})
			.on('decoding', function () {
				self.sourceTitle.innerHTML = "decoding " + titleHtml;
			})
			.on('progress', function (e) {
				if (e === 0) return;
				self.sourceTitle.innerHTML = "loading " + titleHtml;
			})
			.on('error', function (err) {
				showError(err);
			})
		}
	}

	// else if (/youtu/.test(url.hostname)) {
	// 	this.sourceIcon.innerHTML = this.icons.loading;
	// 	this.sourceTitle.innerHTML = 'connecting to youtube';
	// 	var token = this.token.youtube || this.token;


	// 	self.source = url.href;
	// 	self.audio.src = url.href;
	//
	// 	self.audioEl.removeAttribute('hidden');
	// 	self.audioStop.removeAttribute('hidden');
	// }

	//default url
	else {
		// if (!isUrl(src)) {
		// 	showError();
		// 	return this;
		// }

		self.sourceIcon.innerHTML = self.icons.loading;
		self.sourceTitle.innerHTML = "loading " + src;

		//FIXME: avoid this double-request
		xhr({
			uri: src
		}, function (err, resp) {
			if (err) return showError(err);
			if (resp.statusCode !== 200) return showError(src + ' not found');

			// self.audio.src = src;
			self.player = createPlayer(src, {
				context: self.context,
				loop: self.loop,
				buffer: isMobile, //FIXME: this can be always false here i guess
				crossOrigin: 'Anonymous'
			}).on('load', function () {
				self.source = src;

				self.sourceTitle.innerHTML = "\n\t\t\t\t\t<a class=\"source-link\" href=\"" + src + "\" target=\"_blank\" title=\"Open " + src + "\"><span class=\"text-length-limiter\">" + src + "</span></a>\n\t\t\t\t";
				self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
				self.playPause && self.audioEl.removeAttribute('hidden');
				self.stop && self.audioStop.removeAttribute('hidden');

				self.emit('source', self.player.node, src);
				cb && cb(null, self.player.node, src);
				self.autoplay && self.play();
			}).on('error', function (err) {
				showError(err);
			});
		});

	}

	function showError (err) {
		self.sourceTitle.innerHTML = err || "bad URL";
		self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
		self.sourceIcon.innerHTML = self.icons.error;
		setTimeout(function () {
			cb && cb('Bad url');
		}, 1500);
	}

	return this;
};


/**
 * Show/hide source input default view
 */
StartApp.prototype.showInput = function () {
	this.sourceLinks.removeAttribute('hidden');
	this.sourceInputURL.setAttribute('hidden', true);
	this.sourceIcon.innerHTML = this.file ? this.icons.open : this.url ? this.icons.url : this.mic ? this.icons.mic : this.icons.open;
	this.sourceTitle.innerHTML = '';
	this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
	this.audioEl.setAttribute('hidden', true);

	return this;
}

StartApp.prototype.hideInput = function () {
	this.sourceLinks.setAttribute('hidden', true);

	return this;
};


/**
 * Play/stop/reset audio
 */
StartApp.prototype.play = function () {
	this.audioEl.title = "Pause";
	this.audioIcon.innerHTML = this.icons.pause;
	this.playPause && this.stop && this.audioStop.setAttribute('hidden', true);

	if (!this.player) throw Error('Set audio source');
	this.player.play();
	this.emit('play', this.player.node);

	return this;
}
StartApp.prototype.pause = function () {
	this.audioEl.title = "Play";
	this.audioIcon.innerHTML = this.icons.play;
	this.playPause && this.stop && this.audioStop.removeAttribute('hidden');

	if (!this.player) throw Error('Set audio source');
	this.player.pause();
	this.emit('pause', this.player.node);

	return this;
}
StartApp.prototype.reset = function () {
	this.source = '';
	this.sourceTitle.innerHTML = '';
	this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
	this.sourceInputURL.value = '';
	this.showInput();


	if (this.micNode) {
		this.micNode.disconnect();
	}

	if (!this.player) throw Error('Set audio source');
	this.pause();
	this.player.stop();
	// this.audio.currentTime = 0;
	// this.audio.src = '';

	this.emit('stop', this.player.node);

	this.audioStop.querySelector('i').innerHTML = this.icons.eject;
	this.stop && this.audioStop.setAttribute('hidden', true);

	return this;
}
StartApp.prototype.getTime = function (time) {
	return pad((time / 60)|0, 2, 0) + ':' + pad((time % 60)|0, 2, 0);
}


/** Create param based off options */
StartApp.prototype.addParam = function (name, opts, cb) {
	if (isPlainObject(name)) {
		cb = opts;
		opts = name;
		name = opts.name;
	}
	if (opts instanceof Function) {
		cb = opts;
		opts = {};
	}

	if (!isPlainObject(opts)) {
		opts = {value: opts}
	}

	if (typeof name === 'string') {
		opts.name = name;
	}

	var type = opts.type || 'text';
	cb = cb || opts.change || opts.cb;

	var el = document.createElement('div');
	el.classList.add('param');
	var title = opts.name.slice(0,1).toUpperCase() + opts.name.slice(1);
	var name = opts.name.toLowerCase();
	name = name.replace(/\s/g, '-');
	el.innerHTML = "<label for=\"" + name + "\" class=\"param-label\">" + title + "</label>";

	if (!opts.type) {
		if (opts.values) {
			opts.type = 'select';
		}
		else if (opts.min || opts.max || opts.step || typeof opts.value === 'number') {
			opts.type = 'range';
		}
		else if (typeof opts.value === 'boolean') {
			opts.type = 'checkbox';
		}
	}

	switch (opts.type) {
		case 'select':
			opts = extend({
				values: {},
				name: 'noname-select'
			}, opts);
			var html = "<select\n\t\t\t\tid=\"" + name + "\" class=\"param-input param-select\" title=\"" + (opts.value) + "\">";
			if (Array.isArray(opts.values)) {
				for (var i = 0; i < opts.values.length; i++) {
					html += "<option value=\"" + (opts.values[i]) + "\" " + (opts.values[i] === opts.value ? 'selected' : '') + ">" + (opts.values[i]) + "</option>"
				}
			}
			else {
				for (var name in opts.values) {
					html += "<option value=\"" + (opts.values[name]) + "\" " + (opts.values[name] === opts.value ? 'selected' : '') + ">" + name + "</option>"
				}
			}
			html += "</select>";

			el.innerHTML +=	html;
			break;

		case 'range':
			opts = extend({
				min: 0,
				max: 1,
				step: 0.01,
				value: .5,
				name: 'noname-range'
			}, opts);
			el.innerHTML += "<input\n\t\t\t\tid=\"" + (opts.name) + "\" type=\"range\" class=\"param-input param-range\" value=\"" + (opts.value) + "\" min=\"" + (opts.min) + "\" max=\"" + (opts.max) + "\" step=\"" + (opts.step) + "\" title=\"" + (opts.value) + "\"/>\n\t\t\t";
			break;


		case 'checkbox':
			opts = extend({
				value: false,
				name: 'noname-checkbox'
			}, opts);
			el.innerHTML += "<input\n\t\t\t\tid=\"" + (opts.name) + "\" type=\"checkbox\" class=\"param-input param-checkbox\" title=\"" + (opts.value) + "\" " + (opts.value ? 'checked' : '') + "/>\n\t\t\t";
			break;

		case 'number':
			opts = extend({
				min: 0,
				max: 1,
				step: 0.01,
				value: .5,
				name: 'noname-number'
			}, opts);
			el.innerHTML += "<input\n\t\t\t\tid=\"" + (opts.name) + "\" type=\"number\" class=\"param-input param-number\" value=\"" + (opts.value) + "\" min=\"" + (opts.min) + "\" max=\"" + (opts.max) + "\" step=\"" + (opts.step) + "\" title=\"" + (opts.value) + "\"/>\n\t\t\t";
			break;

		default:
			opts = extend({
				name: 'noname-text',
				value: ''
			}, opts);
			el.innerHTML += "<input placeholder=\"value...\" id=\"" + (opts.name) + "\" class=\"param-input param-text\" value=\"" + (opts.value) + "\" title=\"" + (opts.value) + "\"/>\n\t\t\t";
			break;

	}

	opts.element = el;

	var self = this;
	el.querySelector('input, select').addEventListener('input', change);
	el.querySelector('input, select').addEventListener('change', change);

	function change () {
		var v = this.type === 'checkbox' ? this.checked : (this.type === 'number' || this.type === 'range') ? parseFloat(this.value) : this.value;
		this.title = v;
		cb && cb.call(self, v, opts);
		self.emit('change', opts.name, v, opts);
	};

	this.paramsEl.appendChild(el);

	return el;
};

//return value of defined param
StartApp.prototype.getParamValue = function (name) {
	var el = this.paramsEl.querySelector('#' + name.toLowerCase());

	return el && el.type === 'checkbox' ? el.checked : el && el.value;
}
},{"audio-context":4,"color-parse":8,"color-space/hsl":9,"events":1,"get-float-time-domain-data":12,"inherits":14,"insert-css":15,"is-mobile":18,"is-url":19,"left-pad":20,"mutype/is-object":21,"raf":25,"right-now":26,"web-audio-player":29,"xhr":38,"xtend/mutable":42}],4:[function(require,module,exports){
var window = require('global/window');

var Context = window.AudioContext || window.webkitAudioContext;
if (Context) module.exports = new Context;

},{"global/window":13}],5:[function(require,module,exports){
// sourced from:
// http://www.leanbackplayer.com/test/h5mt.html
// https://github.com/broofa/node-mime/blob/master/types.json
var mimeTypes = require('./mime-types.json')

var mimeLookup = {}
Object.keys(mimeTypes).forEach(function (key) {
  var extensions = mimeTypes[key]
  extensions.forEach(function (ext) {
    mimeLookup[ext] = key
  })
})

module.exports = function lookup (ext) {
  if (!ext) throw new TypeError('must specify extension string')
  if (ext.indexOf('.') === 0) {
    ext = ext.substring(1)
  }
  return mimeLookup[ext.toLowerCase()]
}

},{"./mime-types.json":6}],6:[function(require,module,exports){
module.exports={
  "audio/midi": ["mid", "midi", "kar", "rmi"],
  "audio/mp4": ["mp4a", "m4a"],
  "audio/mpeg": ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"],
  "audio/ogg": ["oga", "ogg", "spx"],
  "audio/webm": ["weba"],
  "audio/x-matroska": ["mka"],
  "audio/x-mpegurl": ["m3u"],
  "audio/wav": ["wav"],
  "video/3gpp": ["3gp"],
  "video/3gpp2": ["3g2"],
  "video/mp4": ["mp4", "mp4v", "mpg4"],
  "video/mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v"],
  "video/ogg": ["ogv"],
  "video/quicktime": ["qt", "mov"],
  "video/webm": ["webm"],
  "video/x-f4v": ["f4v"],
  "video/x-fli": ["fli"],
  "video/x-flv": ["flv"],
  "video/x-m4v": ["m4v"],
  "video/x-matroska": ["mkv", "mk3d", "mks"]
}
},{}],7:[function(require,module,exports){
module.exports = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aqua": [0, 255, 255],
	"aquamarine": [127, 255, 212],
	"azure": [240, 255, 255],
	"beige": [245, 245, 220],
	"bisque": [255, 228, 196],
	"black": [0, 0, 0],
	"blanchedalmond": [255, 235, 205],
	"blue": [0, 0, 255],
	"blueviolet": [138, 43, 226],
	"brown": [165, 42, 42],
	"burlywood": [222, 184, 135],
	"cadetblue": [95, 158, 160],
	"chartreuse": [127, 255, 0],
	"chocolate": [210, 105, 30],
	"coral": [255, 127, 80],
	"cornflowerblue": [100, 149, 237],
	"cornsilk": [255, 248, 220],
	"crimson": [220, 20, 60],
	"cyan": [0, 255, 255],
	"darkblue": [0, 0, 139],
	"darkcyan": [0, 139, 139],
	"darkgoldenrod": [184, 134, 11],
	"darkgray": [169, 169, 169],
	"darkgreen": [0, 100, 0],
	"darkgrey": [169, 169, 169],
	"darkkhaki": [189, 183, 107],
	"darkmagenta": [139, 0, 139],
	"darkolivegreen": [85, 107, 47],
	"darkorange": [255, 140, 0],
	"darkorchid": [153, 50, 204],
	"darkred": [139, 0, 0],
	"darksalmon": [233, 150, 122],
	"darkseagreen": [143, 188, 143],
	"darkslateblue": [72, 61, 139],
	"darkslategray": [47, 79, 79],
	"darkslategrey": [47, 79, 79],
	"darkturquoise": [0, 206, 209],
	"darkviolet": [148, 0, 211],
	"deeppink": [255, 20, 147],
	"deepskyblue": [0, 191, 255],
	"dimgray": [105, 105, 105],
	"dimgrey": [105, 105, 105],
	"dodgerblue": [30, 144, 255],
	"firebrick": [178, 34, 34],
	"floralwhite": [255, 250, 240],
	"forestgreen": [34, 139, 34],
	"fuchsia": [255, 0, 255],
	"gainsboro": [220, 220, 220],
	"ghostwhite": [248, 248, 255],
	"gold": [255, 215, 0],
	"goldenrod": [218, 165, 32],
	"gray": [128, 128, 128],
	"green": [0, 128, 0],
	"greenyellow": [173, 255, 47],
	"grey": [128, 128, 128],
	"honeydew": [240, 255, 240],
	"hotpink": [255, 105, 180],
	"indianred": [205, 92, 92],
	"indigo": [75, 0, 130],
	"ivory": [255, 255, 240],
	"khaki": [240, 230, 140],
	"lavender": [230, 230, 250],
	"lavenderblush": [255, 240, 245],
	"lawngreen": [124, 252, 0],
	"lemonchiffon": [255, 250, 205],
	"lightblue": [173, 216, 230],
	"lightcoral": [240, 128, 128],
	"lightcyan": [224, 255, 255],
	"lightgoldenrodyellow": [250, 250, 210],
	"lightgray": [211, 211, 211],
	"lightgreen": [144, 238, 144],
	"lightgrey": [211, 211, 211],
	"lightpink": [255, 182, 193],
	"lightsalmon": [255, 160, 122],
	"lightseagreen": [32, 178, 170],
	"lightskyblue": [135, 206, 250],
	"lightslategray": [119, 136, 153],
	"lightslategrey": [119, 136, 153],
	"lightsteelblue": [176, 196, 222],
	"lightyellow": [255, 255, 224],
	"lime": [0, 255, 0],
	"limegreen": [50, 205, 50],
	"linen": [250, 240, 230],
	"magenta": [255, 0, 255],
	"maroon": [128, 0, 0],
	"mediumaquamarine": [102, 205, 170],
	"mediumblue": [0, 0, 205],
	"mediumorchid": [186, 85, 211],
	"mediumpurple": [147, 112, 219],
	"mediumseagreen": [60, 179, 113],
	"mediumslateblue": [123, 104, 238],
	"mediumspringgreen": [0, 250, 154],
	"mediumturquoise": [72, 209, 204],
	"mediumvioletred": [199, 21, 133],
	"midnightblue": [25, 25, 112],
	"mintcream": [245, 255, 250],
	"mistyrose": [255, 228, 225],
	"moccasin": [255, 228, 181],
	"navajowhite": [255, 222, 173],
	"navy": [0, 0, 128],
	"oldlace": [253, 245, 230],
	"olive": [128, 128, 0],
	"olivedrab": [107, 142, 35],
	"orange": [255, 165, 0],
	"orangered": [255, 69, 0],
	"orchid": [218, 112, 214],
	"palegoldenrod": [238, 232, 170],
	"palegreen": [152, 251, 152],
	"paleturquoise": [175, 238, 238],
	"palevioletred": [219, 112, 147],
	"papayawhip": [255, 239, 213],
	"peachpuff": [255, 218, 185],
	"peru": [205, 133, 63],
	"pink": [255, 192, 203],
	"plum": [221, 160, 221],
	"powderblue": [176, 224, 230],
	"purple": [128, 0, 128],
	"rebeccapurple": [102, 51, 153],
	"red": [255, 0, 0],
	"rosybrown": [188, 143, 143],
	"royalblue": [65, 105, 225],
	"saddlebrown": [139, 69, 19],
	"salmon": [250, 128, 114],
	"sandybrown": [244, 164, 96],
	"seagreen": [46, 139, 87],
	"seashell": [255, 245, 238],
	"sienna": [160, 82, 45],
	"silver": [192, 192, 192],
	"skyblue": [135, 206, 235],
	"slateblue": [106, 90, 205],
	"slategray": [112, 128, 144],
	"slategrey": [112, 128, 144],
	"snow": [255, 250, 250],
	"springgreen": [0, 255, 127],
	"steelblue": [70, 130, 180],
	"tan": [210, 180, 140],
	"teal": [0, 128, 128],
	"thistle": [216, 191, 216],
	"tomato": [255, 99, 71],
	"turquoise": [64, 224, 208],
	"violet": [238, 130, 238],
	"wheat": [245, 222, 179],
	"white": [255, 255, 255],
	"whitesmoke": [245, 245, 245],
	"yellow": [255, 255, 0],
	"yellowgreen": [154, 205, 50]
};
},{}],8:[function(require,module,exports){
/**
 * @module color-parse
 */

module.exports = parse;


var names = require('color-name');


/**
 * Base hues
 * http://dev.w3.org/csswg/css-color/#typedef-named-hue
 */
//FIXME: use external hue detector
var baseHues = {
	red: 0,
	orange: 60,
	yellow: 120,
	green: 180,
	blue: 240,
	purple: 300
};


/**
 * Parse color from the string passed
 *
 * @return {Object} A space indicator `space`, an array `values` and `alpha`
 */
function parse (cstr) {
	var m, parts = [0,0,0], alpha = 1, space = 'rgb';

	//keyword
	if (names[cstr]) {
		parts = names[cstr].slice();
	}

	//reserved words
	else if (cstr === 'transparent') alpha = 0;

	//color space
	else if (m = /^((?:rgb|hs[lvb]|hwb|cmyk?|xy[zy]|gray|lab|lchu?v?|[ly]uv|lms)a?)\s*\(([^\)]*)\)/.exec(cstr)) {
		var name = m[1];
		var base = name.replace(/a$/, '');
		space = base;
		var size = base === 'cmyk' ? 4 : base === 'gray' ? 1 : 3;
		parts = m[2].trim()
			.split(/\s*,\s*/)
			.map(function (x, i) {
				//<percentage>
				if (/%$/.test(x)) {
					//alpha
					if (i === size)	return parseFloat(x) / 100;
					//rgb
					if (base === 'rgb') return parseFloat(x) * 255 / 100;
					return parseFloat(x);
				}
				//hue
				else if (base[i] === 'h') {
					//<deg>
					if (/deg$/.test(x)) {
						return parseFloat(x);
					}
					//<base-hue>
					else if (baseHues[x] !== undefined) {
						return baseHues[x];
					}
				}
				return parseFloat(x);
			});

		if (name === base) parts.push(1);
		alpha = parts[size] === undefined ? 1 : parts[size];
		parts = parts.slice(0, size);
	}

	//hex
	else if (/^#[A-Fa-f0-9]+$/.test(cstr)) {
		var base = cstr.replace(/^#/,'');
		var size = base.length;
		var isShort = size <= 4;

		parts = base.split(isShort ? /(.)/ : /(..)/);
		parts = parts.filter(Boolean)
			.map(function (x) {
				if (isShort) {
					return parseInt(x + x, 16);
				}
				else {
					return parseInt(x, 16);
				}
			});

		if (parts.length === 4) {
			alpha = parts[3] / 255;
			parts = parts.slice(0,3);
		}
		if (!parts[0]) parts[0] = 0;
		if (!parts[1]) parts[1] = 0;
		if (!parts[2]) parts[2] = 0;
	}

	//named channels case
	else if (cstr.length > 10 && /[0-9](?:\s|\/)/.test(cstr)) {
		parts = cstr.match(/([0-9]+)/g).map(function (value) {
			return parseFloat(value);
		});

		space = cstr.match(/([a-z])/ig).join('').toLowerCase();
	}

	else {
		throw Error('Unable to parse ' + cstr);
	}

	return {
		space: space,
		values: parts,
		alpha: alpha
	};
}
},{"color-name":7}],9:[function(require,module,exports){
/**
 * @module color-space/hsl
 */

var rgb = require('./rgb');

module.exports = {
	name: 'hsl',
	min: [0,0,0],
	max: [360,100,100],
	channel: ['hue', 'saturation', 'lightness'],
	alias: ['HSL'],

	rgb: function(hsl) {
		var h = hsl[0] / 360,
				s = hsl[1] / 100,
				l = hsl[2] / 100,
				t1, t2, t3, rgb, val;

		if (s === 0) {
			val = l * 255;
			return [val, val, val];
		}

		if (l < 0.5) {
			t2 = l * (1 + s);
		}
		else {
			t2 = l + s - l * s;
		}
		t1 = 2 * l - t2;

		rgb = [0, 0, 0];
		for (var i = 0; i < 3; i++) {
			t3 = h + 1 / 3 * - (i - 1);
			if (t3 < 0) {
				t3++;
			}
			else if (t3 > 1) {
				t3--;
			}

			if (6 * t3 < 1) {
				val = t1 + (t2 - t1) * 6 * t3;
			}
			else if (2 * t3 < 1) {
				val = t2;
			}
			else if (3 * t3 < 2) {
				val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
			}
			else {
				val = t1;
			}

			rgb[i] = val * 255;
		}

		return rgb;
	}
};


//extend rgb
rgb.hsl = function(rgb) {
	var r = rgb[0]/255,
			g = rgb[1]/255,
			b = rgb[2]/255,
			min = Math.min(r, g, b),
			max = Math.max(r, g, b),
			delta = max - min,
			h, s, l;

	if (max === min) {
		h = 0;
	}
	else if (r === max) {
		h = (g - b) / delta;
	}
	else if (g === max) {
		h = 2 + (b - r) / delta;
	}
	else if (b === max) {
		h = 4 + (r - g)/ delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	l = (min + max) / 2;

	if (max === min) {
		s = 0;
	}
	else if (l <= 0.5) {
		s = delta / (max + min);
	}
	else {
		s = delta / (2 - max - min);
	}

	return [h, s * 100, l * 100];
};
},{"./rgb":10}],10:[function(require,module,exports){
/**
 * RGB space.
 *
 * @module  color-space/rgb
 */

module.exports = {
	name: 'rgb',
	min: [0,0,0],
	max: [255,255,255],
	channel: ['red', 'green', 'blue'],
	alias: ['RGB']
};
},{}],11:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":17}],12:[function(require,module,exports){
(function (global){
"use strict";

if (global.AnalyserNode && !global.AnalyserNode.prototype.getFloatTimeDomainData) {
  var uint8 = new Uint8Array(2048);
  global.AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
    this.getByteTimeDomainData(uint8);
    for (var i = 0, imax = array.length; i < imax; i++) {
      array[i] = (uint8[i] - 128) * 0.0078125;
    }
  };
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],13:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],14:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],15:[function(require,module,exports){
var inserted = {};

module.exports = function (css, options) {
    if (inserted[css]) return;
    inserted[css] = true;
    
    var elem = document.createElement('style');
    elem.setAttribute('type', 'text/css');

    if ('textContent' in elem) {
      elem.textContent = css;
    } else {
      elem.styleSheet.cssText = css;
    }
    
    var head = document.getElementsByTagName('head')[0];
    if (options && options.prepend) {
        head.insertBefore(elem, head.childNodes[0]);
    } else {
        head.appendChild(elem);
    }
};

},{}],16:[function(require,module,exports){
/*global window*/

/**
 * Check if object is dom node.
 *
 * @param {Object} val
 * @return {Boolean}
 * @api public
 */

module.exports = function isNode(val){
  if (!val || typeof val !== 'object') return false;
  if (window && 'object' == typeof window.Node) return val instanceof window.Node;
  return 'number' == typeof val.nodeType && 'string' == typeof val.nodeName;
}

},{}],17:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],18:[function(require,module,exports){
module.exports = isMobile;

function isMobile (ua) {
  if (!ua && typeof navigator != 'undefined') ua = navigator.userAgent;
  if (ua && ua.headers && typeof ua.headers['user-agent'] == 'string') {
    ua = ua.headers['user-agent'];
  }
  if (typeof ua != 'string') return false;

  return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(ua) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(ua.substr(0,4));
}


},{}],19:[function(require,module,exports){

/**
 * Expose `isUrl`.
 */

module.exports = isUrl;

/**
 * Matcher.
 */

var matcher = /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/;

/**
 * Loosely validate a URL `string`.
 *
 * @param {String} string
 * @return {Boolean}
 */

function isUrl(string){
  return matcher.test(string);
}

},{}],20:[function(require,module,exports){
'use strict';
module.exports = leftPad;

var cache = [
  '',
  ' ',
  '  ',
  '   ',
  '    ',
  '     ',
  '      ',
  '       ',
  '        ',
  '         '
];

function leftPad (str, len, ch) {
  // convert `str` to `string`
  str = str + '';

  // doesn't need to pad
  len = len - str.length;
  if (len <= 0) return str;

  // convert `ch` to `string`
  if (!ch && ch !== 0) ch = ' ';
  ch = ch + '';
  if(ch === ' ' && len < 10) return cache[len] + str;
  var pad = '';
  while (true) {
    if (len & 1) pad += ch;
    len >>= 1;
    if (len) ch += ch;
    else break;
  }
  return pad + str;
}

},{}],21:[function(require,module,exports){
/**
 * @module mutype/is-object
 */

//TODO: add st8 tests

//isPlainObject indeed
module.exports = function(o){
	// return obj === Object(obj);
	return !!o && typeof o === 'object' && o.constructor === Object;
};

},{}],22:[function(require,module,exports){
'use strict';
/* eslint-disable no-unused-vars */
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],23:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":11,"trim":28}],24:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.7.1
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

}).call(this,require('_process'))
},{"_process":2}],25:[function(require,module,exports){
(function (global){
var now = require('performance-now')
  , root = typeof window === 'undefined' ? global : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = root['request' + suffix]
  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]

for(var i = 0; !raf && i < vendors.length; i++) {
  raf = root[vendors[i] + 'Request' + suffix]
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(root, fn)
}
module.exports.cancel = function() {
  caf.apply(root, arguments)
}
module.exports.polyfill = function() {
  root.requestAnimationFrame = raf
  root.cancelAnimationFrame = caf
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"performance-now":24}],26:[function(require,module,exports){
(function (global){
module.exports =
  global.performance &&
  global.performance.now ? function now() {
    return performance.now()
  } : Date.now || function now() {
    return +new Date
  }

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],27:[function(require,module,exports){
var isDom = require('is-dom')
var lookup = require('browser-media-mime-type')

module.exports.video = simpleMediaElement.bind(null, 'video')
module.exports.audio = simpleMediaElement.bind(null, 'audio')

function simpleMediaElement (elementName, sources, opt) {
  opt = opt || {}

  if (!Array.isArray(sources)) {
    sources = [ sources ]
  }

  var media = opt.element || document.createElement(elementName)

  if (opt.loop) media.setAttribute('loop', 'loop')
  if (opt.muted) media.setAttribute('muted', 'muted')
  if (opt.autoplay) media.setAttribute('autoplay', 'autoplay')
  if (opt.controls) media.setAttribute('controls', 'controls')
  if (opt.crossOrigin) media.setAttribute('crossorigin', opt.crossOrigin)
  if (opt.preload) media.setAttribute('preload', opt.preload)
  if (opt.poster) media.setAttribute('poster', opt.poster)
  if (typeof opt.volume !== 'undefined') media.setAttribute('volume', opt.volume)

  sources = sources.filter(Boolean)
  sources.forEach(function (source) {
    media.appendChild(createSourceElement(source))
  })

  return media
}

function createSourceElement (data) {
  if (isDom(data)) return data
  if (typeof data === 'string') {
    data = { src: data }
    if (data.src) {
      var ext = extension(data.src)
      if (ext) data.type = lookup(ext)
    }
  }

  var source = document.createElement('source')
  if (data.src) source.setAttribute('src', data.src)
  if (data.type) source.setAttribute('type', data.type)
  return source
}

function extension (data) {
  var extIdx = data.lastIndexOf('.')
  if (extIdx <= 0 || extIdx === data.length - 1) {
    return null
  }
  return data.substring(extIdx + 1)
}

},{"browser-media-mime-type":5,"is-dom":16}],28:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],29:[function(require,module,exports){
var buffer = require('./lib/buffer-source')
var media = require('./lib/media-source')

module.exports = webAudioPlayer
function webAudioPlayer (src, opt) {
  if (!src) throw new TypeError('must specify a src parameter')
  opt = opt || {}
  if (opt.buffer) return buffer(src, opt)
  else return media(src, opt)
}

},{"./lib/buffer-source":31,"./lib/media-source":34}],30:[function(require,module,exports){
module.exports = createAudioContext
function createAudioContext () {
  var AudioCtor = window.AudioContext || window.webkitAudioContext
  return new AudioCtor()
}

},{}],31:[function(require,module,exports){
(function (process){
var canPlaySrc = require('./can-play-src')
var createAudioContext = require('./audio-context')
var xhrAudio = require('./xhr-audio')
var EventEmitter = require('events').EventEmitter
var rightNow = require('right-now')
var resume = require('./resume-context')

module.exports = createBufferSource
function createBufferSource (src, opt) {
  opt = opt || {}
  var emitter = new EventEmitter()
  var audioContext = opt.context || createAudioContext()

  // a pass-through node so user just needs to
  // connect() once
  var bufferNode, buffer, duration
  var node = audioContext.createGain()
  var audioStartTime = null
  var audioPauseTime = null
  var audioCurrentTime = 0
  var playing = false
  var loop = opt.loop

  emitter.play = function () {
    if (playing) return
    playing = true

    if (opt.autoResume !== false) resume(emitter.context)
    bufferNode = audioContext.createBufferSource()
    bufferNode.connect(emitter.node)
    bufferNode.onended = ended
    if (buffer) {
      // Might be null undefined if we are still loading
      bufferNode.buffer = buffer
    }
    if (loop) {
      bufferNode.loop = true
    }

    if (duration && audioCurrentTime > duration) {
      // for when it loops...
      audioCurrentTime = audioCurrentTime % duration
    }
    var nextTime = audioCurrentTime

    bufferNode.start(0, nextTime)
    audioStartTime = rightNow()
  }

  emitter.pause = function () {
    if (!playing) return
    playing = false
    // Don't let the "end" event
    // get triggered on manual pause.
    bufferNode.onended = null
    bufferNode.stop(0)
    audioPauseTime = rightNow()
    audioCurrentTime += (audioPauseTime - audioStartTime) / 1000
  }

  emitter.stop = function () {
    emitter.pause()
    ended()
  }

  emitter.dispose = function () {
    buffer = null
  }

  emitter.node = node
  emitter.context = audioContext

  Object.defineProperties(emitter, {
    duration: {
      enumerable: true, configurable: true,
      get: function () {
        return duration
      }
    },
    playing: {
      enumerable: true, configurable: true,
      get: function () {
        return playing
      }
    },
    buffer: {
      enumerable: true, configurable: true,
      get: function () {
        return buffer
      }
    },
    volume: {
      enumerable: true, configurable: true,
      get: function () {
        return node.gain.value
      },
      set: function (n) {
        node.gain.value = n
      }
    }
  })

  // set initial volume
  if (typeof opt.volume === 'number') {
    emitter.volume = opt.volume
  }

  // filter down to a list of playable sources
  var sources = Array.isArray(src) ? src : [ src ]
  sources = sources.filter(Boolean)
  var playable = sources.some(canPlaySrc)
  if (playable) {
    var source = sources.filter(canPlaySrc)[0]
    // Support the same source types as in
    // MediaElement mode...
    if (typeof source.getAttribute === 'function') {
      source = source.getAttribuet('src')
    } else if (typeof source.src === 'string') {
      source = source.src
    }
    // We have at least one playable source.
    // For now just play the first,
    // ideally this module could attempt each one.
    startLoad(source)
  } else {
    // no sources can be played...
    process.nextTick(function () {
      emitter.emit('error', canPlaySrc.createError(sources))
    })
  }
  return emitter

  function startLoad (src) {
    xhrAudio(audioContext, src, function audioDecoded (err, decoded) {
      if (err) return emitter.emit('error', err)
      buffer = decoded // store for later use
      if (bufferNode) {
        // if play() was called early
        bufferNode.buffer = buffer
      }
      duration = buffer.duration
      node.buffer = buffer
      emitter.emit('load')
    }, function audioProgress (amount, total) {
      emitter.emit('progress', amount, total)
    }, function audioDecoding () {
      emitter.emit('decoding')
    })
  }

  function ended () {
    emitter.emit('end')
    playing = false
    audioCurrentTime = 0
  }
}

}).call(this,require('_process'))
},{"./audio-context":30,"./can-play-src":32,"./resume-context":35,"./xhr-audio":36,"_process":2,"events":1,"right-now":26}],32:[function(require,module,exports){
var lookup = require('browser-media-mime-type')
var audio

module.exports = isSrcPlayable
function isSrcPlayable (src) {
  if (!src) throw new TypeError('src cannot be empty')
  var type
  if (typeof src.getAttribute === 'function') {
    // <source> element
    type = src.getAttribute('type')
  } else if (typeof src === 'string') {
    // 'foo.mp3' string
    var ext = extension(src)
    if (ext) type = lookup(ext)
  } else {
    // { src: 'foo.mp3', type: 'audio/mpeg; codecs..'}
    type = src.type
  }

  // We have an unknown file extension or
  // a <source> tag without an explicit type,
  // just let the browser handle it!
  if (!type) return true

  // handle "no" edge case with super legacy browsers...
  // https://groups.google.com/forum/#!topic/google-web-toolkit-contributors/a8Uy0bXq1Ho
  if (!audio) audio = new window.Audio()
  var canplay = audio.canPlayType(type).replace(/no/, '')
  return Boolean(canplay)
}

module.exports.createError = createError
function createError (sources) {
  // All sources are unplayable
  var err = new Error('This browser does not support any of the following sources:\n    ' +
      sources.join(', ') + '\n' +
      'Try using an array of OGG, MP3 and WAV.')
  err.type = 'AUDIO_FORMAT'
  return err
}

function extension (data) {
  var extIdx = data.lastIndexOf('.')
  if (extIdx <= 0 || extIdx === data.length - 1) {
    return undefined
  }
  return data.substring(extIdx + 1)
}

},{"browser-media-mime-type":5}],33:[function(require,module,exports){
module.exports = addOnce
function addOnce (element, event, fn) {
  function tmp (ev) {
    element.removeEventListener(event, tmp, false)
    fn()
  }
  element.addEventListener(event, tmp, false)
}
},{}],34:[function(require,module,exports){
(function (process){
var EventEmitter = require('events').EventEmitter
var createAudio = require('simple-media-element').audio
var assign = require('object-assign')

var resume = require('./resume-context')
var createAudioContext = require('./audio-context')
var canPlaySrc = require('./can-play-src')
var addOnce = require('./event-add-once')

module.exports = createMediaSource
function createMediaSource (src, opt) {
  opt = assign({}, opt)
  var emitter = new EventEmitter()

  // Default to Audio instead of HTMLAudioElement
  // There is not much difference except in the following:
  //    x instanceof Audio
  //    x instanceof HTMLAudioElement
  // And in my experience Audio has better support on various
  // platforms like CocoonJS.
  // Please open an issue if there is a concern with this.
  if (!opt.element) opt.element = new window.Audio()

  var desiredVolume = opt.volume
  delete opt.volume // make sure <audio> tag receives full volume
  var audio = createAudio(src, opt)
  var audioContext = opt.context || createAudioContext()
  var node = audioContext.createGain()
  var mediaNode = audioContext.createMediaElementSource(audio)
  mediaNode.connect(node)

  audio.addEventListener('ended', function () {
    emitter.emit('end')
  })

  emitter.element = audio
  emitter.context = audioContext
  emitter.node = node

  emitter.pause = audio.pause.bind(audio)
  emitter.play = function () {
    if (opt.autoResume !== false) resume(emitter.context)
    return audio.play()
  }

  // This exists currently for parity with Buffer source
  // Open to suggestions for what this should dispose...
  emitter.dispose = function () {}

  emitter.stop = function () {
    var wasPlaying = emitter.playing
    audio.pause()
    audio.currentTime = 0
    if (wasPlaying) {
      emitter.emit('end')
    }
  }

  Object.defineProperties(emitter, {
    duration: {
      enumerable: true, configurable: true,
      get: function () {
        return audio.duration
      }
    },
    currentTime: {
      enumerable: true, configurable: true,
      get: function () {
        return audio.currentTime
      }
    },
    playing: {
      enumerable: true, configurable: true,
      get: function () {
        return !audio.paused
      }
    },
    volume: {
      enumerable: true, configurable: true,
      get: function () {
        return node.gain.value
      },
      set: function (n) {
        node.gain.value = n
      }
    }
  })

  // Set initial volume
  if (typeof desiredVolume === 'number') {
    emitter.volume = desiredVolume
  }

  // Check if all sources are unplayable,
  // if so we emit an error since the browser
  // might not.
  var sources = Array.isArray(src) ? src : [ src ]
  sources = sources.filter(Boolean)
  var playable = sources.some(canPlaySrc)
  if (playable) {
    // At least one source is probably/maybe playable
    startLoad()
  } else {
    // emit error on next tick so user can catch it
    process.nextTick(function () {
      emitter.emit('error', canPlaySrc.createError(sources))
    })
  }

  return emitter

  function startLoad () {
    var done = function () {
      emitter.emit('load')
    }

    // On most browsers the loading begins
    // immediately. However, on iOS 9.2 Safari,
    // you need to call load() for events
    // to be triggered.
    audio.load()

    if (audio.readyState >= audio.HAVE_ENOUGH_DATA) {
      process.nextTick(done)
    } else {
      addOnce(audio, 'canplay', done)
      addOnce(audio, 'error', function (err) {
        emitter.emit('error', err)
      })
    }
  }
}

}).call(this,require('_process'))
},{"./audio-context":30,"./can-play-src":32,"./event-add-once":33,"./resume-context":35,"_process":2,"events":1,"object-assign":22,"simple-media-element":27}],35:[function(require,module,exports){
module.exports = function (audioContext) {
  if (audioContext.state === 'suspended' &&
      typeof audioContext.resume === 'function') {
    audioContext.resume()
  }
}

},{}],36:[function(require,module,exports){
var xhr = require('xhr')
var xhrProgress = require('xhr-progress')

module.exports = xhrAudio
function xhrAudio (audioContext, src, cb, progress, decoding) {
  var xhrObject = xhr({
    uri: src,
    responseType: 'arraybuffer'
  }, function (err, resp, arrayBuf) {
    if (!/^2/.test(resp.statusCode)) {
      err = new Error('status code ' + resp.statusCode + ' requesting ' + src)
    }
    if (err) return cb(err)
    decode(arrayBuf)
  })

  xhrProgress(xhrObject)
    .on('data', function (amount, total) {
      progress(amount, total)
    })

  function decode (arrayBuf) {
    decoding()
    audioContext.decodeAudioData(arrayBuf, function (decoded) {
      cb(null, decoded)
    }, function () {
      var err = new Error('Error decoding audio data')
      err.type = 'DECODE_AUDIO_DATA'
      cb(err)
    })
  }
}

},{"xhr":38,"xhr-progress":37}],37:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter

module.exports = progress

function progress(xhr) {
  var emitter = new EventEmitter
  var finished = false

  if (xhr.attachEvent) {
    xhr.attachEvent('onreadystatechange', done)
    return emitter
  }

  xhr.addEventListener('load', done, false)
  xhr.addEventListener('progress', progress, false)
  function progress(event) {
    var value = event.lengthComputable
      ? event.loaded / event.total
      : 0

    if (!finished) emitter.emit('data'
      , value
      , event.total || null
    )

    finished = value === 1
  }

  function done(event) {
    if (event.type !== 'load' && !/^(ready|complete)$/g.test(
      (event.currentTarget || event.srcElement).readyState
    )) return

    if (finished) return
    if (xhr.removeEventListener) {
      xhr.removeEventListener('load', done, false)
      xhr.removeEventListener('progress', progress, false)
    } else
    if (xhr.detatchEvent) {
      xhr.detatchEvent('onreadystatechange', done)
    }

    emitter.emit('data', 1, event.total || null)
    emitter.emit('done')
    finished = true
  }

  return emitter
}

},{"events":1}],38:[function(require,module,exports){
"use strict";
var window = require("global/window")
var once = require("once")
var isFunction = require("is-function")
var parseHeaders = require("parse-headers")
var xtend = require("xtend")

module.exports = createXHR
createXHR.XMLHttpRequest = window.XMLHttpRequest || noop
createXHR.XDomainRequest = "withCredentials" in (new createXHR.XMLHttpRequest()) ? createXHR.XMLHttpRequest : window.XDomainRequest

forEachArray(["get", "put", "post", "patch", "head", "delete"], function(method) {
    createXHR[method === "delete" ? "del" : method] = function(uri, options, callback) {
        options = initParams(uri, options, callback)
        options.method = method.toUpperCase()
        return _createXHR(options)
    }
})

function forEachArray(array, iterator) {
    for (var i = 0; i < array.length; i++) {
        iterator(array[i])
    }
}

function isEmpty(obj){
    for(var i in obj){
        if(obj.hasOwnProperty(i)) return false
    }
    return true
}

function initParams(uri, options, callback) {
    var params = uri

    if (isFunction(options)) {
        callback = options
        if (typeof uri === "string") {
            params = {uri:uri}
        }
    } else {
        params = xtend(options, {uri: uri})
    }

    params.callback = callback
    return params
}

function createXHR(uri, options, callback) {
    options = initParams(uri, options, callback)
    return _createXHR(options)
}

function _createXHR(options) {
    var callback = options.callback
    if(typeof callback === "undefined"){
        throw new Error("callback argument missing")
    }
    callback = once(callback)

    function readystatechange() {
        if (xhr.readyState === 4) {
            loadFunc()
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else if (xhr.responseType === "text" || !xhr.responseType) {
            body = xhr.responseText || xhr.responseXML
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    var failureResponse = {
                body: undefined,
                headers: {},
                statusCode: 0,
                method: method,
                url: uri,
                rawRequest: xhr
            }

    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "Unknown XMLHttpRequest Error") )
        }
        evt.statusCode = 0
        callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        if (aborted) return
        var status
        clearTimeout(timeoutTimer)
        if(options.useXDR && xhr.status===undefined) {
            //IE8 CORS GET successful response doesn't have a status field, but body is fine
            status = 200
        } else {
            status = (xhr.status === 1223 ? 204 : xhr.status)
        }
        var response = failureResponse
        var err = null

        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        callback(err, response, response.body)

    }

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new createXHR.XDomainRequest()
        }else{
            xhr = new createXHR.XMLHttpRequest()
        }
    }

    var key
    var aborted
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data || null
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer

    if ("json" in options) {
        isJson = true
        headers["accept"] || headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["content-type"] || headers["Content-Type"] || (headers["Content-Type"] = "application/json") //Don't override existing accept header declared by user
            body = JSON.stringify(options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync, options.username, options.password)
    //has to be after open
    if(!sync) {
        xhr.withCredentials = !!options.withCredentials
    }
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            aborted=true//IE9 may still call readystatechange
            xhr.abort("timeout")
            var e = new Error("XMLHttpRequest timeout")
            e.code = "ETIMEDOUT"
            errorFunc(e)
        }, options.timeout )
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers && !isEmpty(options.headers)) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }

    if ("beforeSend" in options &&
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    xhr.send(body)

    return xhr


}

function noop() {}

},{"global/window":39,"is-function":17,"once":40,"parse-headers":23,"xtend":41}],39:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],40:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],41:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],42:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],43:[function(require,module,exports){
var createDemo = require('./');
var raf = require('raf');
var xhr = require('xhr');
var ctx = require('audio-context');

//analyser
var source = null;
var analyser = ctx.createAnalyser();
analyser.frequencyBinCount = 4096;
analyser.smoothingTimeConstant = .1;
analyser.connect(ctx.destination);


//waveform painter helper, expected to be user’s component
var N = 1024;
var sine = new Float32Array(N);
var saw = new Float32Array(N);
var noise = new Float32Array(N);
var rate = 44100;

for (var i = 0; i < N; i++) {
	sine[i] = Math.sin(1000 * Math.PI * 2 * (i / rate));
	saw[i] = 2 * ((1000 * i / rate) % 1) - 1;
	noise[i] = Math.random() * 2 - 1;
}



var demo = createDemo({
	source: './sample.mp3',
	// source: 'https://soundcloud.com/esteban-lara/sets/premieres',
	url: true,
	file: true,
	// mic: true,
	// playPause: true,
	// stop: true,
	// title: true,
	icon: true,
	// color: 'rgb(40,40,40)',
	// fullscreen: true,
	// microphone: true,
	// autoplay: true,
	fps: true,
	params: [
		{
			name: 'range',
			type: 'range',
			value: .1
		},
		{
			name: 'text'
		},
		{
			name: 'checkbox',
			type: 'checkbox'
		},
		{
			name: 'number',
			type: 'number'
		},
		{
			name: 'select',
			type: 'select',
			values: {
				'inferno': 'inferno',
				'plasma': 'plasma'
			},
			value: 'inferno'
		}
	]
	// forkme: 'https://github.com/audio-lab',
	// donate: '',
	// orientation: 'horizontal'
});

demo.on('source', function (node) {
	node.connect(analyser);
});

setTimeout(function () {
	demo.setColor('green');
	demo.addParam('xyz', {
		value: true
	}, function (v) { return console.log(v); })
}, 1000);


//enable render
raf(function draw() {
	var data = new Float32Array(N);
	analyser.getFloatTimeDomainData(data);
	waveform(data);
	raf(draw)
});


var wfCanvas = document.createElement('canvas');
// wfCanvas.style.marginTop = '55px';
wfCanvas.style.display = 'block';
var wfCtx = wfCanvas.getContext('2d');
(document.body || document.documentElement).appendChild(wfCanvas);
resize();
window.addEventListener('resize', resize, false);


function resize () {
	wfCanvas.height = parseInt(window.innerHeight);
	wfCanvas.width = parseInt(window.innerWidth);
}

function waveform (buffer) {
	var len = buffer.length;

	wfCtx.clearRect(0, 0, wfCanvas.width, wfCanvas.height);

	var amp = wfCanvas.height / 2;
	var step = len / wfCanvas.width;
	var middle = amp;

	wfCtx.beginPath();
	wfCtx.moveTo(0, middle);

	for (var i = 0; i < wfCanvas.width; i++) {
		var sampleNumber = (step * i)|0;
		var sample = buffer[sampleNumber];

		wfCtx.lineTo(i, -sample * amp + middle);
		// wfCtx.lineTo(i + 1, -sample * amp + middle);
	}

	wfCtx.stroke();
}
},{"./":3,"audio-context":4,"raf":25,"xhr":38}]},{},[43]);
