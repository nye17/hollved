var path = require('path');
var webpack = require('webpack');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');

function replaceWith(stubFile) {
  return function(resource) {
    resource.request = path.resolve(__dirname, 'src/galaxy/render/' + stubFile);
  };
}

module.exports = {
  mode: 'production',
  entry: './src/wechat-bgs.jsx',
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

    // The shared renderer keeps a single implementation for both products, but
    // these expensive auxiliary modules are replaced at bundle time for the
    // standalone BGS viewer. The normal webpack config is untouched.
    new webpack.NormalModuleReplacementPlugin(
      /detailedGxyRenderer\.js$/,
      replaceWith('detailedGxyRenderer.wechat.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /solarRenderer\.js$/,
      replaceWith('solarRenderer.wechat.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /starField\.js$/,
      replaceWith('starField.wechat.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /labelLayer\.js$/,
      replaceWith('labelLayer.wechat.js')
    ),
    new webpack.NormalModuleReplacementPlugin(
      /radarStyle\.js$/,
      replaceWith('radarStyle.wechat.js')
    ),

    new MiniCssExtractPlugin({ filename: 'styles.css' })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
