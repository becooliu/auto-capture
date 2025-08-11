const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === "development";
  const outputPath = isDevelopment
    ? path.resolve(__dirname, "Extension/development")
    : path.resolve(__dirname, "Extension/production");

  return {
    entry: {
      "service-worker": "./src/background/service-worker.js",
      content: "./src/content/content.js",
      popup: "./src/popup/popup.js",
    },
    devtool: false,
    output: {
      path: outputPath,
      filename: "[name].js",
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(svg|png)$/,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [outputPath],
      }),
      new CopyPlugin({
        patterns: [
          {
            from: "src/manifest.json",
            to: ".",
          },
          {
            from: "src/popup/popup.html",
            to: "./popup/",
          },
          {
            from: "src/popup/popup.css",
            to: "./popup/",
          },
          {
            from: "src/icons",
            to: "./icons/",
          },
        ],
      }),
    ],
  };
};
