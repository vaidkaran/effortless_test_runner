import Mocha from "mocha";

export default class MochaTestRunner {
  static #mocha = new Mocha({
    timeout: 60000,
    reporter: 'mochawesome',
    reporterOptions: {
      reportFilename: 'customReportFilename',
      quiet: true,
    },
  });

  static getMochaInstance = () => MochaTestRunner.#mocha;

  static runTests = () => {
    return new Promise((resolve, reject) => {
      MochaTestRunner.#mocha.run((failures) => {
        if (failures) reject('at least one test is failed, check detailed execution report')
        resolve('success')
      });
    });
  }
}

