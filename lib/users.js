/*

    This file is only for functions creating, updating, or deleting data in the rp_users collection.
    
    Functions for queries without modifying data should go in queries.js
    
    Do not change data from more than one collection in the same function.
    
    If you need to update two collections in the same action, chain Promises together to do it.
    This will usually happen in app.js

*/


// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production or development?
const debug = require('debug'), name = 'Rockpool' // debug for development

// Mongo
const { MongoClient, ObjectId} = require('mongodb')
const assert = require('assert')
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

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

// *************
// CLAIM BLOG - legacy DB only
// *************

// add blog _id to user claimedBlogs array
const claimBlog = function(vals) {
  return new Promise(function (resolve, reject) {
    // Use connect method to connect to the server
    if (!vals.blogs[0]) {
      reject(`No blog found with URL ${vals.query.url}`)
    } else {
      MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        assert.strictEqual(null, err)
        const db = client.db(dbName)
          const updateUser = function(db, callback) {
            db.collection('rp_users').updateOne(
                {_id: ObjectId(vals.user)}, 
                {$addToSet: { claimedBlogs: vals.blogs[0]._id }} // $addToSet only adds unique values unlike $push
                ).then( doc => {
                    assert.equal(doc.matchedCount, 1)
                    resolve()
                    callback()
                })
          }
          // call the function
          updateUser(db, function() {
              client.close()
          })
      })
    }
  })
}

module.exports = {
  updateUserDetails: updateUserDetails,
  claimBlog: claimBlog
}