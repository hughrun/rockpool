// Migration script to migrate CommunityTweets MongoDB databases to new Rockpool structure

// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production, development, or test?
const debug = require('debug') // debug for development

// Mongo
const { MongoClient } = require('mongodb')
const assert = require('assert')
const url = `mongodb://${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}/${settings.mongo_db}`
const dbName = settings.mongo_db

// feedfinder
const { getSite } = require('@hughrun/feedfinder')

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

// TAGS
const prepareTags = function() {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const dropIds = function(db, callback) {
          db.collection('tags').find()
          .map(entry => {
            delete entry._id // remove _id
            return entry // return the record
          })
          .toArray(function(err, docs) {
          assert.equal(null, err)
          return callback(docs) // close the connection
        })
      }
      return dropIds(db, function(docs) {
        client.close()
        .then( () => {
          resolve( docs ) // resolve as an array of documents, now without valid _ids
        })
      })
    })
  })
}


// insert everything into a new collection
// because there is now no _id, this creates one, as an ObjectID
function migrateTags(records) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const update = function(db, callback) {
        return db.collection("rp_tags")
        .insertMany(records)
        .then( () => {
          callback() // close the connection
        })
      }
      update(db, function() {
        client.close().then( () => {
          console.log('Tags migration complete.')
          resolve() // resolve
        })
      })
    })
  })
}

// BLOGS
const prepareBlogs = function() {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const transform = function(db, callback) {
        db.collection("blogs")
        .find()
        .map(entry => {
          delete entry._id // remove old non-object _id
          entry.category = entry.type 
          delete entry.type // $rename 'type' to 'category'
          delete entry.author // delete author (we get author from posts)
          if (!entry.twHandle) {
            delete entry.twHandle // if twHandle is empty then delete it
          }
          if (entry.category === 'DH') {
            entry.category = 'digital humanities'
          }
          return entry
        })
        .toArray(function(err, docs) {
          assert.equal(null, err)
          callback(docs) // close the connection
        })
      }
      transform(db, function(docs) {
        client.close().then( () => {
          resolve( docs ) // resolve as an array of documents, now without valid _ids
        })
      })
    })
  })
  .catch( err => {
    console.log('ERROR PREPARING BLOGS')
    throw new Error(err)
  })
}

// Find title where possible, using feedfinder
function updateTitles(records) {
  console.log('Finding blog titles - this will take a few moments...')
  let promises = []
  for (let entry of records) {
    console.log(entry.feed)
    let record = getSite(entry.feed).catch( () => entry) // get the title or simply return the entry
    promises.push(record)
  }
  return Promise.all(promises)
  .then( result => {
    for (let res of result) {
      records.map( record => {
        if ( (record.feed === res.feed) && res.title) {
          record.title = res.title
        }
        return record
      }) 
    }
    console.log('Titles updated')
    return records
  })
}

// insert everything into a new collection
// because there is now no _id, this creates one, as an ObjectID
function migrateBlogs(records) {
  return new Promise( function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      assert.strictEqual(null, err)
      const db = client.db(dbName)
      const update = function(db, callback) {
        db.collection("rp_blogs")
        .insertMany(records)
        .then( () => {
          callback()
        })
        
      }
      update(db, function() {
        client.close()
        .then( () => {
          console.log('Blogs migration complete.')
          resolve()
        })
        .catch(err => reject(err))
      })
    })
  })
  .catch( err => {
    console.log('ERROR MIGRATING BLOGS')
    throw new Error(err)
  })
}

// ARTICLES
const prepareArticles = function() {
  return new Promise( function (resolve, reject) {
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
  .catch( err => {
    console.log('ERROR PREPARING ARTICLES')
    throw new Error(err)
  })
}

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
            // NOTE: other variations (e.g. www subdomains) will not be checked.
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
          callback() // close the connection
          resolve(records) // resolve update articles
        })
      }
      update(db, function() {
        client.close()
        debug.log('Article linking complete.')
      })
    })
  })
  .catch( err => {
    console.log('ERROR LINKING')
    throw new Error(err)
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
        callback(create) // close the connection
      }
      update(db, function(create) {
        client.close()
        debug.log('Articles migration complete.')
        resolve(create) // resolve
      })
    })
  })
  .catch( err => {
    console.log('ERROR MIGRATING ARTICLES')
    throw new Error(err)
  })
}

// combine the two user migration promises
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
          { $set: {
            pocket: {
              username: user.pocketName, 
              token: user.pocketToken
              }
            }
          },
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

// now run everything else
prepareTags()
.then(migrateTags)
.then(prepareBlogs)
.then(updateTitles)
.then(migrateBlogs)
.then(prepareArticles)
.then(LinkArticlesToBlogs)
.then(migrateArticles)
.catch( err => {
  console.log(err)
})