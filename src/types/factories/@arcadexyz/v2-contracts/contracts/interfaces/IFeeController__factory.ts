/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  IFeeController,
  IFeeControllerInterface,
} from "../../../../../@arcadexyz/v2-contracts/contracts/interfaces/IFeeController";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_newFee",
        type: "uint256",
      },
    ],
    name: "UpdateOriginationFee",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_newFee",
        type: "uint256",
      },
    ],
    name: "UpdateRolloverFee",
    type: "event",
  },
  {
    inputs: [],
    name: "getOriginationFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getRolloverFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_originationFee",
        type: "uint256",
      },
    ],
    name: "setOriginationFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_rolloverFee",
        type: "uint256",
      },
    ],
    name: "setRolloverFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class IFeeController__factory {
  static readonly abi = _abi;
  static createInterface(): IFeeControllerInterface {
    return new utils.Interface(_abi) as IFeeControllerInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IFeeController {
    return new Contract(address, _abi, signerOrProvider) as IFeeController;
  }
}