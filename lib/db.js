const settings = require('../settings.json')
// Mongo
const { MongoClient } = require('mongodb')
const url = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db

// export connection and pool

let connection = null;

module.exports.connect = () => new Promise( (resolve, reject) => {
  function checkMongo() {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        if (err) { setTimeout(checkMongo, 5000)}
        const db = client.db(dbName)
        resolve(db);
        connection = db;
    })
  }
  setTimeout(checkMongo, 5000)
});

module.exports.get = () => {
    if ( !connection ) {
        throw new Error('Call connect first!');
    }
    return connection;
}