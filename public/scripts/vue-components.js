var userMessages =  new Vue({
  el: '#user-messages',
  data() {
    return {
      messages: [
        {type: 'news', class: 'error', text: 'hello this is a message'}
      ]
    }
  },
  methods: {
    removeMessage(msg) {
      // fired when click on X to get rid of it
      // reloading the page will also remove any messages that aren't in the DB
    }
  },
  mounted () {
    // check messages in the database?
    // e.g. blog approved or rejected, blog failing, error with Pocket account, new feature?
  }
})

var userInfo =  new Vue({
  el: '#user-info',
  data() {
    return {
      user : {
        email: null,
        twitter: null,
        mastodon: null
      },
      editing : false
    }
  },
  methods: {
    updateUser(event) {
      // TODO: at this point we trigger a data param to show a loader image
      var params = {
        email : event.target.parentNode.email.value,
        twitter : event.target.parentNode.twitter.value,
        mastodon : event.target.parentNode.mastodon.value
      }
      axios.post("/api/v1/update/user-info", params)
      .then( response => {
        this.user = response.data.user ? response.data.user : response.error // TODO: how do we deal with errors?
        // TODO: here we change the data param back to stop the loader image
        this.editing = false
      })
      .catch( err => {
        // TODO: do something sensible with the error - can we load a message?
      })
    }
  },
  mounted () {
    axios
      .get('/api/v1/user/info')
      .then(response => (this.user = response.data))
      .catch( err => this.user = 'error')
  }
})

var userBlogs =  new Vue({
  el: '#user-approved-blogs',
  data () {
    return {
      userIdString: null,
      blogs : null,
      editing: false
    }
  },
  mounted () {
    axios
      .get('/api/v1/user/blogs')
      .then(response => {
        this.userIdString = response.data.user
        this.blogs = response.data.blogs
        this.blogs.forEach( blog => {
          blog.editing = false
        })
      })
      .catch( err => this.blogs = 'error')
  },
  methods: {
    deleteBlog(event) {
      var payload = {
        blog: event.target.id,
        action: 'delete'
      }
      // axios.post('api/v1/user/delete-blog', payload)
      // .then( response => {
      //   var msg = response.data.message || response.data.error
      //   this.editing = false
      //   this.blogs = response.data.blogs // TODO: change api call so it returns the update blog list
      //   alert(msg)
      // })
      alert(this.userIdString)
      // this.checking = false
    },
    checking(blog) {
      var checking = blog
      checking.editing = true
      Vue.set(this.blogs, this.blogs.indexOf(blog), checking)
      console.log(blog)
    }
  }
})

var userUnapprovedBlogs =  new Vue({
  el: '#user-unapproved-blogs',
  data () {
    return {
      uBlogs : null,
    }
  },
  mounted () {
    axios
      .get('/api/v1/user/unapproved-blogs')
      .then(response => (this.uBlogs = response.data))
      .catch( err => this.ublogs = 'error')
  }
})