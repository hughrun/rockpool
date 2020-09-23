const settings = require('../settings.json')
// Mongo
const { MongoClient } = require('mongodb')
const url = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db
const options = { 
                  useNewUrlParser: true,
                  poolSize: 10,
                  useUnifiedTopology: true
                }

let connection = null

module.exports.connect = () => new Promise( (resolve, reject) => {
  function checkMongo() {
    MongoClient.connect(url, options, function(err, client) {
        if (err) { setTimeout(checkMongo, 5000)}
        const db = client.db(dbName)
        connection = db
        resolve()
    })
  }
  setTimeout(checkMongo, 5000)
});

module.exports.get = () => {
    if ( !connection ) {
        throw new Error('Call connect first!');
    }
    return connection
}