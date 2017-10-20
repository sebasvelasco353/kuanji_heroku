var admin = require("firebase-admin");
var serviceAccount = require("./models/kuanji-64c62-firebase-adminsdk-nj9xx-56a9d1276d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://kuanji-64c62.firebaseio.com"
});

module.exports = admin;
