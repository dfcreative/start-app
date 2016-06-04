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
3. Let user himself init the way to stream data to audio.
	+ let him use audio-source for stream
	+ let him use url for audio node
	- how do we manage raw data?
		+ by passing him an url of source.