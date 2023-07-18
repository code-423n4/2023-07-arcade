module.exports = {
    istanbulReporter: ["html", "lcov"],
    providerOptions: {
        mnemonic: process.env.MNEMONIC,
    },
    skipFiles: ["mocks", "test", "external"],
    configureYulOptimizer: true,
};
