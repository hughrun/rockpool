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

const updateUserContacts = function(vals) {
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
          // so always run checkEmailIsUnique (from queries.js) in app.js routes
          matchQuery = vals.id ? { '_id' : ObjectId(vals.id) } : { 'email' : vals.email}
          collection.updateOne(
            matchQuery,
            { $set: {
                email: vals.email, 
                twitter: vals.twitter,
                mastodon: vals.mastodon
              }
            },
            {
              upsert: true
            }
          )
          .then( doc => { // user here is just the callback from update: no user data
            resolve({user: vals, new: false, error: null})
          })
          .catch( err => {
            resolve({user: vals, new: false, error: err})
          })
          .then(callback) // does this actually run, give we've resolved already?
        }
        // call the function
        updateUser(db, function() {
          client.close()
        })
    })
  })
}

// *************
// UPDATE BLOG INFO
// *************

/*
    vals.query is the Mongo query used to find the blog (if there was one)
    vals.user is the id of the user associated with the request (i.e. the owner or claimer)
    vals.blog is the blog id as a string
    vals.blogs is an array with a single document which is the blog info
    vals.action is one of register, approve, reject, or delete
*/
const updateUserBlogs = function(vals) {
  return new Promise(function (resolve, reject) {
    // vals.blog comes from all calls, except for claiming (legacy) which will provide vals.blogs
    const blog = vals.blog ? ObjectId(vals.blog) : vals.blogs[0] ? vals.blogs[0]._id : false
    const action = ['approve', 'delete', 'register', 'reject'].includes(vals.action)
    if (!blog) {
      reject(`No blog found with URL ${vals.query.url}`) // this should only fail from a claiming URL search
    } else if (!action) {
      // if there is no recognised 'action', we don't know what to do
      // therefore reject the call with an error
      reject('No valid update action provided for blog')
    } else {
      MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        assert.strictEqual(null, err)
        const db = client.db(dbName)
        const updateUser = function(db, callback) {
          try {
            const action = vals.action === 'register' ? {$addToSet: { blogsForApproval: blog }}
            : vals.action === 'approve' ? {$addToSet: { blogs: blog }, $pull: { blogsForApproval: blog }}
            : vals.action === 'reject' ? {$pull: { blogsForApproval: blog }}
            : {$pull: { blogs: blog }} // 'delete'
            db.collection('rp_users').updateOne(
              {_id: ObjectId(vals.user)}, 
              action
            )
            .then( doc => {
              assert.equal(doc.matchedCount, 1)
              resolve(vals)
              callback()
            })
          } catch (e) {
            reject(e)
          }
        }
          // call the function
          updateUser(db, function() {
              client.close()
          })
      })
    }
  })
}

const updateUserPocket = function(args) {
  return new Promise(function (resolve, reject) {
    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const updateUser = function(db, callback) {
        db.collection('rp_users').updateOne(
          { 'email' : args.email},
          {$set: {pocket: {token: args.token, username: args.username}}}
        )
        .then( doc => {
          if (doc.modifiedCount) {
            resolve(args)
          } else {
            reject('Pocket account is already registered!')
          }
        })
        .catch( err => {
          reject(err)
        })
      }
      // call the function
      updateUser(db, function() {
        client.close()
      })
    })
  })
}

const unsubscribeFromPocket = function(email) {
  return new Promise(function (resolve, reject) {
    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const updateUser = function(db, callback) {
        db.collection('rp_users').updateOne(
          {'email' : email},
          {$unset : {'pocket' : ''}}
        )
        .then( doc => {
          if (doc.modifiedCount === 1) {
            resolve()
          } else {
            reject('User did not have a Pocket subscription!')
          }
        })
        .catch( err => {
          reject(err)
        })
      }
      updateUser(db, function() {
        client.close()
      })
    })
  })
}

const updateUserPermission = function(args) {
  return new Promise(function (resolve, reject) {
    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const updateUser = function(db, callback) {
        db.collection('rp_users').updateOne(
          {'email' : args.user},
          {$set : {'permission' : args.permission}}
        )
        .then( doc => {
          if (doc.modifiedCount === 1) {
            resolve()
          } else if (doc.matchedCount === 0) {
            reject(`${args.user} is not a registered user`)
          } else {
            reject('User already had that permission set')
          }
        })
        .catch( err => {
          reject(err)
        })
      }
      updateUser(db, function() {
        client.close()
      })
    })
  })
}

module.exports = {
  updateUserContacts : updateUserContacts,
  updateUserBlogs : updateUserBlogs,
  updateUserPocket : updateUserPocket,
  unsubscribeFromPocket : unsubscribeFromPocket,
  updateUserPermission : updateUserPermission
}