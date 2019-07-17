// Migration script to migrate CommunityTweets MongoDB databases to new Rockpool structure

// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production or development?
const debug = require('debug'), name = 'Rockpool' // debug for development

// Mongo
const { MongoClient, ObjectID } = require('mongodb')
const assert = require('assert')
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

// USERS
// Only migrate if emails[0].verified is true
// Strip everything except for _id, and emails[0].address (renamed to 'email')
// Set 'permission' to 'admin'
const migrateUsers = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err)
    const db = client.db(dbName)

    // reduce the users collection to just the verified email addresses
    const users = function(db, callback) {
      const userArray = db.collection('users').find().map(record => {
        if (record.emails[0].verified) {
          return {email: record.emails[0].address, permission: "admin"}
        }
      })
      resolve(userArray.toArray()) // return the clean array
      callback() // close the connection
    }
    users(db, function() {
      client.close()
    })
  })
})

// POCKETS => users
// check username against users.email for upsert
// Older Pocket usernames may not be email addresses so those subscriptions won't be migrated
// They will just have to re-subscribe (or possibly we could send-to-pocket a special note?)
// upsert into users as pocket: {username, accessToken}
// Potentially we now have some duplicate users (pocket and blog owners)
// However using the email address as a primary identifier, this should be no problem for blogs
// And solvable for pocket accounts

const migratePockets = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    const db = client.db(dbName);

    // find pockets
    const pockets = function(db, callback) {
      const userArray = db.collection('pockets').find().map(record => {
        let regex = /((?=.*[a-z])(?=.*\.)(?=.*@).*)/
        let email = record.username.match(regex)
        if (email) {
          return {
            email: record.username,
            pocketName: record.username,
            pocketToken: record.accessToken
          }
        }
      })
      resolve(userArray.toArray()) // return the clean array
      callback() // close the connection
    }
    pockets(db, function() {
      client.close()
    })
  })
})

// merge pockets into users
Promise.all([migrateUsers, migratePockets]).then(x => {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    const db = client.db(dbName);
    const newUsers = db.collection('rp_users')

    function addPockets(callback) {
      const cleanPockets = x[1].filter( x => x != undefined)
      cleanPockets.forEach(user => {
        newUsers.updateOne(
          {email: user.email},
          {$set: {pocketName: user.pocketName, pocketToken: user.pocketToken}},
          {upsert: true}
          )
      })
      return callback()
    }

  // create new users collection and populate it
  // make sure they are in this order so the users are updated before pockets are upserted
    newUsers.insertMany(x[0]).then(
      addPockets(function() {
        debug.log('User migration complete.')
        client.close()
      })
    )
  })
})

// TAGS

const prepareTags = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err)
    const db = client.db(dbName)
    const dropIds = function(db, callback) {
        db.collection("tags").find().map(entry => {
        delete entry._id // remove _id
        return entry // return the record
      }).toArray(function(err, docs) {
        assert.equal(null, err)
        resolve( docs ) // resolve as an array of documents, now without valid _ids
        callback() // close the connection
      })
    }
    dropIds(db, function() {
      client.close()
    })
  })
})

// insert everything into a new collection
// because there is now no _id, this creates one, as an ObjectID
function migrateTags(records) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const update = function(db, callback) {
        const create = db.collection("rp_tags").insertMany(records)
        resolve(create) // resolve
        callback() // close the connection
      }
      update(db, function() {
        client.close()
        debug.log('Tags migration complete.')
      })
    })
  })
}

// BLOGS

const prepareBlogs = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err)
    const db = client.db(dbName)
    const transform = function(db, callback) {
        db.collection("blogs").find().map(entry => {
        delete entry._id // remove old non-object _id
        entry.category = entry.type 
        delete entry.type // $rename 'type' to 'category'
        delete entry.author // delete author (we get author from posts)
        if (!entry.twHandle) {
          delete entry.twHandle // if twHandle is empty then delete it
        }
        return entry // return the amended record
      }).toArray(function(err, docs) {
        assert.equal(null, err)
        resolve( docs ) // resolve as an array of documents, now without valid _ids
        callback() // close the connection
      })
    }
    transform(db, function() {
      client.close()
    })
  })
})

// insert everything into a new collection
// because there is now no _id, this creates one, as an ObjectID
function migrateBlogs(records) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const update = function(db, callback) {
        const create = db.collection("rp_blogs").insertMany(records)
        resolve(create) // resolve
        callback() // close the connection
      }
      update(db, function() {
        client.close()
        debug.log('Blogs migration complete.')
      })
    })
  })
}

// ARTICLES
// NOTE: run this AFTER blogs migration

const prepareArticles = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err)
    const db = client.db(dbName)
    const transform = function(db, callback) {
      db.collection("articles").find().map(entry => {
        delete entry._id // remove old non-object _id
        entry.tags = entry.categories;
        delete entry.categories; // rename 'categories' field name to 'tags' for consistency
        entry.blogTitle = entry.blog;
        delete entry.blog; // rename 'blog' to 'blogTitle'

        // strip any queries in blogLink url
        // i.e. http://url.com/@user?strip-this-out-including-question-mark)
        const regex = /([^?]*)+(\?)?(.*)/ig;
        const url = regex.exec(entry.blogLink);
        entry.blogLink = url[1]
        return entry // return the amended record
      }).toArray(function(err, docs) {
        assert.equal(null, err)
        resolve( docs ) // resolve as an array of documents, now without valid _ids
        callback() // close the connection
      })
    }
    transform(db, function() {
      client.close()
    })
  })
})

// now add a blog_id field if possible
function LinkArticlesToBlogs(records) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const update = function(db, callback) {
        
        db.collection("rp_blogs").find().toArray().then( blogs => {
          records.forEach( record => {
            // check against each article to see if the blogLink matches the url
            // run through regex to match regardless of http or https protocols
            // NOTE: other variations (e.g. www subdomains) will not be checked
            // for blogs where the url has changed, this will leave orphan articles
            const match = blogs.find( blog => {
              const regex = /(http(s)?:\/\/)(.*)/i
              const parsedArticle = regex.exec(record.blogLink)
              const parsedBlog = regex.exec(blog.url)
              return parsedArticle[3] === parsedBlog[3]
              })
            if (match) {
              record.blog_id = match._id // record the _id when there is a match
            }
          })
          resolve(records) // resolve update articles
          callback() // close the connection
        })
      }
      update(db, function() {
        client.close()
        debug.log('Article linking complete.')
      })
    })
  })
}

// insert everything into a new collection
// because there is now no _id, this creates one, as an ObjectID
function migrateArticles(records) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const update = function(db, callback) {
        const create = db.collection("rp_articles").insertMany(records)
        resolve(create) // resolve
        callback() // close the connection
      }
      update(db, function() {
        client.close()
        debug.log('Articles migration complete.')
      })
    })
  })
}

// TWEETS
// do not migrate

// UBLOGS
// do not migrate

// DELETE OLD COLLECTIONS
// make this a completely separate script to be called, just to be sure
// NOTE: if you use mongodump with the --collection flag to specify only the collections we want
// you can avoid having to subsequently dump collections we never needed

// NOTES FOR OTHER FUNCTIONALITY

// TODO: migration instructions should simply say deal with any unapproved blogs before migrating,
// to make things simpler

// ** linking blogs to owners
// link to owner on _id and use this for finding the social media accounts to mention
// i.e. the blog _id is listed in the user account once verified (array)
// and we check for ownership to grab their twitter and mastodon names

// ** claiming blogs
// this should just alert an admin and then you can check it out and decided whether it's legit
// rather than faffing around with rel=me etc

// NOTE: blogs already listed mostly have a twitter account already listed
// there needs to be backwards-compatibility so that the announce function uses the owner's twitter
// but falls back to the blog's twitter account listed on the blog itself if there is no verified owner
// if not twitter at all, use article author

// add a guid field to articles on ingest to avoid doubling up on ingest when post URLs are updated
// i.e. upsert the article lookig for a guid match, rather than inserting
// guid is the url if there is nothing else?

// link articles to blog using blog _id (i.e. article.blog_id) 
// so that if the blog URL changes we can still track it's the same blog
// when ingesting we already have access to the blog _id when iterating
// NOTE: is this a browse feature to add?

  // NOTE: if you migrate pockets and then test pocket, it will send to everyone on the list
  // with an email address so don't test until absolutely sure!
  // TODO: update users collection to drop out everyone except hugh@newcardigan.org

  // run the functions one after the other
prepareTags.then(migrateTags).catch(error => {
  debug.log(error)
})

prepareBlogs.then(migrateBlogs).catch(error => {
  debug.log(error)
})

// TODO: need this to run AFTER blogs
// adjust promises?
prepareArticles.then(LinkArticlesToBlogs)
  .then(migrateArticles)
  .catch(error => {
    debug.log(error)
  })