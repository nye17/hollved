var path = require('path');
var webpack = require('webpack');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  entry: './src/main',
  output: {
    path: path.join(__dirname, 'build-wechat-bgs'),
    filename: 'app.js'
  },
  module: {
    rules: [{
      test: /\.jsx?$/,
      exclude: /node_modules/,
      use: 'babel-loader'
    }, {
      test: /\.less$/,
      use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader']
    }, {
      test: /\.(woff2?|eot|ttf|otf|svg)$/,
      type: 'asset/resource'
    }]
  },
  plugins: [
    new webpack.DefinePlugin({
      __HOLLVD_VARIANT__: JSON.stringify('wechat-bgs')
    }),
    new MiniCssExtractPlugin({ filename: 'styles.css' })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
