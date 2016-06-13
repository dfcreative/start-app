# start-app [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)

Create demo page for an audio component.

## Usage

[![npm install start-app](https://nodei.co/npm/start-app.png?mini=true)](https://npmjs.org/package/start-app/)

```js
var createDemo = require('audio-demo');

var app = createDemo({
	//container to use as a start-app demo
	container: el,

	//default source url to play, if undefined - last session or open file dialog will be shown
	source: null,

	//API token (for soundcloud, youtube etc.)
	token: {soundcloud, youtube},

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

	//show icon
	icon: true,

	//enable settings menu, or object containing settings
	settings: {
		fill: {
			type: 'checkbox',
			value: true
		},
		colormap: {
			type: 'select',
			values: {
				cdom: 'cdom',
				inferno: 'inferno',
				plasma: 'plasma'
			},
			value: 'cdom'
		}
	}
});

//set color of fonts, icons, fps etc.
app.setColor(color);

//set a new audio source
app.setSource(url);

//call to update color, icons, params etc.
app.update(opts);

//control playback
app.play();
app.pause();
app.reset();

//called when new source is set to audio.
app.on('source', (url) => {});

//called when track is played/paused/stopped
app.on('play', () => {});
app.on('pause', () => {});
app.on('stop', () => {});

//called when ready to play
app.on('ready', (audioNode) => {});

//called when any of settings changed
app.on('change', (name, value) => {});

//creating settings
app.addSelect(name, opts);
app.addRange(name, opts);
app.addCheckbox(name, opts);
app.addNumber(name, opts);
app.addText(name, opts);
```

## Inspired by

* [tap-to-start](https://github.com/hughsk/tap-to-start)
* [soundcloud-badge](https://github.com/hughsk/soundcloud-badge)

## Used by

* [gl-spectrum](https://github.com/audio-lab/gl-spectrum)
* [gl-spectrogram](https://github.com/audio-lab/gl-spectrogram)
* [gl-waveform](https://github.com/audio-lab/gl-waveform)