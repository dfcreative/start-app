/**
 * @module audio-demo
 */
var Emitter = require('events').EventEmitter;
var inherits = require('inherits');
var extend = require('xtend/mutable');
var sf = require('sheetify');
var className = sf('./index.css');
var ctx = require('audio-context');
var URLParser = require('url');
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

	//create file/url input area
	this.sourceEl = document.createElement('div');
	this.sourceEl.classList.add('source');
	this.sourceEl.innerHTML = `
		<i class="source-icon"></i>
		<span class="source-text"></span>
	`;
	this.sourceIcon = this.sourceEl.querySelector('.source-icon');
	this.sourceText = this.sourceEl.querySelector('.source-text');
	this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/open.svg', 'utf8');
	if (!this.source) {
		this.sourceText.innerHTML = `
			<span class="source-links">
				<a href="#open-file" class="source-link">
					Open file
					<input class="source-input source-input-file" type="file"/>
				</a>
				or
				<a href="#enter-url" class="source-link source-link-url">
					enter URL
				</a>
			</span>
			<input hidden placeholder="http://url.to/file.ogg" class="source-input source-input-url" type="url"/>
			<strong class="source-title"></strong>
		`;
		this.sourceTitle = this.sourceEl.querySelector('.source-title');
		this.sourceLinks = this.sourceEl.querySelector('.source-links');
		this.sourceInputFile = this.sourceEl.querySelector('.source-input-file');
		this.sourceInputFile.addEventListener('change', (e) => {
			if (!this.sourceInputFile.files.length) return this;
			this.setSource(this.sourceInputFile.files);
		});
		this.sourceInputURL = this.sourceEl.querySelector('.source-input-url');
		this.sourceInputURL.addEventListener('blur', (e) => {
			this.showInput();
		});
		this.sourceInputURL.addEventListener('change', (e) => {
			e.preventDefault();
			this.hideInput();
			this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/loading.svg', 'utf8');
			this.sourceTitle.innerHTML = `loading`;
			this.setSource(this.sourceInputURL.value, (err) => {
				//in case of error allow second chance
				if (err) {
					this.hideInput();
					this.sourceTitle.innerHTML = ``;
					this.sourceInputURL.removeAttribute('hidden');
					this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/url.svg', 'utf8');
				}
			});
		});
		this.sourceEl.querySelector('.source-link-url').addEventListener('click', (e) => {
			e.preventDefault();
			this.hideInput();
			this.sourceInputURL.removeAttribute('hidden');
			this.sourceInputURL.focus();
			this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/url.svg', 'utf8');
		});
	}
	this.container.appendChild(this.sourceEl);

	this.init(this);
}

inherits(StartApp, Emitter);

//Allow dropping files to browser
StartApp.prototype.dragAndDrop = true;

//Default (my) soundcloud API token
StartApp.prototype.token = {
	soundcloud: '6b7ae5b9df6a0eb3fcca34cc3bb0ef14',
	youtube: 'AIzaSyBPxsJRzvSSz_LOpejJhOGPyEzlRxU062M'
};


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
		this.setSource(dt.files);
	});

	this.container.addEventListener('dragover', (e) => {
		e.preventDefault();
	}, false);
}


/**
 * Set source to play
 */
StartApp.prototype.setSource = function (src, cb) {
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
			this.sourceTitle.innerHTML = `not an audio`;
			this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/error.svg', 'utf8');
			setTimeout(() => {
				this.showInput();
				cb && cb(new Error('Not an audio'));
			}, 1000);
			return this;
		}
	}

	//File instance case
	if (src instanceof File) {
		var url = URL.createObjectURL(src);
		this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/record.svg', 'utf8');
		this.sourceTitle.innerHTML = src.name;

		cb && cb(null, url);

		return this;
	}


	//handle plain URL case
	if (typeof src === 'string') {
		var url = URLParser.parse(src);
	}

	if (url.hostname === 'soundcloud.com') {
		scResolve(this.token.soundcloud || this.token, src, (err, json, streamUrl) => {
			if (err) {
				cb && cb(err, streamUrl);
				return;
			}

			this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/soundcloud.svg', 'utf8');

			this.sourceText.innerHTML = `
				<a class="source-link" href="${json.permalink_url}" target="_blank">${json.title}</a>
			`;
			if (json.user) {
				this.sourceText.innerHTML += `by
				<a class="source-link" href="${json.user.permalink_url}" target="_blank">${json.user.username}</a>
				`;
			}

			cb && cb(err, streamUrl);
		});
	}
	else if (url.hostname === 'youtube') {

	}
	//error
	else {
		this.sourceTitle.innerHTML = `bad URL`;
		this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/error.svg', 'utf8');
		setTimeout(() => {
			cb && cb('Bad url');
		}, 1000);
		return this;
	}

	return this;
};

/**
 * Show/hide source input default view
 */
StartApp.prototype.showInput = function () {
	this.sourceLinks.removeAttribute('hidden');
	this.sourceInputURL.setAttribute('hidden', true);
	this.sourceIcon.innerHTML = fs.readFileSync(__dirname + '/image/open.svg', 'utf8');
	this.sourceTitle.innerHTML = '';

	return this;
}

StartApp.prototype.hideInput = function () {
	this.sourceLinks.setAttribute('hidden', true);

	return this;
};
