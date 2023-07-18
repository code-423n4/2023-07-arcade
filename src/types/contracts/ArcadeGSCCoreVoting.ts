/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../common";

export declare namespace CoreVoting {
  export type VoteStruct = {
    votingPower: PromiseOrValue<BigNumberish>;
    castBallot: PromiseOrValue<BigNumberish>;
  };

  export type VoteStructOutput = [BigNumber, number] & {
    votingPower: BigNumber;
    castBallot: number;
  };
}

export interface ArcadeGSCCoreVotingInterface extends utils.Interface {
  functions: {
    "DAY_IN_BLOCKS()": FunctionFragment;
    "approvedVaults(address)": FunctionFragment;
    "authorize(address)": FunctionFragment;
    "authorized(address)": FunctionFragment;
    "baseQuorum()": FunctionFragment;
    "changeExtraVotingTime(uint256)": FunctionFragment;
    "changeVaultStatus(address,bool)": FunctionFragment;
    "deauthorize(address)": FunctionFragment;
    "execute(uint256,address[],bytes[])": FunctionFragment;
    "extraVoteTime()": FunctionFragment;
    "getProposalVotingPower(uint256)": FunctionFragment;
    "isAuthorized(address)": FunctionFragment;
    "lockDuration()": FunctionFragment;
    "minProposalPower()": FunctionFragment;
    "owner()": FunctionFragment;
    "proposal(address[],bytes[],address[],bytes[],uint256,uint8)": FunctionFragment;
    "proposalCount()": FunctionFragment;
    "proposals(uint256)": FunctionFragment;
    "quorums(address,bytes4)": FunctionFragment;
    "setCustomQuorum(address,bytes4,uint256)": FunctionFragment;
    "setDefaultQuorum(uint256)": FunctionFragment;
    "setLockDuration(uint256)": FunctionFragment;
    "setMinProposalPower(uint256)": FunctionFragment;
    "setOwner(address)": FunctionFragment;
    "vote(address[],bytes[],uint256,uint8)": FunctionFragment;
    "votes(address,uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "DAY_IN_BLOCKS"
      | "approvedVaults"
      | "authorize"
      | "authorized"
      | "baseQuorum"
      | "changeExtraVotingTime"
      | "changeVaultStatus"
      | "deauthorize"
      | "execute"
      | "extraVoteTime"
      | "getProposalVotingPower"
      | "isAuthorized"
      | "lockDuration"
      | "minProposalPower"
      | "owner"
      | "proposal"
      | "proposalCount"
      | "proposals"
      | "quorums"
      | "setCustomQuorum"
      | "setDefaultQuorum"
      | "setLockDuration"
      | "setMinProposalPower"
      | "setOwner"
      | "vote"
      | "votes"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "DAY_IN_BLOCKS",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "approvedVaults",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "authorize",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "authorized",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "baseQuorum",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "changeExtraVotingTime",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "changeVaultStatus",
    values: [PromiseOrValue<string>, PromiseOrValue<boolean>]
  ): string;
  encodeFunctionData(
    functionFragment: "deauthorize",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "execute",
    values: [
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<string>[],
      PromiseOrValue<BytesLike>[]
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "extraVoteTime",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getProposalVotingPower",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "isAuthorized",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "lockDuration",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "minProposalPower",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "proposal",
    values: [
      PromiseOrValue<string>[],
      PromiseOrValue<BytesLike>[],
      PromiseOrValue<string>[],
      PromiseOrValue<BytesLike>[],
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "proposalCount",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "proposals",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "quorums",
    values: [PromiseOrValue<string>, PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "setCustomQuorum",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "setDefaultQuorum",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "setLockDuration",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "setMinProposalPower",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "setOwner",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "vote",
    values: [
      PromiseOrValue<string>[],
      PromiseOrValue<BytesLike>[],
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "votes",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;

  decodeFunctionResult(
    functionFragment: "DAY_IN_BLOCKS",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "approvedVaults",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "authorize", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "authorized", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "baseQuorum", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "changeExtraVotingTime",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "changeVaultStatus",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deauthorize",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "execute", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "extraVoteTime",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getProposalVotingPower",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "isAuthorized",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "lockDuration",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "minProposalPower",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "proposal", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "proposalCount",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "proposals", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "quorums", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setCustomQuorum",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setDefaultQuorum",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setLockDuration",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setMinProposalPower",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setOwner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "vote", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "votes", data: BytesLike): Result;

  events: {
    "ProposalCreated(uint256,uint256,uint256,uint256)": EventFragment;
    "ProposalExecuted(uint256)": EventFragment;
    "Voted(address,uint256,tuple)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "ProposalCreated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ProposalExecuted"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Voted"): EventFragment;
}

export interface ProposalCreatedEventObject {
  proposalId: BigNumber;
  created: BigNumber;
  execution: BigNumber;
  expiration: BigNumber;
}
export type ProposalCreatedEvent = TypedEvent<
  [BigNumber, BigNumber, BigNumber, BigNumber],
  ProposalCreatedEventObject
>;

export type ProposalCreatedEventFilter = TypedEventFilter<ProposalCreatedEvent>;

export interface ProposalExecutedEventObject {
  proposalId: BigNumber;
}
export type ProposalExecutedEvent = TypedEvent<
  [BigNumber],
  ProposalExecutedEventObject
>;

export type ProposalExecutedEventFilter =
  TypedEventFilter<ProposalExecutedEvent>;

export interface VotedEventObject {
  voter: string;
  proposalId: BigNumber;
  vote: CoreVoting.VoteStructOutput;
}
export type VotedEvent = TypedEvent<
  [string, BigNumber, CoreVoting.VoteStructOutput],
  VotedEventObject
>;

export type VotedEventFilter = TypedEventFilter<VotedEvent>;

export interface ArcadeGSCCoreVoting extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: ArcadeGSCCoreVotingInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    DAY_IN_BLOCKS(overrides?: CallOverrides): Promise<[BigNumber]>;

    approvedVaults(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    authorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    authorized(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    baseQuorum(overrides?: CallOverrides): Promise<[BigNumber]>;

    changeExtraVotingTime(
      _extraVoteTime: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    changeVaultStatus(
      vault: PromiseOrValue<string>,
      isValid: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    deauthorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    execute(
      proposalId: PromiseOrValue<BigNumberish>,
      targets: PromiseOrValue<string>[],
      calldatas: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    extraVoteTime(overrides?: CallOverrides): Promise<[BigNumber]>;

    getProposalVotingPower(
      proposalId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[[BigNumber, BigNumber, BigNumber]]>;

    isAuthorized(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    lockDuration(overrides?: CallOverrides): Promise<[BigNumber]>;

    minProposalPower(overrides?: CallOverrides): Promise<[BigNumber]>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    proposal(
      votingVaults: PromiseOrValue<string>[],
      extraVaultData: PromiseOrValue<BytesLike>[],
      targets: PromiseOrValue<string>[],
      calldatas: PromiseOrValue<BytesLike>[],
      lastCall: PromiseOrValue<BigNumberish>,
      ballot: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    proposalCount(overrides?: CallOverrides): Promise<[BigNumber]>;

    proposals(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<
      [string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
        proposalHash: string;
        created: BigNumber;
        unlock: BigNumber;
        expiration: BigNumber;
        quorum: BigNumber;
        lastCall: BigNumber;
      }
    >;

    quorums(
      target: PromiseOrValue<string>,
      functionSelector: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    setCustomQuorum(
      target: PromiseOrValue<string>,
      selector: PromiseOrValue<BytesLike>,
      quorum: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setDefaultQuorum(
      quorum: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setLockDuration(
      _lockDuration: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setMinProposalPower(
      _minProposalPower: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setOwner(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    vote(
      votingVaults: PromiseOrValue<string>[],
      extraVaultData: PromiseOrValue<BytesLike>[],
      proposalId: PromiseOrValue<BigNumberish>,
      ballot: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    votes(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, number] & { votingPower: BigNumber; castBallot: number }
    >;
  };

  DAY_IN_BLOCKS(overrides?: CallOverrides): Promise<BigNumber>;

  approvedVaults(
    arg0: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  authorize(
    who: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  authorized(
    arg0: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  baseQuorum(overrides?: CallOverrides): Promise<BigNumber>;

  changeExtraVotingTime(
    _extraVoteTime: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  changeVaultStatus(
    vault: PromiseOrValue<string>,
    isValid: PromiseOrValue<boolean>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  deauthorize(
    who: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  execute(
    proposalId: PromiseOrValue<BigNumberish>,
    targets: PromiseOrValue<string>[],
    calldatas: PromiseOrValue<BytesLike>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  extraVoteTime(overrides?: CallOverrides): Promise<BigNumber>;

  getProposalVotingPower(
    proposalId: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<[BigNumber, BigNumber, BigNumber]>;

  isAuthorized(
    who: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  lockDuration(overrides?: CallOverrides): Promise<BigNumber>;

  minProposalPower(overrides?: CallOverrides): Promise<BigNumber>;

  owner(overrides?: CallOverrides): Promise<string>;

  proposal(
    votingVaults: PromiseOrValue<string>[],
    extraVaultData: PromiseOrValue<BytesLike>[],
    targets: PromiseOrValue<string>[],
    calldatas: PromiseOrValue<BytesLike>[],
    lastCall: PromiseOrValue<BigNumberish>,
    ballot: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  proposalCount(overrides?: CallOverrides): Promise<BigNumber>;

  proposals(
    arg0: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<
    [string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
      proposalHash: string;
      created: BigNumber;
      unlock: BigNumber;
      expiration: BigNumber;
      quorum: BigNumber;
      lastCall: BigNumber;
    }
  >;

  quorums(
    target: PromiseOrValue<string>,
    functionSelector: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  setCustomQuorum(
    target: PromiseOrValue<string>,
    selector: PromiseOrValue<BytesLike>,
    quorum: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setDefaultQuorum(
    quorum: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setLockDuration(
    _lockDuration: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setMinProposalPower(
    _minProposalPower: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setOwner(
    who: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  vote(
    votingVaults: PromiseOrValue<string>[],
    extraVaultData: PromiseOrValue<BytesLike>[],
    proposalId: PromiseOrValue<BigNumberish>,
    ballot: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  votes(
    arg0: PromiseOrValue<string>,
    arg1: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, number] & { votingPower: BigNumber; castBallot: number }
  >;

  callStatic: {
    DAY_IN_BLOCKS(overrides?: CallOverrides): Promise<BigNumber>;

    approvedVaults(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    authorize(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    authorized(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    baseQuorum(overrides?: CallOverrides): Promise<BigNumber>;

    changeExtraVotingTime(
      _extraVoteTime: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    changeVaultStatus(
      vault: PromiseOrValue<string>,
      isValid: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<void>;

    deauthorize(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    execute(
      proposalId: PromiseOrValue<BigNumberish>,
      targets: PromiseOrValue<string>[],
      calldatas: PromiseOrValue<BytesLike>[],
      overrides?: CallOverrides
    ): Promise<void>;

    extraVoteTime(overrides?: CallOverrides): Promise<BigNumber>;

    getProposalVotingPower(
      proposalId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber, BigNumber]>;

    isAuthorized(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    lockDuration(overrides?: CallOverrides): Promise<BigNumber>;

    minProposalPower(overrides?: CallOverrides): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<string>;

    proposal(
      votingVaults: PromiseOrValue<string>[],
      extraVaultData: PromiseOrValue<BytesLike>[],
      targets: PromiseOrValue<string>[],
      calldatas: PromiseOrValue<BytesLike>[],
      lastCall: PromiseOrValue<BigNumberish>,
      ballot: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    proposalCount(overrides?: CallOverrides): Promise<BigNumber>;

    proposals(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<
      [string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
        proposalHash: string;
        created: BigNumber;
        unlock: BigNumber;
        expiration: BigNumber;
        quorum: BigNumber;
        lastCall: BigNumber;
      }
    >;

    quorums(
      target: PromiseOrValue<string>,
      functionSelector: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setCustomQuorum(
      target: PromiseOrValue<string>,
      selector: PromiseOrValue<BytesLike>,
      quorum: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    setDefaultQuorum(
      quorum: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    setLockDuration(
      _lockDuration: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    setMinProposalPower(
      _minProposalPower: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    setOwner(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    vote(
      votingVaults: PromiseOrValue<string>[],
      extraVaultData: PromiseOrValue<BytesLike>[],
      proposalId: PromiseOrValue<BigNumberish>,
      ballot: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    votes(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, number] & { votingPower: BigNumber; castBallot: number }
    >;
  };

  filters: {
    "ProposalCreated(uint256,uint256,uint256,uint256)"(
      proposalId?: null,
      created?: null,
      execution?: null,
      expiration?: null
    ): ProposalCreatedEventFilter;
    ProposalCreated(
      proposalId?: null,
      created?: null,
      execution?: null,
      expiration?: null
    ): ProposalCreatedEventFilter;

    "ProposalExecuted(uint256)"(proposalId?: null): ProposalExecutedEventFilter;
    ProposalExecuted(proposalId?: null): ProposalExecutedEventFilter;

    "Voted(address,uint256,tuple)"(
      voter?: PromiseOrValue<string> | null,
      proposalId?: PromiseOrValue<BigNumberish> | null,
      vote?: null
    ): VotedEventFilter;
    Voted(
      voter?: PromiseOrValue<string> | null,
      proposalId?: PromiseOrValue<BigNumberish> | null,
      vote?: null
    ): VotedEventFilter;
  };

  estimateGas: {
    DAY_IN_BLOCKS(overrides?: CallOverrides): Promise<BigNumber>;

    approvedVaults(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    authorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    authorized(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    baseQuorum(overrides?: CallOverrides): Promise<BigNumber>;

    changeExtraVotingTime(
      _extraVoteTime: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    changeVaultStatus(
      vault: PromiseOrValue<string>,
      isValid: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    deauthorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    execute(
      proposalId: PromiseOrValue<BigNumberish>,
      targets: PromiseOrValue<string>[],
      calldatas: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    extraVoteTime(overrides?: CallOverrides): Promise<BigNumber>;

    getProposalVotingPower(
      proposalId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isAuthorized(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    lockDuration(overrides?: CallOverrides): Promise<BigNumber>;

    minProposalPower(overrides?: CallOverrides): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    proposal(
      votingVaults: PromiseOrValue<string>[],
      extraVaultData: PromiseOrValue<BytesLike>[],
      targets: PromiseOrValue<string>[],
      calldatas: PromiseOrValue<BytesLike>[],
      lastCall: PromiseOrValue<BigNumberish>,
      ballot: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    proposalCount(overrides?: CallOverrides): Promise<BigNumber>;

    proposals(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    quorums(
      target: PromiseOrValue<string>,
      functionSelector: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setCustomQuorum(
      target: PromiseOrValue<string>,
      selector: PromiseOrValue<BytesLike>,
      quorum: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setDefaultQuorum(
      quorum: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setLockDuration(
      _lockDuration: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setMinProposalPower(
      _minProposalPower: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setOwner(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    vote(
      votingVaults: PromiseOrValue<string>[],
      extraVaultData: PromiseOrValue<BytesLike>[],
      proposalId: PromiseOrValue<BigNumberish>,
      ballot: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    votes(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    DAY_IN_BLOCKS(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    approvedVaults(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    authorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    authorized(
      arg0: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    baseQuorum(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    changeExtraVotingTime(
      _extraVoteTime: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    changeVaultStatus(
      vault: PromiseOrValue<string>,
      isValid: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    deauthorize(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    execute(
      proposalId: PromiseOrValue<BigNumberish>,
      targets: PromiseOrValue<string>[],
      calldatas: PromiseOrValue<BytesLike>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    extraVoteTime(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getProposalVotingPower(
      proposalId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    isAuthorized(
      who: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    lockDuration(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    minProposalPower(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    proposal(
      votingVaults: PromiseOrValue<string>[],
      extraVaultData: PromiseOrValue<BytesLike>[],
      targets: PromiseOrValue<string>[],
      calldatas: PromiseOrValue<BytesLike>[],
      lastCall: PromiseOrValue<BigNumberish>,
      ballot: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    proposalCount(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    proposals(
      arg0: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    quorums(
      target: PromiseOrValue<string>,
      functionSelector: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    setCustomQuorum(
      target: PromiseOrValue<string>,
      selector: PromiseOrValue<BytesLike>,
      quorum: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setDefaultQuorum(
      quorum: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setLockDuration(
      _lockDuration: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setMinProposalPower(
      _minProposalPower: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setOwner(
      who: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    vote(
      votingVaults: PromiseOrValue<string>[],
      extraVaultData: PromiseOrValue<BytesLike>[],
      proposalId: PromiseOrValue<BigNumberish>,
      ballot: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    votes(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
