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
var raf = require('raf');
var now = require('right-now');
var colorParse = require('color-parse');
var hsl = require('color-space/hsl');
var pad = require('left-pad');

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

	//create container
	this.sourceEl = document.createElement('div');
	this.sourceEl.classList.add('source');
	this.container.appendChild(this.sourceEl);

	//create dynamic style
	this.styleEl = document.createElement('style');
	(document.head || document.documentElement).appendChild(this.styleEl);

	//create layout
	this.sourceEl.innerHTML = `
		<i class="source-icon">${this.icons.loading}</i>
		<span class="source-text"></span>
		<a href="#audio" class="audio-playback" hidden><i class="audio-icon">${this.icons.play}</i></a>
	`;
	this.sourceIcon = this.sourceEl.querySelector('.source-icon');
	this.sourceText = this.sourceEl.querySelector('.source-text');
	this.sourceIcon.innerHTML = this.file ? this.icons.open : this.url ? this.icons.url : this.mic ? this.icons.mic : this.icons.open;

	this.sourceText.innerHTML = `
		<span class="source-links">
			<a href="#open-file" ${this.file ? '' : 'hidden'} class="source-link source-link-file">open file</a>${this.file && this.url && this.mic ? ',' : this.file && (this.url || this.mic) ? ' or' : '' }
			<a href="#enter-url" ${this.url ? '' : 'hidden'} class="source-link source-link-url">enter URL</a>
			${this.url && this.mic ? ' or' : ''}
			<a href="#enable-mic" ${this.mic ? '' : 'hidden'} class="source-link source-link-mic">
				enable microphone
			</a>
		</span>
		<input class="source-input source-input-file" hidden type="file"/>
		<input placeholder="http://url.to/audio" hidden class="source-input source-input-url" type="url" value="${this.source || ''}"/>
		<strong class="source-title"></strong>
	`;
	this.sourceTitle = this.sourceEl.querySelector('.source-title');
	this.sourceLinks = this.sourceEl.querySelector('.source-links');
	this.sourceInputFile = this.sourceEl.querySelector('.source-input-file');
	this.sourceEl.querySelector('.source-link-file').addEventListener('click', (e) => {
		e.preventDefault();
		this.sourceInputFile.click();
	});
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
		this.sourceIcon.innerHTML = this.icons.loading;
		this.sourceTitle.innerHTML = `loading`;
		this.setSource(this.sourceInputURL.value, (err) => {
			//in case of error allow second chance
			if (err) {
				this.hideInput();
				this.sourceTitle.innerHTML = ``;
				this.sourceInputURL.removeAttribute('hidden');
				this.sourceIcon.innerHTML = this.icons.url;
			}
		});
	});
	this.sourceEl.querySelector('.source-link-url').addEventListener('click', (e) => {
		e.preventDefault();
		this.hideInput();
		this.sourceInputURL.removeAttribute('hidden');
		this.sourceInputURL.focus();
		this.sourceIcon.innerHTML = this.icons.url;
	});
	this.sourceInputMic = this.sourceEl.querySelector('.source-link-mic');
	this.sourceInputMic.addEventListener('click', (e) => {
		e.preventDefault();
		// this.showInput();
	});

	//init audio
	var audio = this.audio = new Audio();
	this.audio.loop = this.loop;
	this.audio.crossOrigin = 'Anonymous';
	this.audioEl = this.sourceEl.querySelector('.audio-playback');
	this.audioIcon = this.sourceEl.querySelector('.audio-icon');
	this.audio.addEventListener('canplay', () => {
		this.autoplay && this.play();
	});
	this.audioEl.addEventListener('click', (e) => {
		e.preventDefault();
		if (this.audio.paused) {
			this.play();
		}
		else {
			this.pause();
		}
	});

	//init progress bar
	var progress = this.progressEl = document.createElement('div');
	this.progressEl.classList.add('progress');
	if (!this.progress) this.progressEl.setAttribute('hidden', true);
	this.progressEl.setAttribute('title', '00:00');
	this.container.appendChild(progress);
	setInterval(() => {
		progress.style.width = (audio.currentTime / audio.duration * 100) + '%';
		progress.setAttribute('title', `${this.getTime(this.audio.currentTime)} / ${this.getTime(this.audio.duration)} played`);
	}, 500)


	//init fps
	this.fpsEl = document.createElement('div');
	this.fpsEl.classList.add('fps');
	this.fpsEl.setAttribute('hidden', true);
	this.fpsEl.innerHTML = `
		<canvas class="fps-canvas"></canvas>
		<span class="fps-text">
			fps <span class="fps-value">60.0</span>
		</span>
	`;
	this.fpsCanvas = this.fpsEl.querySelector('.fps-canvas');
	var fpsValue = this.fpsValue = this.fpsEl.querySelector('.fps-value');
	this.container.appendChild(this.fpsEl);

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

	//enable update routine
	raf(function measure () {
		count++;
		var t = now();
		if (t - last> updatePeriod) {
			var color = that.color;
			var transparentColor = that.transparentColor;
			last = t;
			values.push((count - 1) / (maxFPS * updatePeriod * 0.001));
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


	//bind start call
	setTimeout(() => cb && cb(null, this.source));

	this.update();
}

inherits(StartApp, Emitter);

//Allow dropping files to browser
StartApp.prototype.dragAndDrop = true;

//Enable file select
StartApp.prototype.file = true;

//Enable url select
StartApp.prototype.url = true;

//Enable mic input
StartApp.prototype.mic = false;

//Default (my) soundcloud API token
StartApp.prototype.token = {
	soundcloud: '6b7ae5b9df6a0eb3fcca34cc3bb0ef14',
	youtube: 'AIzaSyBPxsJRzvSSz_LOpejJhOGPyEzlRxU062M'
};

//display micro fps counter
StartApp.prototype.fps = true;

//autostart play
StartApp.prototype.autoplay = true;
StartApp.prototype.loop = true;

//enable progress indicator
StartApp.prototype.progress = true;

//icon paths
StartApp.prototype.icons = {
	record: fs.readFileSync(__dirname + '/image/record.svg', 'utf8'),
	error: fs.readFileSync(__dirname + '/image/error.svg', 'utf8'),
	soundcloud: fs.readFileSync(__dirname + '/image/soundcloud.svg', 'utf8'),
	open: fs.readFileSync(__dirname + '/image/open.svg', 'utf8'),
	loading: fs.readFileSync(__dirname + '/image/loading.svg', 'utf8'),
	url: fs.readFileSync(__dirname + '/image/url.svg', 'utf8'),
	mic: fs.readFileSync(__dirname + '/image/mic.svg', 'utf8'),
	play: fs.readFileSync(__dirname + '/image/play.svg', 'utf8'),
	pause: fs.readFileSync(__dirname + '/image/pause.svg', 'utf8')
};

/**
 * Init settings
 */
StartApp.prototype.update = function (opts) {
	extend(this, opts);

	if (this.color) {
		var parsed = colorParse(this.color);
		if (parsed.space === 'hsl') {
			var values = hsl.rgb(parsed.values);
		}
		else {
			var values = parsed.values;
		}
		this.inverseColor = `rgba(${values.map((v) => 255 - v).join(', ')}, ${parsed.alpha})`;
		values.push(parsed.alpha * 0.25);
		this.semiTransparentColor = `rgba(${values.join(', ')})`;
		values[3] = parsed.alpha * 0.1;
		this.transparentColor = `rgba(${values.join(', ')})`;
		this.styleEl.innerHTML = `
			.${className} {
				color: ${this.color};
			}
			.${className} .source-input,
			.${className} .source-link
			{
				box-shadow: 0 2px ${this.semiTransparentColor};
			}
			.${className} .source-input:focus,
			.${className} .source-link:hover
			{
				box-shadow: 0 2px ${this.color};
			}

			::selection{
				background: ${this.semiTransparentColor};
				color: ${this.inverseColor};
			}
			::-moz-selection{
				background: ${this.semiTransparentColor};
				color: ${this.inverseColor};
			}

			.${className} .fps-canvas { background:${this.transparentColor}; }

			::-moz-placeholder { color:${this.semiTransparentColor}; }
			input:-moz-placeholder { color:${this.semiTransparentColor}; }
			:-ms-input-placeholder { color:${this.semiTransparentColor}; }
			::-webkit-input-placeholder { color:${this.semiTransparentColor}; }
		`;
	}

	if (this.dragAndDrop && !this.isDnD) {
		this.isDnD = true;
		var title, icon, target;

		this.container.addEventListener('dragstart', (e) => {
			//ignore dragging the container
			//FIXME: maybe we need a bit more specifics here, by components
			e.preventDefault();
			return false;
		}, false);
		this.container.addEventListener('dragenter', (e) => {
			if (target) return;
			target = e.target;
			// if (e.target != this.container) return;

			this.container.classList.add('dragover');
			e.dataTransfer.dropEffect = 'copy';

			//save initial values
			title = this.sourceTitle.innerHTML;
			icon = this.sourceIcon.innerHTML;

			var dt = e.dataTransfer;
			var list = dt.files, src;

			this.hideInput();
			this.sourceTitle.innerHTML = `drop audio file`;
			this.sourceIcon.innerHTML = this.icons.record;
		});

		this.container.addEventListener('dragleave', (e) => {
			if (e.target != this.container) return;

			target = null;
			this.container.classList.remove('dragover');
			if (this.source) {
				this.sourceTitle.innerHTML = title;
				this.sourceIcon.innerHTML = icon;
			}
			else {
				this.showInput();
			}
		}, false);

		this.container.addEventListener('drop', (e) => {
			e.preventDefault();
			this.container.classList.remove('dragover');
			target = null;

			var dt = e.dataTransfer;
			this.setSource(dt.files, (err, data) => {
				if (err) {
					this.sourceTitle.innerHTML = title;
					this.sourceIcon.innerHTML = icon;
				}
			});
		}, false);

		this.container.addEventListener('dragover', (e) => {
			e.preventDefault();
		}, false);
	}

	if (this.fps) {
		this.fpsEl.removeAttribute('hidden');
	}
	else {
		this.fpsEl.setAttribute('hidden', true);
	}

	if (this.time) {

	}

	this.setSource(this.source, (err) => {
		if (err) this.showInput();
	});
};


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
			this.sourceIcon.innerHTML = this.icons.error;
			setTimeout(() => {
				if (!this.source) this.showInput();
				cb && cb(new Error('Not an audio'));
			}, 1000);
			return this;
		}
	}

	//File instance case
	if (src instanceof File) {
		var url = URL.createObjectURL(src);
		this.sourceIcon.innerHTML = this.icons.record;
		this.sourceTitle.innerHTML = src.name;

		this.source = url;
		this.audio.src = url;
		this.audioEl.removeAttribute('hidden');

		this.emit('source', url);
		cb && cb(null, url);

		return this;
	}


	//handle plain URL case
	if (typeof src === 'string') {
		var url = URLParser.parse(src);
	}

	if (url.hostname === 'soundcloud.com') {
		this.sourceIcon.innerHTML = this.icons.loading;
		this.sourceTitle.innerHTML = 'connecting to soundcloud';
		scResolve(this.token.soundcloud || this.token, src, (err, json, streamUrl) => {
			if (err) {
				cb && cb(err, streamUrl);
				return;
			}

			this.sourceIcon.innerHTML = this.icons.soundcloud;

			//FIXME: play list of tracks properly
			if (json.tracks) {
				var id = Math.floor(Math.random() * json.tracks.length);
				return this.setSource(json.tracks[id].permalink_url, cb);
			}

			var maxTitle = window.innerWidth * .05;
			this.sourceTitle.innerHTML = `
				<a class="source-link" href="${json.permalink_url}" target="_blank" title="${json.title}"><span class="text-length-limiter">${json.title}</span></a>
			`;
			if (json.user) {
				this.sourceTitle.innerHTML += `by
				<a class="source-link" href="${json.user.permalink_url}" target="_blank" title="${json.user.username}"><span class="text-length-limiter">${json.user.username}</span></a>
				`;
			}

			this.source = streamUrl;
			this.audio.src = streamUrl;
			this.audioEl.removeAttribute('hidden');

			this.emit('source', streamUrl);
			cb && cb(err, streamUrl);
		});
	}
	else if (url.hostname === 'youtube') {

	}
	//error
	else {
		this.sourceTitle.innerHTML = `bad URL`;
		this.sourceIcon.innerHTML = this.icons.error;
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
	this.sourceIcon.innerHTML = this.file ? this.icons.open : this.url ? this.icons.url : this.mic ? this.icons.mic : this.icons.open;
	this.sourceTitle.innerHTML = '';
	this.audioEl.setAttribute('hidden', true);

	return this;
}

StartApp.prototype.hideInput = function () {
	this.sourceLinks.setAttribute('hidden', true);

	return this;
};


/**
 * Play/stop audio
 */
StartApp.prototype.play = function () {
	this.audio.play();
	this.audioEl.title = `Pause`;
	this.audioIcon.innerHTML = this.icons.pause;

	return this;
}
StartApp.prototype.pause = function () {
	this.audio.pause();
	this.audioEl.title = `Play`;
	this.audioIcon.innerHTML = this.icons.play;

	return this;
}
StartApp.prototype.getTime = function (time) {
	return pad((time / 60)|0, 2, 0) + ':' + pad((time % 60)|0, 2, 0);
}