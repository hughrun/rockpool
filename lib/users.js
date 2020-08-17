/*

    This file is only for functions creating, updating, or deleting data in the rp_users collection.
    
    Functions for queries without modifying data should go in queries.js
    
    Do not change data from more than one collection in the same function.
    
    If you need to update two collections in the same action, chain Promises together to do it.
    This will usually happen in app.js

*/

// imports+
const { ObjectId } = require('mongodb')
const assert = require('assert')
const db = require('./db')

const updateUserContacts = function(args) {
  return new Promise(function (resolve, reject) {
    // search uses req.user (original address) rather than args.email (new address)
    // NOTE: Always run checkEmailIsUnique (from queries.js) in app.js routes
    query = { 'email' : args.user }
    db.get().collection('rp_users')
    .updateOne(
      query,
      { $set: {
          email: args.email, 
          twitter: args.twitter,
          mastodon: args.mastodon
        }
      },
      { upsert: true}
    )
    .then( doc => { // doc here has no user data
      assert(doc.matchedCount === 1)
      // NOTE: pass original args back
      resolve({user: args, new: false, error: null})
    })
    .catch( err => {
      resolve({user: args, new: false, error: err})
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
    const action = ['approve', 'approve_claim', 'delete', 'register', 'reject'].includes(vals.action)
    if (!blog) {
      reject(`No blog found with URL ${vals.query.url}`) // this should only fail from a claiming URL search
    } else if (!action) {
      // if there is no recognised 'action', we don't know what to do
      // therefore reject the call with an error
      reject('No valid update action provided for blog')
    } else {
      const action = vals.action === 'register' ? {$addToSet: { blogsForApproval: blog }}
      : (vals.action === 'approve' || vals.action === 'approve_claim') ? {$addToSet: { blogs: blog }, $pull: { blogsForApproval: blog }}
      : vals.action === 'reject' ? {$pull: { blogsForApproval: blog }}
      : {$pull: { blogs: blog }} // 'delete'
      db.get().collection('rp_users').updateOne(
        {"email" : vals.user},
        action
      )
      .then( doc => {
        if (doc.result.nModified === 1) {
          resolve(vals)
        } else {
          throw new Error(`Could not ${vals.action} ${vals.blog} for ${vals.user}`)
        }
      })
      .catch(e => {
        reject(e)
      })
    }
  })
}

const updateUserPocket = function(args) {
  return new Promise(function (resolve, reject) {
    db.get().collection('rp_users').updateOne(
      { 'email' : args.user},
      { $set: {
          pocket: {
            token: args.token, 
            username: args.username
          }
        }
      }
    )
    .then( doc => {
      assert.equal(doc.modifiedCount,1)
      if (doc.modifiedCount) {
        resolve(args)
      } else {
        reject('Pocket account is already registered!')
      }
    })
    .catch( err => {
      reject(err)
    })
  })
}

const updateUserPocketFilters = function(args) {
  return new Promise(function (resolve, reject) {
    if (args.exclude) {
      db.get().collection('rp_users').updateOne(
        { 'email' : args.user},
        { $addToSet: {
            "pocket.excluded" : ObjectId(args.blog)
          }
        }
      )
      .then( doc => { // ignore the return value
        resolve(args) // return the original value
      })
      .catch( err => {
        reject(err)
      })
    } else if (args.exclude === false) {
      db.get().collection('rp_users').updateOne(
        { 'email' : args.user},
        { $pull: {
            "pocket.excluded" : ObjectId(args.blog)
          }
        }
      )
      .then( doc => { // ignore the return value
        resolve(args) // return the original value
      })
      .catch( err => {
        reject(err)
      })
    } else {
      throw new Error('No action supplied')
    }
  })
}

const unsubscribeFromPocket = function(email) {
  return new Promise(function (resolve, reject) {
    db.get().collection('rp_users').updateOne(
      {'email' : email},
      { $unset : { 'pocket' : ''} }
    )
    .then( doc => {
      assert.equal(doc.modifiedCount,1)
      resolve()
    })
    .catch( err => {
      reject(err)
    })
  })
}

const updateUserPermission = function(args) {
  return new Promise(function (resolve, reject) {
    db.get().collection('rp_users').updateOne(
      {'email' : args.user},
      {$set : {'permission' : args.permission}}
    )
    .then( doc => {
      if (doc.modifiedCount === 1) {
        resolve()
      } else if (doc.matchedCount === 0) {
        reject({message: `${args.user} is not a registered user`})
      } else {
        reject({message: 'User already has that permission set'})
      }
    })
    .catch( err => {
      reject(err)
    })
  })
}

module.exports = {
  updateUserContacts : updateUserContacts,
  updateUserBlogs : updateUserBlogs,
  updateUserPocket : updateUserPocket,
  updateUserPocketFilters: updateUserPocketFilters,
  unsubscribeFromPocket : unsubscribeFromPocket,
  updateUserPermission : updateUserPermission
}