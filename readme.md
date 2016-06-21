# start-app [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)

Create demo page for an audio component.

## Usage

[![npm install start-app](https://nodei.co/npm/start-app.png?mini=true)](https://npmjs.org/package/start-app/)

```js
var createDemo = require('audio-demo');

var app = createDemo({
	//container to use as a start-app demo
	container: el,

	//audio context (by default audio-context module)
	context: audioContext,

	//default source url to play, if undefined open file dialog will be shown
	source: null,

	//API token for soundcloud
	token: 'xxxxx...',

	//allow dropping files to browser
	dragAndDrop: true,

	//WIP open last user settings from last session: song, time
	saveSession: true,

	//enable open file dialog
	file: true,

	//enable load url input
	url: true,

	//enable microphone input
	mic: false,

	//default color for all elements
	color: 'black',

	//set of icons to use for source input component (svg components)
	icons: {open, record, mic, error, soundcloud, loading, error, url},

	//show fps stats
	fps: true,

	//start song as only as ready
	autoplay: true,

	//repeat played track or stop at the end
	loop: true,

	//show progress bar at the top of the page
	progress: true,

	//show play/pause buttons
	playPause: true,

	//show stop button
	stop: true,

	//show title of track/current source
	title: true,

	//show status icon
	icon: true,

	//github link
	github: 'dfcreative/start-app',

	//enable settings menu, optionally with the passed fields
	params: [
		{
			name: 'logarithmic',
			type: 'checkbox',
			value: true
		},
		{
			name: 'colormap',
			type: 'select',
			values: {
				cdom: 'cdom',
				inferno: 'inferno',
				plasma: 'plasma'
			},
			value: 'cdom',
			change: function (value) {}
		},
		{
			name: 'Text param',
			type: 'text',
			placeholder: 'some value',
			value:'',
		}
	]
});

//called when new source is set, inc. microphone.
app.on('source', (audioNode, url) => {
	//do any sort of connection here
	audioNode.connect(app.context.destination);
});

//set a new audio source
app.setSource(url, cb(audioNode, url)?);

//control playback & menu - play/pause/stop
app.play();
app.pause();
app.reset();

//called when track is played/paused/stopped
app.on('play', (audioNode) => {});
app.on('pause', (audioNode) => {});
app.on('stop', (audioNode) => {});


//call to update options
app.update(opts);

//set color of fonts, icons, fps etc. Better than calling update.
app.setColor(color);


//called when any of settings changed
app.on('change', (name, value, state) => {});

//creating parameters
app.addParam('my-param', {
	type: 'range',
	value: 0,
	min: 0,
	max: 100,
	step: 1
}, function onchange (value) {});
app.getParamValue('my-param');
```

## Inspired by

* [tap-to-start](https://github.com/hughsk/tap-to-start)
* [soundcloud-badge](https://github.com/hughsk/soundcloud-badge)

## Used by

* [gl-spectrum](https://github.com/audio-lab/gl-spectrum)
* [gl-spectrogram](https://github.com/audio-lab/gl-spectrogram)
* [gl-waveform](https://github.com/audio-lab/gl-waveform)