// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production or development?

// Mongo
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

// create indexes
const createIndexes = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);

    // create text index for search to work
    const createArticleIndexes = function(db, callback) {
      db.collection('rp_articles').createIndex(
        {
          blog: "text",
          tags: "text",
          title: "text"
        }, function(err, result) {
          if (err) {
            console.error(`Error with text index: ${err.codeName}`)
          }
          else {
            console.log('text index ok')
          }
        }
      )
      // create tags index within articles collection for faster tag browsing
      db.collection('rp_articles').createIndex(
        {
          tags : 1
        }, function(err, result) {
          if (err) {
            resolve(err.codeName)
          } else {
            resolve('tags index ok')
          }
        }
      )
    callback() // close the connection
    }

    // this actually calls everything above
    createArticleIndexes(db, function() {
      client.close()
    })
  })
})

// let's do this...
createIndexes
  .then( function(msg){
    console.log(msg)
  })