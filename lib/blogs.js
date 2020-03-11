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
const url = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db



// *************
// APPROVE BLOG
// *************

// update blog info after approval of either a registration, an ownership claim (legacy), 
// or (in future) an update

const approveBlog = function(args) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      assert.equal(null, err)
      const db = client.db(dbName)
      const approve = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        try {
          blogs.updateOne(
            { 
              _id: ObjectId(args.blog)
            }, 
            {
              $set: {
                approved: true
              }
            }
          ).then( doc => {
            if (doc.modifiedCount === 0) {
              args.action = "approve_claim" // approving a claim (already 'approved')
            } else {
              args.action = "approve"  // approving a new blog (approved previously was false)
            } // this is for the rpUsers.updateUserBlogs call, if necessary
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

// *************
// REGISTER BLOG
// *************

// runs after feed-finder checks feed works and gets info
// should be followed by rpUsers.updateBlog() to add blog _id to user blogs array

const registerBlog = function(args) {
	return new Promise( function (resolve, reject) {
		MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
		  assert.equal(null, err)
      const db = client.db(dbName)
      const register = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        blogs.insertOne( 
          {
            approved : false,
            announced: false,
            url: args.url,
            title: args.title,
            feed: args.feed,
            category: args.category
          })
          .then( doc => { // set args.blog to the string value of blog _id and return
            args.blog = doc.insertedId.toString()
            resolve(args)
          })
          .catch( e => {
            reject(e)
          })
      }
      register(db, function() {
        client.close();
      })
		})
	})
}

// *************
// UPDATE DETAILS - allows users to update blog URL or category if it has migrated
// *************

/* 
    this is a TODO for a future version
    * check the URL for the feed using feedFinder
    * submit update request to admin
      (this is to avoid malilcious/duplicitous "updates" to spam sites etc)
    * actually update info once admin has approved
*/
const editBlog = function(args) {
	return new Promise( function (resolve, reject) {
		MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
		  assert.equal(null, err)
      const db = client.db(dbName)
      const register = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        blogs.updateOne( 
          {
            url: args.url // we can use this because it came out of the DB so redirects should not matter
          },
          {
            $set: {
              title: args.title,
              feed: args.feed,
              category: args.category
            }
          })
          .then( doc => { 
            assert.strictEqual(doc.modifiedCount, 1)
            callback(args)
          })
          .catch( e => {
            reject(e)
          })
      }
      register(db, function(args) {
        client.close()
        .then( () => {
          resolve(args)
        })
      })
		})
	})
}


// *************
// SUSPEND / UNSUSPEND BLOG
// *************

const suspendBlog = function(args) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      assert.equal(null, err)
      const db = client.db(dbName)
      const suspend = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        const now = new Date()
        // here we determine how to update the blog
        // if args.suspend is true we are suspending
        // if args.suspend is false we are unsuspending
        const values = args.suspend === true ? {
          $set: {
            suspended: true
          }
        }
        : {
          $set: {
            suspended: false,
            suspensionEndDate: now
          }
        }
        // update the blog
        blogs.updateOne(
          { 
            url: args.url
          }, 
          values
        )
        .then( doc => {
          assert.strictEqual(doc.modifiedCount, 1) // check something actually got updated
          resolve(args)
        })
        .catch(e => {
          reject(e)
        })
      }
      // call the function
      suspend(db, function() {
        client.close()
    })
    })
  })
}

// *************
// SET FAILING - called from feeds.js when feed fails
// *************

const setFailing = function(args) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
      assert.equal(null, err)
      const db = client.db(dbName)
      const toggle = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        // here we determine how to update the blog
        // if args.failing is true we are setting
        // if args.failing is false we are unsetting
        const values = args.failing === true ? {
          $set: {
            failing: true
          }
        }
        : {
          $set: {
            failing: false,
          }
        }
        // update the blog
        blogs.updateOne(
          { 
            url: args.url
          }, 
          values
        )
        .then( doc => {
          assert.strictEqual(doc.result.ok, 1) // check it went ok
          resolve(args)
        })
        .catch(e => {
          reject(e)
        })
      }
      // call the function
      toggle(db, function() {
        client.close()
    })
    })
  })
}

// *************
// DELETE BLOG - does what it says on the tin. Usually you want to run rpUsers.updateBlog first
// *************

const deleteBlog = function(args) {
	return new Promise( function (resolve, reject) {
		MongoClient.connect(url, { useNewUrlParser: true}, function(err, client) {
		  assert.equal(null, err)
      const db = client.db(dbName)
      const deleteDoc = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        blogs.deleteOne({_id: ObjectId(args.blog)})
          .then( doc => {
            assert(doc.deletedCount)
            resolve(args)
          })
          .catch( (e) => {
            reject(e)
          }) 
      }
      deleteDoc(db, function() {
        client.close();
      })
		})
	})
}

module.exports = {
  approveBlog : approveBlog,
  deleteBlog : deleteBlog,
  editBlog : editBlog,
  registerBlog : registerBlog,
  setFailing : setFailing,
  suspendBlog : suspendBlog
  }