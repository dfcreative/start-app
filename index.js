/**
 * @module audio-demo
 */
var Emitter = require('events').EventEmitter;
var inherits = require('inherits');
var extend = require('xtend/mutable');
var sf = require('sheetify');
var className = sf('./index.css');
var fs = require('fs');
var raf = require('raf');
var now = require('right-now');
var colorParse = require('color-parse');
var hsl = require('color-space/hsl');
var pad = require('left-pad');
var isMobile = require('is-mobile')();
var xhr = require('xhr');
var isUrl = require('is-url');
var ctx = require('audio-context');
var Draggable = require('draggy');
var isPlainObject = require('mutype/is-object');

module.exports = StartApp;



/**
 * @constructor
 */
function StartApp (opts, cb) {
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

		setTimeout(() => {
			window.scrollTo(0, 0);
		}, 0);
	}

	//create layout
	this.sourceEl.innerHTML = `
		<i class="source-icon" hidden>${this.icons.loading}</i>
		<span class="source-text"></span>
		<a href="#audio" class="audio-playback" hidden><i class="audio-icon">${this.icons.play}</i></a><a href="#stop" class="audio-stop" title="Reset" hidden><i class="audio-icon">${this.icons.eject}</i></a>
	`;
	this.sourceIcon = this.sourceEl.querySelector('.source-icon');
	this.sourceContent = this.sourceEl.querySelector('.source-text');
	this.sourceIcon.innerHTML = this.file ? this.icons.open : this.url ? this.icons.url : this.mic ? this.icons.mic : this.icons.open;

	this.sourceContent.innerHTML = `
		<span class="source-links">
			<a href="#open-file" ${this.file ? '' : 'hidden'} class="source-link source-link-file">Open file</a>${this.file && this.url && this.mic ? ',' : this.file && (this.url || this.mic) ? ' or' : '' }
			<a href="#enter-url" ${this.url ? '' : 'hidden'} class="source-link source-link-url">enter URL</a>
			${this.url && this.mic ? ' or' : ''}
			<a href="#enable-mic" ${this.mic ? '' : 'hidden'} class="source-link source-link-mic">
				enable microphone
			</a>
		</span>
		<input class="source-input source-input-file" hidden type="file"/>
		<input placeholder="http://url.to/audio" hidden class="source-input source-input-url" type="url" value="${this.source || ''}"/>
		<strong class="source-title" hidden></strong>
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
	var lastURL;
	this.sourceInputURL.addEventListener('focus', (e) => {
		lastURL = this.sourceInputURL.value;
	});
	this.sourceInputURL.addEventListener('blur', (e) => {
		//if nothing changed - blur
		if (lastURL === this.sourceInputURL.value) {
			this.showInput();
		}
	});
	this.sourceInputURL.addEventListener('change', (e) => {
		e.preventDefault();
		this.hideInput();
		this.sourceIcon.innerHTML = this.icons.loading;
		this.sourceTitle.innerHTML = `loading`;
		this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
		this.sourceInputURL.setAttribute('hidden', true);
		this.setSource(this.sourceInputURL.value, (err) => {
			this.hideInput();
			//in case of error allow second chance
			if (err) {
				this.sourceTitle.innerHTML = ``;
				this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
				this.sourceIcon.innerHTML = this.icons.url;
				this.sourceInputURL.removeAttribute('hidden');
				this.sourceInputURL.focus();

				return;
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
			self.sourceTitle.innerHTML = `Microphone`;
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
			self.emit('source', streamUrl);
			self.emit('play');
		}
		function errMic (err) {
			self.hideInput();
			self.sourceTitle.innerHTML = err;//`microphone is not allowed`;
			self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
			self.sourceIcon.innerHTML = self.icons.error;
			setTimeout(() => {
				if (!self.source) self.showInput();
				cb && cb(new Error('Microphone is not allowed'));
			}, 1000);
		}
	});

	//init audio
	var audio = this.audio = new Audio();
	this.audio.loop = this.loop;
	this.audio.crossOrigin = 'Anonymous';
	this.audioEl = this.sourceEl.querySelector('.audio-playback');
	this.audioStop = this.sourceEl.querySelector('.audio-stop');
	this.audioIcon = this.sourceEl.querySelector('.audio-icon');
	this.audioNode = this.context.createMediaElementSource(this.audio);
	this.audioNode.connect(this.context.destination);
	this.audio.addEventListener('canplay', () => {
		this.emit('ready', this.audioNode);
		this.source && this.autoplay && this.play();
	});
	this.playPause && this.audioEl.addEventListener('click', (e) => {
		e.preventDefault();
		if (this.audio.paused) {
			this.play();
		}
		else {
			this.pause();
		}
	});
	this.stop && this.audioStop.addEventListener('click', (e) => {
		this.reset();
	});

	//init progress bar
	var progress = this.progressEl = document.createElement('div');
	this.progressEl.classList.add('progress');
	if (!this.progress) this.progressEl.setAttribute('hidden', true);
	this.progressEl.setAttribute('title', '00:00');
	this.container.appendChild(progress);
	setInterval(() => {
		if (this.audio) {
			progress.style.width = ((this.audio.currentTime / this.audio.duration * 100) || 0) + '%';
			progress.setAttribute('title', `${this.getTime(this.audio.currentTime)} / ${this.getTime(this.audio.duration)} played`);
		}
	}, 500)


	//technical element for fps, params, info etc
	this.statusEl = document.createElement('div');
	this.statusEl.classList.add('status');
	this.container.appendChild(this.statusEl);

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
			this.params[name].name = name;
			params.push(this.params[name]);
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
	this.paramsEl.innerHTML = `<a class="params-close" href="#close-params"><i class="icon-close">✕</i></a>`;
	this.paramsCollection.forEach((opts) => this.addParam(opts));
	this.container.appendChild(this.paramsEl);

	//params button
	this.paramsBtn = document.createElement('a');
	this.paramsBtn.classList.add('params-button');
	this.paramsBtn.href = '#params';
	this.paramsBtn.innerHTML = `<i>${this.icons.settings}</i>`;
	this.paramsBtn.setAttribute('hidden', true);
	this.statusEl.appendChild(this.paramsBtn);

	this.paramsBtn.addEventListener('click', () => {
		if (this.paramsEl.hasAttribute('hidden')) {
			this.paramsEl.removeAttribute('hidden');
		}
		else {
			this.paramsEl.setAttribute('hidden', true);
		}
	});
	this.paramsEl.querySelector('.params-close').addEventListener('click', () => {
		if (this.paramsEl.hasAttribute('hidden')) {
			this.paramsEl.removeAttribute('hidden');
		}
		else {
			this.paramsEl.setAttribute('hidden', true);
		}
	});

	if (!isMobile) {
		this.draggable = Draggable(this.paramsEl);
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

	setTimeout(() => {
		if (this.source) {
			this.setSource(this.source, (err) => {
				if (err) this.showInput();
				cb && cb(null, this.source);
			});
		}
		else {
			cb && cb(null, this.source);
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
	pause: fs.readFileSync(__dirname + '/image/pause.svg', 'utf8'),
	stop: fs.readFileSync(__dirname + '/image/stop.svg', 'utf8'),
	eject: fs.readFileSync(__dirname + '/image/eject.svg', 'utf8'),
	settings: fs.readFileSync(__dirname + '/image/settings.svg', 'utf8')
};

//do mobile routines like meta, splashscreen etc
StartApp.prototype.mobile = true;

//show params button
StartApp.prototype.params = true;


/**
 * Init settings
 */
StartApp.prototype.update = function (opts) {
	extend(this, opts);

	if (this.color) {
		this.setColor(this.color);
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
			this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
			this.sourceIcon.innerHTML = this.icons.record;
		});

		this.container.addEventListener('dragleave', (e) => {
			if (e.target != this.container) return;

			target = null;
			this.container.classList.remove('dragover');
			if (this.source) {
				this.sourceTitle.innerHTML = title;
				this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
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
					this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
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

	var inverseValues = values.map((v) => 255 - v).map((v) => v * ( !isDark ? .2 : 1.8)).map((v) => Math.max(Math.min(v, 255), 0)).map((v) => !isDark ? v*.2 : 255*.8+v*.2);
	this.color = `rgba(${values.join(', ')}, ${parsed.alpha})`;
	this.inverseColor = `rgba(${inverseValues.map(v => v.toFixed(0)).join(', ')}, ${parsed.alpha})`;
	this.transparentColor = `rgba(${values.join(', ')}, 0.1)`;
	this.semiTransparentColor = `rgba(${values.join(', ')}, 0.25)`;

	var semiTransparentInverseColor = `rgba(${inverseValues.map(v => v.toFixed(0)).join(', ')}, .75)`;

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

		.${className} .params {
			background: linear-gradient(to bottom, rgba(${inverseValues.map(v => v.toFixed(0)).join(', ')}, .5), rgba(${inverseValues.map(v => v.toFixed(0)).join(', ')}, .75));
		}

		.${className} .params-button {
			color: ${this.color}
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

	return this;
};


/**
 * Set source to play
 */
StartApp.prototype.setSource = function (src, cb) {
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
			this.sourceTitle.innerHTML = `not an audio`;
			this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
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
		this.sourceTitle.innerHTML = `<a class="source-link" href="${url}" target="_blank" title="${src.name}"><span class="text-length-limiter">${src.name}</span></a>`;
		this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);

		this.source = url;

		this.audio.src = url;
		this.playPause && this.audioEl.removeAttribute('hidden');
		this.stop && this.audioStop.removeAttribute('hidden');

		this.emit('source', url);
		cb && cb(null, url);

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
				uri: `https://api.soundcloud.com/resolve.json?client_id=${this.token.soundcloud || this.token}&url=${src}&format=json`,
				method: 'GET'
			}, () => {
				xhr({
					uri: `https://api.soundcloud.com/resolve.json?client_id=${this.token.soundcloud || this.token}&url=${src}&_status_code_map[302]=200&format=json`,
					method: 'GET'
				}, function (err, response) {
					if (err) return badURL(err);

					var obj = JSON.parse(response.body);
					xhr({
						uri: obj.location,
						method: 'GET'
					}, function (err, response) {
						if (err) return badURL(err);

						var json = JSON.parse(response.body);

						setSoundcloud(json);
					});
				});
			});
		}

		else {
			xhr({
				uri: `https://api.soundcloud.com/resolve.json?client_id=${this.token.soundcloud || this.token}&url=${src}`,
				method: 'GET'
			}, (err, response) => {
				if (err) {
					return badURL(err);
				}

				var json = JSON.parse(response.body);

				setSoundcloud(json);
			});
		}

		function setSoundcloud (json) {
			var streamUrl = json.stream_url + '?client_id=' + token;

			self.sourceIcon.innerHTML = self.icons.soundcloud;

			//FIXME: play list of tracks properly
			if (json.tracks) {
				var id = Math.floor(Math.random() * json.tracks.length);
				return self.setSource(json.tracks[id].permalink_url, cb);
			}

			var maxTitle = window.innerWidth * .05;
			self.sourceTitle.innerHTML = `
				<a class="source-link" href="${json.permalink_url}" target="_blank" title="${json.title}"><span class="text-length-limiter">${json.title}</span></a>`;
			self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
			if (json.user) {
				self.sourceTitle.innerHTML += ` by <a class="source-link" href="${json.user.permalink_url}" target="_blank" title="${json.user.username}"><span class="text-length-limiter">${json.user.username}</span></a>
				`;
				self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
			}

			self.source = streamUrl;

			self.audio.src = streamUrl;
			self.playPause && self.audioEl.removeAttribute('hidden');
			self.stop && self.audioStop.removeAttribute('hidden');

			self.emit('source', streamUrl);

			cb && cb(null, streamUrl);
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
		if (!isUrl(src)) {
			badURL();
			return this;
		}

		xhr({
			url: src,
			method: 'GET',
		}, (err, resp) => {
			if (err) return badURL(err);

			//FIXME: here actually possible to handle websockets/stuff, not the stupid method below
			self.source = src;

			self.sourceTitle.innerHTML = `
				<a class="source-link" href="${src}" target="_blank" title="Open ${src}"><span class="text-length-limiter">${src}</span></a>
			`;
			self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
			self.audio.src = src;
			self.playPause && self.audioEl.removeAttribute('hidden');
			self.stop && self.audioStop.removeAttribute('hidden');

			this.emit('source', src);
			cb && cb(null, src);
		});
	}

	function badURL (err) {
		self.sourceTitle.innerHTML = err || `bad URL`;
		self.sourceIcon.setAttribute('title', self.sourceTitle.textContent);
		self.sourceIcon.innerHTML = self.icons.error;
		setTimeout(() => {
			cb && cb('Bad url');
		}, 1000);
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
	this.audio.play();
	this.audioEl.title = `Pause`;
	this.audioIcon.innerHTML = this.icons.pause;
	this.playPause && this.stop && this.audioStop.setAttribute('hidden', true);

	this.emit('play');

	return this;
}
StartApp.prototype.pause = function () {
	this.audio.pause();
	this.audioEl.title = `Play`;
	this.audioIcon.innerHTML = this.icons.play;
	this.playPause && this.stop && this.audioStop.removeAttribute('hidden');

	this.emit('pause');

	return this;
}
StartApp.prototype.reset = function () {
	this.source = '';
	this.sourceTitle.innerHTML = '';
	this.sourceIcon.setAttribute('title', this.sourceTitle.textContent);
	this.sourceInputURL.value = '';
	this.audio.currentTime = 0;

	this.audio.src = '';
	this.pause();
	this.audioStop.querySelector('i').innerHTML = this.icons.eject;
	this.stop && this.audioStop.setAttribute('hidden', true);
	this.showInput();

	if (this.micNode) {
		this.micNode.disconnect();
	}

	this.emit('stop');

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
	el.innerHTML = `<label for="${name}" class="param-label">${title}</label>`;

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
			var html = `<select
				id="${name}" class="param-input param-select" title="${opts.value}">`;
			if (Array.isArray(opts.values)) {
				for (var i = 0; i < opts.values.length; i++) {
					html += `<option value="${opts.values[i]}" ${opts.values[i] === opts.value ? 'selected' : ''}>${opts.values[i]}</option>`
				}
			}
			else {
				for (var name in opts.values) {
					html += `<option value="${opts.values[name]}" ${opts.values[name] === opts.value ? 'selected' : ''}>${name}</option>`
				}
			}
			html += `</select>`;

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
			el.innerHTML += `<input
				id="${opts.name}" type="range" class="param-input param-range" value="${opts.value}" min="${opts.min}" max="${opts.max}" step="${opts.step}" title="${opts.value}"/>
			`;
			break;


		case 'checkbox':
			opts = extend({
				value: false,
				name: 'noname-checkbox'
			}, opts);
			el.innerHTML += `<input
				id="${opts.name}" type="checkbox" class="param-input param-checkbox" title="${opts.value}" ${opts.value ? 'checked' : ''}/>
			`;
			break;

		case 'number':
			opts = extend({
				min: 0,
				max: 1,
				step: 0.01,
				value: .5,
				name: 'noname-number'
			}, opts);
			el.innerHTML += `<input
				id="${opts.name}" type="number" class="param-input param-number" value="${opts.value}" min="${opts.min}" max="${opts.max}" step="${opts.step}" title="${opts.value}"/>
			`;
			break;

		default:
			opts = extend({
				name: 'noname-text',
				value: ''
			}, opts);
			el.innerHTML += `<input placeholder="value..." id="${opts.name}" class="param-input param-text" value="${opts.value}" title="${opts.value}"/>
			`;
			break;

	}

	opts.element = el;

	var self = this;
	el.querySelector('input, select').addEventListener('input', change);
	el.querySelector('input, select').addEventListener('change', change);

	function change () {
		var v = this.type === 'checkbox' ? this.checked : this.value;
		this.title = v;
		cb && cb(v);
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