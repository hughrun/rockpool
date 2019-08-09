/*  ######################################
    ###         require modules        ###
    ######################################
*/

// dev
const debug = require('debug'), name = 'Rockpool' // debug for development
const clipboardy = require('clipboardy') // write to and from clipboard (for development)

// settings
const settings = require('./settings.json') // local settings file (leave at top)
const env = process.env.NODE_ENV // are we in production or development?

// express
const path = require('path') // nodejs native package
const express = require('express') // express
const app = express(); // create local instance of express
const engines = require('consolidate') // use consolidate with whiskers template engine

// require locals
const db = require('./lib/queries.js') // local database queries module
const { updateUserContacts, updateUserBlogs, unsubscribeFromPocket, updateUserPermission } = require('./lib/users.js') // local database updates module
const { approveBlog, deleteBlog, registerBlog } = require('./lib/blogs.js') // local database updates module
const { authorisePocket, finalisePocketAuthentication, sendEmail } = require('./lib/utilities.js') // local pocket functions

// managing users
const session = require('express-session') // sessions so people can log in
const passwordless = require('passwordless') // passwordless for ...passwordless logins
const { ObjectId } = require('mongodb') // for mongo IDs
const MongoStore = require('passwordless-mongostore-bcryptjs') // for creating and storing passwordless tokens
var cookieParser = require('cookie-parser') // cookies
var sessionStore = new session.MemoryStore // cookie storage

// dealing with form data
const bodyParser = require('body-parser') // bodyparser for form data
const { body, validationResult } = require('express-validator/check') // validate
const { sanitizeBody } = require('express-validator/filter') // sanitise TODO: this is never called

// other stuff
const flash = require('express-flash') // flash messages
const feedfinder = require('@hughrun/feedfinder') // get feeds from site URLs

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

// MongoDB TokenStore for passwordless login tokens
const pathToMongoDb = `${settings[env].mongo_url}/email-tokens` // mongo collection for tokens
passwordless.init(new MongoStore(pathToMongoDb)) // initiate store

// Set up an email delivery service for passwordless logins
passwordless.addDelivery('email',
	function(tokenToSend, uidToSend, recipient, callback, req) {
    var message =  {
			text: 'Hello!\nAccess your account here: ' + settings[env].app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend),
			to: recipient,
      subject: 'Log in to ' + settings.app_name,
      attachment: [
        {data: `<html><p>Somebody is trying to log in to ${settings.app_name} with this email address. If it was you, please <a href="${settings[env].app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend)}">log in in</a> now.</p><p>If it wasn't you, simply delete this email.</p></html>`, alternative: true}
      ]
    }
    sendEmail(message)
    .then( err => {
      callback(err)
    })
})

// passwordless for dev (bypass email and send the token to the clipboard instead)
passwordless.addDelivery('clipboard',
  function(tokenToSend, uidToSend, recipient, callback, req) {
    var address = settings[env].app_url + '/tokens/?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend)
    clipboardy.writeSync(address)
    if (env === 'development') {
      debug.log("Login link copied to clipboard")
    }
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
app.use(bodyParser.urlencoded({ extended: false })) // use bodyParser with form data
app.use(bodyParser.json()) // use bodyParser with JSON
app.use(cookieParser(settings[env].cookie_parser_secret))
app.use(session(sess)) // use sessions
app.use(passwordless.sessionSupport()) // makes session persistent
app.use(passwordless.acceptToken({ successRedirect: '/user'})) // checks token and redirects
app.use(express.static(__dirname + '/public')) // serve static files from 'public' directory
app.use(flash()) // use flash messages

// Middleware to check that ObjectId(req.body.user) is the user who is logged in
// TODO: this shouldn't be needed if we just use email instead of id in most instances
function userIsThisUser (req, res, next) {
  const thisUserEmail = req.session.passwordless
  const claimedUserIdString = req.body.user || req.user
  const args = req.body
  args.query = {"email" : thisUserEmail}
  db.getUsers(args)
    .then( data => {
      if (data.users.length === 1 && data.users[0]._id.equals(ObjectId(claimedUserIdString))) {
        // user is logged in and acting on self
        next()
      } else {
        // logged in user and user being updated don't match
        res.status(403)
        req.flash('error', 'Not allowed to update other user data')
        res.redirect('/user')
      }
    })
    .catch( e => {
      debug.log(e)
      req.flash('error', e)
      res.redirect('/user')
    })
}

// locals (variables for all routes)
app.locals.pageTitle = settings.app_name
app.locals.appName = settings.app_name
app.locals.appTagline = settings.app_tagline
app.locals.appDescription = settings.app_description
app.locals.orgName = settings.org_name
app.locals.orgUrl = settings.org_url
app.locals.blogClub = settings.blog_club_name
app.locals.blogClubUrl = settings.blog_club_url
app.locals.blogCategories = settings.blog_categories

/*  ######################################
    ###              routes            ###
    ######################################
*/

/*  
    ###############
      PUBLIC ROUTES
    ###############
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
	.catch(err => debug.log(err))
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
  .catch(err => debug.log(err))
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
    user: req.session.passwordless,
    errors: req.flash('error')
  })
})

// TODO: /opml

/*  
    ###############
      LOGIN ROUTES
    ###############
*/

/* GET login screen. */
app.get('/letmein', function(req, res) {
  if (req.session.passwordless) {
    res.redirect('/user')
  } else {
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
  }
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

/*  
    ###############
      USER ROUTES
    ###############
*/

// restrict all user paths to logged in users
app.all('/user*',
  passwordless.restricted({ failureRedirect: '/letmein' }),
  (req, res, next) =>
    next()
)

// user dashboard
app.get('/user',
  function (req, res) { 
  var args = {}
  args.user = req.user 
  db.getUserDetails(args)
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
  )
})

// update user details
// app.post('/user/update-user',
//     [
//       // normalise email
//       body('email').isEmail().normalizeEmail(),
//       // validate twitter with custom check
//       body('twitter').custom( val => {
//         let valid = val.match(/^@+[A-Za-z0-9_]*$/) || val == ""
//         return valid
//       }).withMessage("Twitter handles must start with '@' and contain only alphanumerics or underscores"),
//       // validate twitter length
//       body('twitter').isLength({max: 16}).withMessage("Twitter handles must contain fewer than 16 characters"),
//       // validate mastodon with custom check
//       body('mastodon').custom( val => {
//         let valid = val.match(/^@+\S*@+\S*/) || val == ""
//         return valid
//       }).withMessage("Mastodon addresses should be in the form '@user@server.com'")
//     ],
//     [userIsThisUser], // TODO:L if you use req.user this won't be necessary
//     (req, res, next) => {
//       debug.log('User details: %O', req.body)
//       if (!validationResult(req).isEmpty()) {
//         // flash errors
//         let valArray = validationResult(req).array()
//         for (var i=0; i < valArray.length; ++i) {
//           req.flash('error', valArray[i].msg)
//         }
//         // reload page with flashes instead of updating
//         res.redirect('/user')
//       } else {
//         next()
//       }
//     },
//     function(req, res, next) {
//     // here we need to check for other users with the same email
//       db.checkEmailIsUnique(req.body)
//         .then(updateUserContacts)
//         .then(() => {
//           debug.log('user updated')
//           if (req.body.email != req.session.passwordless) {
//             res.redirect('/email-updated') // force logout if email has changed
//           } else {
//             req.flash("success", "Your details have been updated")
//             next() // if email unchanged, reload the page with update info
//           }
//         })
//         .catch(err => {
//             debug.log(err)
//             req.flash("error", `Something went wrong:\n${err}`)
//             next()
//         })
//       },
//       (req, res) => {
//         res.redirect('/user')
//       }
//   )

// update user details
app.post('/user/update-user',
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
      if (req.user != req.body.email) {
        throw new Error('Cannot update another user')
      }
      db.checkEmailIsUnique(req.body)
        .then(updateUserContacts)
        .then(() => {
          if (req.body.email != req.session.passwordless) {
            res.redirect('/email-updated') // force logout if email has changed
          } else {
            req.flash("success", "Your details have been updated")
            next() // if email unchanged, reload the page with update info
          }
        })
        .catch(err => {
            debug.log(err)
            req.flash("error", `Something went wrong:\n${err}`)
            next()
        })
      },
      (req, res) => {
        res.redirect('/user')
      }
  )

// register blog
app.post('/user/register-blog',
  [userIsThisUser],
  function(req, res, next) {
    feedfinder.getFeed(req.body.url)
    .then( ff => {
      const args = req.body
      args.user = req.user
      args.feed = ff.feed // add the feed to the form data object
      args.action = "register" // this is used in updateUserBlogs
      args.url = args.url.replace(/\/*$/, "") // get rid of trailing slashes
      // we match on the FEED rather than the URL (below)
      // because if there is a redirect, the URL might not match even though it's the same blog
      args.query = {feed: args.feed}
      return args
    })
    .then(db.getBlogs) // check the blog isn't already registered
    .then( args => { 
      if (args.blogs.length < 1) {
        debug.log(args)
        return args
      } else {
        throw new Error("That blog is already registered!")
      }
    }) 
    .then(registerBlog) // create new blog document
    .then(updateUserBlogs) // add blog _id to user's blogsForApproval array
    .then( args => {
      message = {
        text: `User ${req.user} has registered ${args.url} with ${settings.app_name}.\n\nLog in at ${settings[env].app_url}/letmein to accept or reject the registration.`,
        to: 'admins',
        subject: `New blog registered for ${settings.app_name}`,
      }
      sendEmail(message) // send email to admins
      req.flash('success', 'Blog registered!')
      next()
    }).catch( e => {
      debug.log(e)
      req.flash('error', `Something went wrong registering your blog: ${e}`)
      next()
    })
  }, 
  function(req, res) {
    res.redirect('/user')
  })

// claim blog (legacy DB only)
app.post('/user/claim-blog',
  [userIsThisUser],
  function(req, res, next) {
    const args = req.body
    args.url = args.url.replace(/\/*$/, "") // get rid of trailing slashes
    args.query = { "url" : args.url}
    args.action = "register"
    db.getBlogs(args)
      // then check users for any claiming this blog
      .then( args => {
        if (args.blogs.length < 1) {
          throw new Error("Blog does not exist: check the URL or try registering") // if there are no results the blog doesn't exist
        } else {
          args.blog = args.blogs[0].idString
          args.query = {"blogsForApproval" : args.blogs[0]._id}
          return args
        }
      })
      .then(db.getUsers)
      .then( args => {
        if (args.users.length < 1) {
          return args
        } else {
          throw new Error("Another user has claimed that blog!")
        } 
      })
      .then(updateUserBlogs)
      .then( args => {
        message = {
          text: `User ${req.user} has claimed ${args.url} on ${settings.app_name}.\n\nLog in at ${settings[env].app_url}/letmein to accept or reject the registration.`,
          to: 'admins',
          subject: `New blog claimed on ${settings.app_name}`,
        }
        sendEmail(message) // send email to admins
      req.flash('success', 'Blog claimed!')
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

// delete (own) blog
app.post('/user/delete-blog',
  [userIsThisUser],
  function(req, res, next) {
    const args = req.body
    args.user = req.user
    args.action = 'delete'
    updateUserBlogs(args)
    .then(deleteBlog)
    .then( () => {
      req.flash('success', 'Blog deleted')
      next()
    }).catch( e => {
      debug.log('**ERROR DELETING BLOG**')
      debug.log(e)
      req.flash('error', `Something went wrong deleting your blog: ${e}`)
      next()
    })
  }, 
  function(req, res) {
    res.redirect('/user')
  })

// pocket routes

app.get('/user/pocket', 
  (req, res, next) => {
    var args = {}
    args.user = req.user 
    db.getUserDetails(args)
    .then(authorisePocket)
    .then( args => {
      req.session.pocketCode = args.code
      res.redirect(`https://getpocket.com/auth/authorize?request_token=${args.code}&redirect_uri=${settings[env].app_url}/user/pocket-redirect`)
    })
    .catch( err => {
      debug.log(err)
      req.flash('error', `Something went wrong trying to authenticate with Pocket: ${err}`)
      res.redirect('/subscribe')
    })
})

app.get('/user/pocket-redirect', 
  (req, res, next) => {
    // user has now authorised us to authenticate to pocket and get an access token
    const args = {}
    args.code = req.session.pocketCode
    args.key = settings[env].pocket_consumer_key
    args.user = req.user
    finalisePocketAuthentication(args)
      .then( () => {
        req.flash('success', 'Pocket account registered')
        res.redirect('/user')
      })
      .catch(e => {
        req.flash('error', e)
        res.redirect('/subscribe')
      })
  })

app.post('/user/pocket-unsubscribe', 
  (req, res, next) => {
    unsubscribeFromPocket(req.user)
      .then( () => {
        req.flash('success', 'Pocket subscription cancelled. You should also "remove access" by this app at https://getpocket.com/connected_applications')
        res.redirect('/user')
      })
      .catch(err => {
        debug.log(err)
        req.flash('error', `Something went wrong cancelling your Pocket subscription: ${err}`)
      })
  })

/*  
    ###############
      ADMIN ROUTES
    ###############
*/

// restrict all admin paths
app.all('/admin*',
  passwordless.restricted({ failureRedirect: '/letmein' }),
  function (req, res, next) {
    var args = {}
    args.user = req.user 
    db.getUserDetails(args)
    .then( doc => {
      if (doc.user.permission && doc.user.permission === "admin") {
        next()
      } else {
        req.flash('error', 'You are not allowed to view admin pages because you are not an administrator')
        res.status(403)
        res.redirect('/user')
      }
    })
    .catch(err => {
      debug.log(`Error accessing admin page: ${err}`)
      req.flash('error', 'Something went wrong')
      res.redirect('/user')
    })
  })

// admin home page
app.get('/admin', function (req, res) {
  var args = {}
  args.user = req.user 
  db.getUserDetails(args)
      .then( function (user) {
        return db.getBlogs({user: user, query: {failing: true}}) // get failing blogs
      })
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
          doc.approvals = updated
          return doc
        })
    })
    .then( args => {
      // now we need to get all the admins!!
      args.query = { 'permission' : 'admin'}
      return args
    })
    .then(db.getUsers)
    .then( args => {
      // remove this user from admins
      // this prevents the user from accidentally removing themself as an admin
      function removeThisUser(user) {
        return user.email !== req.user
      }
      args.users = args.users.filter(removeThisUser)
      return args
    })
    .then( args =>
    res.render('admin', {
      partials: {
        head: __dirname+'/views/partials/head.html',
        header: __dirname+'/views/partials/header.html',
        foot: __dirname+'/views/partials/foot.html',
        footer: __dirname+'/views/partials/footer.html'
      },
      admins: args.users,
      user: args.user,
      failing: args.failing,
      legacy: settings.legacy_db,
      approvals: args.approvals,
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
          args.user = vals[0]._id // for deleteBlog below
          args.email = vals[0].email // for sendEmail later
          updateUserBlogs(args) // remove the blog _id from the owner's 'blogs' array
            .then( args => { 
              return args
            })
        } else {
          return args // for legacy DB entry with no blog owner simply skip this step
        }
      })
      .then(deleteBlog) // now we actually delete the document from the blogs collection
      .then( args => { // if there was an owner, send email
        message = {
          text: `User ${req.user} has deleted ${args.url} from ${settings.app_name}.`,
          to: args.email,
          subject: `Your blog listing has been removed from ${settings.app_name}`,
        }
        sendEmail(message) // send email to admins
        req.flash('success', 'Blog deleted')
        res.redirect('/admin')
      }).catch(err => {
        // TODO: WTF is the line below trying to do?
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
  var args = req.body
  args.user = req.user
  args.query = {"email": args.user}
  db.getUsers(args)
  .then(approveBlog)
  .then(updateUserBlogs)
  .then( args => { // now we need to get the user's email address so we can send a confirmation
    args.query = {'email' : args.user} // query for getUsers
    return args
  })
  .then(db.getUsers)
  .then( args => {
    const user = args.users[0]
    message = {
      text: `Your blog ${args.url} has been approved on ${settings.app_name}.\n\nTime to get publishing!`,
      to: user.email,
      subject: `Your blog has been approved on ${settings.app_name}`,
    }
    sendEmail(message)
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
  updateUserBlogs(args)
    .then( args => {
      args.query = {"_id" : ObjectId(args.blog)}
      return args
    })
    .then(db.getBlogs)
    .then( args => {
      if (args.blogs[0] && args.blogs[0].approved) {
        // if approved is true then the blog is a legacy one and this is a 'claim'
        // rather than a new registration, so we do NOT want to delete it!
        return args
      } else { 
        deleteBlog(args)
        .then( doc => {
          return args
        })
      }
    })
    .then( args => {
      // TODO: email user with reason
      const user = args.users[0]
      message = {
        text: `Your blog registration for ${args.url} has been rejected from ${settings.app_name}.\n\nReason:\n\n${args.reason}`,
        to: args.user,
        subject: `Your blog registration has been rejected on ${settings.app_name}`,
      }
      sendEmail(message)
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

app.post('/admin/add-admin', 
  (req, res, next) => {
    const args = req.body // user (email)
    args.permission = 'admin'
    updateUserPermission(args)
      .then( () => {
        message = {
          text: `${req.user} has made you an administrator on ${settings.app_name}.\n\nLog in at ${settings[env].app_url}/letmein to use this new power, (but only for good).`,
          to: args.user,
          subject: `You are now an admin on ${settings.app_name}`,
        }
        sendEmail(message) // send email to user
        req.flash('success', `${args.user} is now an administrator`)
        next()
      })
      .catch( err => {
        req.flash('error', err)
        next()
      })
  },
  (req, res, next) => {
    res.redirect('/admin')
  })

app.post('/admin/remove-admin', 
(req, res, next) => {
  const args = req.body // user (email)
  args.permission = 'user'
  updateUserPermission(args)
    .then( () => {
      message = {
        text: `You have been removed as an administrator on ${settings.app_name} by ${req.user}.`,
        to: args.user,
        subject: `You are no longer an admin on ${settings.app_name}`,
      }
      sendEmail(message) // send email to user
      req.flash('success', `${args.user} is no longer an administrator`)
      next()
    })
    .catch( err => {
      req.flash('error', err)
      next()
    })
},
(req, res, next) => {
  res.redirect('/admin')
})

/*  
    #######################
    LOGOUT AND ERROR ROUTES
    #######################
*/


// logout
app.get('/logout',
  passwordless.logout(),
	function(req, res) {
		res.redirect('/')
})

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

// TESTING vuejs

/*  
    #######################
          API ROUTES
    #######################
*/

app.all('/api/v1/user*', 
passwordless.restricted(),
(req, res, next) => {
  next()
})

/*  ########
      GET
    ########
*/

app.get('/api/v1/user/info', function(req, res) {
  db.getUsers({query: {"email" : req.user}})
  .then(
    doc => {
      var data = {}
      data.user = doc.users[0]._id
      data.email = doc.users[0].email
      data.twitter = doc.users[0].twitter || null
      data.mastodon = doc.users[0].mastodon || null
      res.json(data)
  })
  .catch( err => {
    debug.log(err)
  })
})

app.get('/api/v1/user/blogs', function(req, res) {
  db.getUsers({query: {"email" : req.user}})
  .then( // now get the approved blogs
    doc => {
      doc.query = {"_id": {$in: doc.users[0].blogs}}
      return doc
    })
  .then(db.getBlogs)
  .then( data => {
    res.json({user: data.users[0].idString, blogs: data.blogs})
  })
  .catch( err => {
    debug.log(err)
  })
})

app.get('/api/v1/user/unapproved-blogs', function(req, res) {
  db.getUsers({query: {"email" : req.user}})
  .then( // now get the approved blogs
    doc => {
      doc.query = {
        "_id": {$in: doc.users[0].blogsForApproval},
      }
      return doc
    })
  .then(db.getBlogs)
  .then( data => {
    res.json(data.blogs)
  })
  .catch( err => {
    debug.log(err)
  })
})

app.get('/api/v1/user/pocket-info', function(req, res) {
  db.getUsers({query: {"email" : req.user}})
  .then(
    doc => {
      var data = {}
      data.pocket_username = doc.users[0].pocket ? doc.users[0].pocket.username : null
      res.json(data)
  })
  .catch( err => {
    debug.log(err)
  })
})

/*  ########
      POST
    ########
*/

// UPDATE/user routes

// NOTE: all routes **MUST** use req.user to identify user to update
// do not make routes taking user id or current email from req.body

app.all('/api/v1/update*', 
passwordless.restricted(),
(req, res, next) => {
  next()
})

// update user contact info
app.post('/api/v1/update/user/info', function(req,res) {
  var args = req.body
  args.user = req.user
  db.checkEmailIsUnique(args)
  .then(updateUserContacts)
  .then(args => {
    if (args.user.email != req.user) {
      res.redirect('/email-updated') // force logout if email has changed
    } else {
      args.msg = {}
      args.msg.type = 'success'
      args.msg.class = 'flash-success'
      args.msg.text = 'Your details have been updated'
      res.send(
        {
          user: args.user, // NOTE: this is *only* the data that was sent! i.e. it's "args"
          error: null
        }
      )
    }
  })
  .catch(err => {
    debug.log('ERROR', err)
    res.send(
      {
        user: null, 
        error: {
          type: 'error', 
          class: 'flash-error',
          message: err.message
        }
      }
    )
  })
})

// delete blog
app.post('/api/v1/update/user/delete-blog', function(req, res, next) {
  const args = req.body 
  args.user = req.user // for updateUserBlogs & getUserDetails
  updateUserBlogs(args)
  .then(deleteBlog)
  .then( args => {
    args.query = {"email" : args.user }
    return args
  })
  .then(db.getUsers)
  .then( args => {
    args.query = {"_id": {$in: args.users[0].blogs}}
    return args
  })
  .then(db.getBlogs)
  .then( args => {
    res.send(
      {
        blogs: args.blogs, 
        msg: {
          type: 'success',
          class:'flash-success',
          text: 'Blog deleted'
        }, 
        error: null
      }
    )
  })
  .catch( e => {
    debug.log('**ERROR DELETING BLOG**')
    debug.log(e)
    db.getUserDetails(args)
    .then( args)
    .then( args => {
      res.send(
        {
          blogs: args.user.blogs, // BUG: TODO: this needs to return the actual blogs info not just _id
          msg: {
            type: 'error',
            class:'flash-error',
            text: e.message // TODO: probably not great to just send the error message
          }, 
          error: e.message // should the message actually go here or is it not needed?
        }
      )
    })
  })
})

app.get('/vuetest', function(req, res) {
  res.render('vuetest', {
    partials: {
      head: __dirname+'/views/partials/head.html',
      header: __dirname+'/views/partials/header.html',
      foot: __dirname+'/views/partials/foot.html',
      footer: __dirname+'/views/partials/footer.html'
    }
  })
})

app.get('/403', function (req, res) {
  res.sendStatus(403)
})

// 404 errors: this should always be the last route
app.use(function (req, res, next) {
  res.status(404).render("404")
})

// listen on server
app.listen(3000, function() {
  if (env !== 'test') {
    console.log('    *****************************************************************************')
    console.log('     👂  Rockpool is listening on port 3000')
    console.log(`     👟  You are running in ${process.env.NODE_ENV.toUpperCase()} mode`)
    console.log(`     🗃  Connected to database at ${settings[process.env.NODE_ENV].mongo_url}`)
    console.log('    *****************************************************************************')
  }
})

// export app for testing
module.exports = app;