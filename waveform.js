/**
 * Trivial waveform painter
 */

var wfCanvas = document.createElement('canvas');
var wfCtx = wfCanvas.getContext('2d');
(document.body || document.documentElement).appendChild(wfCanvas);


module.exports = function (buffer) {
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
		wfCtx.lineTo(i + 1, -sample * amp + middle);
	}

	wfCtx.stroke();
}
