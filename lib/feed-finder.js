const cheerio = require('cheerio')
const feedparser = require('feedparser-promised')

const rejectCallback = function(e) {
  return {error: {message: e.message, url: e.config.url}}
}

const returnFeedInfo = function(args) {
  // extract the base domain URL using a regex
  var baseURL = /(.+(\/+){2})+(\w|\d|\.|-)*/.exec(args.url)[0];
  // if the feed address is relative we need to add it to the base domain URL
  var feed = /^http/.test(args.feed) ? args.feed : `${baseURL}${args.feed}`;
  args.feed = feed; // update feed address
  return args
}

const parseFeedFromSite = function(args) {
	return new Promise( (resolve, reject) => {
    const $ = cheerio.load(args.body)
    const titleElem = $('title').clone() // get the head <title> element
    // get the RSS or Atom feed element
    const rss = $('link[type="application/rss+xml"]').clone()
    const atom = $('link[type="application/atom+xml"]').clone()
    const elem = rss ? rss : atom // If rss exists assign its value to elem, otherwise assign the value of atom
    // elem may be null or not have any child nodes if there is no feed listed in the head
    if (!elem[0] || !elem) {
      // sometimes there *is* a feed but it's not listed in the head.
      // in this case look for any link element that might be a link to the feed
      $('a').each(function(i, e) {
        const anchor = $(this)[0].attribs.href // look for <a> elements
        if (anchor) {
          const regexString = RegExp('(' + args.url + '|^(?!http)).*\/?(feed\/?|rss\/?|rss2\/?|atom\/?|(rss|atom|rss2|feed)+.xml?)$')
          var regex = RegExp(regexString, 'ig')
          const isFeed = $(this)[0].attribs.href.match(regex) // if the last section of the URL ends in atom, rss, rss2, feed or any of those + '.xml', it's the feed
          if (isFeed) {
            let feed = $(this)[0].attribs.href
            let title = titleElem[0].children[0].data
            resolve({feed: feed, title: title, url: args.url})
          }
        }
      })
      // if there wasn't any feed link there's no other way to automatically find the feed
      reject({code: 'NOFEED', message: `No link to RSS or Atom feed found at this URL`, config: {url: args.url}})
    } else {
      let feed = elem[0].attribs.href // get the feed and title from the rss link element
      // Get the title and if the link element doesn't have a title, grab the title from the page itself
      let title = elem[0].attribs.title ? elem[0].attribs.title : titleElem[0].children[0].data;
      resolve({feed: feed, title: title, url: args.url})
    }
	})
}

const checkFeedLinkValidity = function(uri) {
  return new Promise( (resolve, reject) => {
    const httpOptions = {
      uri: uri,
      timeout: 10000
    }

    function feedValid(items) {
      resolve({ok: true, error: null})
    }

    function feedInvalid(e) {
      // if the error code is "ENOTFOUND" provide a nicer message, else just show the error message
      // note that if feedparser just can't parse it, it will return a message of "Not a feed"
      const reason = e.code === "ENOTFOUND" ? "URL does not exist" : e.message
      resolve({ok: false, error: reason})
    }

    feedparser.parse(httpOptions).then(feedValid, feedInvalid)

  })
}


/* =====================================================

examples of how you would call feed-finder from app.js

  ## Check a blog URL ##

axios("https://www.hughrundle.net").then(function(res) {
  return {body: res.data, url: res.config.url}
})
  .then(parseFeedFromSite)
  .then(returnFeedInfo, rejectCallback)
  .catch(rejectCallback)

  ## Check an RSS feed ##

function resolveFunction(x) {
  console.log(x)
}

function rejectFunction(e) {
  console.error(e)
}

checkFeedLinkValidity("https://www.nla.gov.au/blogs/")
  .then(resolveFunction, rejectCallback)

 ===================================================== */

module.exports = {
  rejectCallback: rejectCallback,
  returnFeedInfo: returnFeedInfo,
  parseFeedFromSite: parseFeedFromSite,
  checkFeedLinkValidity: checkFeedLinkValidity
}