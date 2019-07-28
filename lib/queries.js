/*

    This file is only for non-mutating functions. Anything that simply retrieves data goes here.
    Generally this means functions that only use db.collection.find() or db.collection.findOne()

    If you are creating, updating, or deleting records, do not put that function in this file.

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

// moment
const moment = require('moment');

// process articles for viewing, without changing anything in the DB
const processArticlesForView = function(docs){
  // clean up listings
  docs.map(x => {
    x.tags = x.tags.filter(tag => settings.filtered_tags.includes(tag) != true) // filter out system tags
    x.relativeDate = moment(x.date).fromNow(); // add a relative date on the fly
    // URI encode the tags for use in URLs
    x.tags = x.tags.map(t => {
      obj = {}
      obj.tag = t
      obj.encoded = encodeURIComponent(t) // Use encodeURIComponent so we encode valid path elements e.g. # ? /
      return obj
    })
    return x // return the documents to whatever called the function
  })
}

// GET TOP TAGS
const getTopTags = new Promise( function (resolve, reject) {

  // Use connect method to connect to the server
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err); // throws error if there is an error i.e. assert that error === null
    const db = client.db(dbName);

    const findDocuments = function(db, callback) {
      const collection = db.collection('rp_articles'); // get the articles collection
      const now = moment();
      const recent = moment().subtract(60, 'days'); // get dates to include in our query
      collection.find({$and: [ {date: {$lte: new Date(now)}}, {date: {$gte: new Date(recent)}} ]})
      .toArray(function(err, docs) {
        assert.strictEqual(err, null); // check for errors
        const allTags = docs.length > 0 ? // are there any articles?
        docs.map(x => x = x.tags) // remove everything from the article record except the tags
        .reduce((acc, arr) => acc.concat(arr)) // flatten the array
        .filter(tag => settings.filtered_tags.includes(tag) != true) // filter out system tags
        : [] // if no articles just return an empty array (otherwise reduce will fail)
        // make an object like {tag: number-of-times-used}
        const tagObj = {};
        for (var x of allTags) {
          let transforms = Object.keys(settings.tag_transforms) // get the keys (tags to transform)
          if (transforms.includes(x)) { // check if the tag needs to be normalised
            x = settings.tag_transforms[x] // use the transform value instead of the original tag
          }
          tagObj[x] = (tagObj[x] + 1) || 1;
        }

        // now make an array like [{tag1: 18}, {tag2: 12}]
        const tagArray = []
        for (var t in tagObj) {
          tagArray.push({tag: t, total: tagObj[t]})
        }
        const sorted = tagArray.sort( (a, b) => b.total - a.total) // now we need to sort it
        var topTags = sorted.slice(0, 10) // and truncate to just the top 10
          topTags = topTags.map(t => {
            t.encoded = encodeURIComponent(t.tag) // URI encode the tags for safe use in URLs
            return t
          })
        resolve({tags: topTags}) // resolve promise with docs
        callback() // close the connection
      });
    }

    // this actually calls everything above
    findDocuments(db, function() {
      client.close()
    })
  })
})

// GET ARTICLES WITH TAG
const getArticles = function(tag, page, searchterm, month) {
	return new Promise( function (resolve, reject) {
    // Use connect method to connect to the server
		MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
		  assert.equal(null, err);
		  const db = client.db(dbName);
			const findDocuments = function(db, callback) {

        // Get the articles collection
        const articles = db.collection('rp_articles')

        // Depending on whether it's a text search or a tag browse, and whether the first page or not
        // we will have to craft the query differently, which is what everything between here
        // and collection.limit(10)... is doing

        var collection, hasNext // declare these here to make things simpler later

        // check here that searchterm and tag are strings
        // if not, just make them null so we don't do anything dangerous to the DB
        // NOTE: not sure this is enough, or the best way to do this
        searchterm = typeof searchterm === 'string' ? searchterm : null
        tag = typeof tag === 'string' ? tag : null

        // normalise tag if there is a tag
        if (tag){
          for (var x in settings.tag_transforms) {
            if (x === tag) { // if tag is in the special tags from settings.tag_transforms
              tag = settings.tag_transforms[x] // replace it with the specified replacement value
            }
          }
          // if tag includes any spaces or punctuation, replace with '.*'
          // this creates something akin to a LIKE search in SQL
          punctuation = /[\s!@#$%^&*()_=+\\|\]\[\}\{\-?\/\.>,<;:~`'"]/gi
          tag = `.*${tag.replace(punctuation, '.*')}.*`
        }

        // is there a searchterm or tag at all? (if not, we just do an empty search: "{}")
        // if so, is this a tag browse (search tags) or a search query (search the text index)?
        var query = ( searchterm || tag ) ? tag ? {tags: {$regex: tag, $options: "si"}} :  { $text: { $search: searchterm} } : {}

        // is this query restricted to 'this month' or 'last month'?
        if (month) {
          let thisMonth = moment().startOf('month')
          let lastMonth = moment().startOf('month').subtract(1, 'months')
          let dateQuery = month === '0' ? {date: {$gte: new Date(thisMonth)}} : {$and: [ {date: {$lte: new Date(thisMonth)}}, {date: {$gte: new Date(lastMonth)}} ]}
          // Get the name of the month to use in the UI
          var monthName = month === '0' ? moment().format('MMMM') : moment().subtract(1, 'months').format('MMMM')
          query = {$and: [ query, dateQuery ]};
        }
        // construct the query string
        if (page && Number(page) > 0) {
          collection = articles.find(query).skip(page*10) // if it's a paged result we want to skip all the results we already looked at
          hasPage = true
        } else {
          collection = articles.find(query)
          hasPage = false
          }
        // run the query
        collection.limit(10).sort({'date': -1}).toArray(function(err, docs) {
          assert.strictEqual(err, null); // check for errors
          processArticlesForView(docs) // add relative dates and URI encode searchterm/tag - this is called lower down
          docs.page = page + 1 // iterate the page number

          // check if there are next queries
          if (hasPage) {
            hasNext = articles.find(query).skip((page*10)+10).hasNext() // are there more on the page after this one?
            hasPrev = true // if page > 0 there must be previous results
          } else {
            hasNext = articles.find(query).skip(10).hasNext() // are there more on the page after this one?
            hasPrev = false // if the page is nonexistent or zero, there can't be previous results
          }
          // articles.find() is a Promise, so we need to use hasNext.then() to get the result
          hasNext
          .then( function(x) {
            hasNext = x
            hasNext = hasNext ? true : false
            resolve(
              {
                articles: docs,
                monthName: monthName,
                hasNext: hasNext,
                hasPrev: hasPrev
              }
              ) // resolve promise with docs
            callback(); // close the connection once completed
          })
        });
      }
      // this calls the function above and then closes the connection
      findDocuments(db, function() {
        client.close();
      })
		})
	})
}

// GET BLOGS
// Use args so we can use the same function for all blogs, unclaimed blogs, problem blogs etc
// args.query is always the actual query, args can have any other values as well
// these aren't used in this function but allow Promise chaining
const getBlogs = function(args) {
	return new Promise( function (resolve, reject) {
    // Use connect method to connect to the server
		MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
		  assert.equal(null, err);
		  const db = client.db(dbName);
			const findDocuments = function(db, callback) {
        const blogs = db.collection('rp_blogs')
        blogs.find(args.query).sort({'url': 1}).toArray(function(err, docs) {
          if (docs) {
            docs.map( doc => {
              doc.idString = doc._id.valueOf() // we need each ID as a string for HTML forms
              return doc
            })
            args.blogs = docs
          } else {
            args.blogs = [] // if there are no results from the query send an empty array
          }
          resolve(args)
          callback()
        })
      }
      // this calls the function above and then closes the connection
      findDocuments(db, function() {
        client.close();
      })
		})
	})
}

// Get user details when they log in
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
            if (user && user._id) { // brand new users don't have an _id yet.
              user.idString = user._id.valueOf() // we need the ID as a string to pass it back in updateUserContacts
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

const checkEmailIsUnique = function(args) {
  return new Promise(function (resolve, reject) {
    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const checkEmail = function(db, callback) {
          const collection = db.collection('rp_users')
          collection.findOne({email: args.email})
            .then(existing => {
              if (existing && existing._id) { // brand new users don't have an _id yet.
                if (existing._id.valueOf() == args.user) { // use valueOf() to get ObjectId as a string
                  // it's the same user
                  resolve(args)
                } else {
                  // uh oh a different user already has that email address
                  // NOTE: this is a small security/privacy concern since we're confirming a particular email
                  // address is being used, but I can't see any other way to do it
                  reject(`${args.email} is already being used`)
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

// get multiple users from a query
const getUsers = function(args) {
  return new Promise(function (resolve, reject) {

    // Use connect method to connect to the server
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err);
      const db = client.db(dbName);
        const findDocuments = function(db, callback) {
          const users = db.collection('rp_users')
          users.find(args.query).toArray()
          .then( docs => {
            args.users = docs
            resolve(args)
            callback()
          })
        }
        // this actually calls everything above
        findDocuments(db, function() {
          client.close()
        })
    })
  })
}

module.exports = {
  getTopTags: getTopTags,
  getArticles: getArticles,
  getBlogs: getBlogs,
  getUserDetails: getUserDetails,
  checkEmailIsUnique: checkEmailIsUnique,
  getUsers: getUsers
}