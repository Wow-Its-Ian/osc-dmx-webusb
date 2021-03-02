/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/bindings/bindings.js":
/*!*******************************************!*\
  !*** ./node_modules/bindings/bindings.js ***!
  \*******************************************/
/***/ ((module, exports, __webpack_require__) => {

/**
 * Module dependencies.
 */

var fs = __webpack_require__(/*! fs */ "fs"),
  path = __webpack_require__(/*! path */ "path"),
  fileURLToPath = __webpack_require__(/*! file-uri-to-path */ "./node_modules/file-uri-to-path/index.js"),
  join = path.join,
  dirname = path.dirname,
  exists =
    (fs.accessSync &&
      function(path) {
        try {
          fs.accessSync(path);
        } catch (e) {
          return false;
        }
        return true;
      }) ||
    fs.existsSync ||
    path.existsSync,
  defaults = {
    arrow: process.env.NODE_BINDINGS_ARROW || ' → ',
    compiled: process.env.NODE_BINDINGS_COMPILED_DIR || 'compiled',
    platform: process.platform,
    arch: process.arch,
    nodePreGyp:
      'node-v' +
      process.versions.modules +
      '-' +
      process.platform +
      '-' +
      process.arch,
    version: process.versions.node,
    bindings: 'bindings.node',
    try: [
      // node-gyp's linked version in the "build" dir
      ['module_root', 'build', 'bindings'],
      // node-waf and gyp_addon (a.k.a node-gyp)
      ['module_root', 'build', 'Debug', 'bindings'],
      ['module_root', 'build', 'Release', 'bindings'],
      // Debug files, for development (legacy behavior, remove for node v0.9)
      ['module_root', 'out', 'Debug', 'bindings'],
      ['module_root', 'Debug', 'bindings'],
      // Release files, but manually compiled (legacy behavior, remove for node v0.9)
      ['module_root', 'out', 'Release', 'bindings'],
      ['module_root', 'Release', 'bindings'],
      // Legacy from node-waf, node <= 0.4.x
      ['module_root', 'build', 'default', 'bindings'],
      // Production "Release" buildtype binary (meh...)
      ['module_root', 'compiled', 'version', 'platform', 'arch', 'bindings'],
      // node-qbs builds
      ['module_root', 'addon-build', 'release', 'install-root', 'bindings'],
      ['module_root', 'addon-build', 'debug', 'install-root', 'bindings'],
      ['module_root', 'addon-build', 'default', 'install-root', 'bindings'],
      // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
      ['module_root', 'lib', 'binding', 'nodePreGyp', 'bindings']
    ]
  };

/**
 * The main `bindings()` function loads the compiled bindings for a given module.
 * It uses V8's Error API to determine the parent filename that this function is
 * being invoked from, which is then used to find the root directory.
 */

function bindings(opts) {
  // Argument surgery
  if (typeof opts == 'string') {
    opts = { bindings: opts };
  } else if (!opts) {
    opts = {};
  }

  // maps `defaults` onto `opts` object
  Object.keys(defaults).map(function(i) {
    if (!(i in opts)) opts[i] = defaults[i];
  });

  // Get the module root
  if (!opts.module_root) {
    opts.module_root = exports.getRoot(exports.getFileName());
  }

  // Ensure the given bindings name ends with .node
  if (path.extname(opts.bindings) != '.node') {
    opts.bindings += '.node';
  }

  // https://github.com/webpack/webpack/issues/4175#issuecomment-342931035
  var requireFunc =
     true
      ? require
      : 0;

  var tries = [],
    i = 0,
    l = opts.try.length,
    n,
    b,
    err;

  for (; i < l; i++) {
    n = join.apply(
      null,
      opts.try[i].map(function(p) {
        return opts[p] || p;
      })
    );
    tries.push(n);
    try {
      b = opts.path ? requireFunc.resolve(n) : requireFunc(n);
      if (!opts.path) {
        b.path = n;
      }
      return b;
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND' &&
          e.code !== 'QUALIFIED_PATH_RESOLUTION_FAILED' &&
          !/not find/i.test(e.message)) {
        throw e;
      }
    }
  }

  err = new Error(
    'Could not locate the bindings file. Tried:\n' +
      tries
        .map(function(a) {
          return opts.arrow + a;
        })
        .join('\n')
  );
  err.tries = tries;
  throw err;
}
module.exports = exports = bindings;

/**
 * Gets the filename of the JavaScript file that invokes this function.
 * Used to help find the root directory of a module.
 * Optionally accepts an filename argument to skip when searching for the invoking filename
 */

exports.getFileName = function getFileName(calling_file) {
  var origPST = Error.prepareStackTrace,
    origSTL = Error.stackTraceLimit,
    dummy = {},
    fileName;

  Error.stackTraceLimit = 10;

  Error.prepareStackTrace = function(e, st) {
    for (var i = 0, l = st.length; i < l; i++) {
      fileName = st[i].getFileName();
      if (fileName !== __filename) {
        if (calling_file) {
          if (fileName !== calling_file) {
            return;
          }
        } else {
          return;
        }
      }
    }
  };

  // run the 'prepareStackTrace' function above
  Error.captureStackTrace(dummy);
  dummy.stack;

  // cleanup
  Error.prepareStackTrace = origPST;
  Error.stackTraceLimit = origSTL;

  // handle filename that starts with "file://"
  var fileSchema = 'file://';
  if (fileName.indexOf(fileSchema) === 0) {
    fileName = fileURLToPath(fileName);
  }

  return fileName;
};

/**
 * Gets the root directory of a module, given an arbitrary filename
 * somewhere in the module tree. The "root directory" is the directory
 * containing the `package.json` file.
 *
 *   In:  /home/nate/node-native-module/lib/index.js
 *   Out: /home/nate/node-native-module
 */

exports.getRoot = function getRoot(file) {
  var dir = dirname(file),
    prev;
  while (true) {
    if (dir === '.') {
      // Avoids an infinite loop in rare cases, like the REPL
      dir = process.cwd();
    }
    if (
      exists(join(dir, 'package.json')) ||
      exists(join(dir, 'node_modules'))
    ) {
      // Found the 'package.json' file or 'node_modules' dir; we're done
      return dir;
    }
    if (prev === dir) {
      // Got to the top
      throw new Error(
        'Could not find module root given file: "' +
          file +
          '". Do you have a `package.json` file? '
      );
    }
    // Try the parent dir next
    prev = dir;
    dir = join(dir, '..');
  }
};


/***/ }),

/***/ "./node_modules/file-uri-to-path/index.js":
/*!************************************************!*\
  !*** ./node_modules/file-uri-to-path/index.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/**
 * Module dependencies.
 */

var sep = __webpack_require__(/*! path */ "path").sep || '/';

/**
 * Module exports.
 */

module.exports = fileUriToPath;

/**
 * File URI to Path function.
 *
 * @param {String} uri
 * @return {String} path
 * @api public
 */

function fileUriToPath (uri) {
  if ('string' != typeof uri ||
      uri.length <= 7 ||
      'file://' != uri.substring(0, 7)) {
    throw new TypeError('must pass in a file:// URI to convert to a file path');
  }

  var rest = decodeURI(uri.substring(7));
  var firstSlash = rest.indexOf('/');
  var host = rest.substring(0, firstSlash);
  var path = rest.substring(firstSlash + 1);

  // 2.  Scheme Definition
  // As a special case, <host> can be the string "localhost" or the empty
  // string; this is interpreted as "the machine from which the URL is
  // being interpreted".
  if ('localhost' == host) host = '';

  if (host) {
    host = sep + sep + host;
  }

  // 3.2  Drives, drive letters, mount points, file system root
  // Drive letters are mapped into the top of a file URI in various ways,
  // depending on the implementation; some applications substitute
  // vertical bar ("|") for the colon after the drive letter, yielding
  // "file:///c|/tmp/test.txt".  In some cases, the colon is left
  // unchanged, as in "file:///c:/tmp/test.txt".  In other cases, the
  // colon is simply omitted, as in "file:///c/tmp/test.txt".
  path = path.replace(/^(.+)\|/, '$1:');

  // for Windows, we need to invert the path separators from what a URI uses
  if (sep == '\\') {
    path = path.replace(/\//g, '\\');
  }

  if (/^.+\:/.test(path)) {
    // has Windows drive at beginning of path
  } else {
    // unix path…
    path = sep + path;
  }

  return host + path;
}


/***/ }),

/***/ "./node_modules/udmx/udmx.js":
/*!***********************************!*\
  !*** ./node_modules/udmx/udmx.js ***!
  \***********************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var usb = __webpack_require__(/*! usb */ "./node_modules/usb/usb.js");
var events = __webpack_require__(/*! events */ "events");

function DMX(options) {
    var defaults = {
        vendor: 0x16c0,
        device: 0x5dc
    };

    for(var opt in defaults) {
        if(!defaults.hasOwnProperty(opt)) continue;
        this[opt] = options && options.hasOwnProperty(opt) ? options[opt] : defaults[opt];
    }

    this.connected = false;
    this.state = {}
}

DMX.prototype.__proto__ = events.EventEmitter.prototype;

DMX.prototype.connect = function() {
    this.dev = usb.findByIds(this.vendor, this.device);
    if(this.dev === undefined) {
       throw 'Unable to find USB device!';
    }

   this.dev.open();
   this.emit('connected');
}

DMX.prototype.set = function(channel, value) {
    var self = this;
    return new Promise((resolve, reject) => {
        this.dev.controlTransfer(64, 1, value, channel-1, Buffer(1), function(err, result) {
            if(err) {
                reject(err);
            } else {
                self.emit('channel-' + channel, value);
                self.emit('channel-all', channel, value);
                self.state[channel] = value;
                resolve(result);
            }
        });
    });
}

DMX.prototype.get = function(channel) {
    return this.state[channel];
}

module.exports = DMX;


/***/ }),

/***/ "./node_modules/usb/usb.js":
/*!*********************************!*\
  !*** ./node_modules/usb/usb.js ***!
  \*********************************/
/***/ ((module, exports, __webpack_require__) => {

var usb = exports = module.exports = __webpack_require__(/*! bindings */ "./node_modules/bindings/bindings.js")('usb_bindings');
var events = __webpack_require__(/*! events */ "events")
var util = __webpack_require__(/*! util */ "util")

var isBuffer = function(obj) {
	return obj && obj instanceof Uint8Array
}

if (usb.INIT_ERROR) {
	console.warn("Failed to initialize libusb.")
	usb.Device = function () { throw new Error("Device cannot be instantiated directly.") };
	usb.Transfer = function () { throw new Error("Transfer cannot be instantiated directly.") };
	usb.setDebugLevel = function () { };
	usb.getDeviceList = function () { return []; };
	usb._enableHotplugEvents = function () { };
	usb._disableHotplugEvents = function () { };
}

Object.keys(events.EventEmitter.prototype).forEach(function (key) {
	exports[key] = events.EventEmitter.prototype[key];
});

// convenience method for finding a device by vendor and product id
exports.findByIds = function(vid, pid) {
	var devices = usb.getDeviceList()

	for (var i = 0; i < devices.length; i++) {
		var deviceDesc = devices[i].deviceDescriptor
		if ((deviceDesc.idVendor == vid) && (deviceDesc.idProduct == pid)) {
			return devices[i]
		}
	}
}

usb.Device.prototype.timeout = 1000

usb.Device.prototype.open = function(defaultConfig){
	this.__open()
	if (defaultConfig === false) return
	this.interfaces = []
	var len = this.configDescriptor ? this.configDescriptor.interfaces.length : 0
	for (var i=0; i<len; i++){
		this.interfaces[i] = new Interface(this, i)
	}
}

usb.Device.prototype.close = function(){
	this.__close()
	this.interfaces = null
}

Object.defineProperty(usb.Device.prototype, "configDescriptor", {
	get: function() {
		try {
			return this._configDescriptor || (this._configDescriptor = this.__getConfigDescriptor())
		} catch(e) {
			// Check descriptor exists
			if (e.errno == usb.LIBUSB_ERROR_NOT_FOUND) return null;
			throw e;
		}
	}
});

Object.defineProperty(usb.Device.prototype, "allConfigDescriptors", {
	get: function() {
		try {
			return this._allConfigDescriptors || (this._allConfigDescriptors = this.__getAllConfigDescriptors())
		} catch(e) {
			// Check descriptors exist
			if (e.errno == usb.LIBUSB_ERROR_NOT_FOUND) return [];
			throw e;
		}
	}
});

Object.defineProperty(usb.Device.prototype, "parent", {
	get: function() {
		return this._parent || (this._parent = this.__getParent())
	}
});

usb.Device.prototype.interface = function(addr){
	if (!this.interfaces){
		throw new Error("Device must be open before searching for interfaces")
	}
	addr = addr || 0
	for (var i=0; i<this.interfaces.length; i++){
		if (this.interfaces[i].interfaceNumber == addr){
			return this.interfaces[i]
		}
	}
}

var SETUP_SIZE = usb.LIBUSB_CONTROL_SETUP_SIZE

usb.Device.prototype.controlTransfer =
function(bmRequestType, bRequest, wValue, wIndex, data_or_length, callback){
	var self = this
	var isIn = !!(bmRequestType & usb.LIBUSB_ENDPOINT_IN)
	var wLength

	if (isIn){
		if (!(data_or_length >= 0)){
			throw new TypeError("Expected size number for IN transfer (based on bmRequestType)")
		}
		wLength = data_or_length
	}else{
		if (!isBuffer(data_or_length)){
			throw new TypeError("Expected buffer for OUT transfer (based on bmRequestType)")
		}
		wLength = data_or_length.length
	}

	// Buffer for the setup packet
	// http://libusbx.sourceforge.net/api-1.0/structlibusb__control__setup.html
	var buf = Buffer.alloc(wLength + SETUP_SIZE)
	buf.writeUInt8(   bmRequestType, 0)
	buf.writeUInt8(   bRequest,      1)
	buf.writeUInt16LE(wValue,        2)
	buf.writeUInt16LE(wIndex,        4)
	buf.writeUInt16LE(wLength,       6)

	if (!isIn){
		buf.set(data_or_length, SETUP_SIZE)
	}

	var transfer = new usb.Transfer(this, 0, usb.LIBUSB_TRANSFER_TYPE_CONTROL, this.timeout,
		function(error, buf, actual){
			if (callback){
				if (isIn){
					callback.call(self, error, buf.slice(SETUP_SIZE, SETUP_SIZE + actual))
				}else{
					callback.call(self, error)
				}
			}
		}
	)

	try {
		transfer.submit(buf)
	} catch (e) {
		if (callback){
			process.nextTick(function() { callback.call(self, e); });
		}
	}
	return this;
}

usb.Device.prototype.getStringDescriptor = function (desc_index, callback) {
	var langid = 0x0409;
	var length = 255;
	this.controlTransfer(
		usb.LIBUSB_ENDPOINT_IN,
		usb.LIBUSB_REQUEST_GET_DESCRIPTOR,
		((usb.LIBUSB_DT_STRING << 8) | desc_index),
		langid,
		length,
		function (error, buf) {
			if (error) return callback(error);
			callback(undefined, buf.toString('utf16le', 2));
		}
	);
}

usb.Device.prototype.getBosDescriptor = function (callback) {

	if (this._bosDescriptor) {
		// Cached descriptor
		return callback(undefined, this._bosDescriptor);
	}

	if (this.deviceDescriptor.bcdUSB < 0x201) {
		// BOS is only supported from USB 2.0.1
		return callback(undefined, null);
	}

	this.controlTransfer(
		usb.LIBUSB_ENDPOINT_IN,
		usb.LIBUSB_REQUEST_GET_DESCRIPTOR,
		(usb.LIBUSB_DT_BOS << 8),
		0,
		usb.LIBUSB_DT_BOS_SIZE,
		function (error, buffer) {
			if (error) {
				// Check BOS descriptor exists
				if (error.errno == usb.LIBUSB_TRANSFER_STALL) return callback(undefined, null);
				return callback(error, null);
			}

			var totalLength = buffer.readUInt16LE(2);
			this.controlTransfer(
				usb.LIBUSB_ENDPOINT_IN,
				usb.LIBUSB_REQUEST_GET_DESCRIPTOR,
				(usb.LIBUSB_DT_BOS << 8),
				0,
				totalLength,
				function (error, buffer) {
					if (error) {
						// Check BOS descriptor exists
						if (error.errno == usb.LIBUSB_TRANSFER_STALL) return callback(undefined, null);
						return callback(error, null);
					}

					var descriptor = {
						bLength: buffer.readUInt8(0),
						bDescriptorType: buffer.readUInt8(1),
						wTotalLength: buffer.readUInt16LE(2),
						bNumDeviceCaps: buffer.readUInt8(4),
						capabilities: []
					};

					var i = usb.LIBUSB_DT_BOS_SIZE;
					while (i < descriptor.wTotalLength) {
						var capability = {
							bLength: buffer.readUInt8(i + 0),
							bDescriptorType: buffer.readUInt8(i + 1),
							bDevCapabilityType: buffer.readUInt8(i + 2)
						};

						capability.dev_capability_data = buffer.slice(i + 3, i + capability.bLength);
						descriptor.capabilities.push(capability);
						i += capability.bLength;
					}

					// Cache descriptor
					this._bosDescriptor = descriptor;
					callback(undefined, this._bosDescriptor);
				}
			);
		}
	);
}

usb.Device.prototype.getCapabilities = function (callback) {
	var capabilities = [];
	var self = this;

	this.getBosDescriptor(function(error, descriptor) {
		if (error) return callback(error, null);

		var len = descriptor ? descriptor.capabilities.length : 0
		for (var i=0; i<len; i++){
			capabilities.push(new Capability(self, i))
		}

		callback(undefined, capabilities);
	});
}

usb.Device.prototype.setConfiguration = function(desired, cb) {
	var self = this;
	this.__setConfiguration(desired, function(err) {
		if (!err) {
			this.interfaces = []
			var len = this.configDescriptor ? this.configDescriptor.interfaces.length : 0
			for (var i=0; i<len; i++) {
				this.interfaces[i] = new Interface(this, i)
			}
		}
		cb.call(self, err)
	});
}

function Interface(device, id){
	this.device = device
	this.id = id
	this.altSetting = 0;
	this.__refresh()
}

Interface.prototype.__refresh = function(){
	this.descriptor = this.device.configDescriptor.interfaces[this.id][this.altSetting]
	this.interfaceNumber = this.descriptor.bInterfaceNumber
	this.endpoints = []
	var len = this.descriptor.endpoints.length
	for (var i=0; i<len; i++){
		var desc = this.descriptor.endpoints[i]
		var c = (desc.bEndpointAddress&usb.LIBUSB_ENDPOINT_IN)?InEndpoint:OutEndpoint
		this.endpoints[i] = new c(this.device, desc)
	}
}

Interface.prototype.claim = function(){
	this.device.__claimInterface(this.id)
}

Interface.prototype.release = function(closeEndpoints, cb){
	var self = this;
	if (typeof closeEndpoints == 'function') {
		cb = closeEndpoints;
		closeEndpoints = null;
	}

	if (!closeEndpoints || this.endpoints.length == 0) {
		next();
	} else {
		var n = self.endpoints.length;
		self.endpoints.forEach(function (ep, i) {
			if (ep.pollActive) {
				ep.once('end', function () {
					if (--n == 0) next();
				});
				ep.stopPoll();
			} else {
				if (--n == 0) next();
			}
		});
	}

	function next () {
		self.device.__releaseInterface(self.id, function(err){
			if (!err){
				self.altSetting = 0;
				self.__refresh()
			}
			cb.call(self, err)
		})
	}
}

Interface.prototype.isKernelDriverActive = function(){
	return this.device.__isKernelDriverActive(this.id)
}

Interface.prototype.detachKernelDriver = function() {
	return this.device.__detachKernelDriver(this.id)
};

Interface.prototype.attachKernelDriver = function() {
	return this.device.__attachKernelDriver(this.id)
};


Interface.prototype.setAltSetting = function(altSetting, cb){
	var self = this;
	this.device.__setInterface(this.id, altSetting, function(err){
		if (!err){
			self.altSetting = altSetting;
			self.__refresh();
		}
		cb.call(self, err)
	})
}

Interface.prototype.endpoint = function(addr){
	for (var i=0; i<this.endpoints.length; i++){
		if (this.endpoints[i].address == addr){
			return this.endpoints[i]
		}
	}
}

function Capability(device, id){
	this.device = device
	this.id = id
	this.descriptor = this.device._bosDescriptor.capabilities[this.id]
	this.type = this.descriptor.bDevCapabilityType
	this.data = this.descriptor.dev_capability_data
}

function Endpoint(device, descriptor){
	this.device = device
	this.descriptor = descriptor
	this.address = descriptor.bEndpointAddress
	this.transferType = descriptor.bmAttributes&0x03
}
util.inherits(Endpoint, events.EventEmitter)

Endpoint.prototype.timeout = 0

Endpoint.prototype.clearHalt = function(callback){
	return this.device.__clearHalt(this.address, callback);
}

Endpoint.prototype.makeTransfer = function(timeout, callback){
	return new usb.Transfer(this.device, this.address, this.transferType, timeout, callback)
}

Endpoint.prototype.startPoll = function(nTransfers, transferSize, callback){
	if (this.pollTransfers){
		throw new Error("Polling already active")
	}

	nTransfers = nTransfers || 3;
	this.pollTransferSize = transferSize || this.descriptor.wMaxPacketSize;
	this.pollActive = true
	this.pollPending = 0

	var transfers = []
	for (var i=0; i<nTransfers; i++){
		transfers[i] = this.makeTransfer(0, callback)
	}
	return transfers;
}

Endpoint.prototype.stopPoll = function(cb){
	if (!this.pollTransfers) {
		throw new Error('Polling is not active.');
	}
	for (var i=0; i<this.pollTransfers.length; i++){
		try {
			this.pollTransfers[i].cancel()
		} catch (err) {
			this.emit('error', err);
		}
	}
	this.pollActive = false
	if (cb) this.once('end', cb);
}

function InEndpoint(device, descriptor){
	Endpoint.call(this, device, descriptor)
}

exports.InEndpoint = InEndpoint
util.inherits(InEndpoint, Endpoint)
InEndpoint.prototype.direction = "in"

InEndpoint.prototype.transfer = function(length, cb){
	var self = this
	var buffer = Buffer.alloc(length)

	function callback(error, buf, actual){
		cb.call(self, error, buffer.slice(0, actual))
	}

	try {
		this.makeTransfer(this.timeout, callback).submit(buffer)
	} catch (e) {
		process.nextTick(function() { cb.call(self, e); });
	}
	return this;
}

InEndpoint.prototype.startPoll = function(nTransfers, transferSize){
	var self = this
	this.pollTransfers = InEndpoint.super_.prototype.startPoll.call(this, nTransfers, transferSize, transferDone)

	function transferDone(error, buf, actual){
		if (!error){
			self.emit("data", buf.slice(0, actual))
		}else if (error.errno != usb.LIBUSB_TRANSFER_CANCELLED){
			self.emit("error", error)
			self.stopPoll()
		}

		if (self.pollActive){
			startTransfer(this)
		}else{
			self.pollPending--

			if (self.pollPending == 0){
				delete self.pollTransfers;
				self.emit('end')
			}
		}
	}

	function startTransfer(t){
		try {
			t.submit(Buffer.alloc(self.pollTransferSize), transferDone);
		} catch (e) {
			self.emit("error", e);
			self.stopPoll();
		}
	}

	this.pollTransfers.forEach(startTransfer)
	self.pollPending = this.pollTransfers.length
}



function OutEndpoint(device, descriptor){
	Endpoint.call(this, device, descriptor)
}
exports.OutEndpoint = OutEndpoint
util.inherits(OutEndpoint, Endpoint)
OutEndpoint.prototype.direction = "out"

OutEndpoint.prototype.transfer = function(buffer, cb){
	var self = this
	if (!buffer){
		buffer = Buffer.alloc(0)
	}else if (!isBuffer(buffer)){
		buffer = Buffer.from(buffer)
	}

	function callback(error, buf, actual){
		if (cb) cb.call(self, error)
	}

	try {
		this.makeTransfer(this.timeout, callback).submit(buffer);
	} catch (e) {
		process.nextTick(function() { callback(e); });
	}

	return this;
}

OutEndpoint.prototype.transferWithZLP = function (buf, cb) {
	if (buf.length % this.descriptor.wMaxPacketSize == 0) {
		this.transfer(buf);
		this.transfer(Buffer.alloc(0), cb);
	} else {
		this.transfer(buf, cb);
	}
}

var hotplugListeners = 0;
exports.on('newListener', function(name) {
	if (name !== 'attach' && name !== 'detach') return;
	if (++hotplugListeners === 1) {
		usb._enableHotplugEvents();
	}
});

exports.on('removeListener', function(name) {
	if (name !== 'attach' && name !== 'detach') return;
	if (--hotplugListeners === 0) {
		usb._disableHotplugEvents();
	}
});


/***/ }),

/***/ "./node_modules/webusb-dmx512-controller/controller.js":
/*!*************************************************************!*\
  !*** ./node_modules/webusb-dmx512-controller/controller.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Controller)
/* harmony export */ });
/**
 * The controller is creating a connection to the USB device (Arduino) to send data over WebUSB.
 * By using the default <code>args</code> you will only see the following Arduino in the user prompt:
 * - Arduino Leonardo
 * - Arduino Leonardo ETH
 * - Seeeduino Lite
 * @module Controller
 *
 * @param {Object} args - Arguments to configure the controller
 * @param {Object[]} args.filters - List of devices that are whitelisted when opening the user prompt to select an Arduino
 * @param {Object} args.device - The selected Arduino to use as the DMX512 controller
 * @param {number[]} args.universe - Holds all the values for each channel of the DMX512 universe
 * @example
 * import Controller from 'webusb-dmx512-controller/controller.js'
 *
 * // Create a new controller using the default properties
 * const controller = new Controller()
 */
class Controller {

  constructor(args = {}) {
    // Reference to the selected USB device
    this.device = args.device || undefined

    // Only allow specific USB devices
    this.filters = args.filters || [
      // Arduino Leonardo
      { vendorId: 0x2341, productId: 0x8036 },
      { vendorId: 0x2341, productId: 0x0036 },
      { vendorId: 0x2a03, productId: 0x8036 },
      { vendorId: 0x2a03, productId: 0x0036 },

      // Arduino Leonardo ETH
      { vendorId: 0x2a03, productId: 0x0040 },
      { vendorId: 0x2a03, productId: 0x8040 },

      // Seeeduino Lite
      { vendorId: 0x2886, productId: 0x8002 },

      // UDMX
      { vendorId: 0x16c0, productId: 0x5dc }
    ]

    // The DMX512 universe with 512 channels
    this.universe = args.universe || new Array(512).fill(0)
  }

  /**
   * Enable WebUSB and save the selected Arduino into <code>controller.device</code>
   *
   * Note: This function has to be triggered by a user gesture
   *
   * @return {Promise}
   *
   * @example
   * controller.enable().then(() => {
   *   // Create a connection to the selected Arduino
   *   controller.connect().then(() => {
   *     // Successfully created a connection
   *   })
   * })
   * .catch(error => {
   *   // No Arduino was selected by the user
   * })
   */
  enable() {
    // Request access to the USB device
    return navigator.usb.requestDevice({ filters: this.filters })

    // selectedDevice = the USB device that was selected by the user in the browser
    .then(selectedDevice => {
      this.device = selectedDevice
    })
  }

  /**
   * Get a USB device that was already paired with the browser.
   *
   * @return {Promise}
   */
  getPairedDevice() {
    return navigator.usb.getDevices()

    .then(devices => {
      return devices[0]
    })
  }

  /**
   * Automatically connect to a USB device that was already paired with the Browser and save it into <code>controller.device</code>
   *
   * @return {Promise}
   * @example
   * controller.autoConnect()
   *   .then(() => {
   *     // Connected to already paired Arduino
   *   })
   *   .catch(error => {
   *     // Nothing found or found paired Arduino, but it's not connected to computer
   *   })
   */
  autoConnect() {
    return this.getPairedDevice().then((device) => {

      this.device = device

      return new Promise((resolve, reject) => {

        // USB Device is not connected to the computer
        if (this.device === undefined) {
          return reject(new Error('Can not find USB device.'))

        // USB device is connected to the computer, so try to create a WebUSB connection
        } else {
          return resolve(this.connect())
        }

      })

    })
  }

  /**
   * Open a connection to the selected USB device and tell the device that
   * we are ready to send data to it.
   *
   * @return {Promise}
   * @example
   * controller.connect().then(() => {
   *   // Successfully created a connection to the selected Arduino
   * })
   */
  connect() {
    // Open connection
    return this.device.open()

    // Select #1 configuration if not automatially set by OS
    .then(() => {
      if (this.device.configuration === null) {
        return this.device.selectConfiguration(1)
      }
    })

    // Get exclusive access to the #2 interface
    .then(() => this.device.claimInterface(2))

    // Tell the USB device that we are ready to send data
    .then(() => this.device.controlTransferOut({
        // It's a USB class request
        'requestType': 'class',
        // The destination of this request is the interface
        'recipient': 'interface',
        // CDC: Communication Device Class
        // 0x22: SET_CONTROL_LINE_STATE
        // RS-232 signal used to tell the USB device that the computer is now present.
        'request': 0x22,
        // Yes
        'value': 0x01,
        // Interface #2
        'index': 0x02
      })
    )
  }

  /**
   * Send data to the USB device to update the DMX512 universe
   *
   * @param {Array} data - List containing all channels that should be updated in the universe
   *
   * @return {Promise}
   * @example
   * controller.send([255, 0, 0])
   */
  send(data) {
    return new Promise((resolve, reject) => {

      // USB Device is not connected to the computer
      if (this.device === undefined) {
        return reject(new Error('USB device is not connected to the computer'))

      // USB device is connected to the computer, so try to create a WebUSB connection
      } else {
        // Create an ArrayBuffer, because that is needed for WebUSB
        const buffer = Uint8Array.from(data)

        // Send data on Endpoint #4
        return resolve(this.device.transferOut(4, buffer))
      }

    })
  }

  /**
   * Update the <code>channel</code>(s) of the DMX512 universe with the provided <code>value</code>
   *
   * @param {number} channel - The channel to update
   * @param {(number|number[])} value - The value to update the channel, supporting two different modes: single (= <code>number</code>) & multi (= <code>Array</code>)
   * @example <caption>Update a single channel</caption>
   * // Update channel #1
   * controller.updateUniverse(1, 255)
   * @example <caption>Update multiple channels starting with channel</caption>
   * // Update channel #5 with 255, #6 with 0 & #7 with 20
   * controller.updateUniverse(5, [255, 0, 20])
   */
  updateUniverse(channel, value) {
    return new Promise((resolve, reject) => {

      // The DMX512 universe starts with channel 1, but the array with 0
      channel = channel - 1

      // Single
      if (Number.isInteger(value)) {
        this.universe.splice(channel, 1, value)

      // Multiple
      } else if (Array.isArray(value)) {
        this.universe.splice(channel, value.length, ...value)

      } else {
        return reject(new Error('Could not update Universe because the provided value is not of type number or number[]'))
      }

      // Send the updated universe to the DMX512 controller
      return resolve(this.send(this.universe))

    })
  }

  /**
   * Disconnect from the USB device
   *
   * Note: The device is still paired to the browser!
   *
   * @return {Promise}
   * @example
   * controller.disconnect().then(() => {
   *   // Destroyed connection to USB device, but USB device is still paired with the browser
   *})
   */
  disconnect() {
    // Declare that we don't want to receive data anymore
    return this.device.controlTransferOut({
      // It's a USB class request
      'requestType': 'class',
      // The destination of this request is the interface
      'recipient': 'interface',
      // CDC: Communication Device Class
      // 0x22: SET_CONTROL_LINE_STATE
      // RS-232 signal used to tell the USB device that the computer is not present anymore
      'request': 0x22,
      // No
      'value': 0x01,
      // Interface #2
      'index': 0x02
    })

    // Close the connection to the USB device
    .then(() => this.device.close())
  }
}


/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");;

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");;

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!******************************!*\
  !*** ./web/dmxController.js ***!
  \******************************/
var Controller = __webpack_require__(/*! webusb-dmx512-controller */ "./node_modules/webusb-dmx512-controller/controller.js").default;

var uDMX = __webpack_require__(/*! udmx */ "./node_modules/udmx/udmx.js");

var controller = new Controller();
console.log(controller);
var example = example || {};

(function () {
  "use strict";

  example.DMXController = function () {
    this.oscPort = new osc.WebSocketPort({
      url: "ws://localhost:8081"
    });
    this.listen();
    this.oscPort.open();

    this.oscPort.socket.onmessage = function (e) {
      console.log("message", e);
    };

    this.valueMap = {
      "/1/toggle1": "DMX channel 1",
      "/1/fader1": "DMX channel 1",
      "/1/toggle2": "DMX channel 1",
      "/1/fader2": "DMX channel 1",
      "/1/toggle3": "DMX channel 1",
      "/1/fader3": "DMX channel 1",
      "/1/toggle4": "DMX channel 1",
      "/1/fader4": "DMX channel 1"
    };
  };

  example.DMXController.prototype.listen = function () {
    this.oscPort.on("message", this.mapMessage.bind(this));
    this.oscPort.on("message", function (msg) {
      console.log("message", msg);
    });
  };

  example.DMXController.prototype.mapMessage = function (oscMessage) {
    $("#message").text(fluid.prettyPrintJSON(oscMessage));
  };
})();

var startBtn = document.getElementById("start-btn");
startBtn.addEventListener("click", e => {
  // Enable WebUSB and select the Arduino
  console.log(navigator.usb.getDevices());
  controller.enable().then(() => {
    // Create a connection to the selected Arduino
    controller.connect().then(() => {
      // Update the 1 channel of the DMX512 universe with value 255
      controller.updateUniverse(1, 255);
    });
  });
});
var dmxController = new example.DMXController();
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9vc2MtdGVzdC8uL25vZGVfbW9kdWxlcy9iaW5kaW5ncy9iaW5kaW5ncy5qcyIsIndlYnBhY2s6Ly9vc2MtdGVzdC8uL25vZGVfbW9kdWxlcy9maWxlLXVyaS10by1wYXRoL2luZGV4LmpzIiwid2VicGFjazovL29zYy10ZXN0Ly4vbm9kZV9tb2R1bGVzL3VkbXgvdWRteC5qcyIsIndlYnBhY2s6Ly9vc2MtdGVzdC8uL25vZGVfbW9kdWxlcy91c2IvdXNiLmpzIiwid2VicGFjazovL29zYy10ZXN0Ly4vbm9kZV9tb2R1bGVzL3dlYnVzYi1kbXg1MTItY29udHJvbGxlci9jb250cm9sbGVyLmpzIiwid2VicGFjazovL29zYy10ZXN0L2V4dGVybmFsIFwiZXZlbnRzXCIiLCJ3ZWJwYWNrOi8vb3NjLXRlc3QvZXh0ZXJuYWwgXCJmc1wiIiwid2VicGFjazovL29zYy10ZXN0L2V4dGVybmFsIFwicGF0aFwiIiwid2VicGFjazovL29zYy10ZXN0L2V4dGVybmFsIFwidXRpbFwiIiwid2VicGFjazovL29zYy10ZXN0L3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL29zYy10ZXN0L3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9vc2MtdGVzdC93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL29zYy10ZXN0L3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vb3NjLXRlc3QvLi93ZWIvZG14Q29udHJvbGxlci5qcyJdLCJuYW1lcyI6WyJDb250cm9sbGVyIiwicmVxdWlyZSIsInVETVgiLCJjb250cm9sbGVyIiwiY29uc29sZSIsImxvZyIsImV4YW1wbGUiLCJETVhDb250cm9sbGVyIiwib3NjUG9ydCIsIm9zYyIsIldlYlNvY2tldFBvcnQiLCJ1cmwiLCJsaXN0ZW4iLCJvcGVuIiwic29ja2V0Iiwib25tZXNzYWdlIiwiZSIsInZhbHVlTWFwIiwicHJvdG90eXBlIiwib24iLCJtYXBNZXNzYWdlIiwiYmluZCIsIm1zZyIsIm9zY01lc3NhZ2UiLCIkIiwidGV4dCIsImZsdWlkIiwicHJldHR5UHJpbnRKU09OIiwic3RhcnRCdG4iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiYWRkRXZlbnRMaXN0ZW5lciIsIm5hdmlnYXRvciIsInVzYiIsImdldERldmljZXMiLCJlbmFibGUiLCJ0aGVuIiwiY29ubmVjdCIsInVwZGF0ZVVuaXZlcnNlIiwiZG14Q29udHJvbGxlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBOztBQUVBLFNBQVMsbUJBQU8sQ0FBQyxjQUFJO0FBQ3JCLFNBQVMsbUJBQU8sQ0FBQyxrQkFBTTtBQUN2QixrQkFBa0IsbUJBQU8sQ0FBQyxrRUFBa0I7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBDQUEwQyxTQUFTLEVBQUUsU0FBUyxFQUFFO0FBQ2hFO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWixHQUFHO0FBQ0g7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxJQUFJLEtBQXlDO0FBQzdDLFFBQVEsT0FBdUI7QUFDL0IsUUFBUSxDQUFPOztBQUVmO0FBQ0E7QUFDQTtB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Q0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYywwQkFBMEI7QUFDeEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQUFFO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEVBQUU7QUFDRjtBQUNBLGdDQUFnQyx3QkFBd0IsRUFBRTtBQUMxRDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxlQUFlLE9BQU87QUFDdEI7QUFDQTs7QUFFQTtBQUNBLEVBQUU7QUFDRjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0IsT0FBTztBQUN2QjtBQUNBO0FB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LENBQXlCLE1BQU07QUFDOUI7QUFDQWpDLGNBQVUsQ0FBQ2tDLE9BQVgsR0FBcUJELElBQXJCLENBQTBCLE1BQU07QUFDL0I7QUFDQWpDLGdCQUFVLENBQUNtQyxjQUFYLENBQTBCLENBQTFCLEVBQTZCLEdBQTdCO0FBQ0EsS0FIRDtBQUlBLEdBTkQ7QUFPQSxDQVZEO0FBWUEsSUFBTUMsYUFBYSxHQUFHLElBQUlqQyxPQUFPLENBQUNDLGFBQVosRUFBdEIsQyIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIGZzID0gcmVxdWlyZSgnZnMnKSxcbiAgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKSxcbiAgZmlsZVVSTFRvUGF0aCA9IHJlcXVpcmUoJ2ZpbGUtdXJpLXRvLXBhdGgnKSxcbiAgam9pbiA9IHBhdGguam9pbixcbiAgZGlybmFtZSA9IHBhdGguZGlybmFtZSxcbiAgZXhpc3RzID1cbiAgICAoZnMuYWNjZXNzU3luYyAmJlxuICAgICAgZnVuY3Rpb24ocGF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGZzLmFjY2Vzc1N5bmMocGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KSB8fFxuICAgIGZzLmV4aXN0c1N5bmMgfHxcbiAgICBwYXRoLmV4aXN0c1N5bmMsXG4gIGRlZmF1bHRzID0ge1xuICAgIGFycm93OiBwcm9jZXNzLmVudi5OT0RFX0JJTkRJTkdTX0FSUk9XIHx8ICcg4oaSICcsXG4gICAgY29tcGlsZWQ6IHByb2Nlc3MuZW52Lk5PREVfQklORElOR1NfQ09NUElMRURfRElSIHx8ICdjb21waWxlZCcsXG4gICAgcGxhdGZvcm06IHByb2Nlc3MucGxhdGZvcm0sXG4gICAgYXJjaDogcHJvY2Vzcy5hcmNoLFxuICAgIG5vZGVQcmVHeXA6XG4gICAgICAnbm9kZS12JyArXG4gICAgICBwcm9jZXNzLnZlcnNpb25zLm1vZHVsZXMgK1xuICAgICAgJy0nICtcbiAgICAgIHByb2Nlc3MucGxhdGZvcm0gK1xuICAgICAgJy0nICtcbiAgICAgIHByb2Nlc3MuYXJjaCxcbiAgICB2ZXJzaW9uOiBwcm9jZXNzLnZlcnNpb25zLm5vZGUsXG4gICAgYmluZGluZ3M6ICdiaW5kaW5ncy5ub2RlJyxcbiAgICB0cnk6IFtcbiAgICAgIC8vIG5vZGUtZ3lwJ3MgbGlua2VkIHZlcnNpb24gaW4gdGhlIFwiYnVpbGRcIiBkaXJcbiAgICAgIFsnbW9kdWxlX3Jvb3QnLCAnYnVpbGQnLCAnYmluZGluZ3MnXSxcbiAgICAgIC8vIG5vZGUtd2FmIGFuZCBneXBfYWRkb24gKGEuay5hIG5vZGUtZ3lwKVxuICAgICAgWydtb2R1bGVfcm9vdCcsICdidWlsZCcsICdEZWJ1ZycsICdiaW5kaW5ncyddLFxuICAgICAgWydtb2R1bGVfcm9vdCcsICdidWlsZCcsICdSZWxlYXNlJywgJ2JpbmRpbmdzJ10sXG4gICAgICAvLyBEZWJ1ZyBmaWxlcywgZm9yIGRldmVsb3BtZW50IChsZWdhY3kgYmVoYXZpb3IsIHJlbW92ZSBmb3Igbm9kZSB2MC45KVxuICAgICAgWydtb2R1bGVfcm9vdCcsICdvdXQnLCAnRGVidWcnLCAnYmluZGluZ3MnXSxcbiAgICAgIFsnbW9kdWxlX3Jvb3QnLCAnRGVidWcnLCAnYmluZGluZ3MnXSxcbiAgICAgIC8vIFJlbGVhc2UgZmlsZXMsIGJ1dCBtYW51YWxseSBjb21waWxlZCAobGVnYWN5IGJlaGF2aW9yLCByZW1vdmUgZm9yIG5vZGUgdjAuOSlcbiAgICAgIFsnbW9kdWxlX3Jvb3QnLCAnb3V0JywgJ1JlbGVhc2UnLCAnYmluZGluZ3MnXSxcbiAgICAgIFsnbW9kdWxlX3Jvb3QnLCAnUmVsZWFzZScsICdiaW5kaW5ncyddLFxuICAgICAgLy8gTGVnYWN5IGZyb20gbm9kZS13YWYsIG5vZGUgPD0gMC40LnhcbiAgICAgIFsnbW9kdWxlX3Jvb3QnLCAnYnVpbGQnLCAnZGVmYXVsdCcsICdiaW5kaW5ncyddLFxuICAgICAgLy8gUHJvZHVjdGlvbiBcIlJlbGVhc2VcIiBidWlsZHR5cGUgYmluYXJ5IChtZWguLi4pXG4gICAgICBbJ21vZHVsZV9yb290JywgJ2NvbXBpbGVkJywgJ3ZlcnNpb24nLCAncGxhdGZvcm0nLCAnYXJjaCcsICdiaW5kaW5ncyddLFxuICAgICAgLy8gbm9kZS1xYnMgYnVpbGRzXG4gICAgICBbJ21vZHVsZV9yb290JywgJ2FkZG9uLWJ1aWxkJywgJ3JlbGVhc2UnLCAnaW5zdGFsbC1yb290JywgJ2JpbmRpbmdzJ10sXG4gICAgICBbJ21vZHVsZV9yb290JywgJ2FkZG9uLWJ1aWxkJywgJ2RlYnVnJywgJ2luc3RhbGwtcm9vdCcsICdiaW5kaW5ncyddLFxuICAgICAgWydtb2R1bGVfcm9vdCcsICdhZGRvbi1idWlsZCcsICdkZWZhdWx0JywgJ2luc3RhbGwtcm9vdCcsICdiaW5kaW5ncyddLFxuICAgICAgLy8gbm9kZS1wcmUtZ3lwIHBhdGggLi9saWIvYmluZGluZy97bm9kZV9hYml9LXtwbGF0Zm9ybX0te2FyY2h9XG4gICAgICBbJ21vZHVsZV9yb290JywgJ2xpYicsICdiaW5kaW5nJywgJ25vZGVQcmVHeXAnLCAnYmluZGluZ3MnXVxuICAgIF1cbiAgfTtcblxuLyoqXG4gKiBUaGUgbWFpbiBgYmluZGluZ3MoKWAgZnVuY3Rpb24gbG9hZHMgdGhlIGNvbXBpbGVkIGJpbmRpbmdzIGZvciBhIGdpdmVuIG1vZHVsZS5cbiAqIEl0IHVzZXMgVjgncyBFcnJvciBBUEkgdG8gZGV0ZXJtaW5lIHRoZSBwYXJlbnQgZmlsZW5hbWUgdGhhdCB0aGlzIGZ1bmN0aW9uIGlzXG4gKiBiZWluZyBpbnZva2VkIGZyb20sIHdoaWNoIGlzIHRoZW4gdXNlZCB0byBmaW5kIHRoZSByb290IGRpcmVjdG9yeS5cbiAqL1xuXG5mdW5jdGlvbiBiaW5kaW5ncyhvcHRzKSB7XG4gIC8vIEFyZ3VtZW50IHN1cmdlcnlcbiAgaWYgKHR5cGVvZiBvcHRzID09ICdzdHJpbmcnKSB7XG4gICAgb3B0cyA9IHsgYmluZGluZ3M6IG9wdHMgfTtcbiAgfSBlbHNlIGlmICghb3B0cykge1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIC8vIG1hcHMgYGRlZmF1bHRzYCBvbnRvIGBvcHRzYCBvYmplY3RcbiAgT2JqZWN0LmtleXMoZGVmYXVsdHMpLm1hcChmdW5jdGlvbihpKSB7XG4gICAgaWYgKCEoaSBpbiBvcHRzKSkgb3B0c1tpXSA9IGRlZmF1bHRzW2ldO1xuICB9KTtcblxuICAvLyBHZXQgdGhlIG1vZHVsZSByb290XG4gIGlmICghb3B0cy5tb2R1bGVfcm9vdCkge1xuICAgIG9wdHMubW9kdWxlX3Jvb3QgPSBleHBvcnRzLmdldFJvb3QoZXhwb3J0cy5nZXRGaWxlTmFtZSgpKTtcbiAgfVxuXG4gIC8vIEVuc3VyZSB0aGUgZ2l2ZW4gYmluZGluZ3MgbmFtZSBlbmRzIHdpdGggLm5vZGVcbiAgaWYgKHBhdGguZXh0bmFtZShvcHRzLmJpbmRpbmdzKSAhPSAnLm5vZGUnKSB7XG4gICAgb3B0cy5iaW5kaW5ncyArPSAnLm5vZGUnO1xuICB9XG5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3dlYnBhY2svd2VicGFjay9pc3N1ZXMvNDE3NSNpc3N1ZWNvbW1lbnQtMzQyOTMxMDM1XG4gIHZhciByZXF1aXJlRnVuYyA9XG4gICAgdHlwZW9mIF9fd2VicGFja19yZXF1aXJlX18gPT09ICdmdW5jdGlvbidcbiAgICAgID8gX19ub25fd2VicGFja19yZXF1aXJlX19cbiAgICAgIDogcmVxdWlyZTtcblxuICB2YXIgdHJpZXMgPSBbXSxcbiAgICBpID0gMCxcbiAgICBsID0gb3B0cy50cnkubGVuZ3RoLFxuICAgIG4sXG4gICAgYixcbiAgICBlcnI7XG5cbiAgZm9yICg7IGkgPCBsOyBpKyspIHtcbiAgICBuID0gam9pbi5hcHBseShcbiAgICAgIG51bGwsXG4gICAgICBvcHRzLnRyeVtpXS5tYXAoZnVuY3Rpb24ocCkge1xuICAgICAgICByZXR1cm4gb3B0c1twXSB8fCBwO1xuICAgICAgfSlcbiAgICApO1xuICAgIHRyaWVzLnB1c2gobik7XG4gICAgdHJ5IHtcbiAgICAgIGIgPSBvcHRzLnBhdGggPyByZXF1aXJlRnVuYy5yZXNvbHZlKG4pIDogcmVxdWlyZUZ1bmMobik7XG4gICAgICBpZiAoIW9wdHMucGF0aCkge1xuICAgICAgICBiLnBhdGggPSBuO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGI7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUuY29kZSAhPT0gJ01PRFVMRV9OT1RfRk9VTkQnICYmXG4gICAgICAgICAgZS5jb2RlICE9PSAnUVVBTElGSUVEX1BBVEhfUkVTT0xVVElPTl9GQUlMRUQnICYmXG4gICAgICAgICAgIS9ub3QgZmluZC9pLnRlc3QoZS5tZXNzYWdlKSkge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGVyciA9IG5ldyBFcnJvcihcbiAgICAnQ291bGQgbm90IGxvY2F0ZSB0aGUgYmluZGluZ3MgZmlsZS4gVHJpZWQ6XFxuJyArXG4gICAgICB0cmllc1xuICAgICAgICAubWFwKGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgICByZXR1cm4gb3B0cy5hcnJvdyArIGE7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKCdcXG4nKVxuICApO1xuICBlcnIudHJpZXMgPSB0cmllcztcbiAgdGhyb3cgZXJyO1xufVxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gYmluZGluZ3M7XG5cbi8qKlxuICogR2V0cyB0aGUgZmlsZW5hbWUgb2YgdGhlIEphdmFTY3JpcHQgZmlsZSB0aGF0IGludm9rZXMgdGhpcyBmdW5jdGlvbi5cbiAqIFVzZWQgdG8gaGVscCBmaW5kIHRoZSByb290IGRpcmVjdG9yeSBvZiBhIG1vZHVsZS5cbiAqIE9wdGlvbmFsbHkgYWNjZXB0cyBhbiBmaWxlbmFtZSBhcmd1bWVudCB0byBza2lwIHdoZW4gc2VhcmNoaW5nIGZvciB0aGUgaW52b2tpbmcgZmlsZW5hbWVcbiAqL1xuXG5leHBvcnRzLmdldEZpbGVOYW1lID0gZnVuY3Rpb24gZ2V0RmlsZU5hbWUoY2FsbGluZ19maWxlKSB7XG4gIHZhciBvcmlnUFNUID0gRXJyb3IucHJlcGFyZVN0YWNrVHJhY2UsXG4gICAgb3JpZ1NUTCA9IEVycm9yLnN0YWNrVHJhY2VMaW1pdCxcbiAgICBkdW1teSA9IHt9LFxuICAgIGZpbGVOYW1lO1xuXG4gIEVycm9yLnN0YWNrVHJhY2VMaW1pdCA9IDEwO1xuXG4gIEVycm9yLnByZXBhcmVTdGFja1RyYWNlID0gZnVuY3Rpb24oZSwgc3QpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHN0Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgZmlsZU5hbWUgPSBzdFtpXS5nZXRGaWxlTmFtZSgpO1xuICAgICAgaWYgKGZpbGVOYW1lICE9PSBfX2ZpbGVuYW1lKSB7XG4gICAgICAgIGlmIChjYWxsaW5nX2ZpbGUpIHtcbiAgICAgICAgICBpZiAoZmlsZU5hbWUgIT09IGNhbGxpbmdfZmlsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gcnVuIHRoZSAncHJlcGFyZVN0YWNrVHJhY2UnIGZ1bmN0aW9uIGFib3ZlXG4gIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKGR1bW15KTtcbiAgZHVtbXkuc3RhY2s7XG5cbiAgLy8gY2xlYW51cFxuICBFcnJvci5wcmVwYXJlU3RhY2tUcmFjZSA9IG9yaWdQU1Q7XG4gIEVycm9yLnN0YWNrVHJhY2VMaW1pdCA9IG9yaWdTVEw7XG5cbiAgLy8gaGFuZGxlIGZpbGVuYW1lIHRoYXQgc3RhcnRzIHdpdGggXCJmaWxlOi8vXCJcbiAgdmFyIGZpbGVTY2hlbWEgPSAnZmlsZTovLyc7XG4gIGlmIChmaWxlTmFtZS5pbmRleE9mKGZpbGVTY2hlbWEpID09PSAwKSB7XG4gICAgZmlsZU5hbWUgPSBmaWxlVVJMVG9QYXRoKGZpbGVOYW1lKTtcbiAgfVxuXG4gIHJldHVybiBmaWxlTmFtZTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgYSBtb2R1bGUsIGdpdmVuIGFuIGFyYml0cmFyeSBmaWxlbmFtZVxuICogc29tZXdoZXJlIGluIHRoZSBtb2R1bGUgdHJlZS4gVGhlIFwicm9vdCBkaXJlY3RvcnlcIiBpcyB0aGUgZGlyZWN0b3J5XG4gKiBjb250YWluaW5nIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlLlxuICpcbiAqICAgSW46ICAvaG9tZS9uYXRlL25vZGUtbmF0aXZlLW1vZHVsZS9saWIvaW5kZXguanNcbiAqICAgT3V0OiAvaG9tZS9uYXRlL25vZGUtbmF0aXZlLW1vZHVsZVxuICovXG5cbmV4cG9ydHMuZ2V0Um9vdCA9IGZ1bmN0aW9uIGdldFJvb3QoZmlsZSkge1xuICB2YXIgZGlyID0gZGlybmFtZShmaWxlKSxcbiAgICBwcmV2O1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGlmIChkaXIgPT09ICcuJykge1xuICAgICAgLy8gQXZvaWRzIGFuIGluZmluaXRlIGxvb3AgaW4gcmFyZSBjYXNlcywgbGlrZSB0aGUgUkVQTFxuICAgICAgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgZXhpc3RzKGpvaW4oZGlyLCAncGFja2FnZS5qc29uJykpIHx8XG4gICAgICBleGlzdHMoam9pbihkaXIsICdub2RlX21vZHVsZXMnKSlcbiAgICApIHtcbiAgICAgIC8vIEZvdW5kIHRoZSAncGFja2FnZS5qc29uJyBmaWxlIG9yICdub2RlX21vZHVsZXMnIGRpcjsgd2UncmUgZG9uZVxuICAgICAgcmV0dXJuIGRpcjtcbiAgICB9XG4gICAgaWYgKHByZXYgPT09IGRpcikge1xuICAgICAgLy8gR290IHRvIHRoZSB0b3BcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0NvdWxkIG5vdCBmaW5kIG1vZHVsZSByb290IGdpdmVuIGZpbGU6IFwiJyArXG4gICAgICAgICAgZmlsZSArXG4gICAgICAgICAgJ1wiLiBEbyB5b3UgaGF2ZSBhIGBwYWNrYWdlLmpzb25gIGZpbGU/ICdcbiAgICAgICk7XG4gICAgfVxuICAgIC8vIFRyeSB0aGUgcGFyZW50IGRpciBuZXh0XG4gICAgcHJldiA9IGRpcjtcbiAgICBkaXIgPSBqb2luKGRpciwgJy4uJyk7XG4gIH1cbn07XG4iLCJcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgc2VwID0gcmVxdWlyZSgncGF0aCcpLnNlcCB8fCAnLyc7XG5cbi8qKlxuICogTW9kdWxlIGV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmaWxlVXJpVG9QYXRoO1xuXG4vKipcbiAqIEZpbGUgVVJJIHRvIFBhdGggZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVyaVxuICogQHJldHVybiB7U3RyaW5nfSBwYXRoXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGZpbGVVcmlUb1BhdGggKHVyaSkge1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHVyaSB8fFxuICAgICAgdXJpLmxlbmd0aCA8PSA3IHx8XG4gICAgICAnZmlsZTovLycgIT0gdXJpLnN1YnN0cmluZygwLCA3KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3QgcGFzcyBpbiBhIGZpbGU6Ly8gVVJJIHRvIGNvbnZlcnQgdG8gYSBmaWxlIHBhdGgnKTtcbiAgfVxuXG4gIHZhciByZXN0ID0gZGVjb2RlVVJJKHVyaS5zdWJzdHJpbmcoNykpO1xuICB2YXIgZmlyc3RTbGFzaCA9IHJlc3QuaW5kZXhPZignLycpO1xuICB2YXIgaG9zdCA9IHJlc3Quc3Vic3RyaW5nKDAsIGZpcnN0U2xhc2gpO1xuICB2YXIgcGF0aCA9IHJlc3Quc3Vic3RyaW5nKGZpcnN0U2xhc2ggKyAxKTtcblxuICAvLyAyLiAgU2NoZW1lIERlZmluaXRpb25cbiAgLy8gQXMgYSBzcGVjaWFsIGNhc2UsIDxob3N0PiBjYW4gYmUgdGhlIHN0cmluZyBcImxvY2FsaG9zdFwiIG9yIHRoZSBlbXB0eVxuICAvLyBzdHJpbmc7IHRoaXMgaXMgaW50ZXJwcmV0ZWQgYXMgXCJ0aGUgbWFjaGluZSBmcm9tIHdoaWNoIHRoZSBVUkwgaXNcbiAgLy8gYmVpbmcgaW50ZXJwcmV0ZWRcIi5cbiAgaWYgKCdsb2NhbGhvc3QnID09IGhvc3QpIGhvc3QgPSAnJztcblxuICBpZiAoaG9zdCkge1xuICAgIGhvc3QgPSBzZXAgKyBzZXAgKyBob3N0O1xuICB9XG5cbiAgLy8gMy4yICBEcml2ZXMsIGRyaXZlIGxldHRlcnMsIG1vdW50IHBvaW50cywgZmlsZSBzeXN0ZW0gcm9vdFxuICAvLyBEcml2ZSBsZXR0ZXJzIGFyZSBtYXBwZWQgaW50byB0aGUgdG9wIG9mIGEgZmlsZSBVUkkgaW4gdmFyaW91cyB3YXlzLFxuICAvLyBkZXBlbmRpbmcgb24gdGhlIGltcGxlbWVudGF0aW9uOyBzb21lIGFwcGxpY2F0aW9ucyBzdWJzdGl0dXRlXG4gIC8vIHZlcnRpY2FsIGJhciAoXCJ8XCIpIGZvciB0aGUgY29sb24gYWZ0ZXIgdGhlIGRyaXZlIGxldHRlciwgeWllbGRpbmdcbiAgLy8gXCJmaWxlOi8vL2N8L3RtcC90ZXN0LnR4dFwiLiAgSW4gc29tZSBjYXNlcywgdGhlIGNvbG9uIGlzIGxlZnRcbiAgLy8gdW5jaGFuZ2VkLCBhcyBpbiBcImZpbGU6Ly8vYzovdG1wL3Rlc3QudHh0XCIuICBJbiBvdGhlciBjYXNlcywgdGhlXG4gIC8vIGNvbG9uIGlzIHNpbXBseSBvbWl0dGVkLCBhcyBpbiBcImZpbGU6Ly8vYy90bXAvdGVzdC50eHRcIi5cbiAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXiguKylcXHwvLCAnJDE6Jyk7XG5cbiAgLy8gZm9yIFdpbmRvd3MsIHdlIG5lZWQgdG8gaW52ZXJ0IHRoZSBwYXRoIHNlcGFyYXRvcnMgZnJvbSB3aGF0IGEgVVJJIHVzZXNcbiAgaWYgKHNlcCA9PSAnXFxcXCcpIHtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8vZywgJ1xcXFwnKTtcbiAgfVxuXG4gIGlmICgvXi4rXFw6Ly50ZXN0KHBhdGgpKSB7XG4gICAgLy8gaGFzIFdpbmRvd3MgZHJpdmUgYXQgYmVnaW5uaW5nIG9mIHBhdGhcbiAgfSBlbHNlIHtcbiAgICAvLyB1bml4IHBhdGjigKZcbiAgICBwYXRoID0gc2VwICsgcGF0aDtcbiAgfVxuXG4gIHJldHVybiBob3N0ICsgcGF0aDtcbn1cbiIsInZhciB1c2IgPSByZXF1aXJlKCd1c2InKTtcbnZhciBldmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcblxuZnVuY3Rpb24gRE1YKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIHZlbmRvcjogMHgxNmMwLFxuICAgICAgICBkZXZpY2U6IDB4NWRjXG4gICAgfTtcblxuICAgIGZvcih2YXIgb3B0IGluIGRlZmF1bHRzKSB7XG4gICAgICAgIGlmKCFkZWZhdWx0cy5oYXNPd25Qcm9wZXJ0eShvcHQpKSBjb250aW51ZTtcbiAgICAgICAgdGhpc1tvcHRdID0gb3B0aW9ucyAmJiBvcHRpb25zLmhhc093blByb3BlcnR5KG9wdCkgPyBvcHRpb25zW29wdF0gOiBkZWZhdWx0c1tvcHRdO1xuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5zdGF0ZSA9IHt9XG59XG5cbkRNWC5wcm90b3R5cGUuX19wcm90b19fID0gZXZlbnRzLkV2ZW50RW1pdHRlci5wcm90b3R5cGU7XG5cbkRNWC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGV2ID0gdXNiLmZpbmRCeUlkcyh0aGlzLnZlbmRvciwgdGhpcy5kZXZpY2UpO1xuICAgIGlmKHRoaXMuZGV2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICB0aHJvdyAnVW5hYmxlIHRvIGZpbmQgVVNCIGRldmljZSEnO1xuICAgIH1cblxuICAgdGhpcy5kZXYub3BlbigpO1xuICAgdGhpcy5lbWl0KCdjb25uZWN0ZWQnKTtcbn1cblxuRE1YLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihjaGFubmVsLCB2YWx1ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB0aGlzLmRldi5jb250cm9sVHJhbnNmZXIoNjQsIDEsIHZhbHVlLCBjaGFubmVsLTEsIEJ1ZmZlcigxKSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLmVtaXQoJ2NoYW5uZWwtJyArIGNoYW5uZWwsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBzZWxmLmVtaXQoJ2NoYW5uZWwtYWxsJywgY2hhbm5lbCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIHNlbGYuc3RhdGVbY2hhbm5lbF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5ETVgucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGNoYW5uZWwpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZVtjaGFubmVsXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBETVg7XG4iLCJ2YXIgdXNiID0gZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnYmluZGluZ3MnKSgndXNiX2JpbmRpbmdzJyk7XG52YXIgZXZlbnRzID0gcmVxdWlyZSgnZXZlbnRzJylcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpXG5cbnZhciBpc0J1ZmZlciA9IGZ1bmN0aW9uKG9iaikge1xuXHRyZXR1cm4gb2JqICYmIG9iaiBpbnN0YW5jZW9mIFVpbnQ4QXJyYXlcbn1cblxuaWYgKHVzYi5JTklUX0VSUk9SKSB7XG5cdGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBpbml0aWFsaXplIGxpYnVzYi5cIilcblx0dXNiLkRldmljZSA9IGZ1bmN0aW9uICgpIHsgdGhyb3cgbmV3IEVycm9yKFwiRGV2aWNlIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQgZGlyZWN0bHkuXCIpIH07XG5cdHVzYi5UcmFuc2ZlciA9IGZ1bmN0aW9uICgpIHsgdGhyb3cgbmV3IEVycm9yKFwiVHJhbnNmZXIgY2Fubm90IGJlIGluc3RhbnRpYXRlZCBkaXJlY3RseS5cIikgfTtcblx0dXNiLnNldERlYnVnTGV2ZWwgPSBmdW5jdGlvbiAoKSB7IH07XG5cdHVzYi5nZXREZXZpY2VMaXN0ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW107IH07XG5cdHVzYi5fZW5hYmxlSG90cGx1Z0V2ZW50cyA9IGZ1bmN0aW9uICgpIHsgfTtcblx0dXNiLl9kaXNhYmxlSG90cGx1Z0V2ZW50cyA9IGZ1bmN0aW9uICgpIHsgfTtcbn1cblxuT2JqZWN0LmtleXMoZXZlbnRzLkV2ZW50RW1pdHRlci5wcm90b3R5cGUpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuXHRleHBvcnRzW2tleV0gPSBldmVudHMuRXZlbnRFbWl0dGVyLnByb3RvdHlwZVtrZXldO1xufSk7XG5cbi8vIGNvbnZlbmllbmNlIG1ldGhvZCBmb3IgZmluZGluZyBhIGRldmljZSBieSB2ZW5kb3IgYW5kIHByb2R1Y3QgaWRcbmV4cG9ydHMuZmluZEJ5SWRzID0gZnVuY3Rpb24odmlkLCBwaWQpIHtcblx0dmFyIGRldmljZXMgPSB1c2IuZ2V0RGV2aWNlTGlzdCgpXG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkZXZpY2VzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGRldmljZURlc2MgPSBkZXZpY2VzW2ldLmRldmljZURlc2NyaXB0b3Jcblx0XHRpZiAoKGRldmljZURlc2MuaWRWZW5kb3IgPT0gdmlkKSAmJiAoZGV2aWNlRGVzYy5pZFByb2R1Y3QgPT0gcGlkKSkge1xuXHRcdFx0cmV0dXJuIGRldmljZXNbaV1cblx0XHR9XG5cdH1cbn1cblxudXNiLkRldmljZS5wcm90b3R5cGUudGltZW91dCA9IDEwMDBcblxudXNiLkRldmljZS5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKGRlZmF1bHRDb25maWcpe1xuXHR0aGlzLl9fb3BlbigpXG5cdGlmIChkZWZhdWx0Q29uZmlnID09PSBmYWxzZSkgcmV0dXJuXG5cdHRoaXMuaW50ZXJmYWNlcyA9IFtdXG5cdHZhciBsZW4gPSB0aGlzLmNvbmZpZ0Rlc2NyaXB0b3IgPyB0aGlzLmNvbmZpZ0Rlc2NyaXB0b3IuaW50ZXJmYWNlcy5sZW5ndGggOiAwXG5cdGZvciAodmFyIGk9MDsgaTxsZW47IGkrKyl7XG5cdFx0dGhpcy5pbnRlcmZhY2VzW2ldID0gbmV3IEludGVyZmFjZSh0aGlzLCBpKVxuXHR9XG59XG5cbnVzYi5EZXZpY2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKXtcblx0dGhpcy5fX2Nsb3NlKClcblx0dGhpcy5pbnRlcmZhY2VzID0gbnVsbFxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkodXNiLkRldmljZS5wcm90b3R5cGUsIFwiY29uZmlnRGVzY3JpcHRvclwiLCB7XG5cdGdldDogZnVuY3Rpb24oKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiB0aGlzLl9jb25maWdEZXNjcmlwdG9yIHx8ICh0aGlzLl9jb25maWdEZXNjcmlwdG9yID0gdGhpcy5fX2dldENvbmZpZ0Rlc2NyaXB0b3IoKSlcblx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdC8vIENoZWNrIGRlc2NyaXB0b3IgZXhpc3RzXG5cdFx0XHRpZiAoZS5lcnJubyA9PSB1c2IuTElCVVNCX0VSUk9SX05PVF9GT1VORCkgcmV0dXJuIG51bGw7XG5cdFx0XHR0aHJvdyBlO1xuXHRcdH1cblx0fVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eSh1c2IuRGV2aWNlLnByb3RvdHlwZSwgXCJhbGxDb25maWdEZXNjcmlwdG9yc1wiLCB7XG5cdGdldDogZnVuY3Rpb24oKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiB0aGlzLl9hbGxDb25maWdEZXNjcmlwdG9ycyB8fCAodGhpcy5fYWxsQ29uZmlnRGVzY3JpcHRvcnMgPSB0aGlzLl9fZ2V0QWxsQ29uZmlnRGVzY3JpcHRvcnMoKSlcblx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdC8vIENoZWNrIGRlc2NyaXB0b3JzIGV4aXN0XG5cdFx0XHRpZiAoZS5lcnJubyA9PSB1c2IuTElCVVNCX0VSUk9SX05PVF9GT1VORCkgcmV0dXJuIFtdO1xuXHRcdFx0dGhyb3cgZTtcblx0XHR9XG5cdH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkodXNiLkRldmljZS5wcm90b3R5cGUsIFwicGFyZW50XCIsIHtcblx0Z2V0OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fcGFyZW50IHx8ICh0aGlzLl9wYXJlbnQgPSB0aGlzLl9fZ2V0UGFyZW50KCkpXG5cdH1cbn0pO1xuXG51c2IuRGV2aWNlLnByb3RvdHlwZS5pbnRlcmZhY2UgPSBmdW5jdGlvbihhZGRyKXtcblx0aWYgKCF0aGlzLmludGVyZmFjZXMpe1xuXHRcdHRocm93IG5ldyBFcnJvcihcIkRldmljZSBtdXN0IGJlIG9wZW4gYmVmb3JlIHNlYXJjaGluZyBmb3IgaW50ZXJmYWNlc1wiKVxuXHR9XG5cdGFkZHIgPSBhZGRyIHx8IDBcblx0Zm9yICh2YXIgaT0wOyBpPHRoaXMuaW50ZXJmYWNlcy5sZW5ndGg7IGkrKyl7XG5cdFx0aWYgKHRoaXMuaW50ZXJmYWNlc1tpXS5pbnRlcmZhY2VOdW1iZXIgPT0gYWRkcil7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbnRlcmZhY2VzW2ldXG5cdFx0fVxuXHR9XG59XG5cbnZhciBTRVRVUF9TSVpFID0gdXNiLkxJQlVTQl9DT05UUk9MX1NFVFVQX1NJWkVcblxudXNiLkRldmljZS5wcm90b3R5cGUuY29udHJvbFRyYW5zZmVyID1cbmZ1bmN0aW9uKGJtUmVxdWVzdFR5cGUsIGJSZXF1ZXN0LCB3VmFsdWUsIHdJbmRleCwgZGF0YV9vcl9sZW5ndGgsIGNhbGxiYWNrKXtcblx0dmFyIHNlbGYgPSB0aGlzXG5cdHZhciBpc0luID0gISEoYm1SZXF1ZXN0VHlwZSAmIHVzYi5MSUJVU0JfRU5EUE9JTlRfSU4pXG5cdHZhciB3TGVuZ3RoXG5cblx0aWYgKGlzSW4pe1xuXHRcdGlmICghKGRhdGFfb3JfbGVuZ3RoID49IDApKXtcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBzaXplIG51bWJlciBmb3IgSU4gdHJhbnNmZXIgKGJhc2VkIG9uIGJtUmVxdWVzdFR5cGUpXCIpXG5cdFx0fVxuXHRcdHdMZW5ndGggPSBkYXRhX29yX2xlbmd0aFxuXHR9ZWxzZXtcblx0XHRpZiAoIWlzQnVmZmVyKGRhdGFfb3JfbGVuZ3RoKSl7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgYnVmZmVyIGZvciBPVVQgdHJhbnNmZXIgKGJhc2VkIG9uIGJtUmVxdWVzdFR5cGUpXCIpXG5cdFx0fVxuXHRcdHdMZW5ndGggPSBkYXRhX29yX2xlbmd0aC5sZW5ndGhcblx0fVxuXG5cdC8vIEJ1ZmZlciBmb3IgdGhlIHNldHVwIHBhY2tldFxuXHQvLyBodHRwOi8vbGlidXNieC5zb3VyY2Vmb3JnZS5uZXQvYXBpLTEuMC9zdHJ1Y3RsaWJ1c2JfX2NvbnRyb2xfX3NldHVwLmh0bWxcblx0dmFyIGJ1ZiA9IEJ1ZmZlci5hbGxvYyh3TGVuZ3RoICsgU0VUVVBfU0laRSlcblx0YnVmLndyaXRlVUludDgoICAgYm1SZXF1ZXN0VHlwZSwgMClcblx0YnVmLndyaXRlVUludDgoICAgYlJlcXVlc3QsICAgICAgMSlcblx0YnVmLndyaXRlVUludDE2TEUod1ZhbHVlLCAgICAgICAgMilcblx0YnVmLndyaXRlVUludDE2TEUod0luZGV4LCAgICAgICAgNClcblx0YnVmLndyaXRlVUludDE2TEUod0xlbmd0aCwgICAgICAgNilcblxuXHRpZiAoIWlzSW4pe1xuXHRcdGJ1Zi5zZXQoZGF0YV9vcl9sZW5ndGgsIFNFVFVQX1NJWkUpXG5cdH1cblxuXHR2YXIgdHJhbnNmZXIgPSBuZXcgdXNiLlRyYW5zZmVyKHRoaXMsIDAsIHVzYi5MSUJVU0JfVFJBTlNGRVJfVFlQRV9DT05UUk9MLCB0aGlzLnRpbWVvdXQsXG5cdFx0ZnVuY3Rpb24oZXJyb3IsIGJ1ZiwgYWN0dWFsKXtcblx0XHRcdGlmIChjYWxsYmFjayl7XG5cdFx0XHRcdGlmIChpc0luKXtcblx0XHRcdFx0XHRjYWxsYmFjay5jYWxsKHNlbGYsIGVycm9yLCBidWYuc2xpY2UoU0VUVVBfU0laRSwgU0VUVVBfU0laRSArIGFjdHVhbCkpXG5cdFx0XHRcdH1lbHNle1xuXHRcdFx0XHRcdGNhbGxiYWNrLmNhbGwoc2VsZiwgZXJyb3IpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdClcblxuXHR0cnkge1xuXHRcdHRyYW5zZmVyLnN1Ym1pdChidWYpXG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRpZiAoY2FsbGJhY2spe1xuXHRcdFx0cHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgY2FsbGJhY2suY2FsbChzZWxmLCBlKTsgfSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiB0aGlzO1xufVxuXG51c2IuRGV2aWNlLnByb3RvdHlwZS5nZXRTdHJpbmdEZXNjcmlwdG9yID0gZnVuY3Rpb24gKGRlc2NfaW5kZXgsIGNhbGxiYWNrKSB7XG5cdHZhciBsYW5naWQgPSAweDA0MDk7XG5cdHZhciBsZW5ndGggPSAyNTU7XG5cdHRoaXMuY29udHJvbFRyYW5zZmVyKFxuXHRcdHVzYi5MSUJVU0JfRU5EUE9JTlRfSU4sXG5cdFx0dXNiLkxJQlVTQl9SRVFVRVNUX0dFVF9ERVNDUklQVE9SLFxuXHRcdCgodXNiLkxJQlVTQl9EVF9TVFJJTkcgPDwgOCkgfCBkZXNjX2luZGV4KSxcblx0XHRsYW5naWQsXG5cdFx0bGVuZ3RoLFxuXHRcdGZ1bmN0aW9uIChlcnJvciwgYnVmKSB7XG5cdFx0XHRpZiAoZXJyb3IpIHJldHVybiBjYWxsYmFjayhlcnJvcik7XG5cdFx0XHRjYWxsYmFjayh1bmRlZmluZWQsIGJ1Zi50b1N0cmluZygndXRmMTZsZScsIDIpKTtcblx0XHR9XG5cdCk7XG59XG5cbnVzYi5EZXZpY2UucHJvdG90eXBlLmdldEJvc0Rlc2NyaXB0b3IgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblxuXHRpZiAodGhpcy5fYm9zRGVzY3JpcHRvcikge1xuXHRcdC8vIENhY2hlZCBkZXNjcmlwdG9yXG5cdFx0cmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgdGhpcy5fYm9zRGVzY3JpcHRvcik7XG5cdH1cblxuXHRpZiAodGhpcy5kZXZpY2VEZXNjcmlwdG9yLmJjZFVTQiA8IDB4MjAxKSB7XG5cdFx0Ly8gQk9TIGlzIG9ubHkgc3VwcG9ydGVkIGZyb20gVVNCIDIuMC4xXG5cdFx0cmV0dXJuIGNhbGxiYWNrKHVuZGVmaW5lZCwgbnVsbCk7XG5cdH1cblxuXHR0aGlzLmNvbnRyb2xUcmFuc2Zlcihcblx0XHR1c2IuTElCVVNCX0VORFBPSU5UX0lOLFxuXHRcdHVzYi5MSUJVU0JfUkVRVUVTVF9HRVRfREVTQ1JJUFRPUixcblx0XHQodXNiLkxJQlVTQl9EVF9CT1MgPDwgOCksXG5cdFx0MCxcblx0XHR1c2IuTElCVVNCX0RUX0JPU19TSVpFLFxuXHRcdGZ1bmN0aW9uIChlcnJvciwgYnVmZmVyKSB7XG5cdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0Ly8gQ2hlY2sgQk9TIGRlc2NyaXB0b3IgZXhpc3RzXG5cdFx0XHRcdGlmIChlcnJvci5lcnJubyA9PSB1c2IuTElCVVNCX1RSQU5TRkVSX1NUQUxMKSByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCBudWxsKTtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHRvdGFsTGVuZ3RoID0gYnVmZmVyLnJlYWRVSW50MTZMRSgyKTtcblx0XHRcdHRoaXMuY29udHJvbFRyYW5zZmVyKFxuXHRcdFx0XHR1c2IuTElCVVNCX0VORFBPSU5UX0lOLFxuXHRcdFx0XHR1c2IuTElCVVNCX1JFUVVFU1RfR0VUX0RFU0NSSVBUT1IsXG5cdFx0XHRcdCh1c2IuTElCVVNCX0RUX0JPUyA8PCA4KSxcblx0XHRcdFx0MCxcblx0XHRcdFx0dG90YWxMZW5ndGgsXG5cdFx0XHRcdGZ1bmN0aW9uIChlcnJvciwgYnVmZmVyKSB7XG5cdFx0XHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdFx0XHQvLyBDaGVjayBCT1MgZGVzY3JpcHRvciBleGlzdHNcblx0XHRcdFx0XHRcdGlmIChlcnJvci5lcnJubyA9PSB1c2IuTElCVVNCX1RSQU5TRkVSX1NUQUxMKSByZXR1cm4gY2FsbGJhY2sodW5kZWZpbmVkLCBudWxsKTtcblx0XHRcdFx0XHRcdHJldHVybiBjYWxsYmFjayhlcnJvciwgbnVsbCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dmFyIGRlc2NyaXB0b3IgPSB7XG5cdFx0XHRcdFx0XHRiTGVuZ3RoOiBidWZmZXIucmVhZFVJbnQ4KDApLFxuXHRcdFx0XHRcdFx0YkRlc2NyaXB0b3JUeXBlOiBidWZmZXIucmVhZFVJbnQ4KDEpLFxuXHRcdFx0XHRcdFx0d1RvdGFsTGVuZ3RoOiBidWZmZXIucmVhZFVJbnQxNkxFKDIpLFxuXHRcdFx0XHRcdFx0Yk51bURldmljZUNhcHM6IGJ1ZmZlci5yZWFkVUludDgoNCksXG5cdFx0XHRcdFx0XHRjYXBhYmlsaXRpZXM6IFtdXG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdHZhciBpID0gdXNiLkxJQlVTQl9EVF9CT1NfU0laRTtcblx0XHRcdFx0XHR3aGlsZSAoaSA8IGRlc2NyaXB0b3Iud1RvdGFsTGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHR2YXIgY2FwYWJpbGl0eSA9IHtcblx0XHRcdFx0XHRcdFx0Ykxlbmd0aDogYnVmZmVyLnJlYWRVSW50OChpICsgMCksXG5cdFx0XHRcdFx0XHRcdGJEZXNjcmlwdG9yVHlwZTogYnVmZmVyLnJlYWRVSW50OChpICsgMSksXG5cdFx0XHRcdFx0XHRcdGJEZXZDYXBhYmlsaXR5VHlwZTogYnVmZmVyLnJlYWRVSW50OChpICsgMilcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdGNhcGFiaWxpdHkuZGV2X2NhcGFiaWxpdHlfZGF0YSA9IGJ1ZmZlci5zbGljZShpICsgMywgaSArIGNhcGFiaWxpdHkuYkxlbmd0aCk7XG5cdFx0XHRcdFx0XHRkZXNjcmlwdG9yLmNhcGFiaWxpdGllcy5wdXNoKGNhcGFiaWxpdHkpO1xuXHRcdFx0XHRcdFx0aSArPSBjYXBhYmlsaXR5LmJMZW5ndGg7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gQ2FjaGUgZGVzY3JpcHRvclxuXHRcdFx0XHRcdHRoaXMuX2Jvc0Rlc2NyaXB0b3IgPSBkZXNjcmlwdG9yO1xuXHRcdFx0XHRcdGNhbGxiYWNrKHVuZGVmaW5lZCwgdGhpcy5fYm9zRGVzY3JpcHRvcik7XG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cdFx0fVxuXHQpO1xufVxuXG51c2IuRGV2aWNlLnByb3RvdHlwZS5nZXRDYXBhYmlsaXRpZXMgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0dmFyIGNhcGFiaWxpdGllcyA9IFtdO1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0dGhpcy5nZXRCb3NEZXNjcmlwdG9yKGZ1bmN0aW9uKGVycm9yLCBkZXNjcmlwdG9yKSB7XG5cdFx0aWYgKGVycm9yKSByZXR1cm4gY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuXG5cdFx0dmFyIGxlbiA9IGRlc2NyaXB0b3IgPyBkZXNjcmlwdG9yLmNhcGFiaWxpdGllcy5sZW5ndGggOiAwXG5cdFx0Zm9yICh2YXIgaT0wOyBpPGxlbjsgaSsrKXtcblx0XHRcdGNhcGFiaWxpdGllcy5wdXNoKG5ldyBDYXBhYmlsaXR5KHNlbGYsIGkpKVxuXHRcdH1cblxuXHRcdGNhbGxiYWNrKHVuZGVmaW5lZCwgY2FwYWJpbGl0aWVzKTtcblx0fSk7XG59XG5cbnVzYi5EZXZpY2UucHJvdG90eXBlLnNldENvbmZpZ3VyYXRpb24gPSBmdW5jdGlvbihkZXNpcmVkLCBjYikge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHRoaXMuX19zZXRDb25maWd1cmF0aW9uKGRlc2lyZWQsIGZ1bmN0aW9uKGVycikge1xuXHRcdGlmICghZXJyKSB7XG5cdFx0XHR0aGlzLmludGVyZmFjZXMgPSBbXVxuXHRcdFx0dmFyIGxlbiA9IHRoaXMuY29uZmlnRGVzY3JpcHRvciA/IHRoaXMuY29uZmlnRGVzY3JpcHRvci5pbnRlcmZhY2VzLmxlbmd0aCA6IDBcblx0XHRcdGZvciAodmFyIGk9MDsgaTxsZW47IGkrKykge1xuXHRcdFx0XHR0aGlzLmludGVyZmFjZXNbaV0gPSBuZXcgSW50ZXJmYWNlKHRoaXMsIGkpXG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNiLmNhbGwoc2VsZiwgZXJyKVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gSW50ZXJmYWNlKGRldmljZSwgaWQpe1xuXHR0aGlzLmRldmljZSA9IGRldmljZVxuXHR0aGlzLmlkID0gaWRcblx0dGhpcy5hbHRTZXR0aW5nID0gMDtcblx0dGhpcy5fX3JlZnJlc2goKVxufVxuXG5JbnRlcmZhY2UucHJvdG90eXBlLl9fcmVmcmVzaCA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuZGVzY3JpcHRvciA9IHRoaXMuZGV2aWNlLmNvbmZpZ0Rlc2NyaXB0b3IuaW50ZXJmYWNlc1t0aGlzLmlkXVt0aGlzLmFsdFNldHRpbmddXG5cdHRoaXMuaW50ZXJmYWNlTnVtYmVyID0gdGhpcy5kZXNjcmlwdG9yLmJJbnRlcmZhY2VOdW1iZXJcblx0dGhpcy5lbmRwb2ludHMgPSBbXVxuXHR2YXIgbGVuID0gdGhpcy5kZXNjcmlwdG9yLmVuZHBvaW50cy5sZW5ndGhcblx0Zm9yICh2YXIgaT0wOyBpPGxlbjsgaSsrKXtcblx0XHR2YXIgZGVzYyA9IHRoaXMuZGVzY3JpcHRvci5lbmRwb2ludHNbaV1cblx0XHR2YXIgYyA9IChkZXNjLmJFbmRwb2ludEFkZHJlc3MmdXNiLkxJQlVTQl9FTkRQT0lOVF9JTik/SW5FbmRwb2ludDpPdXRFbmRwb2ludFxuXHRcdHRoaXMuZW5kcG9pbnRzW2ldID0gbmV3IGModGhpcy5kZXZpY2UsIGRlc2MpXG5cdH1cbn1cblxuSW50ZXJmYWNlLnByb3RvdHlwZS5jbGFpbSA9IGZ1bmN0aW9uKCl7XG5cdHRoaXMuZGV2aWNlLl9fY2xhaW1JbnRlcmZhY2UodGhpcy5pZClcbn1cblxuSW50ZXJmYWNlLnByb3RvdHlwZS5yZWxlYXNlID0gZnVuY3Rpb24oY2xvc2VFbmRwb2ludHMsIGNiKXtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRpZiAodHlwZW9mIGNsb3NlRW5kcG9pbnRzID09ICdmdW5jdGlvbicpIHtcblx0XHRjYiA9IGNsb3NlRW5kcG9pbnRzO1xuXHRcdGNsb3NlRW5kcG9pbnRzID0gbnVsbDtcblx0fVxuXG5cdGlmICghY2xvc2VFbmRwb2ludHMgfHwgdGhpcy5lbmRwb2ludHMubGVuZ3RoID09IDApIHtcblx0XHRuZXh0KCk7XG5cdH0gZWxzZSB7XG5cdFx0dmFyIG4gPSBzZWxmLmVuZHBvaW50cy5sZW5ndGg7XG5cdFx0c2VsZi5lbmRwb2ludHMuZm9yRWFjaChmdW5jdGlvbiAoZXAsIGkpIHtcblx0XHRcdGlmIChlcC5wb2xsQWN0aXZlKSB7XG5cdFx0XHRcdGVwLm9uY2UoJ2VuZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRpZiAoLS1uID09IDApIG5leHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGVwLnN0b3BQb2xsKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAoLS1uID09IDApIG5leHQoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIG5leHQgKCkge1xuXHRcdHNlbGYuZGV2aWNlLl9fcmVsZWFzZUludGVyZmFjZShzZWxmLmlkLCBmdW5jdGlvbihlcnIpe1xuXHRcdFx0aWYgKCFlcnIpe1xuXHRcdFx0XHRzZWxmLmFsdFNldHRpbmcgPSAwO1xuXHRcdFx0XHRzZWxmLl9fcmVmcmVzaCgpXG5cdFx0XHR9XG5cdFx0XHRjYi5jYWxsKHNlbGYsIGVycilcblx0XHR9KVxuXHR9XG59XG5cbkludGVyZmFjZS5wcm90b3R5cGUuaXNLZXJuZWxEcml2ZXJBY3RpdmUgPSBmdW5jdGlvbigpe1xuXHRyZXR1cm4gdGhpcy5kZXZpY2UuX19pc0tlcm5lbERyaXZlckFjdGl2ZSh0aGlzLmlkKVxufVxuXG5JbnRlcmZhY2UucHJvdG90eXBlLmRldGFjaEtlcm5lbERyaXZlciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5kZXZpY2UuX19kZXRhY2hLZXJuZWxEcml2ZXIodGhpcy5pZClcbn07XG5cbkludGVyZmFjZS5wcm90b3R5cGUuYXR0YWNoS2VybmVsRHJpdmVyID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLmRldmljZS5fX2F0dGFjaEtlcm5lbERyaXZlcih0aGlzLmlkKVxufTtcblxuXG5JbnRlcmZhY2UucHJvdG90eXBlLnNldEFsdFNldHRpbmcgPSBmdW5jdGlvbihhbHRTZXR0aW5nLCBjYil7XG5cdHZhciBzZWxmID0gdGhpcztcblx0dGhpcy5kZXZpY2UuX19zZXRJbnRlcmZhY2UodGhpcy5pZCwgYWx0U2V0dGluZywgZnVuY3Rpb24oZXJyKXtcblx0XHRpZiAoIWVycil7XG5cdFx0XHRzZWxmLmFsdFNldHRpbmcgPSBhbHRTZXR0aW5nO1xuXHRcdFx0c2VsZi5fX3JlZnJlc2goKTtcblx0XHR9XG5cdFx0Y2IuY2FsbChzZWxmLCBlcnIpXG5cdH0pXG59XG5cbkludGVyZmFjZS5wcm90b3R5cGUuZW5kcG9pbnQgPSBmdW5jdGlvbihhZGRyKXtcblx0Zm9yICh2YXIgaT0wOyBpPHRoaXMuZW5kcG9pbnRzLmxlbmd0aDsgaSsrKXtcblx0XHRpZiAodGhpcy5lbmRwb2ludHNbaV0uYWRkcmVzcyA9PSBhZGRyKXtcblx0XHRcdHJldHVybiB0aGlzLmVuZHBvaW50c1tpXVxuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBDYXBhYmlsaXR5KGRldmljZSwgaWQpe1xuXHR0aGlzLmRldmljZSA9IGRldmljZVxuXHR0aGlzLmlkID0gaWRcblx0dGhpcy5kZXNjcmlwdG9yID0gdGhpcy5kZXZpY2UuX2Jvc0Rlc2NyaXB0b3IuY2FwYWJpbGl0aWVzW3RoaXMuaWRdXG5cdHRoaXMudHlwZSA9IHRoaXMuZGVzY3JpcHRvci5iRGV2Q2FwYWJpbGl0eVR5cGVcblx0dGhpcy5kYXRhID0gdGhpcy5kZXNjcmlwdG9yLmRldl9jYXBhYmlsaXR5X2RhdGFcbn1cblxuZnVuY3Rpb24gRW5kcG9pbnQoZGV2aWNlLCBkZXNjcmlwdG9yKXtcblx0dGhpcy5kZXZpY2UgPSBkZXZpY2Vcblx0dGhpcy5kZXNjcmlwdG9yID0gZGVzY3JpcHRvclxuXHR0aGlzLmFkZHJlc3MgPSBkZXNjcmlwdG9yLmJFbmRwb2ludEFkZHJlc3Ncblx0dGhpcy50cmFuc2ZlclR5cGUgPSBkZXNjcmlwdG9yLmJtQXR0cmlidXRlcyYweDAzXG59XG51dGlsLmluaGVyaXRzKEVuZHBvaW50LCBldmVudHMuRXZlbnRFbWl0dGVyKVxuXG5FbmRwb2ludC5wcm90b3R5cGUudGltZW91dCA9IDBcblxuRW5kcG9pbnQucHJvdG90eXBlLmNsZWFySGFsdCA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcblx0cmV0dXJuIHRoaXMuZGV2aWNlLl9fY2xlYXJIYWx0KHRoaXMuYWRkcmVzcywgY2FsbGJhY2spO1xufVxuXG5FbmRwb2ludC5wcm90b3R5cGUubWFrZVRyYW5zZmVyID0gZnVuY3Rpb24odGltZW91dCwgY2FsbGJhY2spe1xuXHRyZXR1cm4gbmV3IHVzYi5UcmFuc2Zlcih0aGlzLmRldmljZSwgdGhpcy5hZGRyZXNzLCB0aGlzLnRyYW5zZmVyVHlwZSwgdGltZW91dCwgY2FsbGJhY2spXG59XG5cbkVuZHBvaW50LnByb3RvdHlwZS5zdGFydFBvbGwgPSBmdW5jdGlvbihuVHJhbnNmZXJzLCB0cmFuc2ZlclNpemUsIGNhbGxiYWNrKXtcblx0aWYgKHRoaXMucG9sbFRyYW5zZmVycyl7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiUG9sbGluZyBhbHJlYWR5IGFjdGl2ZVwiKVxuXHR9XG5cblx0blRyYW5zZmVycyA9IG5UcmFuc2ZlcnMgfHwgMztcblx0dGhpcy5wb2xsVHJhbnNmZXJTaXplID0gdHJhbnNmZXJTaXplIHx8IHRoaXMuZGVzY3JpcHRvci53TWF4UGFja2V0U2l6ZTtcblx0dGhpcy5wb2xsQWN0aXZlID0gdHJ1ZVxuXHR0aGlzLnBvbGxQZW5kaW5nID0gMFxuXG5cdHZhciB0cmFuc2ZlcnMgPSBbXVxuXHRmb3IgKHZhciBpPTA7IGk8blRyYW5zZmVyczsgaSsrKXtcblx0XHR0cmFuc2ZlcnNbaV0gPSB0aGlzLm1ha2VUcmFuc2ZlcigwLCBjYWxsYmFjaylcblx0fVxuXHRyZXR1cm4gdHJhbnNmZXJzO1xufVxuXG5FbmRwb2ludC5wcm90b3R5cGUuc3RvcFBvbGwgPSBmdW5jdGlvbihjYil7XG5cdGlmICghdGhpcy5wb2xsVHJhbnNmZXJzKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdQb2xsaW5nIGlzIG5vdCBhY3RpdmUuJyk7XG5cdH1cblx0Zm9yICh2YXIgaT0wOyBpPHRoaXMucG9sbFRyYW5zZmVycy5sZW5ndGg7IGkrKyl7XG5cdFx0dHJ5IHtcblx0XHRcdHRoaXMucG9sbFRyYW5zZmVyc1tpXS5jYW5jZWwoKVxuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0dGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG5cdFx0fVxuXHR9XG5cdHRoaXMucG9sbEFjdGl2ZSA9IGZhbHNlXG5cdGlmIChjYikgdGhpcy5vbmNlKCdlbmQnLCBjYik7XG59XG5cbmZ1bmN0aW9uIEluRW5kcG9pbnQoZGV2aWNlLCBkZXNjcmlwdG9yKXtcblx0RW5kcG9pbnQuY2FsbCh0aGlzLCBkZXZpY2UsIGRlc2NyaXB0b3IpXG59XG5cbmV4cG9ydHMuSW5FbmRwb2ludCA9IEluRW5kcG9pbnRcbnV0aWwuaW5oZXJpdHMoSW5FbmRwb2ludCwgRW5kcG9pbnQpXG5JbkVuZHBvaW50LnByb3RvdHlwZS5kaXJlY3Rpb24gPSBcImluXCJcblxuSW5FbmRwb2ludC5wcm90b3R5cGUudHJhbnNmZXIgPSBmdW5jdGlvbihsZW5ndGgsIGNiKXtcblx0dmFyIHNlbGYgPSB0aGlzXG5cdHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2MobGVuZ3RoKVxuXG5cdGZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBidWYsIGFjdHVhbCl7XG5cdFx0Y2IuY2FsbChzZWxmLCBlcnJvciwgYnVmZmVyLnNsaWNlKDAsIGFjdHVhbCkpXG5cdH1cblxuXHR0cnkge1xuXHRcdHRoaXMubWFrZVRyYW5zZmVyKHRoaXMudGltZW91dCwgY2FsbGJhY2spLnN1Ym1pdChidWZmZXIpXG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkgeyBjYi5jYWxsKHNlbGYsIGUpOyB9KTtcblx0fVxuXHRyZXR1cm4gdGhpcztcbn1cblxuSW5FbmRwb2ludC5wcm90b3R5cGUuc3RhcnRQb2xsID0gZnVuY3Rpb24oblRyYW5zZmVycywgdHJhbnNmZXJTaXplKXtcblx0dmFyIHNlbGYgPSB0aGlzXG5cdHRoaXMucG9sbFRyYW5zZmVycyA9IEluRW5kcG9pbnQuc3VwZXJfLnByb3RvdHlwZS5zdGFydFBvbGwuY2FsbCh0aGlzLCBuVHJhbnNmZXJzLCB0cmFuc2ZlclNpemUsIHRyYW5zZmVyRG9uZSlcblxuXHRmdW5jdGlvbiB0cmFuc2ZlckRvbmUoZXJyb3IsIGJ1ZiwgYWN0dWFsKXtcblx0XHRpZiAoIWVycm9yKXtcblx0XHRcdHNlbGYuZW1pdChcImRhdGFcIiwgYnVmLnNsaWNlKDAsIGFjdHVhbCkpXG5cdFx0fWVsc2UgaWYgKGVycm9yLmVycm5vICE9IHVzYi5MSUJVU0JfVFJBTlNGRVJfQ0FOQ0VMTEVEKXtcblx0XHRcdHNlbGYuZW1pdChcImVycm9yXCIsIGVycm9yKVxuXHRcdFx0c2VsZi5zdG9wUG9sbCgpXG5cdFx0fVxuXG5cdFx0aWYgKHNlbGYucG9sbEFjdGl2ZSl7XG5cdFx0XHRzdGFydFRyYW5zZmVyKHRoaXMpXG5cdFx0fWVsc2V7XG5cdFx0XHRzZWxmLnBvbGxQZW5kaW5nLS1cblxuXHRcdFx0aWYgKHNlbGYucG9sbFBlbmRpbmcgPT0gMCl7XG5cdFx0XHRcdGRlbGV0ZSBzZWxmLnBvbGxUcmFuc2ZlcnM7XG5cdFx0XHRcdHNlbGYuZW1pdCgnZW5kJylcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBzdGFydFRyYW5zZmVyKHQpe1xuXHRcdHRyeSB7XG5cdFx0XHR0LnN1Ym1pdChCdWZmZXIuYWxsb2Moc2VsZi5wb2xsVHJhbnNmZXJTaXplKSwgdHJhbnNmZXJEb25lKTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRzZWxmLmVtaXQoXCJlcnJvclwiLCBlKTtcblx0XHRcdHNlbGYuc3RvcFBvbGwoKTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLnBvbGxUcmFuc2ZlcnMuZm9yRWFjaChzdGFydFRyYW5zZmVyKVxuXHRzZWxmLnBvbGxQZW5kaW5nID0gdGhpcy5wb2xsVHJhbnNmZXJzLmxlbmd0aFxufVxuXG5cblxuZnVuY3Rpb24gT3V0RW5kcG9pbnQoZGV2aWNlLCBkZXNjcmlwdG9yKXtcblx0RW5kcG9pbnQuY2FsbCh0aGlzLCBkZXZpY2UsIGRlc2NyaXB0b3IpXG59XG5leHBvcnRzLk91dEVuZHBvaW50ID0gT3V0RW5kcG9pbnRcbnV0aWwuaW5oZXJpdHMoT3V0RW5kcG9pbnQsIEVuZHBvaW50KVxuT3V0RW5kcG9pbnQucHJvdG90eXBlLmRpcmVjdGlvbiA9IFwib3V0XCJcblxuT3V0RW5kcG9pbnQucHJvdG90eXBlLnRyYW5zZmVyID0gZnVuY3Rpb24oYnVmZmVyLCBjYil7XG5cdHZhciBzZWxmID0gdGhpc1xuXHRpZiAoIWJ1ZmZlcil7XG5cdFx0YnVmZmVyID0gQnVmZmVyLmFsbG9jKDApXG5cdH1lbHNlIGlmICghaXNCdWZmZXIoYnVmZmVyKSl7XG5cdFx0YnVmZmVyID0gQnVmZmVyLmZyb20oYnVmZmVyKVxuXHR9XG5cblx0ZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGJ1ZiwgYWN0dWFsKXtcblx0XHRpZiAoY2IpIGNiLmNhbGwoc2VsZiwgZXJyb3IpXG5cdH1cblxuXHR0cnkge1xuXHRcdHRoaXMubWFrZVRyYW5zZmVyKHRoaXMudGltZW91dCwgY2FsbGJhY2spLnN1Ym1pdChidWZmZXIpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0cHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgY2FsbGJhY2soZSk7IH0pO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cbk91dEVuZHBvaW50LnByb3RvdHlwZS50cmFuc2ZlcldpdGhaTFAgPSBmdW5jdGlvbiAoYnVmLCBjYikge1xuXHRpZiAoYnVmLmxlbmd0aCAlIHRoaXMuZGVzY3JpcHRvci53TWF4UGFja2V0U2l6ZSA9PSAwKSB7XG5cdFx0dGhpcy50cmFuc2ZlcihidWYpO1xuXHRcdHRoaXMudHJhbnNmZXIoQnVmZmVyLmFsbG9jKDApLCBjYik7XG5cdH0gZWxzZSB7XG5cdFx0dGhpcy50cmFuc2ZlcihidWYsIGNiKTtcblx0fVxufVxuXG52YXIgaG90cGx1Z0xpc3RlbmVycyA9IDA7XG5leHBvcnRzLm9uKCduZXdMaXN0ZW5lcicsIGZ1bmN0aW9uKG5hbWUpIHtcblx0aWYgKG5hbWUgIT09ICdhdHRhY2gnICYmIG5hbWUgIT09ICdkZXRhY2gnKSByZXR1cm47XG5cdGlmICgrK2hvdHBsdWdMaXN0ZW5lcnMgPT09IDEpIHtcblx0XHR1c2IuX2VuYWJsZUhvdHBsdWdFdmVudHMoKTtcblx0fVxufSk7XG5cbmV4cG9ydHMub24oJ3JlbW92ZUxpc3RlbmVyJywgZnVuY3Rpb24obmFtZSkge1xuXHRpZiAobmFtZSAhPT0gJ2F0dGFjaCcgJiYgbmFtZSAhPT0gJ2RldGFjaCcpIHJldHVybjtcblx0aWYgKC0taG90cGx1Z0xpc3RlbmVycyA9PT0gMCkge1xuXHRcdHVzYi5fZGlzYWJsZUhvdHBsdWdFdmVudHMoKTtcblx0fVxufSk7XG4iLCIvKipcbiAqIFRoZSBjb250cm9sbGVyIGlzIGNyZWF0aW5nIGEgY29ubmVjdGlvbiB0byB0aGUgVVNCIGRldmljZSAoQXJkdWlubykgdG8gc2VuZCBkYXRhIG92ZXIgV2ViVVNCLlxuICogQnkgdXNpbmcgdGhlIGRlZmF1bHQgPGNvZGU+YXJnczwvY29kZT4geW91IHdpbGwgb25seSBzZWUgdGhlIGZvbGxvd2luZyBBcmR1aW5vIGluIHRoZSB1c2VyIHByb21wdDpcbiAqIC0gQXJkdWlubyBMZW9uYXJkb1xuICogLSBBcmR1aW5vIExlb25hcmRvIEVUSFxuICogLSBTZWVlZHVpbm8gTGl0ZVxuICogQG1vZHVsZSBDb250cm9sbGVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGFyZ3MgLSBBcmd1bWVudHMgdG8gY29uZmlndXJlIHRoZSBjb250cm9sbGVyXG4gKiBAcGFyYW0ge09iamVjdFtdfSBhcmdzLmZpbHRlcnMgLSBMaXN0IG9mIGRldmljZXMgdGhhdCBhcmUgd2hpdGVsaXN0ZWQgd2hlbiBvcGVuaW5nIHRoZSB1c2VyIHByb21wdCB0byBzZWxlY3QgYW4gQXJkdWlub1xuICogQHBhcmFtIHtPYmplY3R9IGFyZ3MuZGV2aWNlIC0gVGhlIHNlbGVjdGVkIEFyZHVpbm8gdG8gdXNlIGFzIHRoZSBETVg1MTIgY29udHJvbGxlclxuICogQHBhcmFtIHtudW1iZXJbXX0gYXJncy51bml2ZXJzZSAtIEhvbGRzIGFsbCB0aGUgdmFsdWVzIGZvciBlYWNoIGNoYW5uZWwgb2YgdGhlIERNWDUxMiB1bml2ZXJzZVxuICogQGV4YW1wbGVcbiAqIGltcG9ydCBDb250cm9sbGVyIGZyb20gJ3dlYnVzYi1kbXg1MTItY29udHJvbGxlci9jb250cm9sbGVyLmpzJ1xuICpcbiAqIC8vIENyZWF0ZSBhIG5ldyBjb250cm9sbGVyIHVzaW5nIHRoZSBkZWZhdWx0IHByb3BlcnRpZXNcbiAqIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlcigpXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvbnRyb2xsZXIge1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3MgPSB7fSkge1xuICAgIC8vIFJlZmVyZW5jZSB0byB0aGUgc2VsZWN0ZWQgVVNCIGRldmljZVxuICAgIHRoaXMuZGV2aWNlID0gYXJncy5kZXZpY2UgfHwgdW5kZWZpbmVkXG5cbiAgICAvLyBPbmx5IGFsbG93IHNwZWNpZmljIFVTQiBkZXZpY2VzXG4gICAgdGhpcy5maWx0ZXJzID0gYXJncy5maWx0ZXJzIHx8IFtcbiAgICAgIC8vIEFyZHVpbm8gTGVvbmFyZG9cbiAgICAgIHsgdmVuZG9ySWQ6IDB4MjM0MSwgcHJvZHVjdElkOiAweDgwMzYgfSxcbiAgICAgIHsgdmVuZG9ySWQ6IDB4MjM0MSwgcHJvZHVjdElkOiAweDAwMzYgfSxcbiAgICAgIHsgdmVuZG9ySWQ6IDB4MmEwMywgcHJvZHVjdElkOiAweDgwMzYgfSxcbiAgICAgIHsgdmVuZG9ySWQ6IDB4MmEwMywgcHJvZHVjdElkOiAweDAwMzYgfSxcblxuICAgICAgLy8gQXJkdWlubyBMZW9uYXJkbyBFVEhcbiAgICAgIHsgdmVuZG9ySWQ6IDB4MmEwMywgcHJvZHVjdElkOiAweDAwNDAgfSxcbiAgICAgIHsgdmVuZG9ySWQ6IDB4MmEwMywgcHJvZHVjdElkOiAweDgwNDAgfSxcblxuICAgICAgLy8gU2VlZWR1aW5vIExpdGVcbiAgICAgIHsgdmVuZG9ySWQ6IDB4Mjg4NiwgcHJvZHVjdElkOiAweDgwMDIgfSxcblxuICAgICAgLy8gVURNWFxuICAgICAgeyB2ZW5kb3JJZDogMHgxNmMwLCBwcm9kdWN0SWQ6IDB4NWRjIH1cbiAgICBdXG5cbiAgICAvLyBUaGUgRE1YNTEyIHVuaXZlcnNlIHdpdGggNTEyIGNoYW5uZWxzXG4gICAgdGhpcy51bml2ZXJzZSA9IGFyZ3MudW5pdmVyc2UgfHwgbmV3IEFycmF5KDUxMikuZmlsbCgwKVxuICB9XG5cbiAgLyoqXG4gICAqIEVuYWJsZSBXZWJVU0IgYW5kIHNhdmUgdGhlIHNlbGVjdGVkIEFyZHVpbm8gaW50byA8Y29kZT5jb250cm9sbGVyLmRldmljZTwvY29kZT5cbiAgICpcbiAgICogTm90ZTogVGhpcyBmdW5jdGlvbiBoYXMgdG8gYmUgdHJpZ2dlcmVkIGJ5IGEgdXNlciBnZXN0dXJlXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnRyb2xsZXIuZW5hYmxlKCkudGhlbigoKSA9PiB7XG4gICAqICAgLy8gQ3JlYXRlIGEgY29ubmVjdGlvbiB0byB0aGUgc2VsZWN0ZWQgQXJkdWlub1xuICAgKiAgIGNvbnRyb2xsZXIuY29ubmVjdCgpLnRoZW4oKCkgPT4ge1xuICAgKiAgICAgLy8gU3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgYSBjb25uZWN0aW9uXG4gICAqICAgfSlcbiAgICogfSlcbiAgICogLmNhdGNoKGVycm9yID0+IHtcbiAgICogICAvLyBObyBBcmR1aW5vIHdhcyBzZWxlY3RlZCBieSB0aGUgdXNlclxuICAgKiB9KVxuICAgKi9cbiAgZW5hYmxlKCkge1xuICAgIC8vIFJlcXVlc3QgYWNjZXNzIHRvIHRoZSBVU0IgZGV2aWNlXG4gICAgcmV0dXJuIG5hdmlnYXRvci51c2IucmVxdWVzdERldmljZSh7IGZpbHRlcnM6IHRoaXMuZmlsdGVycyB9KVxuXG4gICAgLy8gc2VsZWN0ZWREZXZpY2UgPSB0aGUgVVNCIGRldmljZSB0aGF0IHdhcyBzZWxlY3RlZCBieSB0aGUgdXNlciBpbiB0aGUgYnJvd3NlclxuICAgIC50aGVuKHNlbGVjdGVkRGV2aWNlID0+IHtcbiAgICAgIHRoaXMuZGV2aWNlID0gc2VsZWN0ZWREZXZpY2VcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIFVTQiBkZXZpY2UgdGhhdCB3YXMgYWxyZWFkeSBwYWlyZWQgd2l0aCB0aGUgYnJvd3Nlci5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gIGdldFBhaXJlZERldmljZSgpIHtcbiAgICByZXR1cm4gbmF2aWdhdG9yLnVzYi5nZXREZXZpY2VzKClcblxuICAgIC50aGVuKGRldmljZXMgPT4ge1xuICAgICAgcmV0dXJuIGRldmljZXNbMF1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEF1dG9tYXRpY2FsbHkgY29ubmVjdCB0byBhIFVTQiBkZXZpY2UgdGhhdCB3YXMgYWxyZWFkeSBwYWlyZWQgd2l0aCB0aGUgQnJvd3NlciBhbmQgc2F2ZSBpdCBpbnRvIDxjb2RlPmNvbnRyb2xsZXIuZGV2aWNlPC9jb2RlPlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKiBAZXhhbXBsZVxuICAgKiBjb250cm9sbGVyLmF1dG9Db25uZWN0KClcbiAgICogICAudGhlbigoKSA9PiB7XG4gICAqICAgICAvLyBDb25uZWN0ZWQgdG8gYWxyZWFkeSBwYWlyZWQgQXJkdWlub1xuICAgKiAgIH0pXG4gICAqICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICogICAgIC8vIE5vdGhpbmcgZm91bmQgb3IgZm91bmQgcGFpcmVkIEFyZHVpbm8sIGJ1dCBpdCdzIG5vdCBjb25uZWN0ZWQgdG8gY29tcHV0ZXJcbiAgICogICB9KVxuICAgKi9cbiAgYXV0b0Nvbm5lY3QoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UGFpcmVkRGV2aWNlKCkudGhlbigoZGV2aWNlKSA9PiB7XG5cbiAgICAgIHRoaXMuZGV2aWNlID0gZGV2aWNlXG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgLy8gVVNCIERldmljZSBpcyBub3QgY29ubmVjdGVkIHRvIHRoZSBjb21wdXRlclxuICAgICAgICBpZiAodGhpcy5kZXZpY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdDYW4gbm90IGZpbmQgVVNCIGRldmljZS4nKSlcblxuICAgICAgICAvLyBVU0IgZGV2aWNlIGlzIGNvbm5lY3RlZCB0byB0aGUgY29tcHV0ZXIsIHNvIHRyeSB0byBjcmVhdGUgYSBXZWJVU0IgY29ubmVjdGlvblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZXNvbHZlKHRoaXMuY29ubmVjdCgpKVxuICAgICAgICB9XG5cbiAgICAgIH0pXG5cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW4gYSBjb25uZWN0aW9uIHRvIHRoZSBzZWxlY3RlZCBVU0IgZGV2aWNlIGFuZCB0ZWxsIHRoZSBkZXZpY2UgdGhhdFxuICAgKiB3ZSBhcmUgcmVhZHkgdG8gc2VuZCBkYXRhIHRvIGl0LlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKiBAZXhhbXBsZVxuICAgKiBjb250cm9sbGVyLmNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICogICAvLyBTdWNjZXNzZnVsbHkgY3JlYXRlZCBhIGNvbm5lY3Rpb24gdG8gdGhlIHNlbGVjdGVkIEFyZHVpbm9cbiAgICogfSlcbiAgICovXG4gIGNvbm5lY3QoKSB7XG4gICAgLy8gT3BlbiBjb25uZWN0aW9uXG4gICAgcmV0dXJuIHRoaXMuZGV2aWNlLm9wZW4oKVxuXG4gICAgLy8gU2VsZWN0ICMxIGNvbmZpZ3VyYXRpb24gaWYgbm90IGF1dG9tYXRpYWxseSBzZXQgYnkgT1NcbiAgICAudGhlbigoKSA9PiB7XG4gICAgICBpZiAodGhpcy5kZXZpY2UuY29uZmlndXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5kZXZpY2Uuc2VsZWN0Q29uZmlndXJhdGlvbigxKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBHZXQgZXhjbHVzaXZlIGFjY2VzcyB0byB0aGUgIzIgaW50ZXJmYWNlXG4gICAgLnRoZW4oKCkgPT4gdGhpcy5kZXZpY2UuY2xhaW1JbnRlcmZhY2UoMikpXG5cbiAgICAvLyBUZWxsIHRoZSBVU0IgZGV2aWNlIHRoYXQgd2UgYXJlIHJlYWR5IHRvIHNlbmQgZGF0YVxuICAgIC50aGVuKCgpID0+IHRoaXMuZGV2aWNlLmNvbnRyb2xUcmFuc2Zlck91dCh7XG4gICAgICAgIC8vIEl0J3MgYSBVU0IgY2xhc3MgcmVxdWVzdFxuICAgICAgICAncmVxdWVzdFR5cGUnOiAnY2xhc3MnLFxuICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gb2YgdGhpcyByZXF1ZXN0IGlzIHRoZSBpbnRlcmZhY2VcbiAgICAgICAgJ3JlY2lwaWVudCc6ICdpbnRlcmZhY2UnLFxuICAgICAgICAvLyBDREM6IENvbW11bmljYXRpb24gRGV2aWNlIENsYXNzXG4gICAgICAgIC8vIDB4MjI6IFNFVF9DT05UUk9MX0xJTkVfU1RBVEVcbiAgICAgICAgLy8gUlMtMjMyIHNpZ25hbCB1c2VkIHRvIHRlbGwgdGhlIFVTQiBkZXZpY2UgdGhhdCB0aGUgY29tcHV0ZXIgaXMgbm93IHByZXNlbnQuXG4gICAgICAgICdyZXF1ZXN0JzogMHgyMixcbiAgICAgICAgLy8gWWVzXG4gICAgICAgICd2YWx1ZSc6IDB4MDEsXG4gICAgICAgIC8vIEludGVyZmFjZSAjMlxuICAgICAgICAnaW5kZXgnOiAweDAyXG4gICAgICB9KVxuICAgIClcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGRhdGEgdG8gdGhlIFVTQiBkZXZpY2UgdG8gdXBkYXRlIHRoZSBETVg1MTIgdW5pdmVyc2VcbiAgICpcbiAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIExpc3QgY29udGFpbmluZyBhbGwgY2hhbm5lbHMgdGhhdCBzaG91bGQgYmUgdXBkYXRlZCBpbiB0aGUgdW5pdmVyc2VcbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICogQGV4YW1wbGVcbiAgICogY29udHJvbGxlci5zZW5kKFsyNTUsIDAsIDBdKVxuICAgKi9cbiAgc2VuZChkYXRhKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgLy8gVVNCIERldmljZSBpcyBub3QgY29ubmVjdGVkIHRvIHRoZSBjb21wdXRlclxuICAgICAgaWYgKHRoaXMuZGV2aWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ1VTQiBkZXZpY2UgaXMgbm90IGNvbm5lY3RlZCB0byB0aGUgY29tcHV0ZXInKSlcblxuICAgICAgLy8gVVNCIGRldmljZSBpcyBjb25uZWN0ZWQgdG8gdGhlIGNvbXB1dGVyLCBzbyB0cnkgdG8gY3JlYXRlIGEgV2ViVVNCIGNvbm5lY3Rpb25cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENyZWF0ZSBhbiBBcnJheUJ1ZmZlciwgYmVjYXVzZSB0aGF0IGlzIG5lZWRlZCBmb3IgV2ViVVNCXG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IFVpbnQ4QXJyYXkuZnJvbShkYXRhKVxuXG4gICAgICAgIC8vIFNlbmQgZGF0YSBvbiBFbmRwb2ludCAjNFxuICAgICAgICByZXR1cm4gcmVzb2x2ZSh0aGlzLmRldmljZS50cmFuc2Zlck91dCg0LCBidWZmZXIpKVxuICAgICAgfVxuXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIDxjb2RlPmNoYW5uZWw8L2NvZGU+KHMpIG9mIHRoZSBETVg1MTIgdW5pdmVyc2Ugd2l0aCB0aGUgcHJvdmlkZWQgPGNvZGU+dmFsdWU8L2NvZGU+XG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBjaGFubmVsIC0gVGhlIGNoYW5uZWwgdG8gdXBkYXRlXG4gICAqIEBwYXJhbSB7KG51bWJlcnxudW1iZXJbXSl9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHVwZGF0ZSB0aGUgY2hhbm5lbCwgc3VwcG9ydGluZyB0d28gZGlmZmVyZW50IG1vZGVzOiBzaW5nbGUgKD0gPGNvZGU+bnVtYmVyPC9jb2RlPikgJiBtdWx0aSAoPSA8Y29kZT5BcnJheTwvY29kZT4pXG4gICAqIEBleGFtcGxlIDxjYXB0aW9uPlVwZGF0ZSBhIHNpbmdsZSBjaGFubmVsPC9jYXB0aW9uPlxuICAgKiAvLyBVcGRhdGUgY2hhbm5lbCAjMVxuICAgKiBjb250cm9sbGVyLnVwZGF0ZVVuaXZlcnNlKDEsIDI1NSlcbiAgICogQGV4YW1wbGUgPGNhcHRpb24+VXBkYXRlIG11bHRpcGxlIGNoYW5uZWxzIHN0YXJ0aW5nIHdpdGggY2hhbm5lbDwvY2FwdGlvbj5cbiAgICogLy8gVXBkYXRlIGNoYW5uZWwgIzUgd2l0aCAyNTUsICM2IHdpdGggMCAmICM3IHdpdGggMjBcbiAgICogY29udHJvbGxlci51cGRhdGVVbml2ZXJzZSg1LCBbMjU1LCAwLCAyMF0pXG4gICAqL1xuICB1cGRhdGVVbml2ZXJzZShjaGFubmVsLCB2YWx1ZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgIC8vIFRoZSBETVg1MTIgdW5pdmVyc2Ugc3RhcnRzIHdpdGggY2hhbm5lbCAxLCBidXQgdGhlIGFycmF5IHdpdGggMFxuICAgICAgY2hhbm5lbCA9IGNoYW5uZWwgLSAxXG5cbiAgICAgIC8vIFNpbmdsZVxuICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIodmFsdWUpKSB7XG4gICAgICAgIHRoaXMudW5pdmVyc2Uuc3BsaWNlKGNoYW5uZWwsIDEsIHZhbHVlKVxuXG4gICAgICAvLyBNdWx0aXBsZVxuICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICB0aGlzLnVuaXZlcnNlLnNwbGljZShjaGFubmVsLCB2YWx1ZS5sZW5ndGgsIC4uLnZhbHVlKVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcignQ291bGQgbm90IHVwZGF0ZSBVbml2ZXJzZSBiZWNhdXNlIHRoZSBwcm92aWRlZCB2YWx1ZSBpcyBub3Qgb2YgdHlwZSBudW1iZXIgb3IgbnVtYmVyW10nKSlcbiAgICAgIH1cblxuICAgICAgLy8gU2VuZCB0aGUgdXBkYXRlZCB1bml2ZXJzZSB0byB0aGUgRE1YNTEyIGNvbnRyb2xsZXJcbiAgICAgIHJldHVybiByZXNvbHZlKHRoaXMuc2VuZCh0aGlzLnVuaXZlcnNlKSlcblxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogRGlzY29ubmVjdCBmcm9tIHRoZSBVU0IgZGV2aWNlXG4gICAqXG4gICAqIE5vdGU6IFRoZSBkZXZpY2UgaXMgc3RpbGwgcGFpcmVkIHRvIHRoZSBicm93c2VyIVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKiBAZXhhbXBsZVxuICAgKiBjb250cm9sbGVyLmRpc2Nvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICogICAvLyBEZXN0cm95ZWQgY29ubmVjdGlvbiB0byBVU0IgZGV2aWNlLCBidXQgVVNCIGRldmljZSBpcyBzdGlsbCBwYWlyZWQgd2l0aCB0aGUgYnJvd3NlclxuICAgKn0pXG4gICAqL1xuICBkaXNjb25uZWN0KCkge1xuICAgIC8vIERlY2xhcmUgdGhhdCB3ZSBkb24ndCB3YW50IHRvIHJlY2VpdmUgZGF0YSBhbnltb3JlXG4gICAgcmV0dXJuIHRoaXMuZGV2aWNlLmNvbnRyb2xUcmFuc2Zlck91dCh7XG4gICAgICAvLyBJdCdzIGEgVVNCIGNsYXNzIHJlcXVlc3RcbiAgICAgICdyZXF1ZXN0VHlwZSc6ICdjbGFzcycsXG4gICAgICAvLyBUaGUgZGVzdGluYXRpb24gb2YgdGhpcyByZXF1ZXN0IGlzIHRoZSBpbnRlcmZhY2VcbiAgICAgICdyZWNpcGllbnQnOiAnaW50ZXJmYWNlJyxcbiAgICAgIC8vIENEQzogQ29tbXVuaWNhdGlvbiBEZXZpY2UgQ2xhc3NcbiAgICAgIC8vIDB4MjI6IFNFVF9DT05UUk9MX0xJTkVfU1RBVEVcbiAgICAgIC8vIFJTLTIzMiBzaWduYWwgdXNlZCB0byB0ZWxsIHRoZSBVU0IgZGV2aWNlIHRoYXQgdGhlIGNvbXB1dGVyIGlzIG5vdCBwcmVzZW50IGFueW1vcmVcbiAgICAgICdyZXF1ZXN0JzogMHgyMixcbiAgICAgIC8vIE5vXG4gICAgICAndmFsdWUnOiAweDAxLFxuICAgICAgLy8gSW50ZXJmYWNlICMyXG4gICAgICAnaW5kZXgnOiAweDAyXG4gICAgfSlcblxuICAgIC8vIENsb3NlIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBVU0IgZGV2aWNlXG4gICAgLnRoZW4oKCkgPT4gdGhpcy5kZXZpY2UuY2xvc2UoKSlcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZXZlbnRzXCIpOzsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicGF0aFwiKTs7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwidXRpbFwiKTs7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0aWYoX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSkge1xuXHRcdHJldHVybiBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiY29uc3QgQ29udHJvbGxlciA9IHJlcXVpcmUoXCJ3ZWJ1c2ItZG14NTEyLWNvbnRyb2xsZXJcIikuZGVmYXVsdDtcbmNvbnN0IHVETVggPSByZXF1aXJlKFwidWRteFwiKTtcblxuY29uc3QgY29udHJvbGxlciA9IG5ldyBDb250cm9sbGVyKCk7XG5cbmNvbnNvbGUubG9nKGNvbnRyb2xsZXIpO1xuXG52YXIgZXhhbXBsZSA9IGV4YW1wbGUgfHwge307XG5cbihmdW5jdGlvbiAoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdGV4YW1wbGUuRE1YQ29udHJvbGxlciA9IGZ1bmN0aW9uICgpIHtcblx0XHR0aGlzLm9zY1BvcnQgPSBuZXcgb3NjLldlYlNvY2tldFBvcnQoe1xuXHRcdFx0dXJsOiBcIndzOi8vbG9jYWxob3N0OjgwODFcIixcblx0XHR9KTtcblxuXHRcdHRoaXMubGlzdGVuKCk7XG5cdFx0dGhpcy5vc2NQb3J0Lm9wZW4oKTtcblxuXHRcdHRoaXMub3NjUG9ydC5zb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24gKGUpIHtcblx0XHRcdGNvbnNvbGUubG9nKFwibWVzc2FnZVwiLCBlKTtcblx0XHR9O1xuXG5cdFx0dGhpcy52YWx1ZU1hcCA9IHtcblx0XHRcdFwiLzEvdG9nZ2xlMVwiOiBcIkRNWCBjaGFubmVsIDFcIixcblx0XHRcdFwiLzEvZmFkZXIxXCI6IFwiRE1YIGNoYW5uZWwgMVwiLFxuXG5cdFx0XHRcIi8xL3RvZ2dsZTJcIjogXCJETVggY2hhbm5lbCAxXCIsXG5cdFx0XHRcIi8xL2ZhZGVyMlwiOiBcIkRNWCBjaGFubmVsIDFcIixcblxuXHRcdFx0XCIvMS90b2dnbGUzXCI6IFwiRE1YIGNoYW5uZWwgMVwiLFxuXHRcdFx0XCIvMS9mYWRlcjNcIjogXCJETVggY2hhbm5lbCAxXCIsXG5cblx0XHRcdFwiLzEvdG9nZ2xlNFwiOiBcIkRNWCBjaGFubmVsIDFcIixcblx0XHRcdFwiLzEvZmFkZXI0XCI6IFwiRE1YIGNoYW5uZWwgMVwiLFxuXHRcdH07XG5cdH07XG5cblx0ZXhhbXBsZS5ETVhDb250cm9sbGVyLnByb3RvdHlwZS5saXN0ZW4gPSBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5vc2NQb3J0Lm9uKFwibWVzc2FnZVwiLCB0aGlzLm1hcE1lc3NhZ2UuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5vc2NQb3J0Lm9uKFwibWVzc2FnZVwiLCBmdW5jdGlvbiAobXNnKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhcIm1lc3NhZ2VcIiwgbXNnKTtcblx0XHR9KTtcblx0fTtcblxuXHRleGFtcGxlLkRNWENvbnRyb2xsZXIucHJvdG90eXBlLm1hcE1lc3NhZ2UgPSBmdW5jdGlvbiAob3NjTWVzc2FnZSkge1xuXHRcdCQoXCIjbWVzc2FnZVwiKS50ZXh0KGZsdWlkLnByZXR0eVByaW50SlNPTihvc2NNZXNzYWdlKSk7XG5cdH07XG59KSgpO1xuXG5jb25zdCBzdGFydEJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhcnQtYnRuXCIpO1xuXG5zdGFydEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcblx0Ly8gRW5hYmxlIFdlYlVTQiBhbmQgc2VsZWN0IHRoZSBBcmR1aW5vXG5cdGNvbnNvbGUubG9nKG5hdmlnYXRvci51c2IuZ2V0RGV2aWNlcygpKTtcblx0Y29udHJvbGxlci5lbmFibGUoKS50aGVuKCgpID0+IHtcblx0XHQvLyBDcmVhdGUgYSBjb25uZWN0aW9uIHRvIHRoZSBzZWxlY3RlZCBBcmR1aW5vXG5cdFx0Y29udHJvbGxlci5jb25uZWN0KCkudGhlbigoKSA9PiB7XG5cdFx0XHQvLyBVcGRhdGUgdGhlIDEgY2hhbm5lbCBvZiB0aGUgRE1YNTEyIHVuaXZlcnNlIHdpdGggdmFsdWUgMjU1XG5cdFx0XHRjb250cm9sbGVyLnVwZGF0ZVVuaXZlcnNlKDEsIDI1NSk7XG5cdFx0fSk7XG5cdH0pO1xufSk7XG5cbmNvbnN0IGRteENvbnRyb2xsZXIgPSBuZXcgZXhhbXBsZS5ETVhDb250cm9sbGVyKCk7XG4iXSwic291cmNlUm9vdCI6IiJ9