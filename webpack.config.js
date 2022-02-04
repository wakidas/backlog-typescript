const { resolve } = require("path");

// module.exports = {
//   mode: "development",
//   target: "node",
//   entry: resolve(__dirname, "backlog.js"),
//   output: {
  //     filename: "index.js",
  //     path: resolve(__dirname, "dist1"),
  //   },
  //   module: {
    //     rules: [
      //       {
        //         test: /\.m?js$/,
        //         exclude: /node_modules/,
        //         use: {
          //           loader: "babel-loader",
          //         },
          //       },
          //     ],
          //   },
          // }
module.exports = {
  target: "node",
  mode: process.env.NODE_ENV || "development",
  devtool: "inline-source-map",
  entry: resolve(__dirname, "ts/index.ts"),
  output: {
    filename: "index.js",
    path: resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts/,
        use: {
          loader: "ts-loader",
        },
      },
    ],
  },
};
