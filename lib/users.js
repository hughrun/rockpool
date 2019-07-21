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
          // so always run checkEmailIsUnique (from queries.js) in app.js routes
          matchQuery = vals.id ? { "_id" : ObjectId(vals.id) } : { "email" : vals.email}
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
// UPDATE BLOG INFO
// *************

// TODO: this needs to trigger an email to admins
/* TODO: 
make this a more generic update function so it can be used for:
  - claiming blogs (legacy)
  - registering blogs
  - approving blogs
  - rejecting blogs
  - deleting blogs

this will require
  - user _id
  - blog _id
  - action ($addToSet or $pull)
  - elements to apply to (however this could be implied by the action)

NOTE: the action could possibly be a URL query.
  e.g. /update-blog?action=approve

actions:
 - registering (or claiming) a blog will $addToSet for blogsForApproval
 - approving a blog will $pull from blogsForApproval and $addToSet for blogs
  - TODO: this will also potentially be used for approving blogs.updateURL() requests
 - rejecting a blog (or claim) will $pull from blogsForApproval 
  - and then run deleteBlogs() if blog.approved is false
 - deleting a blog will $pull from user.blogs 
  - and then deleteBlogs()

* claiming and registering require a check that the user is logged in
* approving, rejecting and deleting require a check that the user is logged in and is an admin
* these checks to be done in app.js at the appropriate time

- ownership is indicated in the user accounts, not the blogs
- claims cannot be made on owned blogs (though can on claimed blogs) 
    - i.e. if users.find({blogs: id}) then reject("Blog already has an owner")
*/

// add blog _id to user blogsForApproval array
/*
    vals.query is the Mongo query used to find the blog (if there was one)
    vals.user is the id of the user associated with the request (i.e. the owner or claimer)
    vals.blog is the blog id as a string
    vals.blogs is an array with a single document which is the blog info
    vals.action is one of register, approve, reject, or delete
*/
const updateBlog = function(vals) {
// const claimBlog = function(vals) {
  return new Promise(function (resolve, reject) {
    // vals.blog comes from all calls except claiming (legacy) which will provide vals.blogs
    const blog = vals.blog ? vals.blog : vals.blogs[0]._id
    if (!blog) {
      reject(`No blog found with URL ${vals.query.url}`) // this should only fail from a claiming URL search
    } else {
      MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
        assert.strictEqual(null, err)
        const db = client.db(dbName)
        const action = vals.action === "register" ? {$addToSet: { blogsForApproval: blog }}
          : vals.action === "approve" ? {$addToSet: { blogs: blog }, $pull: { blogsForApproval: blog }}
          : vals.action === "reject" ? {$pull: { blogsForApproval: blog }}
          : {$pull: { blogs: blog }} // if "delete"
          const updateUser = function(db, callback) {
            db.collection('rp_users').updateOne(
                {_id: ObjectId(vals.user)}, 
                action
                )
                .then( doc => {
                  assert.equal(doc.matchedCount, 1)
                  resolve(vals)
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
  updateUserDetails : updateUserDetails,
  updateBlog : updateBlog
}