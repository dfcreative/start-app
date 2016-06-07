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
	progress: true
});

//set color of fonts, icons, fps etc.
app.setColor(color);

//set a new audio source
app.setSource(url);

//call to update color, icons, params etc.
app.update(opts);

//called when new source is set to audio.
app.on('source', (url) => {});

//audio node behind app, can be used for audio processing/visualization etc
audioContext.createMediaElementSource(app.audio);
```

## Inspired by

* [tap-to-start](https://github.com/hughsk/tap-to-start)
* [soundcloud-badge](https://github.com/hughsk/soundcloud-badge)

## Used by

* [gl-spectrum](https://github.com/audio-lab/gl-spectrum)