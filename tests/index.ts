import {
  logs,
  contract,
  reset,
  stateCache,
  contractEnv,
  setContractImport,
} from "@vsc.eco/contract-testing-utils";

// import { beforeEach, describe, it } from "mocha";
import { expect } from "chai";

const contractImport = import("../build/debug");

beforeAll(() => setContractImport(contractImport));

beforeEach(reset);

// function that replaces every property in the contractEnv object with the properties of the newEnv object

function replaceEnv(newEnv: any) {
  for (const key in newEnv) {
    contractEnv[key] = newEnv[key];
  }
}

function execForEnv(func: any, env: any, anchorId: string, ...args: any) {
  env["anchor.id"] = anchorId;
  replaceEnv(env);

  if (args.length > 0) {
    func(...args)
  } else {
    func()
  }
}

describe("hello-world", () => {
  it("should pass when `to` is 'test2'", () => {
    // arrange
    const envP1 = {
      "anchor.id": "",
      "anchor.block": "",
      "anchor.timestamp": 0,
      "anchor.height": 0,
  
      "msg.sender": "Platinium",
      "msg.required_auths": [],
      "tx.origin": "",
    };
    const envP2 = {
      "anchor.id": "",
      "anchor.block": "",
      "anchor.timestamp": 0,
      "anchor.height": 0,
  
      "msg.sender": "TheEnemie",
      "msg.required_auths": [],
      "tx.origin": "",
    };
    const anchorIds = ["ABC", "ABC", "ABC", "ABC", "ABC", "ABC", "ABC", "ABC"];

    // act
    execForEnv(contract.openGame, envP1, anchorIds[0]);

    execForEnv(contract.joinGame, envP2, anchorIds[1]);

    execForEnv(contract.play, envP1, anchorIds[2], 5);
    execForEnv(contract.play, envP2, anchorIds[3], 8);
    execForEnv(contract.play, envP1, anchorIds[4], 3);
    execForEnv(contract.play, envP2, anchorIds[5], 2);
    execForEnv(contract.play, envP1, anchorIds[6], 1);
    execForEnv(contract.play, envP2, anchorIds[7], 4);

    expect(stateCache.get('winner')).to.equal('TheEnemie:2');
  });
});