/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

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
    .then(() => this.device.claimInterface(0))

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
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Controller = __webpack_require__(/*! webusb-dmx512-controller */ "./node_modules/webusb-dmx512-controller/controller.js").default; // const uDMX = require("udmx");


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
startBtn.addEventListener("click", /*#__PURE__*/_asyncToGenerator(function* () {
  var device;
  var VENDOR_ID = 0x16c0;

  try {
    device = yield navigator.usb.requestDevice({
      filters: [{
        vendorId: VENDOR_ID
      }]
    });
    controller.device = device;
    console.log("open");
    yield controller.device.open();
    console.log("opened:", controller.device); //if (controller.device.configuration === null) {

    console.log("selecting config");
    yield controller.device.selectConfiguration(1);
    console.log("selected config: ", controller.device);
    console.log("claiming interface");
    yield controller.device.claimInterface(0);
    console.log("interface claimed: ", controller.device); //}

    console.log("setting control transfer out");
    yield controller.device.controlTransferOut({
      // It's a USB class request
      requestType: "vendor",
      // The destination of this request is the interface
      recipient: "endpoint",
      // CDC: Communication Device Class
      // 0x22: SET_CONTROL_LINE_STATE
      // RS-232 signal used to tell the USB device that the computer is now present.
      request: 0x80,
      // Yes
      value: 0x02,
      // Interface #2
      index: 0x00
    });
    console.log("control transfer out set: ", controller.device);
    yield controller.updateUniverse(1, 80);
  } catch (err) {
    console.error("ERROR: ", err);
  } // // Enable WebUSB and select the Arduino
  // console.log(navigator.usb.getDevices());
  // controller.enable().then(() => {
  // 	// Create a connection to the selected Arduino
  // 	controller.connect().then(() => {
  // 		// Update the 1 channel of the DMX512 universe with value 255
  // 		controller.updateUniverse(1, 255);
  // 	});
  // });

}));
var dmxController = new example.DMXController();
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9vc2MtdGVzdC8uL25vZGVfbW9kdWxlcy93ZWJ1c2ItZG14NTEyLWNvbnRyb2xsZXIvY29udHJvbGxlci5qcyIsIndlYnBhY2s6Ly9vc2MtdGVzdC93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9vc2MtdGVzdC93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vb3NjLXRlc3Qvd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9vc2MtdGVzdC93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL29zYy10ZXN0Ly4vd2ViL2RteENvbnRyb2xsZXIuanMiXSwibmFtZXMiOlsiQ29udHJvbGxlciIsInJlcXVpcmUiLCJjb250cm9sbGVyIiwiY29uc29sZSIsImxvZyIsImV4YW1wbGUiLCJETVhDb250cm9sbGVyIiwib3NjUG9ydCIsIm9zYyIsIldlYlNvY2tldFBvcnQiLCJ1cmwiLCJsaXN0ZW4iLCJvcGVuIiwic29ja2V0Iiwib25tZXNzYWdlIiwiZSIsInZhbHVlTWFwIiwicHJvdG90eXBlIiwib24iLCJtYXBNZXNzYWdlIiwiYmluZCIsIm1zZyIsIm9zY01lc3NhZ2UiLCIkIiwidGV4dCIsImZsdWlkIiwicHJldHR5UHJpbnRKU09OIiwic3RhcnRCdG4iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiYWRkRXZlbnRMaXN0ZW5lciIsImRldmljZSIsIlZFTkRPUl9JRCIsIm5hdmlnYXRvciIsInVzYiIsInJlcXVlc3REZXZpY2UiLCJmaWx0ZXJzIiwidmVuZG9ySWQiLCJzZWxlY3RDb25maWd1cmF0aW9uIiwiY2xhaW1JbnRlcmZhY2UiLCJjb250cm9sVHJhbnNmZXJPdXQiLCJyZXF1ZXN0VHlwZSIsInJlY2lwaWVudCIsInJlcXVlc3QiLCJ2YWx1ZSIsImluZGV4IiwidXBkYXRlVW5pdmVyc2UiLCJl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LENBQVkscUJBQVosRUFBbUNGLFVBQVUsQ0FBQzZCLE1BQTlDLEVBckJHLENBc0JIOztBQUVBNUIsV0FBTyxDQUFDQyxHQUFSLENBQVksOEJBQVo7QUFDQSxVQUFNRixVQUFVLENBQUM2QixNQUFYLENBQWtCUyxrQkFBbEIsQ0FBcUM7QUFDMUM7QUFDQUMsaUJBQVcsRUFBRSxRQUY2QjtBQUcxQztBQUNBQyxlQUFTLEVBQUUsVUFKK0I7QUFLMUM7QUFDQTtBQUNBO0FBQ0FDLGFBQU8sRUFBRSxJQVJpQztBQVMxQztBQUNBQyxXQUFLLEVBQUUsSUFWbUM7QUFXMUM7QUFDQUMsV0FBSyxFQUFFO0FBWm1DLEtBQXJDLENBQU47QUFjQTFDLFdBQU8sQ0FBQ0MsR0FBUixDQUFZLDRCQUFaLEVBQTBDRixVQUFVLENBQUM2QixNQUFyRDtBQUVBLFVBQU03QixVQUFVLENBQUM0QyxjQUFYLENBQTBCLENBQTFCLEVBQTZCLEVBQTdCLENBQU47QUFDQSxHQTFDRCxDQTBDRSxPQUFPQyxHQUFQLEVBQVk7QUFDYjVDLFdBQU8sQ0FBQzZDLEtBQVIsQ0FBYyxTQUFkLEVBQXlCRCxHQUF6QjtBQUNBLEdBaEQ2QyxDQWlEOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBLENBMUREO0FBNERBLElBQU1FLGFBQWEsR0FBRyxJQUFJNUMsT0FBTyxDQUFDQyxhQUFaLEVBQXRCLEMiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGUgY29udHJvbGxlciBpcyBjcmVhdGluZyBhIGNvbm5lY3Rpb24gdG8gdGhlIFVTQiBkZXZpY2UgKEFyZHVpbm8pIHRvIHNlbmQgZGF0YSBvdmVyIFdlYlVTQi5cbiAqIEJ5IHVzaW5nIHRoZSBkZWZhdWx0IDxjb2RlPmFyZ3M8L2NvZGU+IHlvdSB3aWxsIG9ubHkgc2VlIHRoZSBmb2xsb3dpbmcgQXJkdWlubyBpbiB0aGUgdXNlciBwcm9tcHQ6XG4gKiAtIEFyZHVpbm8gTGVvbmFyZG9cbiAqIC0gQXJkdWlubyBMZW9uYXJkbyBFVEhcbiAqIC0gU2VlZWR1aW5vIExpdGVcbiAqIEBtb2R1bGUgQ29udHJvbGxlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhcmdzIC0gQXJndW1lbnRzIHRvIGNvbmZpZ3VyZSB0aGUgY29udHJvbGxlclxuICogQHBhcmFtIHtPYmplY3RbXX0gYXJncy5maWx0ZXJzIC0gTGlzdCBvZiBkZXZpY2VzIHRoYXQgYXJlIHdoaXRlbGlzdGVkIHdoZW4gb3BlbmluZyB0aGUgdXNlciBwcm9tcHQgdG8gc2VsZWN0IGFuIEFyZHVpbm9cbiAqIEBwYXJhbSB7T2JqZWN0fSBhcmdzLmRldmljZSAtIFRoZSBzZWxlY3RlZCBBcmR1aW5vIHRvIHVzZSBhcyB0aGUgRE1YNTEyIGNvbnRyb2xsZXJcbiAqIEBwYXJhbSB7bnVtYmVyW119IGFyZ3MudW5pdmVyc2UgLSBIb2xkcyBhbGwgdGhlIHZhbHVlcyBmb3IgZWFjaCBjaGFubmVsIG9mIHRoZSBETVg1MTIgdW5pdmVyc2VcbiAqIEBleGFtcGxlXG4gKiBpbXBvcnQgQ29udHJvbGxlciBmcm9tICd3ZWJ1c2ItZG14NTEyLWNvbnRyb2xsZXIvY29udHJvbGxlci5qcydcbiAqXG4gKiAvLyBDcmVhdGUgYSBuZXcgY29udHJvbGxlciB1c2luZyB0aGUgZGVmYXVsdCBwcm9wZXJ0aWVzXG4gKiBjb25zdCBjb250cm9sbGVyID0gbmV3IENvbnRyb2xsZXIoKVxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb250cm9sbGVyIHtcblxuICBjb25zdHJ1Y3RvcihhcmdzID0ge30pIHtcbiAgICAvLyBSZWZlcmVuY2UgdG8gdGhlIHNlbGVjdGVkIFVTQiBkZXZpY2VcbiAgICB0aGlzLmRldmljZSA9IGFyZ3MuZGV2aWNlIHx8IHVuZGVmaW5lZFxuXG4gICAgLy8gT25seSBhbGxvdyBzcGVjaWZpYyBVU0IgZGV2aWNlc1xuICAgIHRoaXMuZmlsdGVycyA9IGFyZ3MuZmlsdGVycyB8fCBbXG4gICAgICAvLyBBcmR1aW5vIExlb25hcmRvXG4gICAgICB7IHZlbmRvcklkOiAweDIzNDEsIHByb2R1Y3RJZDogMHg4MDM2IH0sXG4gICAgICB7IHZlbmRvcklkOiAweDIzNDEsIHByb2R1Y3RJZDogMHgwMDM2IH0sXG4gICAgICB7IHZlbmRvcklkOiAweDJhMDMsIHByb2R1Y3RJZDogMHg4MDM2IH0sXG4gICAgICB7IHZlbmRvcklkOiAweDJhMDMsIHByb2R1Y3RJZDogMHgwMDM2IH0sXG5cbiAgICAgIC8vIEFyZHVpbm8gTGVvbmFyZG8gRVRIXG4gICAgICB7IHZlbmRvcklkOiAweDJhMDMsIHByb2R1Y3RJZDogMHgwMDQwIH0sXG4gICAgICB7IHZlbmRvcklkOiAweDJhMDMsIHByb2R1Y3RJZDogMHg4MDQwIH0sXG5cbiAgICAgIC8vIFNlZWVkdWlubyBMaXRlXG4gICAgICB7IHZlbmRvcklkOiAweDI4ODYsIHByb2R1Y3RJZDogMHg4MDAyIH0sXG5cbiAgICAgIC8vIFVETVhcbiAgICAgIHsgdmVuZG9ySWQ6IDB4MTZjMCwgcHJvZHVjdElkOiAweDVkYyB9XG4gICAgXVxuXG4gICAgLy8gVGhlIERNWDUxMiB1bml2ZXJzZSB3aXRoIDUxMiBjaGFubmVsc1xuICAgIHRoaXMudW5pdmVyc2UgPSBhcmdzLnVuaXZlcnNlIHx8IG5ldyBBcnJheSg1MTIpLmZpbGwoMClcbiAgfVxuXG4gIC8qKlxuICAgKiBFbmFibGUgV2ViVVNCIGFuZCBzYXZlIHRoZSBzZWxlY3RlZCBBcmR1aW5vIGludG8gPGNvZGU+Y29udHJvbGxlci5kZXZpY2U8L2NvZGU+XG4gICAqXG4gICAqIE5vdGU6IFRoaXMgZnVuY3Rpb24gaGFzIHRvIGJlIHRyaWdnZXJlZCBieSBhIHVzZXIgZ2VzdHVyZVxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb250cm9sbGVyLmVuYWJsZSgpLnRoZW4oKCkgPT4ge1xuICAgKiAgIC8vIENyZWF0ZSBhIGNvbm5lY3Rpb24gdG8gdGhlIHNlbGVjdGVkIEFyZHVpbm9cbiAgICogICBjb250cm9sbGVyLmNvbm5lY3QoKS50aGVuKCgpID0+IHtcbiAgICogICAgIC8vIFN1Y2Nlc3NmdWxseSBjcmVhdGVkIGEgY29ubmVjdGlvblxuICAgKiAgIH0pXG4gICAqIH0pXG4gICAqIC5jYXRjaChlcnJvciA9PiB7XG4gICAqICAgLy8gTm8gQXJkdWlubyB3YXMgc2VsZWN0ZWQgYnkgdGhlIHVzZXJcbiAgICogfSlcbiAgICovXG4gIGVuYWJsZSgpIHtcbiAgICAvLyBSZXF1ZXN0IGFjY2VzcyB0byB0aGUgVVNCIGRldmljZVxuICAgIHJldHVybiBuYXZpZ2F0b3IudXNiLnJlcXVlc3REZXZpY2UoeyBmaWx0ZXJzOiB0aGlzLmZpbHRlcnMgfSlcblxuICAgIC8vIHNlbGVjdGVkRGV2aWNlID0gdGhlIFVTQiBkZXZpY2UgdGhhdCB3YXMgc2VsZWN0ZWQgYnkgdGhlIHVzZXIgaW4gdGhlIGJyb3dzZXJcbiAgICAudGhlbihzZWxlY3RlZERldmljZSA9PiB7XG4gICAgICB0aGlzLmRldmljZSA9IHNlbGVjdGVkRGV2aWNlXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBVU0IgZGV2aWNlIHRoYXQgd2FzIGFscmVhZHkgcGFpcmVkIHdpdGggdGhlIGJyb3dzZXIuXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqL1xuICBnZXRQYWlyZWREZXZpY2UoKSB7XG4gICAgcmV0dXJuIG5hdmlnYXRvci51c2IuZ2V0RGV2aWNlcygpXG5cbiAgICAudGhlbihkZXZpY2VzID0+IHtcbiAgICAgIHJldHVybiBkZXZpY2VzWzBdXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBBdXRvbWF0aWNhbGx5IGNvbm5lY3QgdG8gYSBVU0IgZGV2aWNlIHRoYXQgd2FzIGFscmVhZHkgcGFpcmVkIHdpdGggdGhlIEJyb3dzZXIgYW5kIHNhdmUgaXQgaW50byA8Y29kZT5jb250cm9sbGVyLmRldmljZTwvY29kZT5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICogQGV4YW1wbGVcbiAgICogY29udHJvbGxlci5hdXRvQ29ubmVjdCgpXG4gICAqICAgLnRoZW4oKCkgPT4ge1xuICAgKiAgICAgLy8gQ29ubmVjdGVkIHRvIGFscmVhZHkgcGFpcmVkIEFyZHVpbm9cbiAgICogICB9KVxuICAgKiAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAqICAgICAvLyBOb3RoaW5nIGZvdW5kIG9yIGZvdW5kIHBhaXJlZCBBcmR1aW5vLCBidXQgaXQncyBub3QgY29ubmVjdGVkIHRvIGNvbXB1dGVyXG4gICAqICAgfSlcbiAgICovXG4gIGF1dG9Db25uZWN0KCkge1xuICAgIHJldHVybiB0aGlzLmdldFBhaXJlZERldmljZSgpLnRoZW4oKGRldmljZSkgPT4ge1xuXG4gICAgICB0aGlzLmRldmljZSA9IGRldmljZVxuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgIC8vIFVTQiBEZXZpY2UgaXMgbm90IGNvbm5lY3RlZCB0byB0aGUgY29tcHV0ZXJcbiAgICAgICAgaWYgKHRoaXMuZGV2aWNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcignQ2FuIG5vdCBmaW5kIFVTQiBkZXZpY2UuJykpXG5cbiAgICAgICAgLy8gVVNCIGRldmljZSBpcyBjb25uZWN0ZWQgdG8gdGhlIGNvbXB1dGVyLCBzbyB0cnkgdG8gY3JlYXRlIGEgV2ViVVNCIGNvbm5lY3Rpb25cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZSh0aGlzLmNvbm5lY3QoKSlcbiAgICAgICAgfVxuXG4gICAgICB9KVxuXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVuIGEgY29ubmVjdGlvbiB0byB0aGUgc2VsZWN0ZWQgVVNCIGRldmljZSBhbmQgdGVsbCB0aGUgZGV2aWNlIHRoYXRcbiAgICogd2UgYXJlIHJlYWR5IHRvIHNlbmQgZGF0YSB0byBpdC5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICogQGV4YW1wbGVcbiAgICogY29udHJvbGxlci5jb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAqICAgLy8gU3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgYSBjb25uZWN0aW9uIHRvIHRoZSBzZWxlY3RlZCBBcmR1aW5vXG4gICAqIH0pXG4gICAqL1xuICBjb25uZWN0KCkge1xuICAgIC8vIE9wZW4gY29ubmVjdGlvblxuICAgIHJldHVybiB0aGlzLmRldmljZS5vcGVuKClcblxuICAgIC8vIFNlbGVjdCAjMSBjb25maWd1cmF0aW9uIGlmIG5vdCBhdXRvbWF0aWFsbHkgc2V0IGJ5IE9TXG4gICAgLnRoZW4oKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuZGV2aWNlLmNvbmZpZ3VyYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGV2aWNlLnNlbGVjdENvbmZpZ3VyYXRpb24oMSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gR2V0IGV4Y2x1c2l2ZSBhY2Nlc3MgdG8gdGhlICMyIGludGVyZmFjZVxuICAgIC50aGVuKCgpID0+IHRoaXMuZGV2aWNlLmNsYWltSW50ZXJmYWNlKDApKVxuXG4gICAgLy8gVGVsbCB0aGUgVVNCIGRldmljZSB0aGF0IHdlIGFyZSByZWFkeSB0byBzZW5kIGRhdGFcbiAgICAudGhlbigoKSA9PiB0aGlzLmRldmljZS5jb250cm9sVHJhbnNmZXJPdXQoe1xuICAgICAgICAvLyBJdCdzIGEgVVNCIGNsYXNzIHJlcXVlc3RcbiAgICAgICAgJ3JlcXVlc3RUeXBlJzogJ2NsYXNzJyxcbiAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIG9mIHRoaXMgcmVxdWVzdCBpcyB0aGUgaW50ZXJmYWNlXG4gICAgICAgICdyZWNpcGllbnQnOiAnaW50ZXJmYWNlJyxcbiAgICAgICAgLy8gQ0RDOiBDb21tdW5pY2F0aW9uIERldmljZSBDbGFzc1xuICAgICAgICAvLyAweDIyOiBTRVRfQ09OVFJPTF9MSU5FX1NUQVRFXG4gICAgICAgIC8vIFJTLTIzMiBzaWduYWwgdXNlZCB0byB0ZWxsIHRoZSBVU0IgZGV2aWNlIHRoYXQgdGhlIGNvbXB1dGVyIGlzIG5vdyBwcmVzZW50LlxuICAgICAgICAncmVxdWVzdCc6IDB4MjIsXG4gICAgICAgIC8vIFllc1xuICAgICAgICAndmFsdWUnOiAweDAxLFxuICAgICAgICAvLyBJbnRlcmZhY2UgIzJcbiAgICAgICAgJ2luZGV4JzogMHgwMlxuICAgICAgfSlcbiAgICApXG4gIH1cblxuICAvKipcbiAgICogU2VuZCBkYXRhIHRvIHRoZSBVU0IgZGV2aWNlIHRvIHVwZGF0ZSB0aGUgRE1YNTEyIHVuaXZlcnNlXG4gICAqXG4gICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBMaXN0IGNvbnRhaW5pbmcgYWxsIGNoYW5uZWxzIHRoYXQgc2hvdWxkIGJlIHVwZGF0ZWQgaW4gdGhlIHVuaXZlcnNlXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnRyb2xsZXIuc2VuZChbMjU1LCAwLCAwXSlcbiAgICovXG4gIHNlbmQoZGF0YSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgIC8vIFVTQiBEZXZpY2UgaXMgbm90IGNvbm5lY3RlZCB0byB0aGUgY29tcHV0ZXJcbiAgICAgIGlmICh0aGlzLmRldmljZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdVU0IgZGV2aWNlIGlzIG5vdCBjb25uZWN0ZWQgdG8gdGhlIGNvbXB1dGVyJykpXG5cbiAgICAgIC8vIFVTQiBkZXZpY2UgaXMgY29ubmVjdGVkIHRvIHRoZSBjb21wdXRlciwgc28gdHJ5IHRvIGNyZWF0ZSBhIFdlYlVTQiBjb25uZWN0aW9uXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBDcmVhdGUgYW4gQXJyYXlCdWZmZXIsIGJlY2F1c2UgdGhhdCBpcyBuZWVkZWQgZm9yIFdlYlVTQlxuICAgICAgICBjb25zdCBidWZmZXIgPSBVaW50OEFycmF5LmZyb20oZGF0YSlcblxuICAgICAgICAvLyBTZW5kIGRhdGEgb24gRW5kcG9pbnQgIzRcbiAgICAgICAgcmV0dXJuIHJlc29sdmUodGhpcy5kZXZpY2UudHJhbnNmZXJPdXQoNCwgYnVmZmVyKSlcbiAgICAgIH1cblxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSA8Y29kZT5jaGFubmVsPC9jb2RlPihzKSBvZiB0aGUgRE1YNTEyIHVuaXZlcnNlIHdpdGggdGhlIHByb3ZpZGVkIDxjb2RlPnZhbHVlPC9jb2RlPlxuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gY2hhbm5lbCAtIFRoZSBjaGFubmVsIHRvIHVwZGF0ZVxuICAgKiBAcGFyYW0geyhudW1iZXJ8bnVtYmVyW10pfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB1cGRhdGUgdGhlIGNoYW5uZWwsIHN1cHBvcnRpbmcgdHdvIGRpZmZlcmVudCBtb2Rlczogc2luZ2xlICg9IDxjb2RlPm51bWJlcjwvY29kZT4pICYgbXVsdGkgKD0gPGNvZGU+QXJyYXk8L2NvZGU+KVxuICAgKiBAZXhhbXBsZSA8Y2FwdGlvbj5VcGRhdGUgYSBzaW5nbGUgY2hhbm5lbDwvY2FwdGlvbj5cbiAgICogLy8gVXBkYXRlIGNoYW5uZWwgIzFcbiAgICogY29udHJvbGxlci51cGRhdGVVbml2ZXJzZSgxLCAyNTUpXG4gICAqIEBleGFtcGxlIDxjYXB0aW9uPlVwZGF0ZSBtdWx0aXBsZSBjaGFubmVscyBzdGFydGluZyB3aXRoIGNoYW5uZWw8L2NhcHRpb24+XG4gICAqIC8vIFVwZGF0ZSBjaGFubmVsICM1IHdpdGggMjU1LCAjNiB3aXRoIDAgJiAjNyB3aXRoIDIwXG4gICAqIGNvbnRyb2xsZXIudXBkYXRlVW5pdmVyc2UoNSwgWzI1NSwgMCwgMjBdKVxuICAgKi9cbiAgdXBkYXRlVW5pdmVyc2UoY2hhbm5lbCwgdmFsdWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAvLyBUaGUgRE1YNTEyIHVuaXZlcnNlIHN0YXJ0cyB3aXRoIGNoYW5uZWwgMSwgYnV0IHRoZSBhcnJheSB3aXRoIDBcbiAgICAgIGNoYW5uZWwgPSBjaGFubmVsIC0gMVxuXG4gICAgICAvLyBTaW5nbGVcbiAgICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKHZhbHVlKSkge1xuICAgICAgICB0aGlzLnVuaXZlcnNlLnNwbGljZShjaGFubmVsLCAxLCB2YWx1ZSlcblxuICAgICAgLy8gTXVsdGlwbGVcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdGhpcy51bml2ZXJzZS5zcGxpY2UoY2hhbm5lbCwgdmFsdWUubGVuZ3RoLCAuLi52YWx1ZSlcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0NvdWxkIG5vdCB1cGRhdGUgVW5pdmVyc2UgYmVjYXVzZSB0aGUgcHJvdmlkZWQgdmFsdWUgaXMgbm90IG9mIHR5cGUgbnVtYmVyIG9yIG51bWJlcltdJykpXG4gICAgICB9XG5cbiAgICAgIC8vIFNlbmQgdGhlIHVwZGF0ZWQgdW5pdmVyc2UgdG8gdGhlIERNWDUxMiBjb250cm9sbGVyXG4gICAgICByZXR1cm4gcmVzb2x2ZSh0aGlzLnNlbmQodGhpcy51bml2ZXJzZSkpXG5cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIERpc2Nvbm5lY3QgZnJvbSB0aGUgVVNCIGRldmljZVxuICAgKlxuICAgKiBOb3RlOiBUaGUgZGV2aWNlIGlzIHN0aWxsIHBhaXJlZCB0byB0aGUgYnJvd3NlciFcbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICogQGV4YW1wbGVcbiAgICogY29udHJvbGxlci5kaXNjb25uZWN0KCkudGhlbigoKSA9PiB7XG4gICAqICAgLy8gRGVzdHJveWVkIGNvbm5lY3Rpb24gdG8gVVNCIGRldmljZSwgYnV0IFVTQiBkZXZpY2UgaXMgc3RpbGwgcGFpcmVkIHdpdGggdGhlIGJyb3dzZXJcbiAgICp9KVxuICAgKi9cbiAgZGlzY29ubmVjdCgpIHtcbiAgICAvLyBEZWNsYXJlIHRoYXQgd2UgZG9uJ3Qgd2FudCB0byByZWNlaXZlIGRhdGEgYW55bW9yZVxuICAgIHJldHVybiB0aGlzLmRldmljZS5jb250cm9sVHJhbnNmZXJPdXQoe1xuICAgICAgLy8gSXQncyBhIFVTQiBjbGFzcyByZXF1ZXN0XG4gICAgICAncmVxdWVzdFR5cGUnOiAnY2xhc3MnLFxuICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIG9mIHRoaXMgcmVxdWVzdCBpcyB0aGUgaW50ZXJmYWNlXG4gICAgICAncmVjaXBpZW50JzogJ2ludGVyZmFjZScsXG4gICAgICAvLyBDREM6IENvbW11bmljYXRpb24gRGV2aWNlIENsYXNzXG4gICAgICAvLyAweDIyOiBTRVRfQ09OVFJPTF9MSU5FX1NUQVRFXG4gICAgICAvLyBSUy0yMzIgc2lnbmFsIHVzZWQgdG8gdGVsbCB0aGUgVVNCIGRldmljZSB0aGF0IHRoZSBjb21wdXRlciBpcyBub3QgcHJlc2VudCBhbnltb3JlXG4gICAgICAncmVxdWVzdCc6IDB4MjIsXG4gICAgICAvLyBOb1xuICAgICAgJ3ZhbHVlJzogMHgwMSxcbiAgICAgIC8vIEludGVyZmFjZSAjMlxuICAgICAgJ2luZGV4JzogMHgwMlxuICAgIH0pXG5cbiAgICAvLyBDbG9zZSB0aGUgY29ubmVjdGlvbiB0byB0aGUgVVNCIGRldmljZVxuICAgIC50aGVuKCgpID0+IHRoaXMuZGV2aWNlLmNsb3NlKCkpXG4gIH1cbn1cbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdGlmKF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0pIHtcblx0XHRyZXR1cm4gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImNvbnN0IENvbnRyb2xsZXIgPSByZXF1aXJlKFwid2VidXNiLWRteDUxMi1jb250cm9sbGVyXCIpLmRlZmF1bHQ7XG4vLyBjb25zdCB1RE1YID0gcmVxdWlyZShcInVkbXhcIik7XG5cbmNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlcigpO1xuXG5jb25zb2xlLmxvZyhjb250cm9sbGVyKTtcblxudmFyIGV4YW1wbGUgPSBleGFtcGxlIHx8IHt9O1xuXG4oZnVuY3Rpb24gKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHRleGFtcGxlLkRNWENvbnRyb2xsZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0dGhpcy5vc2NQb3J0ID0gbmV3IG9zYy5XZWJTb2NrZXRQb3J0KHtcblx0XHRcdHVybDogXCJ3czovL2xvY2FsaG9zdDo4MDgxXCIsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmxpc3RlbigpO1xuXHRcdHRoaXMub3NjUG9ydC5vcGVuKCk7XG5cblx0XHR0aGlzLm9zY1BvcnQuc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhcIm1lc3NhZ2VcIiwgZSk7XG5cdFx0fTtcblxuXHRcdHRoaXMudmFsdWVNYXAgPSB7XG5cdFx0XHRcIi8xL3RvZ2dsZTFcIjogXCJETVggY2hhbm5lbCAxXCIsXG5cdFx0XHRcIi8xL2ZhZGVyMVwiOiBcIkRNWCBjaGFubmVsIDFcIixcblxuXHRcdFx0XCIvMS90b2dnbGUyXCI6IFwiRE1YIGNoYW5uZWwgMVwiLFxuXHRcdFx0XCIvMS9mYWRlcjJcIjogXCJETVggY2hhbm5lbCAxXCIsXG5cblx0XHRcdFwiLzEvdG9nZ2xlM1wiOiBcIkRNWCBjaGFubmVsIDFcIixcblx0XHRcdFwiLzEvZmFkZXIzXCI6IFwiRE1YIGNoYW5uZWwgMVwiLFxuXG5cdFx0XHRcIi8xL3RvZ2dsZTRcIjogXCJETVggY2hhbm5lbCAxXCIsXG5cdFx0XHRcIi8xL2ZhZGVyNFwiOiBcIkRNWCBjaGFubmVsIDFcIixcblx0XHR9O1xuXHR9O1xuXG5cdGV4YW1wbGUuRE1YQ29udHJvbGxlci5wcm90b3R5cGUubGlzdGVuID0gZnVuY3Rpb24gKCkge1xuXHRcdHRoaXMub3NjUG9ydC5vbihcIm1lc3NhZ2VcIiwgdGhpcy5tYXBNZXNzYWdlLmJpbmQodGhpcykpO1xuXHRcdHRoaXMub3NjUG9ydC5vbihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gKG1zZykge1xuXHRcdFx0Y29uc29sZS5sb2coXCJtZXNzYWdlXCIsIG1zZyk7XG5cdFx0fSk7XG5cdH07XG5cblx0ZXhhbXBsZS5ETVhDb250cm9sbGVyLnByb3RvdHlwZS5tYXBNZXNzYWdlID0gZnVuY3Rpb24gKG9zY01lc3NhZ2UpIHtcblx0XHQkKFwiI21lc3NhZ2VcIikudGV4dChmbHVpZC5wcmV0dHlQcmludEpTT04ob3NjTWVzc2FnZSkpO1xuXHR9O1xufSkoKTtcblxuY29uc3Qgc3RhcnRCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXJ0LWJ0blwiKTtcblxuc3RhcnRCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcblx0bGV0IGRldmljZTtcblx0Y29uc3QgVkVORE9SX0lEID0gMHgxNmMwO1xuXG5cdHRyeSB7XG5cdFx0ZGV2aWNlID0gYXdhaXQgbmF2aWdhdG9yLnVzYi5yZXF1ZXN0RGV2aWNlKHtcblx0XHRcdGZpbHRlcnM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZlbmRvcklkOiBWRU5ET1JfSUQsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0pO1xuXG5cdFx0Y29udHJvbGxlci5kZXZpY2UgPSBkZXZpY2U7XG5cblx0XHRjb25zb2xlLmxvZyhcIm9wZW5cIik7XG5cdFx0YXdhaXQgY29udHJvbGxlci5kZXZpY2Uub3BlbigpO1xuXHRcdGNvbnNvbGUubG9nKFwib3BlbmVkOlwiLCBjb250cm9sbGVyLmRldmljZSk7XG5cblx0XHQvL2lmIChjb250cm9sbGVyLmRldmljZS5jb25maWd1cmF0aW9uID09PSBudWxsKSB7XG5cdFx0Y29uc29sZS5sb2coXCJzZWxlY3RpbmcgY29uZmlnXCIpO1xuXHRcdGF3YWl0IGNvbnRyb2xsZXIuZGV2aWNlLnNlbGVjdENvbmZpZ3VyYXRpb24oMSk7XG5cdFx0Y29uc29sZS5sb2coXCJzZWxlY3RlZCBjb25maWc6IFwiLCBjb250cm9sbGVyLmRldmljZSk7XG5cdFx0Y29uc29sZS5sb2coXCJjbGFpbWluZyBpbnRlcmZhY2VcIik7XG5cdFx0YXdhaXQgY29udHJvbGxlci5kZXZpY2UuY2xhaW1JbnRlcmZhY2UoMCk7XG5cdFx0Y29uc29sZS5sb2coXCJpbnRlcmZhY2UgY2xhaW1lZDogXCIsIGNvbnRyb2xsZXIuZGV2aWNlKTtcblx0XHQvL31cblxuXHRcdGNvbnNvbGUubG9nKFwic2V0dGluZyBjb250cm9sIHRyYW5zZmVyIG91dFwiKTtcblx0XHRhd2FpdCBjb250cm9sbGVyLmRldmljZS5jb250cm9sVHJhbnNmZXJPdXQoe1xuXHRcdFx0Ly8gSXQncyBhIFVTQiBjbGFzcyByZXF1ZXN0XG5cdFx0XHRyZXF1ZXN0VHlwZTogXCJ2ZW5kb3JcIixcblx0XHRcdC8vIFRoZSBkZXN0aW5hdGlvbiBvZiB0aGlzIHJlcXVlc3QgaXMgdGhlIGludGVyZmFjZVxuXHRcdFx0cmVjaXBpZW50OiBcImVuZHBvaW50XCIsXG5cdFx0XHQvLyBDREM6IENvbW11bmljYXRpb24gRGV2aWNlIENsYXNzXG5cdFx0XHQvLyAweDIyOiBTRVRfQ09OVFJPTF9MSU5FX1NUQVRFXG5cdFx0XHQvLyBSUy0yMzIgc2lnbmFsIHVzZWQgdG8gdGVsbCB0aGUgVVNCIGRldmljZSB0aGF0IHRoZSBjb21wdXRlciBpcyBub3cgcHJlc2VudC5cblx0XHRcdHJlcXVlc3Q6IDB4ODAsXG5cdFx0XHQvLyBZZXNcblx0XHRcdHZhbHVlOiAweDAyLFxuXHRcdFx0Ly8gSW50ZXJmYWNlICMyXG5cdFx0XHRpbmRleDogMHgwMCxcblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZyhcImNvbnRyb2wgdHJhbnNmZXIgb3V0IHNldDogXCIsIGNvbnRyb2xsZXIuZGV2aWNlKTtcblxuXHRcdGF3YWl0IGNvbnRyb2xsZXIudXBkYXRlVW5pdmVyc2UoMSwgODApO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRjb25zb2xlLmVycm9yKFwiRVJST1I6IFwiLCBlcnIpO1xuXHR9XG5cdC8vIC8vIEVuYWJsZSBXZWJVU0IgYW5kIHNlbGVjdCB0aGUgQXJkdWlub1xuXHQvLyBjb25zb2xlLmxvZyhuYXZpZ2F0b3IudXNiLmdldERldmljZXMoKSk7XG5cdC8vIGNvbnRyb2xsZXIuZW5hYmxlKCkudGhlbigoKSA9PiB7XG5cdC8vIFx0Ly8gQ3JlYXRlIGEgY29ubmVjdGlvbiB0byB0aGUgc2VsZWN0ZWQgQXJkdWlub1xuXHQvLyBcdGNvbnRyb2xsZXIuY29ubmVjdCgpLnRoZW4oKCkgPT4ge1xuXHQvLyBcdFx0Ly8gVXBkYXRlIHRoZSAxIGNoYW5uZWwgb2YgdGhlIERNWDUxMiB1bml2ZXJzZSB3aXRoIHZhbHVlIDI1NVxuXHQvLyBcdFx0Y29udHJvbGxlci51cGRhdGVVbml2ZXJzZSgxLCAyNTUpO1xuXHQvLyBcdH0pO1xuXHQvLyB9KTtcbn0pO1xuXG5jb25zdCBkbXhDb250cm9sbGVyID0gbmV3IGV4YW1wbGUuRE1YQ29udHJvbGxlcigpO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==