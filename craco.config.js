const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env }) => {
      // ESLint 플러그인 제거 (경고 방지)
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );

      // 개발 모드 성능 최적화
      if (env === 'development') {
        // 캐시 활성화 (빌드 속도 향상)
        webpackConfig.cache = {
          type: 'filesystem',
          cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
        };

        // 소스맵 간소화 (메모리 사용량 감소)
        webpackConfig.devtool = 'cheap-module-source-map';

        // 불필요한 최적화 제거 (컴파일 속도 향상)
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
        };
      }

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
