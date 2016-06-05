var createDemo = require('./');
var raf = require('raf');


createDemo({
	// source: 'xxx',
	url: true,
	file: true,
	mic: false,
	// fullscreen: true,
	// microphone: true,
	// autostart: true,
	fps: true,
	// time: true,
	// forkme: 'https://github.com/audio-lab',
	// donate: '',
	// orientation: 'horizontal'
}, (err, url) => {
	//enable render
	raf(function draw() {
		waveform(sine);
		raf(draw)
	});
});



//waveform painter helper, expected to be user’s component
var N = 1024;
var sine = new Float32Array(N);
var saw = new Float32Array(N);
var noise = new Float32Array(N);
var rate = 44100;

for (var i = 0; i < N; i++) {
	sine[i] = Math.sin(1000 * Math.PI * 2 * (i / rate));
	saw[i] = 2 * ((1000 * i / rate) % 1) - 1;
	noise[i] = Math.random() * 2 - 1;
}


var wfCanvas = document.createElement('canvas');
wfCanvas.style.marginTop = '55px';
var wfCtx = wfCanvas.getContext('2d');
(document.body || document.documentElement).appendChild(wfCanvas);
resize();
window.addEventListener('resize', resize, false);


function resize () {
	wfCanvas.height = parseInt(window.innerHeight) - 100;
	wfCanvas.width = parseInt(window.innerWidth);
}

function waveform (buffer) {
	var len = buffer.length;

	wfCtx.clearRect(0, 0, wfCanvas.width, wfCanvas.height);

	var amp = wfCanvas.height / 2;
	var step = 1;
	var middle = amp;

	wfCtx.beginPath();
	wfCtx.moveTo(0, middle);

	for (var i = 0; i < len; i++) {
		var sampleNumber = (step * i)|0;
		var sample = buffer[sampleNumber];

		wfCtx.lineTo(i, -sample * amp + middle);
		// wfCtx.lineTo(i + 1, -sample * amp + middle);
	}

	wfCtx.stroke();
}
