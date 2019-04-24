// settings
const settings = require('./settings.json')
const env = process.env.NODE_ENV // are we in production or development?

// Mongo
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = `${settings[env].mongo_user}:${settings[env].mongo_password}@${settings[env].mongo_url}:${settings[env].mongo_port}`
const dbName = settings[env].mongo_db

// moment
const moment = require('moment');

// GET TOP TAGS
const getTopTags = new Promise( function (resolve, reject) {

  // Use connect method to connect to the server
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.strictEqual(null, err); // throws error if there is an error i.e. assert that error === null
    const db = client.db(dbName);

    const findDocuments = function(db, callback) {
      const collection = db.collection('articles'); // get the articles collection
      const now = moment();
      const recent = moment().subtract(60, 'days'); // get dates to include in our query
      collection.find({$and: [ {date: {$lte: new Date(now)}}, {date: {$gte: new Date(recent)}} ]})
      .toArray(function(err, docs) {
        assert.strictEqual(err, null); // check for errors
        const allTags = docs.map(x => x = x.categories) // remove everything from the article record except the tags
        .reduce((acc, arr) => acc.concat(arr)) // flatten the array
        .filter(tag => settings.filtered_tags.includes(tag) != true) // filter out system tags

        // make an object like {tag: number-of-times-used}
        const tagObj = {};
        for (x of allTags) {
          let transforms = Object.keys(settings.tag_transforms) // get the keys (tags to transform)
          if (transforms.includes(x)) { // check if the tag needs to be normalised
            x = settings.tag_transforms[x] // use the transform value instead of the original tag
          }
          tagObj[x] = (tagObj[x] + 1) || 1;
        }

        // now make an array like [{tag1: 18}, {tag2: 12}]
        const tagArray = new Array();
        for (t in tagObj) {
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
        const articles = db.collection('articles')

        // Depending on whether it's a text search or a tag browse, and whether the first page or not
        // we will have to craft the query differently, which is what everything between here
        // and collection.limit(10)... is doing

        var collection // declare this here to make things simpler later

        // check here that searchterm and tag are strings
        // if not, just make them null so we don't do anything dangerous to the DB
        // NOTE: not sure this is enough, or the best way to do this
        searchterm = typeof searchterm === 'string' ? searchterm : null
        tag = typeof tag === 'string' ? tag : null

        // normalise tag if there is a tag
        if (tag){
          for (x in settings.tag_transforms) {
            if (x === tag) { // if tag is in the special tags from settings.tag_transforms
              tag = settings.tag_transforms[x] // replace it with the specified replacement value
            }
          }
          // if tag includes any spaces or punctuation, replace with '.*'
          // this creates something akin to a LIKE search in SQL
          punctuation = /[\s!@#$%^&*()_=+\\|\]\[\}\{\-?/.>,<;:~`'"]+/gi
          tag = `.*${tag.replace(punctuation, '.*')}.*`
        }

        // is there a searchterm or tag at all? (if not, we just do an empty search: "{}")
        // if so, is this a tag browse (search categories)or a search query (search the text index)?
        var query = ( searchterm || tag ) ? tag ? {categories: {$regex: tag, $options: "si"}} :  { $text: { $search: searchterm} } : {}

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
        if (page) {
          collection = articles.find(query).skip(page*10) // if it's a paged result we want to skip all the results we already looked at
        } else {
          collection = articles.find(query)
          }
        // run the query
        collection.limit(10).sort({'date': -1}).toArray(function(err, docs) {
          assert.strictEqual(err, null); // check for errors
          processArticlesForView(docs) // add relative dates and URI encode searchterm/tag - this is called lower down
          docs.page = page + 1 // iterate the page number
          resolve({articles: docs, monthName: monthName}) // resolve promise with docs
          callback(); // close the connection once completed
        });
      }
      // this calls the function above and then closes the connection
      findDocuments(db, function() {
        client.close();
      })
		})
	})
}

// process articles for viewing, without changing anything in the DB
const processArticlesForView = function(docs){
  // clean up listings
  docs.map(x => {
    x.categories = x.categories
    .filter(tag => settings.filtered_tags.includes(tag) != true) // filter out system tags
    x.relativeDate = moment(x.date).fromNow(); // add a relative date on the fly
    // URI encode the tags for use in URLs
    x.categories = x.categories.map(t => {
      obj = {}
      obj.tag = t
      obj.encoded = encodeURIComponent(t) // Use encodeURIComponent so we encode valid path elements e.g. # ? /
      return obj
    })
    return x // return the documents to whatever called the function
  })
}

module.exports = {
  getTopTags: getTopTags,
  getArticles: getArticles
}