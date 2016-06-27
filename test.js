var createDemo = require('./');
var raf = require('raf');
var xhr = require('xhr');
var ctx = require('audio-context');

//analyser
var source = null;
var analyser = ctx.createAnalyser();
analyser.frequencyBinCount = 4096;
analyser.smoothingTimeConstant = .1;
analyser.connect(ctx.destination);


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



var demo = createDemo({
	// source: './sample.mp3',
	source: 'https://soundcloud.com/esteban-lara/sets/premieres',
	url: true,
	file: true,
	// mic: true,
	// playPause: true,
	// stop: true,
	// title: true,
	icon: true,
	// color: 'rgb(40,40,40)',
	// fullscreen: true,
	// microphone: true,
	// autoplay: true,
	fps: true,
	params: [
		{
			name: 'range',
			type: 'range',
			value: .1
		},
		{
			name: 'text'
		},
		{
			name: 'checkbox',
			type: 'checkbox'
		},
		{
			name: 'number',
			type: 'number'
		},
		{
			name: 'select',
			type: 'select',
			values: {
				'inferno': 'inferno',
				'plasma': 'plasma'
			},
			value: 'inferno'
		}
	]
	// forkme: 'https://github.com/audio-lab',
	// donate: '',
	// orientation: 'horizontal'
});

demo.on('source', (node) => {
	node.connect(analyser);
});

setTimeout(() => {
	demo.setColor('green');
	demo.addParam('xyz', {
		value: true
	}, (v) => console.log(v))
}, 1000);


//enable render
raf(function draw() {
	var data = new Float32Array(N);
	analyser.getFloatTimeDomainData(data);
	waveform(data);
	raf(draw)
});


var wfCanvas = document.createElement('canvas');
// wfCanvas.style.marginTop = '55px';
wfCanvas.style.display = 'block';
var wfCtx = wfCanvas.getContext('2d');
(document.body || document.documentElement).appendChild(wfCanvas);
resize();
window.addEventListener('resize', resize, false);


function resize () {
	wfCanvas.height = parseInt(window.innerHeight);
	wfCanvas.width = parseInt(window.innerWidth);
}

function waveform (buffer) {
	var len = buffer.length;

	wfCtx.clearRect(0, 0, wfCanvas.width, wfCanvas.height);

	var amp = wfCanvas.height / 2;
	var step = len / wfCanvas.width;
	var middle = amp;

	wfCtx.beginPath();
	wfCtx.moveTo(0, middle);

	for (var i = 0; i < wfCanvas.width; i++) {
		var sampleNumber = (step * i)|0;
		var sample = buffer[sampleNumber];

		wfCtx.lineTo(i, -sample * amp + middle);
		// wfCtx.lineTo(i + 1, -sample * amp + middle);
	}

	wfCtx.stroke();
}
