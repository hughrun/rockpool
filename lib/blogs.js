/*

    This file is only for functions creating, updating, or deleting data in the rp_blogs collection.
    
    Functions for queries without modifying data should go in queries.js
    
    Do not change data from more than one collection in the same function.
    
    If you need to update two collections in the same action, chain Promises together to do it.
    This will usually happen in app.js

*/

const debug = require('debug')
// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production or development?

// Mongo
const { MongoClient, ObjectId} = require('mongodb')
const assert = require('assert');
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db



// *************
// APPROVE BLOG
// *************

// update blog info after approval of either a registration, an ownership claim (legacy), or an update

// in BLOGS:

// $set owner: to user._id (only actually required for claims)
// $set approved: true
const approveBlog = function(args) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.equal(null, err)
      const db = client.db(dbName)
      const approve = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        try {
          blogs.updateOne(
            { 
              _id: args.blog
            }, 
            {
              $set: {
                owner: args.user, 
                approved: true
              }
            }
          ).then( doc => {
            args.action = "approve"
            resolve(args)
          })
        } catch (e) {
          reject(e)
        }
      }
      // call the function
      approve(db, function() {
        client.close()
    })
    })
  })
}
// then IN USERS:
// remove blog _id from user blogsForApproval array

// *************
// REGISTER BLOG
// *************

// runs after feed-finder checks feed works and gets info

// add blog to blogs collection with approved: false

// add blog _id to user blogs array

// *************
// UPDATE URL - allows users to update blog URL if it has migrated
// *************

// submit update request to admin
// (this is to avoid malilcious/duplicitous "updates" to spam sites etc)

// actually update info once admin has approved

// *************
// DELETE BLOG - does what it says on the tin. Usually you want to run rpUsers.updateBlog first
// *************

const deleteBlog = function(args) {
	return new Promise( function (resolve, reject) {
		MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
		  assert.equal(null, err)
      const db = client.db(dbName)
      const deleteDoc = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        blogs.deleteOne({_id: ObjectId(args.blog)})
          .then(resolve)
      }
      deleteDoc(db, function() {
        client.close();
      })
		})
	})
}

module.exports = {
  approveBlog : approveBlog,
  deleteBlog : deleteBlog
  }