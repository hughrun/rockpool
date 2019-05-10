// require modules
const settings = require('./settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?
const path = require('path') // nodejs native package
const express = require('express') // express
const app = express(); // create local instance of express
const engines = require('consolidate') // use consolidate with whiskers template engine
const axios = require('axios') // for requesting web resources
const db = require('./lib/queries.js') // local database queries module
const feedFinder = require('./lib/feed-finder.js') // local feed-finder module

// set up router
// const router = express.Router();
const bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({ extended: false })
// session

const session = require('express-session')
const sess = {
  resave: false,
  saveUninitialized: true,
  secret: settings[env].express_session_secret,
  cookie: {}
}

if (env === 'production') { // in production force https
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

app.use(session(sess))


// ######################
// #### PASSWORDLESS ####
// ######################
// TODO: move most of this into a module that can be required by other modules

// passwordless requires
const passwordless = require('passwordless');
const MongoStore = require('passwordless-mongostore');
const email   = require('emailjs');
// MongoDB TokenStore for login tokens
const pathToMongoDb = `${settings[env].mongo_url}/email-tokens` // separate mongo collection for tokens
passwordless.init(new MongoStore(pathToMongoDb))

// emailjs setup
var smtpServer  = email.server.connect({
  user:    settings[env].email.user,
  password: settings[env].email.password,
  host:    settings[env].email.host,
  ssl:     true
})

// Set up a delivery service for passwordless
passwordless.addDelivery(
	function(tokenToSend, uidToSend, recipient, callback, req) {
		smtpServer.send({
			text:    'Hello!\nAccess your account here: ' + settings[env].app_url + '/?token=' + tokenToSend + '&uid='
			+ encodeURIComponent(uidToSend),
			from: settings[env].email.from,
			to: recipient,
			subject: 'Log in to ' + settings.app_name
		}, function(err, message) {
			if(err) {
				console.log(err);
			}
			callback(err);
		});
});

app.use(passwordless.sessionSupport()) // makes session persistent
app.use(passwordless.acceptToken({ successRedirect: '/user'})) // checks token and redirects

// ### END PASSWORDLESS

// set template views
app.set('views', path.join(__dirname, 'views'))
app.engine('html', engines.whiskers)
app.set('view engine', 'html');
app.use(express.static(__dirname + '/public')) // serve static files from 'public' directory

// ++++++++++
// NAVIGATION
// ++++++++++

// home
app.get('/', (req, res) =>
  Promise.all([db.getArticles(), db.getTopTags])
	.then( function(vals) {
		newVals = vals.reduce( function(result, item, index) {
			let key = Object.keys(item)[0];
			result[key] = item[key]
			return result
		}, {});
		res.render('index', {
			partials: {
        articleList: __dirname+'/views/partials/articleList.html',
        foot: __dirname+'/views/partials/foot.html',
        footer: __dirname+'/views/partials/footer.html',
        head: __dirname+'/views/partials/head.html',
        header: __dirname+'/views/partials/header.html',
        search: __dirname+'/views/partials/search.html',
        searchNav: __dirname+'/views/partials/searchNav.html',
        toptags: __dirname+'/views/partials/toptags.html'
      },
			articles: newVals.articles,
      tags: newVals.tags,
      test: app.locals.localstest
		})
	})
	.catch(err => console.error(err))
)

// search
app.get('/search/', (req, res) => db.getArticles(req.query.tag, req.query.page, req.query.q, req.query.month)
	.then( docs => res.render('tag', {
			partials: {
				articleList: __dirname+'/views/partials/articleList.html',
				search: __dirname+'/views/partials/search.html',
				head: __dirname+'/views/partials/head.html',
				foot: __dirname+'/views/partials/foot.html',
				header: __dirname+'/views/partials/header.html',
        footer: __dirname+'/views/partials/footer.html',
        searchNav: __dirname+'/views/partials/searchNav.html',
			},
			articles: docs.articles,
      searchterm: req.query.tag ? req.query.tag : req.query.q,
      tag: req.query.tag,
      searchTermEncoded: req.query.tag ? 'tag=' + encodeURIComponent(req.query.tag) : req.query.q ? 'q=' + encodeURIComponent(req.query.q) : '',
      next: req.query.page ? Number(req.query.page) + 1 : 1,
      prev: Number(req.query.page) - 1,
      prevExists: Number(req.query.page) != NaN ? Number(req.query.page) : false,
      month: req.query.month,
      monthName: docs.monthName,
      hasNext: docs.hasNext,
      hasPrev: docs.hasPrev
		})
	)
  .catch(err => console.error(err))
)

// subscribe
app.get('/subscribe', function (req, res) {
  res.render('subscribe', {
    partials: {
      head: __dirname+'/views/partials/head.html',
      header: __dirname+'/views/partials/header.html',
      foot: __dirname+'/views/partials/foot.html',
      footer: __dirname+'/views/partials/footer.html'
    }
  })
})

/* GET login screen. */
app.get('/login', function(req, res) {
  res.render('login', {
    partials: {
      head: __dirname+'/views/partials/head.html',
      header: __dirname+'/views/partials/header.html',
      foot: __dirname+'/views/partials/foot.html',
      footer: __dirname+'/views/partials/footer.html'
    }
  })
})

/* POST login email address */
app.post('/sendtoken', urlencodedParser,
	passwordless.requestToken(
		function(user, delivery, callback, req) {
      // TODO: need some validity checking here and/or in browser
      const userEmail = `${user.toLowerCase()}`
      return callback(null, userEmail)
		}),
		function(req, res) {
      // success!
		  res.redirect('/')
})

// user - once logged in show user page
// TODO: This needs a check to see whether the email is registered.
// TODO: If not, need to create a new user. If so, need to retrieve details.
app.use('/user', passwordless.restricted()) // restrict to logged in users only
app.get('/user',
  function(req, res) {
  res.render('user', {
    partials: {
      head: __dirname+'/views/partials/head.html',
      header: __dirname+'/views/partials/header.html',
      foot: __dirname+'/views/partials/foot.html',
      footer: __dirname+'/views/partials/footer.html'
    }
  })
})

app.get('/logout', passwordless.logout(),
	function(req, res) {
		res.redirect('/');
})

// TODO: /author (for verifying owners)

// TODO: /admin

// 404
app.use(function (req, res, next) {
  res.status(404).render("404")
})

// listen on server
app.listen(3000, function() {
  console.log('    *****************************************************************************')
  console.log('     👂  Rockpool is listening on port 3000')
  console.log(`     👟  You are running in ${process.env.NODE_ENV.toUpperCase()} mode`)
  console.log(`     🗃  Connected to database at ${settings[process.env.NODE_ENV].mongo_url}`)
  console.log('    *****************************************************************************')
})