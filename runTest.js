import Mocha from 'mocha';
import { expect } from 'chai';
import _ from 'lodash';
import requests from './reqData.json' assert {type: 'json'};
import MochaTestRunner from './mochaTestRunner.js';
import { flatten } from 'flat';
import { sendRequest, assertValueInRes, assertPathPresenceInRes, sortPaths, getVerifiedParentPaths, getVerifiedVariablePathsWithValues } from 'effortless_test_utils';
import axios from 'axios';

const getAssertArrayData = async (testData, envVarsString) => {
  const assertDataArray = [];
  const testExecutionData = {};
  testExecutionData.savedTestVarsWithValues = {};

  for(const [reqId, reqData] of Object.entries(testData.requests)) {
    const testResults = [];
    // TODO: should this be removed before the data comes to the cli runner?
    if (reqId === 'selectedReqId') continue;
    const {label, url, method, reqBody, headers, queryParams, parentPaths, variablePaths} = reqData;

    const savedTestVars = Object.keys(variablePaths)
      .filter((path) => variablePaths[path].saved)

    // TODO: if there are no saved vars and no verified parent, then we can skip the iteration
    // if (!isTest && savedTestVars.length === 0) return;

    const res = await sendRequest({ url, headers, queryParams, reqBody, method, envVarsString, savedTestVarsWithValues: testExecutionData.savedTestVarsWithValues})
    const resBody = res.data;
    const flattenedResBody = flatten({ root: resBody })
    const savedTestVarsWithValues = {};
    for(const testVarPath of savedTestVars) {
      if (flattenedResBody[testVarPath]) {
        // TODO: this testvarpath should contain reqId.
        savedTestVarsWithValues[`${label}.${testVarPath}`] = flattenedResBody[testVarPath];
      } else {
        console.log(`${testVarPath} not found in the resBody of ${reqId}. ResBody: `, resBody);
        // TODO: we should fail the test here since the saved test var wasn't found in the response
      }
    }

    _.merge(testExecutionData.savedTestVarsWithValues, savedTestVarsWithValues);

    // TODO: Also need to verify type of parent and variable
    // const verifiedParentPaths = Object.keys(parentPaths).filter((path) => parentPaths[path].verified);

    const verifiedParentPaths = getVerifiedParentPaths(parentPaths);
    const verifiedVariables = getVerifiedVariablePathsWithValues(variablePaths);
    const verifiedVariablePaths = Object.keys(verifiedVariables);

    const assertData = {};

    // TODO: write assertions for path presence
    // verifyPathsPresence(res.data, verifiedParentPaths, testResults);
    const sortedParentPathsToVerify = sortPaths(verifiedParentPaths);
    const parentPathPresence = sortedParentPathsToVerify.map(pathToVerify => ({resBody, pathToVerify}))

    // TODO: write assertions for path presence
    // verifyPathsPresence(res.data, verifiedVariablePaths, testResults)
    const sortedVariablePathsToVerify = sortPaths(verifiedVariablePaths);
    const variablePathPresence = sortedVariablePathsToVerify.map(pathToVerify => ({resBody, pathToVerify}))

    assertData.pathPresence = _.concat(parentPathPresence, variablePathPresence); // array

    // TODO: if the presence of a path is false, then all it's children will be false too (no need to check)
    // TODO: write assertions for variable values
    // verifyValues(res.data, verifiedVariables, testResults)
    assertData.variableValue = Object.keys(verifiedVariables).map(variablePath => ({resBody, variablePath, variableValue: verifiedVariables[variablePath].value}))

    assertDataArray.push(assertData);
  }
  return assertDataArray;
}

const runTest = async (userData) => {
  const { reqData, envData: {envVarsString} } = userData;

  const Test = Mocha.Test;
  const Suite = Mocha.Suite;
  const mocha = MochaTestRunner.getMochaInstance();

  const suite = Suite.create(mocha.suite, 'testsuite');

  const promises = Object.keys(reqData).map(async (fileId) => {
    const testData= reqData[fileId];
    if(!testData.test) return;

    const assertDataArray = await getAssertArrayData(testData, envVarsString);

    const test = new Test(testData.testname, () => {
      assertDataArray.forEach((assertData) => {
        assertData.pathPresence.forEach(({resBody, pathToVerify}) => {
          assertPathPresenceInRes(resBody, pathToVerify);
        });
        assertData.variableValue.forEach(({resBody, variablePath, variableValue}) => {
          assertValueInRes(resBody, variablePath, variableValue);
        });
      })
    });
    suite.addTest(test);
  });
  await Promise.all(promises);


  let result;
  try {
    result = await MochaTestRunner.runTests();
  } catch(err) {
    console.log('--->', err)
  }

  console.log(result)

}

// export { runTest };
// runTest({
//   testTitle: 'mytesttitle',
//   testDataRequests: requests,
//   envVarsString: JSON.stringify({ "jsonPlaceholderUrl": "https://jsonplaceholder.typicode.com"})
// });


(async () => {
  const res = await axios('http://localhost:8080/users');
  await runTest(res.data);
})();