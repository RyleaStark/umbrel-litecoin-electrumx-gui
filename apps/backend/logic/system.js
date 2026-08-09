const constants = require("utils/const.js");
const NodeError = require("models/errors.js").NodeError;

async function getElectrumConnectionDetails() {
  try {
    const port = constants.ELECTRUM_PUBLIC_CONNECTION_PORT;

    const torAddress = constants.ELECTRUM_HIDDEN_SERVICE;
    const torConnectionString = `${torAddress}:${port}:t`;

    const localAddress = constants.ELECTRUM_LOCAL_SERVICE;
    const localConnectionString = `${localAddress}:${port}:t`;

    return {
      tor: {
        address: torAddress,
        port,
        connectionString: torConnectionString,
      },
      local: {
        address: localAddress,
        port,
        connectionString: localConnectionString,
      },
    };
  } catch (error) {
    throw new NodeError("Unable to get Electrum connection details");
  }
}

module.exports = {
  getElectrumConnectionDetails,
};
