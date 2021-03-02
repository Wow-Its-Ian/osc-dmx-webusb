const Controller = require("webusb-dmx512-controller").default;
const uDMX = require("udmx");

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

startBtn.addEventListener("click", (e) => {
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

const dmxController = new example.DMXController();
