module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // ESLint 플러그인 제거 (경고 방지)
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
      return webpackConfig;
    },
  },
  devServer: (devServerConfig) => {
    // deprecated된 onBeforeSetupMiddleware와 onAfterSetupMiddleware 제거
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;

    // setupMiddlewares로 대체
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      return middlewares;
    };

    return devServerConfig;
  },
};
