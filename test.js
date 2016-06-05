var createDemo = require('./');
var waveform = require('./waveform');


createDemo({
	source: null,
	url: true,
	// fullscreen: true,
	// microphone: true,
	// autostart: true,
	// fps: true,
	// time: true,
	// forkme: 'https://github.com/audio-lab',
	// donate: '',
	// orientation: 'horizontal'
}, function (err, data) {
	console.log('loaded', data);

	var N = 2048;
	var sine = new Float32Array(N);
	var saw = new Float32Array(N);
	var noise = new Float32Array(N);
	var rate = 44100;

	for (var i = 0; i < N; i++) {
		sine[i] = Math.sin(10000 * Math.PI * 2 * (i / rate));
		saw[i] = 2 * ((1000 * i / rate) % 1) - 1;
		noise[i] = Math.random() * 2 - 1;
	}

	waveform(sine);
});
