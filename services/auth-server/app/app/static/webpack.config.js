const path = require("path");

module.exports = {
  entry: "./js/src/main.js",
  mode: "development",
  watch: false,
  devtool: "eval-cheap-source-map",
  output: {
    path: path.resolve(__dirname, "js/dist"),
    filename: "main.bundle.js",
  },
  optimization: {
    removeAvailableModules: false,
    removeEmptyChunks: false,
    splitChunks: false,
  },
  module: {
    rules: [
      {
        use: [
          {
            loader: "cache-loader",
          },
          {
            loader: "babel-loader",
            query: {
              presets: ["@babel/preset-env"],
            },
          },
        ],
        include: path.resolve(__dirname, "js"),
      },
    ],
  },
  resolve: {
    extensions: [".js"],
    symlinks: false,
  },
};
