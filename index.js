/**
 * @module audio-demo
 */
var Emitter = require('events').EventEmitter;
var inherits = require('inherits');
var extend = require('xtend/mutable');
var sf = require('sheetify');
var className = sf('./index.css');
var ctx = require('audio-context');
var URL = require('url');
var scResolve = require('soundcloud-resolve');
var fs = require('fs');

module.exports = StartApp;


/**
 * @constructor
 */
function StartApp (opts, cb) {
	if (!(this instanceof StartApp)) return new StartApp(opts, cb);

	extend(this, opts);

	//ensure container
	if (!this.container) this.container = document.body || document.documentElement;
	this.container.classList.add(className);

	//create file input area
	if (this.source) {
		this.sourceEl = document.createElement('div');
		this.sourceEl.classList.add('source');
		this.sourceEl.innerHTML = `
			<i class="source-icon"></i>
			<span class="source-text">${this.source}</span>
		`;
		this.sourceIcon = this.sourceEl.querySelector('.source-icon');
		this.sourceText = this.sourceEl.querySelector('.source-text');
		this.container.appendChild(this.sourceEl);
	}

	this.init(this);
}

inherits(StartApp, Emitter);

//Allow dropping files to browser
StartApp.prototype.dragAndDrop = true;

//Default (my) soundcloud API token
StartApp.prototype.token = '6b7ae5b9df6a0eb3fcca34cc3bb0ef14';


/**
 * Init settings
 */
StartApp.prototype.init = function (opts) {
	if (opts.dragAndDrop) {
		this.initDragAndDrop();
	}

	this.setSource(opts.source);
};



/**
 * Manage container drag-n-drop
 */
StartApp.prototype.initDragAndDrop = function () {
	this.container.setAttribute('draggable', true);

	this.container.addEventListener('dragenter', (e) => {
		this.container.classList.add('dragover');
		e.dataTransfer.dropEffect = 'copy';
	});

	this.container.addEventListener('dragleave', (e) => {
		this.container.classList.remove('dragover');
	});

	this.container.addEventListener('drop', (e) => {
		e.preventDefault();
		this.container.classList.remove('dragover');

		var dt = e.dataTransfer;
		for (var i = 0; i < dt.files.length; i++) {
			console.log(dt.files[i])
			console.log(dt.items[i])
			console.log(dt.types[i])
		}

	});

	this.container.addEventListener('dragover', (e) => {
		e.preventDefault();
	}, false);
}


/**
 * Set source to play
 */
StartApp.prototype.setSource = function (src) {
	var url = URL.parse(src);
	console.log(url);

	//detect known sources
	if (url.hostname === 'soundcloud.com') {
		this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/soundcloud.svg', 'utf8');
		scResolve(this.token, src, (err, json, streamUrl) => {
			if (err) return console.error(err);
			console.log(json);
			this.sourceText.innerHTML = `
				<a class="source-link" href="${json.permalink_url}" target="_blank">${json.title}</a>
			`;
			if (json.user) {
				this.sourceText.innerHTML += `by
				<a class="source-link" href="${json.user.permalink_url}" target="_blank">${json.user.username}</a>
				`;
			}
		});
	}
	else if (url.hostname === 'youtube') {

	}
	else {

	}
};

