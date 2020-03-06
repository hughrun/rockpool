// settings
const settings = require('../settings.json')
const env = process.env.NODE_ENV // are we in production, development, or test?

// for markdown pages
const fs = require('fs')
const path = require('path')
const showdown = require('showdown')

// Mongo
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = `${settings.mongo_user}:${settings.mongo_password}@${settings.mongo_url}:${settings.mongo_port}`
const dbName = settings.mongo_db

// create admin user
const createAdmin = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    const db = client.db(dbName);

    // create text index for search to work
    const create = function(db, callback) {
      if (env != 'test') { // creating an admin user here causes issues with the test suite
        db.collection('rp_users').updateOne({
          email: settings.admin_user,
        },
        {
          $set: {permission: 'admin'}
        },
        {
          upsert: true
        })
      }
    callback() // close the connection
    }
    // this actually calls everything above
    create(db, function() {
      client.close()
      console.log('admin created')
      resolve()
    })
  })
})

// create collections
const createCollections = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    const db = client.db(dbName);

    // create text index for search to work
    const createCollection = function(db, callback) {
      db.createCollection('rp_announcements', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["scheduled", "type", "message"],
            properties: {
              scheduled: {
                bsonType: "Date",
                description: "Time announcement was added"
              },
              type: {
                enum: ["toot", "tweet"],
                description: "Announcement type: must only be one of toot or tweet"
              }, 
              message: {
                bsonType: "string",
                description: "the text of the announcement"
              }
            }
          }
        }
      }, function(err, result) {
        if (err) {
          resolve(err.codeName)
        } else {
          console.log('created collection')
        }
      })
    callback() // close the connection
    resolve()
    }

    // this actually calls everything above
    createCollection(db, function() {
      client.close()
    })
  })
})

// create indexes
const createIndexes = new Promise( function (resolve, reject) {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err);
    const db = client.db(dbName);

    // create text index for search to work
    const createArticleIndexes = function(db, callback) {
      db.collection('rp_articles').createIndex(
        {
          blog: "text",
          tags: "text",
          title: "text"
        }, function(err, result) {
          if (err) {
            console.error(`Error with text index: ${err.codeName}`)
          }
          else {
            console.log('text index ok')
          }
        }
      )
      // create tags index within articles collection for faster tag browsing
      db.collection('rp_articles').createIndex(
        {
          tags : 1
        }, function(err, result) {
          if (err) {
            reject(err.codeName)
          } else {
            console.log('tags index ok')

          }
        }
      )
    callback() // close the connection
    resolve('tags index ok')
    }

    // this actually calls everything above
    createArticleIndexes(db, function() {
      client.close()
    })
  })
})

// process help.md into help.html
const processHelp = new Promise( function (resolve, reject) {
  // fs.readFileSync to grab markdown file
  let converter = new showdown.Converter()
  let filepath = path.resolve(__dirname, '../markdown')
  let text = fs.readFileSync(filepath + '/help.md', 'utf8')
  // use showdown to create html out of markdown
  let html = converter.makeHtml(text)
  // add header and footer includes markup
  let page =`
{>head}
  {>header}
  <section class="main">
    ${html}
  </section>
  {>footer}
{>foot}`
  // fs.writeFileSync to views folder
  filepath = path.resolve(__dirname, '../views')
  fs.writeFileSync(filepath + '/help.html', page)
  resolve()
})

// let's do this...
createAdmin
  .then(createCollections)
  .then(createIndexes)
  .then(processHelp)