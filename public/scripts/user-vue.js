Vue.component('loader-screen', {
  props: ['processing'],
  template: `
  <div v-if="processing" id="loader">
  <div class="loader-container">
    <div class="loader-text">
      <p>Processing request...</p>
    </div>
  </div>
</div>
  `
})

Vue.component('message-list', {
  props: ['messages'],
  template: `
<div v-if="messages" id="user-messages">
  <ul v-for="msg in messages" class="blog-list">
    <li v-bind:class="msg.class">
      <span class="message-text">{{ msg.text }}</span>
      <span class="flash-close" v-on:click="removeMessage(msg)">
      X
      </span>
    </li>
  </ul>
</div>
  `,
  data() {
    return {}
  },
  methods: {
    removeMessage(msg) {
      this.$emit('remove-message', msg)
    }
  },
  mounted () {
    // check messages in the database?
    // e.g. blog approved or rejected, blog failing, error with Pocket account, new feature?
  }
})

Vue.component('user-info', {
  props: ['user', 'registered'],
  data() {
    return {
      editing: false
    }
  },
  methods: {
    loading(bool) {
      this.$emit('loading', bool)
    },
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    updateUser(event) {
      var params = {
        email : event.target.parentNode.email.value,
        twitter : event.target.parentNode.twitter.value,
        mastodon : event.target.parentNode.mastodon.value
      }
      this.editing = false
      this.loading(true)
      axios.post('/api/v1/update/user/info', params) 
      .then( response => {
        if (response.data.user) {
          let res = response.data.user
          this.user.email = res.email
          this.user.twitter = res.twitter
          this.user.mastodon = res.mastodon
          this.$emit('registered') // if they are registering
        } else if (response.data.redirect) {
          window.location.href = '/email-updated' // log out and redirect if new email
        } else if (response.data.error) {
          // error from this API call is an array
          let errors = response.data.error
          for (var i=0; i < errors.length; ++i) {
            this.user[errors[i].param] = null // blank the input value
            this.addMessage({class: 'flash-error', text: errors[i].msg})
          }
        }
        this.loading(false)
      })
      .catch( err => {
        // this is an error with the axios call or the API route that is not otherwise caught
        console.error(err)
      })
    },
    cancelPocket() {
      this.loading(true)
      axios.post('/api/v1/update/user/remove-pocket')
      .then( res => {
        this.addMessage(res.data)
        this.user.pocket = false
        this.loading(false)
      })
    }
  },
  template: `
  <section>
    <div v-if="user && user.admin">
      <button class="" type="button" onclick="location.href='/admin'">Admin</button>
    </div>
    <h3 class="form-label">Your Info</h3>
    <form v-if="editing" name="user-info" id="user-info" method="POST">
      <div class="user-form-vals">
        <label for="email">Email:</label>
        <input id="email" name="email" placeholder="name@example.com" v-model="user.email">
      </div>
      <div class="user-form-vals">
        <label for="twitter">Twitter:</label>
        <input id="twitter" name="twitter" placeholder="@alexbloggs" v-model="user.twitter">
      </div>
      <div class="user-form-vals">
        <label for="mastodon">Mastodon:</label>
        <input id="mastodon" name="mastodon" placeholder="@mastodon@example.social" v-model="user.mastodon">
      </div>
      <button class="update-button" v-on:click.prevent="updateUser" id="update-button">Update</button>
      <button class="update-button" v-on:click="editing = false">Cancel</button>
    </form>
    <div v-else>
      <div class="user-info">
        <div class="user-form-vals" id="email">
          <span class="form-label">Email: </span>
          <span v-if="user">{{ user.email }}</span>
        </div>
        <div class="user-form-vals" id="twitter">
          <span class="form-label">Twitter: </span>
          <span v-if="user">{{ user.twitter }}</span>
        </div>
        <div class="user-form-vals" id="mastodon">
          <span class="form-label">Mastodon: </span>
          <span v-if="user">{{user.mastodon }}</span>
        </div>
      </div>
      <button v-on:click="editing = true">Edit</button>
    </div>
    <form v-if="registered" id="pocket" class="pocket-info">
      <template v-if="user && user.pocket">
        <p>You are subscribed to receive articles straight to your <strong>{{ user.pocket.username }}</strong> Pocket list. Nice one!</p>
        <button v-on:click="this.cancelPocket" type="button">Cancel Pocket Subscription</button>
      </template>
      <button v-else type="button" onclick="location.href='/user/pocket'">Subscribe via Pocket</button>
    </form>
  </section>
  `
})

Vue.component('user-approved-blogs', {
  props: ['categories'],
  data () {
    return {
      userIdString: null,
      blogs : [],
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
        blog.deleting = false
        blog.editing = false
      })
      if (response.data.blogs.length == 0) {
        this.addMessage({class: 'flash-warning', text: 'You have no registered/approved blogs yet'})
      }
    })
    .catch( err => this.blogs = 'error')
  },
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    loading(bool) {
      this.$emit('loading', bool)
    },
    deleteBlog(blog) {
      var payload = {
        blog: event.target.id,
        action: 'delete'
      }
      this.loading(true)
      axios.post('/api/v1/update/user/delete-blog', payload)
      .catch( err => {
        console.log(`error with axios:\n${err}`)
      })
      .then( response => {
        var msg = response.data.msg || response.data.error
        this.addMessage(msg)
        blog.deleting = false
        if (!response.data.error){
         Vue.delete(this.blogs, this.blogs.indexOf(blog))
        }
        this.loading(false)
      })
      .catch( err => {
        console.log(`error deleting blog:\n${err}`)
      })
    },
    deletePendingBlogRegistration(blog) {
      var payload = {
        blog: event.target.id,
        action: 'delete'
      }
      this.loading(true)
      axios.post('/api/v1/update/user/delete-pending-registration', payload)
      .catch( err => {
        console.log(`error with axios:\n${err}`)
      })
      .then( response => {
        var msg = response.data.msg || response.data.error
        this.addMessage(msg)
        blog.deleting = false
        if (!response.data.error){
         Vue.delete(this.blogs, this.blogs.indexOf(blog))
        }
        this.loading(false)
      })
      .catch( err => {
        console.log(`error deleting blog registration:\n${err}`)
      })
    },
    editBlog(blog, index) {
      this.loading(true)
      axios
      .post('/api/v1/update/user/edit-blog', {
        url: blog.url,
        category: blog.category
      })
      .then( response => {
        var msg = response.data.msg || response.data.error
        this.addMessage(msg)
        blog.editing = false
        if (response.data.msg) {
          Vue.set(this.blogs, index, blog) // on success message, simply update the blog client-side
        }
        this.loading(false)
      })
    },
    cancelEditing(blog, index) {
      blog.editing = false
      Vue.set(this.blogs, index, blog)
    },
    checkingDeletion(blog) {
      blog.deleting = true
      Vue.set(this.blogs, this.blogs.indexOf(blog), blog)
    },
    checkingEditing(blog) {
      blog.editing = true
      Vue.set(this.blogs, this.blogs.indexOf(blog), blog)
    }
  },
  template: `
  <ul class="blog-list approved-blogs">
    <li v-for='blog in blogs' class="listed-blog" v-bind:class="{deleting: blog.deleting, editing: blog.editing}" v-bind:key="blog.id">
      <div class="approved-blog"></div>
      <span v-if="blog.title"><a v-bind:href="blog.url">{{ blog.title }}</a></span>
      <span v-else>{{ blog.url }}</span>
      <form class="blog-editing-form" v-if="blog.editing" name="blog-info" method="POST">
        <label for="category">Category:</label>
        <select v-model="blog.category" name="category">
          <option v-for="cat in categories" v-bind:value="cat">{{ cat }}</option>
        </select>
        <button class="" v-on:click.prevent="editBlog(blog, blogs.indexOf(blog))" id="update-button">Confirm update</button>
        <button class="" v-on:click.prevent="cancelEditing(blog, blogs.indexOf(blog))">Cancel</button>
      </form>
      <button class="" v-else v-bind:class="{hidden: blog.deleting}" v-on:click="checkingEditing(blog)" v-bind:id="blog.idString">Update</button>
      <button class="" v-if="blog.deleting" v-on:click="deleteBlog(blog)" v-bind:id="blog.idString">Confirm deletion</button>
      <span v-else-if="blog.editing"></span>
      <button class="" v-else v-on:click="checkingDeletion(blog)" v-bind:id="blog.idString">Delete</button>
    </li>
  </ul>
`
})

Vue.component('register-blog', {
  props: ['ublogs', 'categories'],
  data () {
    return {
      registering: false,
      url: null,
      category: null
    }
  },
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    loading(bool) {
      this.$emit('loading', bool)
    },
    validateUrl(input) {
      var regex = /http(s)?:\/\/([a-z0-9-_~:\/?#[\]@!$&'()*+,;=]*)(\.([a-z0-9-_~:\/?#[\]@!$&'()*+,;=]+)+)+/i
      return regex.test(input)
    },
    validate() {
      if (!this.validateUrl(this.url)) { 
        msg = {
          class: 'flash-error',
          text: 'please enter a valid url in the form http://example.com'
        }
        this.addMessage(msg)
      } else if (!this.category) {
        msg = {
          class: 'flash-error',
          text: 'you must select a category for your blog'
        }
        this.addMessage(msg)
      } else {
        this.registerBlog(this.url, this.category)
      }
    },
    registerBlog(url, category) {
      this.loading(true)
      axios
      .post('/api/v1/update/user/register-blog', {
        url: url, 
        category: category
      })
      .then( response => {
        var msg = response.data.msg
        this.addMessage(msg)
       // if we get an ok status, we just update the list, 
       // rather than sending the full data back and forth
        if (response.data.status === 'ok') {
          this.$emit( 'update-ublogs', {url: url, approved: false})
          this.registering = false
        }
        this.url = null
        this.category = null
        this.loading(false)
      })
      .catch(err => {
        this.addMessage({class: 'flash-error', text: err.message})
        this.loading(false)
      })
    }
  },
  template: `
  <section>
    <form v-if="registering" class="register-blog">
      <label for="url">URL:</label>
      <input v-model="url" type="url" name="url" size="60"><br/>
      <label for="category">Category:</label>
      <select v-model="category" name="category">
      <option v-for="cat in categories" v-bind:value="cat">{{ cat }}</option>
      </select>
      <button class="register-blog-button" v-on:click.prevent="validate()">Register blog</button>
      <button v-on:click="registering = false">Cancel</button>
      </form>
    <button v-else v-on:click="registering = true">Register a new blog</button>
  </section>
  `
  })

Vue.component('user-unapproved-blogs', {
  props: ['ublogs'],
  data () {
    return {
      category: null,
      url: null
    }
  },
  mounted () {},
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    checkingDeletion(blog) {
      blog.deleting = true
      Vue.set(this.ublogs, this.ublogs.indexOf(blog), blog)
    },
    deletePendingBlogRegistration(blog) {
      var payload = {
        blog: event.target.id,
        action: 'reject'
      }
      this.$emit('loading', true)
      axios.post('/api/v1/update/user/delete-pending-registration', payload)
      .catch( err => {
        console.log(`error with axios:\n${err}`)
      })
      .then( response => {
        var msg = response.data.msg || response.data.error
        this.addMessage(msg)
        blog.deleting = false
        if (!response.data.error){
         Vue.delete(this.ublogs, this.ublogs.indexOf(blog))
        }
        this.$emit('loading', false)
      })
      .catch( err => {
        console.log(`error deleting blog registration:\n${err}`)
      })
    },
    loading(bool) {
      this.$emit('loading', bool)
    }
  },
  template: `
  <ul class="blog-list unapproved-blogs" >
    <li v-for='blog in ublogs' v-bind:key="blog.idString" class="listed-blog">
      <div class="unapproved-blog"></div>
      <span v-if="blog.title"><a v-bind:href="blog.url">{{ blog.title }}</a></span>
      <span v-else>{{ blog.url }}</span>
      <span class="awaiting-approval"> - awaiting approval</span>
      <button class="" v-if="blog.deleting" v-on:click="deletePendingBlogRegistration(blog)" v-bind:id="blog.idString">Confirm cancellation</button>
      <span v-else-if="blog.editing"></span>
      <button class="" v-else v-on:click="checkingDeletion(blog)" v-bind:id="blog.idString">Cancel</button>
    </li>
  </ul>
  `
})

new Vue({
  el: '#main',
  data () {
    return {
      categories: [],
      messages: [],
      user: null,
      ublogs: [],
      processing: false,
      registered: false
    }
  },
  mounted () {
    axios
    .get('/api/v1/user/info')
    .then(response => {
      this.user = response.data
      this.registered = true
      if (response.data.error) { // if the user is not registered yet
        this.messages.push(response.data.error)
        this.registered = false
      }
    })
    .catch( err => console.error(err))

    axios
    .get('/api/v1/user/unapproved-blogs')
    .then(response => {
      this.ublogs = response.data
    })
    .catch( err => console.error(err))

    axios
    .get('/api/v1/categories')
    .then( res => {
      this.categories = res.data.categories
    })
    .catch( err => console.error(err))

  },
  methods: {
    updateUblogs(args) {
      Vue.set(this.ublogs, this.ublogs.length, args) // add to the end of the blogs list
    },
    addMessage(msg) {
      this.messages.push(msg)
    },
    removeMessage(msg) {
      // fired when click on X to get rid of it
      Vue.delete(this.messages, this.messages.indexOf(msg))
    },
    loading(bool) {
      this.processing = bool
    },
    userRegistered() {
      this.registered = true
    }
  }
})