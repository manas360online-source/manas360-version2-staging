const { StandardCheckoutClient, Env } = require("@phonepe-pg/pg-sdk-node");
const client = StandardCheckoutClient.getInstance('a','b',1, Env.SANDBOX);
console.log(typeof client.validateCallback);
