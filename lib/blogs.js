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
// APPROVE CLAIM - legacy DB only
// *************

// set owner: user._id to blog

// then IN USERS:
// remove blog _id from user claimedBlogs array

// *************
// REGISTER BLOG
// *************

// runs after feed-finder checks feed works and gets info

// add blog to blogs collection with approved: false

// add blog _id to user blogs array

// *************
// UPDATE BLOG - allows users to update blog details
// *************

// submit update request to admin
// (this is to avoid malilcious/duplicitous "updates" to spam sites etc)

// actually update info once admin has approved

// *************
// APPROVE BLOG
// *************

// update blog info after approval of either a registration or an update

// upsert data
// set approved: true

module.exports = {
    
  }