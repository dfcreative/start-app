# start-app

Create demo page for a component. (WIP)

* input stream (section)
	* Drag-n-drop/upload user audio file
	* Record mic
	* Open URL
	* Generate random soundcloud url
	* Play/stop switch
	* code-generated, like tinyrave or naivesound/glitch
	* MIDI-input
	* mute btn
	* youtube link
	* web-sockets streaming any url
* output stream
	* Download file/record
	* options/codegenerator
	* Drag file to fs
* stats
	* stats, log area
	* FPS with styling
* marketing
	* Forkme link
	* Author link
	* donate
	* Meta info like repost image, favicons
* settings
	* Options switch, like style or log/linear
	* save setting to the URL
	* Mobile "start" button - start playing file or open file
	* lock iphone screen & orientation
	* fullscreen
	* keep settings: url, played time

* node pipe-in
* node pipe-out
* WAA stream into


```js
var createDemo = require('audio-demo');

createDemo({
	//container to use as a start-app demo
	container: el,

	//default color for all startapp elements
	color: 'black',

	//default source sound (url) to play
	source: '',

	//API token (for soundcloud, youtube etc.) or object {soundcloud: ..., youtube: ...}
	token: null,

	//allow for dropping files from browser to source
	dragAndDrop: true,

	//open last user settings from last session: song, time
	saveState: true,

	//enable microphone input
	mic: false,

	//enable midi input
	midi: false,

	//start song as only as ready
	autoplay: true,

	//repeat played track or stop at the end
	repeat: true,

	//show fps stats
	fps: true,

	//show played time
	time: true,

	//show play button close to the source
	playPause: true,

	//set of icons to use for source input component (svg components)
	icons: {open, record, mic},

//	fileUpload: true,
//	urlUpload: true,
//	forkme: 'repo from package.json',
//	description: 'from package.json',
//	title: 'from package.json',
//	download: true,
//	generateCode: true,
//	navigation: false
}, function ready () {
	//called as only as app is ready
}).on('change', function () {
	//update components
}).pipe(dest);
```
