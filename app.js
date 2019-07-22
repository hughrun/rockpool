/*  ######################################
    ###         require modules        ###
    ######################################
*/
const settings = require('./settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?
const path = require('path') // nodejs native package
const express = require('express') // express
const app = express(); // create local instance of express
const engines = require('consolidate') // use consolidate with whiskers template engine
const axios = require('axios') // for requesting web resources
const db = require('./lib/queries.js') // local database queries module
const rpUsers = require('./lib/users.js') // local database updates module
const rpBlogs = require('./lib/blogs.js') // local database updates module
const feedFinder = require('./lib/feed-finder.js') // local feed-finder module
const debug = require('debug'), name = 'Rockpool' // debug for development
const clipboardy = require('clipboardy') // write to and from clipboard (for development)
const session = require('express-session') // sessions so people can log in
const passwordless = require('passwordless') // passwordless for ...passwordless logins
const {ObjectId} = require('mongodb') // for mongo IDs
const MongoStore = require('/Users/hugh/coding/javascript/passwordless-mongostore') // for creating and storing passwordless tokens
// TODO: do passwordless-mongostore-bcrypt.js properly as a new npm module
const email   = require('emailjs') // to send email from the server
var cookieParser = require('cookie-parser') // cookies
var sessionStore = new session.MemoryStore // cookie storage
const bodyParser = require('body-parser') // bodyparser for form data
const flash = require('express-flash') // flash messages
const { body, validationResult } = require('express-validator/check') // validate
const { sanitizeBody } = require('express-validator/filter') // sanitise

/*  ######################################
    ### initiate and configure modules ###
    ######################################
*/

// set up session params
const sess = {
  resave: false,
  saveUninitialized: true,
  store: sessionStore,
  secret: settings[env].express_session_secret,
  cookie: {
    maxAge: 6048e5 // expire cookies after a week
  }
}

if (env === 'production') { // in production force https
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}

// emailjs setup
const smtpServer  = email.server.connect({
  user: settings[env].email.user,
  password: settings[env].email.password,
  host: settings[env].email.host,
  ssl: true
})

// MongoDB TokenStore for passwordless login tokens
const pathToMongoDb = `${settings[env].mongo_url}/email-tokens` // mongo collection for tokens
passwordless.init(new MongoStore(pathToMongoDb)) // initiate store

// Set up an email delivery service for passwordless logins
passwordless.addDelivery('email',
	function(tokenToSend, uidToSend, recipient, callback, req) {
    var message =  {
			text: 'Hello!\nAccess your account here: ' + settings[env].app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend),
			from: `${settings.app_name} <${settings[env].email.from}>`,
			to: recipient,
      subject: 'Log in to ' + settings.app_name,
      attachment: [
        {data: `<html><p>Somebody is trying to log in to ${settings.app_name} with this email address. If it was you, please <a href="${settings[env].app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend)}">log in in</a> now.</p><p>If it wasn't you, simply delete this email.</p></html>`, alternative: true}
      ]
    }
    smtpServer.send(message,
      function(err, message) {
        console.log(err || `Email sent to ${recipient}`)
        callback(err);
      })
})

// passwordless for dev (bypass email)
passwordless.addDelivery('browser',
  function(tokenToSend, uidToSend, recipient, callback, req) {
    var address = settings[env].app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend)
    clipboardy.writeSync(address)
    debug.log("link copied to clipboard")
    callback(null, recipient)
  })

/*  ######################################
    ###     app settings and routing   ###
    ######################################
*/

// template views
app.set('views', path.join(__dirname, 'views'))
app.engine('html', engines.whiskers)
app.set('view engine', 'html')

// routing middleware
app.use(bodyParser.urlencoded({ extended: false })) // use bodyParser
app.use(cookieParser(settings[env].cookie_parser_secret))
app.use(session(sess)) // use sessions
app.use(passwordless.sessionSupport()) // makes session persistent
app.use(passwordless.acceptToken({ successRedirect: '/user'})) // checks token and redirects
app.use(express.static(__dirname + '/public')) // serve static files from 'public' directory
app.use(flash()) // use flash messages

// locals (global values for all routes)
app.locals.pageTitle = settings.app_name
app.locals.appName = settings.app_name
app.locals.appTagline = settings.app_tagline
app.locals.appDescription = settings.app_description
app.locals.orgName = settings.org_name
app.locals.orgUrl = settings.org_url
app.locals.blogClub = settings.blog_club_name
app.locals.blogClubUrl = settings.blog_club_url

/*  ######################################
    ###              routes            ###
    ######################################
*/

// home
app.get('/', (req, res) =>
  Promise.all([db.getArticles(), db.getTopTags])
	.then( function(vals) {
		newVals = vals.reduce( function(result, item, index) {
			let key = Object.keys(item)[0];
			result[key] = item[key]
			return result
    }, {})
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
      user: req.session.passwordless
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
      hasPrev: docs.hasPrev,
      user: req.session.passwordless
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
    },
    user: req.session.passwordless
  })
})

/* GET login screen. */
// TODO: redirect this to /user if they *are* logged in
app.get('/letmein', function(req, res) {
  res.render('login', {
    partials: {
      head: __dirname+'/views/partials/head.html',
      header: __dirname+'/views/partials/header.html',
      foot: __dirname+'/views/partials/foot.html',
      footer: __dirname+'/views/partials/footer.html'
    },
    user: req.session.passwordless,
    delivery: settings[env].deliver_tokens_by // allows bypassing email when in development
  })
})

/* POST login email address */
app.post('/sendtoken',
	passwordless.requestToken(
		function(user, delivery, callback, req) {
      body('user').isEmail().normalizeEmail() // check it's email and downcases everything
      if (validationResult(req).isEmpty()) {
        return callback(null, user)
      } else {
        debug.log('ERROR: %O', validationResult(req)) // log errors
        return res.status(422) // return error status
        // NOTE: given the field is an 'email' field, the only way to get to this error
        // is if someone is using a really old browser and enters something that is not an email address
      }
    },
    { failureRedirect: '/logged-out' }
  ),
  function(req, res) {
    // success!
    res.redirect('/token-sent')
})

// info screen after login token sent
app.get('/token-sent', function(req, res) {
  res.render( 'checkEmail', {
  partials: {
    head: __dirname+'/views/partials/head.html',
    header: __dirname+'/views/partials/header.html',
    foot: __dirname+'/views/partials/foot.html',
    footer: __dirname+'/views/partials/footer.html'
    },
    user: req.session.passwordless
  })
})

// user dashboard
app.get('/user',
  passwordless.restricted({ failureRedirect: '/letmein' }),
  (req, res) => db.getUserDetails(req.session.passwordless) // get user
  .then( // here we query any blogs in user.blogs or user.blogsForApproval to reduce the number of DB calls
    doc => {
      doc.query = {"_id": {$in: doc.user.blogsForApproval}}
      return doc
    })
  .then(db.getBlogs) // get blogs for approval
  .then( 
    doc => {
      doc.blogsForApproval = doc.blogs
      doc.query = {"_id": {$in: doc.user.blogs}}
      return doc
  })
  .then(db.getBlogs) // get owned blogs
  .then( 
    doc => {
      doc.ownedBlogs = doc.blogs
      doc.blogs = doc.blogs.concat(doc.blogsForApproval)
      return doc
  })
  .then(
    doc => {
      if (!doc.blogs || doc.blogs.length < 1) {
        req.flash('warning', 'You have not registered a blog yet')
      }
      return doc
    })
    .then(
    doc => res.render('user', {
    partials: {
      head: __dirname+'/views/partials/head.html',
      header: __dirname+'/views/partials/header.html',
      foot: __dirname+'/views/partials/foot.html',
      footer: __dirname+'/views/partials/footer.html'
    },
    user: doc.user,
    admin: doc.user.permission === "admin",
    new: doc.new,
    blogs: doc.blogs,
    ownedBlogs: doc.ownedBlogs,
    blogsForApproval: doc.blogsForApproval,
    legacy: settings.legacy_db,
    warnings: req.flash('warning'),
    success: req.flash('success'),
    errors: req.flash('error')
  })
))

// show token expired screen if token already used or too old
app.get('/tokens', function(req, res) {
  res.render('expired', {
    partials: {
      head: __dirname+'/views/partials/head.html',
      header: __dirname+'/views/partials/header.html',
      foot: __dirname+'/views/partials/foot.html',
      footer: __dirname+'/views/partials/footer.html'
    },
    user: req.session.passwordless
  })
})

/* POST user update */
app.post('/update-user',
    [
      // normalise email
      body('email').isEmail().normalizeEmail(),
      // validate twitter with custom check
      body('twitter').custom( val => {
        let valid = val.match(/^@+[A-Za-z0-9_]*$/) || val == ""
        return valid
      }).withMessage("Twitter handles must start with '@' and contain only alphanumerics or underscores"),
      // validate twitter length
      body('twitter').isLength({max: 16}).withMessage("Twitter handles must contain fewer than 16 characters"),
      // validate mastodon with custom check
      body('mastodon').custom( val => {
        let valid = val.match(/^@+\S*@+\S*/) || val == ""
        return valid
      }).withMessage("Mastodon addresses should be in the form '@user@server.com'")
    ],
    (req, res, next) => {
      debug.log('User details: %O', req.body)
      if (!validationResult(req).isEmpty()) {
        // flash errors
        let valArray = validationResult(req).array()
        for (var i=0; i < valArray.length; ++i) {
          req.flash('error', valArray[i].msg)
        }
        // reload page with flashes instead of updating
        res.redirect('/user')
      } else {
        next()
      }
    },
    function(req, res, next) {
    // here we need to check for other users with the same email
      db.checkEmailIsUnique(req.body)
        .then(rpUsers.updateUserDetails)
        .then(() => {
          debug.log('user updated')
          if (req.body.email != req.session.passwordless) {
            res.redirect('/email-updated') // force logout if email has changed
          } else {
            req.flash("success", "Your details have been updated")
            next() // if email unchanged, reload the page with update info
          }
        })
        .catch(err => {
          if (err.type == 'duplicateUser') {
            debug.log('email is already in use')
            req.flash("error", "That email address is already in use")
            next()
          } else {
            debug.log(err)
            req.flash("error", "Sorry, something went wrong")
            next()
          }
        })
      },
      (req, res) => {
        res.redirect('/user')
      }
  )

// TODO: pocket routes

// TODO: register blog

// TODO: claim blog (see update user)

app.post('/claim-blog', 
  function(req, res, next) {
    var args = {}
    args.query = { "url" : req.body.url}
    args.user = req.body.user
    args.action = "register"
    db.getBlogs(args)
      .then(rpUsers.updateBlog)
      .then( () => {
      req.flash('success', 'Claimed Blog')
      next()
    }).catch( e => {
      debug.log('**ERROR CLAIMING BLOG**')
      debug.log(e)
      req.flash('error', `Something went wrong claiming your blog: ${e}`)
      next()
    })
  }, 
  function(req, res) {
    res.redirect('/user')
  })

      // no need to normalise because we're pulling the data from hidden inputs
      // call rpBlogs.claimBlog
      // then return to user page

// TODO: delete (own) blog

// TODO: /rss

/* TODO: /admin

      This route needs to be restricted not only to logged in users but also those who have
      permission = "admin"

    - approve blog
    - approve claim
    - delete blog ?
    - delete post
    - add admin
    - remove admin
    - audit trails and notes
    - send emails to users when appropriate
*/

// restrict all admin paths
app.all('/admin*',
  passwordless.restricted({ failureRedirect: '/letmein' }),
  (req, res, next) =>
    db.getUserDetails(req.session.passwordless)
    .then( doc => {
        if (doc.user.permission && doc.user.permission === "admin") {
          next()
        } else {
          req.flash('error', 'You are not allowed to view admin pages because you are not an administrator')
          res.status(403) // NOTE: I don't really know what this will effectively do: needs TESTING
          res.redirect('/user')
        }
      })
      .catch(err => {
        debug.log(`Error accessing admin page: ${err}`)
        req.flash('error', 'Something went wrong')
        res.redirect('/user')
      })
)

// admin home page
app.get('/admin', function (req, res) {
  db.getUserDetails(req.session.passwordless)
      .then( function (user) {
        return db.getBlogs({user: user, query: {failing: true}}) // get failing blogs
      })
    //.then() // TODO: // get all claimed blogs
    .then( 
      doc => {
        doc.failing = doc.blogs
        doc.query = {$where: "this.blogsForApproval && this.blogsForApproval.length > 0"}
        return doc
    })
    .then(db.getUsers)
    .then( 
      doc => {
        // find the claimed blogs from the users
        // mapping the array returns a Promise for each item in the array
        // so we eed to return Promise.all() to get a result
        var mapped = doc.users.map( user => {
          return db.getBlogs({query: {_id: {$in: user.blogsForApproval}}}).then( blogs => {
            user.claims = blogs
            return user
          })
        })
        return Promise.all(mapped).then(updated => {
          doc.users = updated
          return doc
        })
    })
      .then( args =>
      res.render('admin', {
        partials: {
          head: __dirname+'/views/partials/head.html',
          header: __dirname+'/views/partials/header.html',
          foot: __dirname+'/views/partials/foot.html',
          footer: __dirname+'/views/partials/footer.html'
        },
        user: args.user,
        failing: args.failing,
        legacy: settings.legacy_db,
        approvals: args.users,
        warnings: req.flash('warning'),
        success: req.flash('success'),
        errors: req.flash('error')
      })
    ).catch(err => {debug.log(err)})
})

// post admin/deleteblog
app.post('/admin/deleteblog', function(req, res) {
  body().exists({checkNull: true}) // make sure there's a value
  if (validationResult(req).isEmpty()) {
    const args = {}
    args.action = "delete"
    args.blog = req.body.id
    db.getUsers({"blogs" : req.body.id}) // get the user with this blog in their 'blogs' array
      .then( vals => {
        if (vals[0]) { // if this is a legacy DB there may be no users with this blog listed
          args.user = vals[0]._id
          rpUsers.updateBlog(args) // remove the blog _id from the owner's 'blogs' array
            .then( args => {
              return args
            })
        } else {
          return args // for legacy DB entry with no blog owner simply skip this step
        }
      })
      .then(rpBlogs.deleteBlog) // delete the document from the blogs collection
      .then( () => {
        req.flash('success', 'Blog deleted')
        res.redirect('/admin')
      }).catch(err => {
        const msg = err ? typeof err === String : "Something went wrong whilst deleting 😯"
        debug.log(err)
        req.flash('error', msg)
        res.redirect('/admin')
      })
  } else {
    let valArray = validationResult(req).array()
    debug.log(valArray)
    req.flash('error', 'There was a problem deleting blogs.')
    res.redirect('/admin')
  }
})

// approve blog
app.post('/admin/approve-blog', function(req, res, next) {
  rpBlogs.approveBlog(req.body)
    .then(rpUsers.updateBlog)
    .then( () => {
      req.flash('success', 'Blog approved')
      return next()
    })
    .catch( error => {
      debug.log(error)
      req.flash('error', 'Something went wrong approving the blog')
      return next()
    })
},
function (req, res, next) {
  res.redirect('/admin')
})

// reject blog
app.post('/admin/reject-blog', function(req, res, next) {
  const args = req.body
  args.action = "reject"
  rpUsers.updateBlog(args)
    .then( args => {
      args.query = {"_id" : ObjectId(args.blog)}
      return args
    })
    .then(db.getBlogs)
    .then( args => {
      debug.log(args)
      if (args.blogs[0] && args.blogs[0].approved) {
        // if approved is true then the blog is a legacy one and this is a 'claim'
        // rather than a new registration, so we do NOT want to delete it!
        return args
      } else {
        // rpBlogs.deleteBlog(args)
        // .then( doc => {
        //   return args
        // })
        debug.log("the blog would be deleted")
      }
    })
    .then( () => {
      req.flash('success', 'Blog rejected')
      return next()
    })
    .catch( error => {
      debug.log(error)
      req.flash('error', 'Something went wrong rejecting the blog')
      return next()
    })
},
function (req, res, next) {
  res.redirect('/admin')
})

// END admin paths

// logout
app.get('/logout',
  passwordless.logout(),
	function(req, res) {
		res.redirect('/')
})

// email-updated to log out users who change their email address
app.get('/email-updated',
  passwordless.logout(), // force logout
	function(req, res) {
    res.render('emailUpdated', {
      partials: {
        head: __dirname+'/views/partials/head.html',
        header: __dirname+'/views/partials/header.html',
        foot: __dirname+'/views/partials/foot.html',
        footer: __dirname+'/views/partials/footer.html'
      }
    })
  })

// 404 errors: this should always be the last route
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