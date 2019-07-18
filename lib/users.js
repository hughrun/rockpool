// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production or development?
const debug = require('debug'), name = 'Rockpool' // debug for development

// Mongo
const { MongoClient, ObjectId} = require('mongodb')
const assert = require('assert')
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

const getUserDetails = function(email) {
  return new Promise(function (resolve, reject) {

    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const findDocuments = function(db, callback) {
          const collection = db.collection('rp_users')
          collection.findOne({email: email})
          .then( user => {
            if (user) {
              user.idString = user._id.valueOf() // we need the ID as a string to pass it back in updateUserDetails
              resolve({user: user, new: false})
            } else {
              // send back the email address for automatic inclusion in the form
              // we only actually add the user if they confirm they want to join up
              // this avoids adding addresses when people can't remember which one they used etc
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

const checkEmailIsUnique = function(user) {
  return new Promise(function (resolve, reject) {
    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const checkEmail = function(db, callback) {
          const collection = db.collection('rp_users')
          collection.findOne({email: user.email})
            .then(existing => {
              if (existing) {
                if (existing._id.valueOf() == user.id) { // use valueOf() to get ObjectId as a string
                  // it's the same user
                  resolve(user)
                } else {
                  // uh oh a different user already has that email address
                  // NOTE: this is a small security/privacy concern since we're confirming a particular email
                  // address is being used, but I can't see any other way to do it
                  reject({type: 'duplicateUser', user: user})
                }
              } else {
                // it's an update to the email address and the new one is unique
                resolve(user)
              }
            })
        }
        // call the function
        checkEmail(db, function() {
          client.close()
        })
    })
  })
}

const updateUserDetails = function(vals) {
  return new Promise(function (resolve, reject) {
    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const updateUser = function(db, callback) {
          const collection = db.collection('rp_users') 
          // search uses the _id rather than email address, otherwise if the email changes
          // it will either make a new user and leave the old one, or update an existing user
          // before updating we need to check if another user has the same email
          collection.updateOne(
            {
              _id: ObjectId(vals.id)
            },
            { $set: {
                email: vals.email, // what if there's another user with this email address?
                twitter: vals.twitter,
                mastodon: vals.mastodon
              }
            },
            {
              upsert: true
            }
          )
          .then( user => {
            resolve({user: user, new: false})
          })
          .then(callback)
        }
        // call the function
        updateUser(db, function() {
          client.close()
        })
    })
  })
}

module.exports = {
  getUserDetails: getUserDetails,
  updateUserDetails: updateUserDetails,
  checkEmailIsUnique: checkEmailIsUnique
}