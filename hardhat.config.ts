import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import { config as dotenvConfig } from "dotenv";
import "hardhat-gas-reporter";
import { HardhatUserConfig } from "hardhat/config";
import { HardhatNetworkUserConfig, NetworkUserConfig } from "hardhat/types";
import { resolve } from "path";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/deploy";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const chainIds = {
    arbitrumOne: 42161,
    optimism: 10,
    polygon: 137,
    ganache: 1337,
    goerli: 5,
    hardhat: 1337,
    localhost: 31337,
    kovan: 42,
    mainnet: 1,
    rinkeby: 4,
    ropsten: 3,
    sepolia: 11155111,
};

// Ensure that we have all the environment variables we need.
let mnemonic: string;
if (!process.env.MNEMONIC) {
    mnemonic = "test test test test test test test test test test test junk";
} else {
    mnemonic = process.env.MNEMONIC;
}

const forkMainnet = process.env.FORK_MAINNET === "true";

let alchemyApiKey: string | undefined;
if (forkMainnet && !process.env.ALCHEMY_API_KEY) {
    throw new Error("Please set process.env.ALCHEMY_API_KEY");
} else {
    alchemyApiKey = process.env.ALCHEMY_API_KEY;
}

function createTestnetConfig(network: keyof typeof chainIds): NetworkUserConfig {
    const networkUrls = {
        A: `https://rpc.sepolia.org/`,
        B: `https://eth-${network}.alchemyapi.io/v2/${alchemyApiKey}`,
    };
    const url = network === `sepolia` ? networkUrls.A : networkUrls.B;
    return {
        accounts: {
            count: 10,
            initialIndex: 0,
            mnemonic,
            path: "m/44'/60'/0'/0",
        },
        chainId: chainIds[network],
        url,
    };
}

function createHardhatConfig(): HardhatNetworkUserConfig {
    const config = {
        accounts: {
            mnemonic,
        },
        allowUnlimitedContractSize: true,
        chainId: chainIds.hardhat,
    };

    if (forkMainnet) {
        return Object.assign(config, {
            forking: {
                url: `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey}`,
                // blockNumber: 13837533,
            },
        });
    }

    return config;
}

function createMainnetConfig(): NetworkUserConfig {
    return {
        accounts: {
            mnemonic,
        },
        chainId: chainIds.mainnet,
        url: `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey}`,
    };
}

const optimizerEnabled = process.env.DISABLE_OPTIMIZER ? false : true;

const config: HardhatUserConfig = {
    defaultNetwork: "hardhat",
    etherscan: {
        apiKey: {
            arbitrumOne: process.env.ARBISCAN_API_KEY || "",
            avalanche: process.env.SNOWTRACE_API_KEY || "",
            bsc: process.env.BSCSCAN_API_KEY || "",
            mainnet: process.env.ETHERSCAN_API_KEY || "",
            goerli: process.env.ETHERSCAN_API_KEY || "",
            optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
            polygon: process.env.POLYGONSCAN_API_KEY || "",
            polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
            rinkeby: process.env.ETHERSCAN_API_KEY || "",
            sepolia: process.env.ETHERSCAN_API_KEY || "",
        },
    },
    gasReporter: {
        currency: "USD",
        enabled: process.env.REPORT_GAS == "true" ? true : false,
        excludeContracts: [],
        src: "./contracts",
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
        outputFile: process.env.REPORT_GAS_OUTPUT,
    },
    networks: {
        mainnet: createMainnetConfig(),
        hardhat: createHardhatConfig(),
        goerli: createTestnetConfig("goerli"),
        kovan: createTestnetConfig("kovan"),
        rinkeby: createTestnetConfig("rinkeby"),
        ropsten: createTestnetConfig("ropsten"),
        sepolia: createTestnetConfig("sepolia"),
        localhost: {
            accounts: {
                mnemonic,
            },
            chainId: chainIds.hardhat,
            gasMultiplier: 10,
        },
    },
    paths: {
        artifacts: "./artifacts",
        cache: "./cache",
        sources: "./contracts",
        tests: "./test",
    },
    solidity: {
        compilers: [
            {
                version: "0.8.18",
                settings: {
                    metadata: {
                        // Not including the metadata hash
                        // https://github.com/paulrberg/solidity-template/issues/31
                        bytecodeHash: "none",
                    },
                    // You should disable the optimizer when debugging
                    // https://hardhat.org/hardhat-network/#solidity-optimizer-support
                    optimizer: {
                        enabled: optimizerEnabled,
                        runs: 999999,
                    },
                    //viaIR: true, // experimental compiler feature to reduce stack 2 deep intolerance
                },
            },
        ],
    },
    typechain: {
        outDir: "src/types",
        target: "ethers-v5",
    },
};

export default config;
