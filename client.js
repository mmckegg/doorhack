var Client = require('node-xmpp-client')
var PixelGrid = require('ndpixels-opc')
var NdArray = require('ndarray')
var Socket = require('net').Socket
var opcSocket = new Socket({ highWaterMark: 1 })

opcSocket.setNoDelay()
opcSocket.connect({ port: 7890, host: 'beaglebone.local' })

var leds = PixelGrid(0)
leds.pipe(opcSocket)

var client = new Client({
  jid: process.argv[2],
  password: process.argv[3]
})

client.connection.socket.setTimeout(0)
client.connection.socket.setKeepAlive(true, 10000)

client.on('online', function (data) {
  console.log('online', data)
  client.send(
		new Client.ltx.Element('presence', { }).c('show').t('chat').up().c('status').t('Call me, maybe?')
	)
})

client.on('stanza', function (data) {
  if (data.name === 'message') {
    data.children.forEach(function (child) {
      if (child.name === 'body') {
        ring(child.children.join(' '))
      }
    })
  }
})

var white = Frame(16, 16)
white.data.fill(200)

var black = Frame(16, 16)
black.data.fill(0)

var sequence = []
var rainbowLength = 40

for (var i = 0; i < 5; i++) {
  for (var k = 0; k < 10; k++) {
    sequence.push(black, white)
  }
  for (var d = 0; d < rainbowLength; d++) {
    var frame = Frame(16, 16)
    for (var x = 0; x < 16; x++) {
      var h = x / 16
      for (var y = 0; y < 16; y++) {
        set(frame, x, y, hslToRgb(h + d / rainbowLength, 1, (d % 10) / 10))
      }
    }
    sequence.push(frame)
  }
  sequence.push(black, black, black, black)
}

function ring (message) {
  var step = 0
  console.log('RING', message)
  var timer = setInterval(function () {
    if (sequence[step]) {
      leds.write(sequence[step])
      step += 1
    } else {
      clearTimeout(timer)
    }
  }, 1000 / 30)
}

function set (target, x, y, hsl) {
  target.set(x, y, 0, hsl[0])
  target.set(x, y, 1, hsl[1])
  target.set(x, y, 2, hsl[2])
}

function Frame (width, height) {
  var arr = NdArray(new Uint8Array(width * height * 3), [width, height, 3])
  arr.format = 'rgb'
  return arr
}

function hslToRgb (h, s, l) {
  var r, g, b
  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s
    var p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function hue2rgb (p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}
