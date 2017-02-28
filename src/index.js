const colorConvert = require('color-convert');

const express = require('express');
const app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http);

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const hw = false;

let leds;
let currentcolor;

if (hw) {
  const Gpio = require('pigpio').Gpio;

  leds = {
    redled: new Gpio(17, { mode: Gpio.OUTPUT }),
    greenled: new Gpio(22, { mode: Gpio.OUTPUT }),
    blueled: new Gpio(24, { mode: Gpio.OUTPUT })
  };

  currentcolor = {
    red: leds.redled.getPwmDutyCycle(),
    green: leds.greenled.getPwmDutyCycle(),
    blue: leds.blueled.getPwmDutyCycle()
  };
} else {
  currentcolor = {
    red: 0,
    green: 0,
    blue: 0
  };
}

app.use('/', express.static('src/client'));

app.get('/getcolor', function(req, res) {
  return (res.json({
    rgb: [currentcolor['red'],
    currentcolor['green'],
    currentcolor['blue']],
    hex: '#' + colorConvert.rgb.hex(
      currentcolor['red'],
      currentcolor['green'],
      currentcolor['blue']
    )
  }));
});

app.post('/setcolor', function(req, res) {
  const color = req.body.color;
  if (isValidColor(color)) {
    updateColor(color);
    io.sockets.emit('color_change', color);
    console.log('[POST] Changed color to ' + color);
    return (res.json({ status: 'success', reason: '', color: currentcolor }));
  } else {
    return (res.json({ status: 'failed', reason: 'notValidColor', color: currentcolor }));
  }
});

io.on('connection', function(socket) {
  socket.emit('initial_color', colorConvert.rgb.hex(
    currentcolor['red'],
    currentcolor['green'],
    currentcolor['blue']));

  socket.on('color_change', function(color) {
    if (isValidColor(color)) {
      updateColor(color);
      socket.broadcast.emit('color_change', color);
      console.log('[Socket] Changed color to ' + color);
    }
  });
});

// Starting server on localhost:8080
http.listen(8080, _ => {
  console.log('Listening on :8080');
});

function updateColor(color) {
  const rgb = colorConvert.hex.rgb(color);
  currentcolor = { red: rgb[0], green: rgb[1], blue: rgb[2] };
  if (hw) {
    updateHardware();
  }
}

function updateHardware() {
  if (!currentcolor.red > 255) {
    leds.redled.pwmWrite(currentcolor.red);
  }
  if (!currentcolor.green > 255) {
    leds.greenled.pwmWrite(currentcolor.green);
  }
  if (!currentcolor.blue > 255) {
    leds.blueled.pwmWrite(currentcolor.blue);
  }
}

function isValidColor(color) {
  if (/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color)) {
    return true;
  }
  return false;
}
