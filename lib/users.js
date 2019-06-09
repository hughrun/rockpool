// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production or development?

// Mongo
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

const getUserDetails = function(email) {
  return new Promise(function (resolve, reject) {

    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const findDocuments = function(db, callback) {
          const collection = db.collection('newusers') // TODO: change this to 'users' after migrating
          collection.findOne({email: email})
          .then( user => {
            if (user) {
              resolve({user: user, new: false})
            } else {
              // TODO: create new user if not in DB
              resolve({user: {email: email}, new: true})
            }
          })
          .then(callback)
        }
        // this actually calls everything above
        findDocuments(db, function() {
          client.close()
        })
    })
  })
}

const updateUserDetails = null

module.exports = {
  getUserDetails: getUserDetails
}