// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require('path');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('karma-junit-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      clearContext: false,
    },
    reporters: ['progress', 'kjhtml', 'coverage', 'junit'],
    junitReporter: {
      outputDir: 'reports',
      outputFile: 'junit.xml',
      useBrowserName: false,
    },
    coverageReporter: {
      dir: join(__dirname, 'reports'),
      reporters: [
        { type: 'cobertura', subdir: '.', file: 'coverage.xml' },
        { type: 'text-summary' },
      ],
      check: {
        global: {
          statements: 60,
          branches: 40,
          functions: 40,
          lines: 60,
        },
      },
    },
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
    },
    browsers: ['ChromeHeadless'],
    singleRun: true,
    restartOnFileChange: false,
  });
};
