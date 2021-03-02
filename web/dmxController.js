const Controller = require("webusb-dmx512-controller").default;
// const uDMX = require("udmx");

const controller = new Controller();

console.log(controller);

var example = example || {};

(function () {
	"use strict";

	example.DMXController = function () {
		this.oscPort = new osc.WebSocketPort({
			url: "ws://localhost:8081",
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
			"/1/fader4": "DMX channel 1",
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

const startBtn = document.getElementById("start-btn");

startBtn.addEventListener("click", async () => {
	let device;
	const VENDOR_ID = 0x16c0;

	try {
		device = await navigator.usb.requestDevice({
			filters: [
				{
					vendorId: VENDOR_ID,
				},
			],
		});

		controller.device = device;

		console.log("open");
		await controller.device.open();
		console.log("opened:", controller.device);

		//if (controller.device.configuration === null) {
		console.log("selecting config");
		await controller.device.selectConfiguration(1);
		console.log("selected config: ", controller.device);
		console.log("claiming interface");
		await controller.device.claimInterface(0);
		console.log("interface claimed: ", controller.device);
		//}

		console.log("setting control transfer out");
		await controller.device.controlTransferOut({
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
			index: 0x00,
		});
		console.log("control transfer out set: ", controller.device);

		await controller.updateUniverse(1, 80);
	} catch (err) {
		console.error("ERROR: ", err);
	}
	// // Enable WebUSB and select the Arduino
	// console.log(navigator.usb.getDevices());
	// controller.enable().then(() => {
	// 	// Create a connection to the selected Arduino
	// 	controller.connect().then(() => {
	// 		// Update the 1 channel of the DMX512 universe with value 255
	// 		controller.updateUniverse(1, 255);
	// 	});
	// });
});

const dmxController = new example.DMXController();
