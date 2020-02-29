Vue.component('message-list', {
  props: ['messages'],
  template: `
<div v-if="messages" id="user-messages">
  <div v-for="msg in messages" class="blog-list">
  <li v-bind:class="msg.class">
    <span class="message-text">{{ msg.text }}</span>
    <span class="flash-close" v-on:click="removeMessage(msg)">
    X
    </span>
  </li>
  </div>
</div>
  `,
  data() {
    return {
      messages: this.messages
    }
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

Vue.component('reject-reason', {
  props: ['blog', 'email'],
  data () {
    return {
      reason: null,
      email: null,
      blog: null,
    }
  },
  template: `
  <div>
  <label for="reject-reason">Reason for rejecting:</label><br/>
  <textarea name="reject-reason" v-model="reason" cols="40" rows="6" required></textarea>
  <button class="" v-on:click.prevent="confirmRejection">Confirm rejection</button>
  </div>
  `,
  methods: {
    confirmRejection() {
      if (this.reason) {
      axios
      .post('/api/v1/update/admin/reject-blog', {
        user: this.email,
        url: this.blog.url,
        blog: this.blog.idString,
        reason: this.reason
      })
      .then( () => {
        this.$emit('reject-blog', this.blog)
      })
      .catch( err => {
        console.log(err)
        msg = {
          class: 'flash-error',
          text: 'Something went wrong rejecting that blog.'
        }
        this.$emit('add-message', msg)
      })
      } else {
        msg = {
          class: 'flash-error',
          text: 'You must provide a reason for rejecting this blog. Your reason will be emailed to the user.'
        }
        this.$emit('add-message', msg)
      }
    }
  }
})

Vue.component('blogs-for-approval', {
  props: ['blogs', 'email'],
  data () {
    return {}
  },
  template: `
  <ul class="blog-list">
    <li v-for="blog in blogs">
      <form>
        <a v-if="blog.title" v-bind:href="blog.url" v-bind:class="{ deleting: blog.rejecting }">{{ blog.title }}</a>
        <a v-else v-bind:href="blog.url" v-bind:class="{ deleting: blog.rejecting }">{{ blog.url }}</a>
        <div v-if="blog.rejecting">
          <reject-reason 
            v-bind:blog="blog" 
            v-bind:email="email" 
            @reject-blog="rejectBlog" 
            @add-message="addMessage"
          ></reject-reason>
        </div>
        <span v-else>
          <button  v-if="blog.approving" class="" v-on:click.prevent="confirmApproval(blog)">Confirm Approval</button>
          <button v-else class="" class="approve-button" v-on:click.prevent="approve(blog)">Approve</button>
          <button class="reject-button"  v-on:click.prevent="reject(blog)" type="button">Reject</button>
        </span>
      </form>
    </li>
  </ul>
  `,
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    approve(blog) {
      blog.approving = true
      Vue.set(this.blogs, this.blogs.indexOf(blog), blog)
    },
    confirmApproval(blog) {
      axios
      .post('/api/v1/update/admin/approve-blog', {
        user: this.email,
        url: blog.url,
        blog: blog.idString,
        reason: this.reason
      })
      .then( res => {
        this.addMessage(res.data)
        if (res.data.class === "flash-success") {
          Vue.delete(this.blogs, this.blogs.indexOf(blog))
        }
      })
      .catch( err => {
        msg = {
          class: 'flash-error',
          text: 'Something went wrong approving that blog.'
        }
        this.addMessage(msg)
      })
    },
    reject(blog) {
      blog.rejecting = true
      Vue.set(this.blogs, this.blogs.indexOf(blog), blog)
    },
    rejectBlog(blog) {
      // TODO: here we should check length of this.blogs and if 1, $emit a remove-approval up the chain
      Vue.delete(this.blogs, this.blogs.indexOf(blog))
      this.$emit('add-message', {class: 'flash-success', text: `${blog.url} rejected`})
    }
  }
})

Vue.component('users-with-approvals', {
  // props: ['approvals'],
  mounted() {
    axios
    .get('/api/v1/admin/blogs-for-approval')
    .then( res => {
      this.approvals = res.data
    })
    .catch( e => {
      console.log(e)
    })
  },
  data() {
    return {
      messages: [],
      legacy: legacy,
      approvals: null
    }
  },
  template: `
  <section v-if="approvals">
  <h2>Awaiting Approval</h2>
  <div v-for="user in approvals" class="claimed-blogs">
    <div><strong>Email:</strong> <a v-bind:href="'mailto:' + user.email">{{ user.email }}</a></div>
    <div><strong>Twitter:</strong> <a v-bind:href="'https://twitter.com/' + user.twitter">{{ user.twitter }}</a></div>
    <div><strong>Mastodon:</strong> {{ user.mastodon }}</div>
    <div v-if:legacy><strong>Claiming or Awaiting Approval:</strong></div>
    <div v-else><strong>Awaiting Approval:</strong></div>
    <blogs-for-approval 
      v-bind:blogs="user.claims" 
      v-bind:email="user.email" 
      @add-message="addMessage" 
    ></blogs-for-approval>
  </div>
  <div v-else>There are no blogs awaiting approval.</div>
  </section>
  `,
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    }
  }
})

Vue.component('failing-blog', {
  props: ['blog'],
  data () {
    return {
      editing: false,
      reason: null,
      messages: []
    }
  },
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    editBlog() {
      this.editing = true
    },
    deleteBlog(blog, reason) {
      if (!reason) {
        this.addMessage({
          class: 'flash-error',
          text: `You must provide a reason for deleting this blog`
        })
      } else {
      this.editing = false
      this.reason = null
      this.$emit('delete-blog', blog, reason)
      }
    },
    suspendBlog(blog, reason) {
      if (!reason) {
        this.addMessage({
          class: 'flash-error',
          text: `You must provide a reason for suspending this blog`
        })
      } else {
      this.editing = false
      this.reason = null
      this.$emit('suspend-blog', blog, reason)
      }
    }
  },
  template: `
  <div class="blog-list">
  <div>
    <br/>
    <a v-bind:href="blog.url">{{ blog.url }}</a> | <a class="feed-link" v-bind:href="blog.feed">feed</a>
  </div>
  <div v-if="editing">
  <label>Reason for suspending/deleting:</label><br/>
  <textarea v-model="reason" cols="40" rows="6" required></textarea>
  <button class="reject-button" @click.prevent="deleteBlog(blog, reason)">Delete</button>
  <button class="" @click.prevent="suspendBlog(blog, reason)">Suspend</button>
  </div>
  <button v-else @click.prevent="editBlog" class="failing-suspended-button">Delete or suspend</button>
</div>
  `
})

Vue.component('failing-blogs-list', {
  data () {
    return {
      messages: [],
      failing: [],
      suspended: []
    }
  },
  mounted () {
    axios
    .get('/api/v1/admin/failing-blogs')
    .then( res => {
      this.failing = res.data
    })

    axios
    .get('/api/v1/admin/suspended-blogs')
    .then( res => {
      this.suspended = res.data
    })
  },
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    deleteBlog(blog, reason) {
      // delete blog from server
      axios
      .post('/api/v1/update/admin/delete-blog', {
        blog: blog.idString,
        url: blog.url,
        reason: reason
      })
      .then( res => {
        this.addMessage(res.data) // then add message
        if (res.data.class === 'flash-success') {
          Vue.delete(this.failing, this.failing.indexOf(blog)) // then remove from blogs list
        }
      })
      .catch(err => {
        this.addMessage({class: 'flash-error', text: err.message})
      })
    },
    suspendBlog(blog, reason) {
      // suspend blog on server
      let data = blog
      data.reason = reason
      axios
      .post('/api/v1/update/admin/suspend-blog', data)
      .then( res => {
        this.addMessage(res.data) // then add message
        if (res.data.class === 'flash-success') {
          Vue.set(this.suspended, this.suspended.length, blog) // then add to the suspended list
        }
      })
    }
  },
  template: `
  <section>
    <h2>Failing feeds</h2>
    <section v-if="failing" class="claimed-blogs">
      <p>
      These blog feeds are currently failing. 
      You can either delete them completely, or suspend them pending further research or changes. 
      Posts published whilst a blog is suspended will never be included, even if you lift the suspension later. 
      </p>
      <p>
      Note that this may be a temporary glitch: always do your homework before deleting a blog.
      </p>
      <form v-for="blog in failing" class="claimed-blogs">
        <failing-blog 
        v-bind:blog="blog"
        @delete-blog="deleteBlog"
        @suspend-blog="suspendBlog"
        @add-message="addMessage"></failing-blog>
      </form>
    </section>
    <div v-else>You have no failing feeds to attend to.</div>
    <suspended-blogs @add-message="addMessage" v-bind:suspended="suspended"></suspended-blogs>
    <suspend-blog @add-message="addMessage" @suspend-blog="suspendBlog"></suspend-blog>
  </section>
  `
})

Vue.component('suspended-blog', {
  props: ['blog'],
  data () {
    return {
      editing: false,
      reason: null
    }
  },
  methods: {
    editBlog() {
      this.editing = true
    },
    deleteBlog(blog, reason) {
      if (!reason) {
        this.$emit('add-message', {
          class: 'flash-error',
          text: `You must provide a reason for deleting this blog`
        })
      } else {
      this.editing = false
      this.reason = null
      this.$emit('delete-blog', blog, reason)
      }
    },
    unsuspendBlog(blog) {
      this.$emit('unsuspend-blog', blog)
    }
  },
  template: `
  <div class="blog-list">
  <div>
    <br/>
    <a v-bind:href="blog.url">{{ blog.url }}</a> | <a class="feed-link" v-bind:href="blog.feed">feed</a>
  </div>
  <div v-if="editing">
  <label>Reason for suspending/deleting:</label><br/>
  <textarea v-model="reason" cols="40" rows="6" required></textarea>
    <button class="failing-suspended-button" @click.prevent="deleteBlog(blog, reason)">Confirm Deletion</button>
  </div>
  <button v-else @click.prevent="editBlog">Delete</button>
  <button class="failing-suspended-button" @click.prevent="unsuspendBlog(blog)">Lift suspension</button>
</div>
  `
})

Vue.component('suspended-blogs', {
  props: ['suspended'],
  data () {
    return {
      messages: []
    }
  },
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    deleteBlog(blog,reason) {
      axios
      .post('/api/v1/update/admin/delete-blog', {url: blog.url}) // delete blog
      .then( res => {
        this.addMessage(res.data) // then add message
        if (res.data.class === 'flash-success') {
          Vue.delete(this.suspended, this.suspended.indexOf(blog)) // then remove from blogs list
        }
      })
      .catch(err => {
        this.addMessage({class: 'flash-error', text: err.message})
      })
    },
    unsuspendBlog(blog) {
      axios
      .post('/api/v1/update/admin/unsuspend-blog', {url: blog.url}) // suspend blog
      .then( res => {
        this.addMessage(res.data) // then add message
        if (res.data.class === 'flash-success') {
          Vue.delete(this.suspended, this.suspended.indexOf(blog)) // then remove from blogs list
        }
      })
      .catch(err => {
        this.addMessage({class: 'flash-error', text: err.message})
      })
    }
  },
  template: `
  <div>
    <h3>Suspended Blogs</h3>
    <form v-for="blog in suspended" class="claimed-blogs">
      <suspended-blog 
      v-bind:blog="blog"
      @add-message="addMessage"
      @delete-blog="deleteBlog"
      @unsuspend-blog="unsuspendBlog"></suspended-blog>
    </form>
  </div>
  `
})

Vue.component('suspend-blog', {
  data () {
    return {
      messages: [],
      url: null,
      reason: null
    }
  },
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    suspendBlog() {
      if (!this.reason) {
        this.addMessage({
          class: 'flash-error',
          text: `You must provide a reason for suspending this blog`
        })
      } else if (!this.url) {
        this.addMessage({
          class: 'flash-error',
          text: `You must provide the URL of the blog to suspend!`
        })
      } else {
      this.$emit('suspend-blog', {url: this.url}, this.reason)
      this.url = null
      this.reason = null
      }
    }
  },
  template: `
  <div>
    <h3>Suspend Blog</h3>
    <form class="claimed-blogs">
      <label>URL of blog to suspend:</label><br/>
      <input v-model="url" type="url" size="40"><br/>
      <label>Reason for suspending:</label><br/>
      <textarea v-model="reason" cols="40" rows="6" required></textarea><br/>
      <button @click.prevent="suspendBlog">Suspend</button>
    </form>
  </div>
  `
})

Vue.component('admin-info', {
  props: ['admin'],
  data () {
    return {
      editing: false
    }
  },
  methods: {
    editAdmin() {
      this.editing = true
    },
    removeAdmin(admin) {
      this.$emit('remove-admin', admin)
    }
  },
  template: `
  <div>
    {{ admin.email }}
    <button v-if="editing" @click.prevent="removeAdmin(admin)">Confirm removal</button>
    <button v-else @click.prevent="editAdmin">Remove as admin</button>
  </div>
  `
})

Vue.component('admins-list', {
  data () {
    return {
      admins: []
    }
  },
  mounted () {
    axios
    .get('/api/v1/admin/admins')
    .then( res => {
      this.admins = res.data
    })
  },
  methods: {
    addMessage(msg) {
      this.$emit('add-message', msg)
    },
    removeAdmin(admin) {
      axios
      .post('/api/v1/update/admin/remove-admin', {user: admin.email})
      .then( res => {
        this.addMessage(res.data)
        if (res.data.class === 'flash-success') {
          Vue.delete(this.admins, this.admins.indexOf(admin))
        }
      })
    },
    addAdmin(admin) {
      axios
      .post('/api/v1/update/admin/make-admin', {user: admin.email})
      .then( res => {
        this.addMessage(res.data)
        if (res.data.class === 'flash-success') {
          Vue.set(this.admins, this.admins.length, admin)
        }
      })
    }
  },
  template: `
    <section>
      <h2>Administrators</h2>
      <div v-if="admins.length">
        <h3>Remove admin rights</h3>
        <div v-for="admin in admins" class="admins-list">
          <admin-info 
          v-bind:admin="admin"
          @remove-admin="removeAdmin"></admin-info>
        </div>
      </div>
      <div v-else>
        <p><strong>You are currently the only administrator.</strong></p> 
        <p>You should add someone else in case you get hit by a bus.</p>
      </div>
      <make-admin @add-admin="addAdmin"></make-admin>
    </section>
    `
})

Vue.component('make-admin', {
  data () {
    return {
      user: []
    }
  },
  methods: {
    assignAdmin(user) {
      this.$emit('add-admin', {email: user})// then add to user array in parent
      this.user = null // clear form
    }
  },
  template: `
  <div class="assign-admin">
    <h3>Assign admin rights</h3>
    <p>Only make trusted users an administrator - they will have the power to remove your own admin rights!</p>
    <form>
      <label class="form-label" for="user">User email:</label>
      <input v-model="user" type="email" size="40">
      <button class="add-button" @click.prevent="assignAdmin(user)">Assign admin</button>
    </form>
  </div>
  `
})

new Vue({
  el: '#main',
  data () {
    return {
      messages: []
    }
  },
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
    },
    removeMessage(msg) {
      // fired when click on X to get rid of it
      Vue.delete(this.messages, this.messages.indexOf(msg))
    }
  }
})