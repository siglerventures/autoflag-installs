// Cloud Functions entrypoint. Re-export each function here.
// Your existing askAI function lives in its own deployment; this folder only
// adds syncAccess. If you deploy them together, merge the exports.
exports.syncAccess = require("./syncAccess").syncAccess;
