const path = require("path");

module.exports = {
	mode: "development",
	entry: "./web/dmxController.js",
	devtool: "inline-source-map",
	target: "node",
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: [
							[
								"@babel/preset-env",
								{
									targets: {
										esmodules: true,
									},
								},
							],
							"@babel/preset-react",
						],
					},
				},
			},
			{
				test: [/\.s[ac]ss$/i, /\.css$/i],
				use: [
					// Creates `style` nodes from JS strings
					"style-loader",
					// Translates CSS into CommonJS
					"css-loader",
					// Compiles Sass to CSS
					"sass-loader",
				],
			},
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".js", ".tsx", ".ts"],
	},
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "web"),
	},
};
