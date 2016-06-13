## Q: It is rather demo-generator, not a component, right?

* Like all meta-info, images, readme things.
	* - generator is onetimer, that is bad. Yoman will not fit here.
	* It really should be a component - to make npm update and demo will be updated.
		+ Ideally - via greenkeeper.
	* It should be like browserify - takes test.js as input, generates index.html output, with all stuff included.
	* ✔ it is like tap-to-start app, or start-app

## Q: should we focus it for the audio only?

- Audio narrows possibilities, we could load any type of file
+ Audio is good to focus etc.
* We could handle default filetypes, eg if dropped an image - insert it as a bg, if dropped an mp3 - play it, etc. Default handlers.
	+ Extensible with custom handlers, eg for event `drop`.

## Q: what is the best (most handy) UI?

* allows for max self-expression
* I would expect it to play some default song (per-project), until it is changed by user

## Q: how do we receive audio, how do we send it to output?

1. HTMLAudioElement (Audio)
	+ extendive API, inc start, stop, mute
2. AudioBufferSource
	+ low-level control over the data
	+ possible to insert any type of raw data
* what if I need no use WebAudioAPI, just simple streams?
	* use web-audio-to-stream converter
3. Let user himself init the way to stream data to audio, provide him url
	+ let him use audio-source for stream
	+ let him use url for audio node
	- how do we manage raw data?
		+ by passing him an url of source as blob
	- how do we manage mic? Anyways we have to mix data.
		+ seems that we can create stream url as `navigator.getMedia({audio: true}, stream => var url = URL.createObjectURL(stream);`
	- in that case we avoid mixing. Microphone becomes an alternate to file or url.
		+ mixing can be done separately, but anyways
	+ not every browser and app have Web-Audio-API, some may want to use ajax with pure streams for example
	- how do we control the playback?
* As far as we have to have a play/pause of input stream, therefore we have to use audio element to do that.


## Q: what are necessary features
* input stream (section)
	* + Drag-n-drop/upload user audio file
	* + Record mic
	* ~ Open URL
	* x Generate random soundcloud url
	* + Play/stop switch
	* x code-generated, like tinyrave or naivesound/glitch
	* x MIDI-input
	* x mute btn
	* x youtube link
	* x web-sockets streaming any url
* output stream
	* x Download file/record
	* x options/codegenerator
	* x Drag file to fs
* stats
	* x stats, log area
	* + FPS with styling
* marketing
	* x Forkme link
	* x Author link
	* x donate
	* x Meta info like repost image, favicons
* settings
	* x Options switch, like style or log/linear
	* x save setting to the URL/localstorage
	* x Mobile "start" button - start playing file or open file
	* x lock iphone screen & orientation
	* x fullscreen
	* x keep settings: url, played time

* node pipe-in
* node pipe-out
* WAA stream into

## Q: how can we make things work now?

* For microphone we can createMediaStream node.
* For local mp3 file we can fully buffer it and return audiobuffersource.
* Websockets?
	* the predominant approach is decoding mp3 data to buffer. Guess they glue things up in scriptProcessorNode.
* WebRTC?
	* will work with mediaDevices, same way as microphone.
* audio stream (soundcloud)?
	* We can createMediaElement - it works (fhuh)
* Remote mp3 file?
	1. Whether fully load via xhr with decodeaudiodata
	2. Or