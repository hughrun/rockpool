// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production, development, or test?

// Mongo
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

// create admin user
const createAdmin = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    const db = client.db(dbName);

    // create text index for search to work
    const create = function(db, callback) {
      if (env != 'test') { // creating an admin user here causes issues with the test suite
        db.collection('rp_users').updateOne({
          email: settings[env].admin_user,
        },
        {
          $set: {permission: 'admin'}
        },
        {
          upsert: true
        })
      }
    callback() // close the connection
    }
    // this actually calls everything above
    create(db, function() {
      client.close()
      console.log('admin created')
      resolve()
    })
  })
})

// create collections
const createCollections = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    const db = client.db(dbName);

    // create text index for search to work
    const createCollection = function(db, callback) {
      db.createCollection('rp_announcements', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["scheduled", "type", "message"],
            properties: {
              scheduled: {
                bsonType: "Date",
                description: "Time announcement was added"
              },
              type: {
                enum: ["toot", "tweet"],
                description: "Announcement type: must only be one of toot or tweet"
              }, 
              message: {
                bsonType: "string",
                description: "the text of the announcement"
              }
            }
          }
        }
      }, function(err, result) {
        if (err) {
          resolve(err.codeName)
        } else {
          console.log('created collection')
        }
      })
    callback() // close the connection
    resolve()
    }

    // this actually calls everything above
    createCollection(db, function() {
      client.close()
    })
  })
})

// create indexes
const createIndexes = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
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
            reject(err.codeName)
          } else {
            console.log('tags index ok')

          }
        }
      )
    callback() // close the connection
    resolve('tags index ok')
    }

    // this actually calls everything above
    createArticleIndexes(db, function() {
      client.close()
    })
  })
})

// let's do this...
createAdmin
  .then(createCollections)
  .then(createIndexes)