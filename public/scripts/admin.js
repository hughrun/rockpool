Vue.component('message-list', {
  props: ['messages'],
  template: `
<div v-if="messages" id="user-messages">
  <div v-for="msg in messages" class="blog-list">
    <div v-bind:class="msg.class">{{ msg.text }}</div>
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
      // fired when click on X to get rid of it
      // reloading the page will also remove any messages that aren't in the DB
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
  <button class="confirm-button" v-on:click.prevent="confirmRejection">Confirm rejection</button>
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
        <a v-bind:href="blog.url" v-bind:class="{ deleting: blog.rejecting }">{{ blog.url }}</a>
        <div v-if="blog.rejecting">
          <reject-reason v-bind:blog="blog" v-bind:email="email" @reject-blog="rejectBlog" @add-message="addMessage"></reject-reason>
        </div>
        <span v-else>
          <button  v-if="blog.approving" class="confirm-button" v-on:click.prevent="confirmApproval(blog)">Confirm Approval</button>
          <button v-else class="confirm-button" class="approve-button" v-on:click.prevent="approve(blog)">Approve</button>
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
  props: ['approvals'],
  data() {
    return {
      legacy: legacy,
      messages: []
    }
  },
  template: `
  <section v-if="approvals">
  <h2>Awaiting Approval</h2>
  <message-list v-bind:messages="messages"></message-list>
  <div v-for="user in approvals" class="claimed-blogs">
    <div><strong>Email:</strong> <a v-bind:href="'mailto:' + user.email">{{ user.email }}</a></div>
    <div><strong>Twitter:</strong> <a v-bind:href="'https://twitter.com/' + user.twitter">{{ user.twitter }}</a></div>
    <div><strong>Mastodon:</strong> {{ user.mastodon }}</div>
    <div v-if:legacy><strong>Claiming or Awaiting Approval:</strong></div>
    <div v-else><strong>Awaiting Approval:</strong></div>
    <blogs-for-approval 
    v-bind:blogs="user.claims" 
    v-bind:email="user.email" 
    @add-message="addMessage"></blogs-for-approval>
  </div>
  <div v-else>There are no blogs awaiting approval.</div>
  </section>
  `,
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
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
    editBlog() {
      this.editing = true
    },
    deleteBlog(blog, reason) {
      if (!reason) {
        this.messages.push({
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
        this.messages.push({
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
  <message-list v-bind:messages="messages"></message-list>
  <div v-if="editing">
  <label>Reason for suspending/deleting:</label><br/>
  <textarea v-model="reason" cols="40" rows="6" required></textarea>
    <button class="delete-button" @click.prevent="deleteBlog(blog, reason)">Delete</button>
    <button class="delete-button" @click.prevent="suspendBlog(blog, reason)">Suspend</button>
  </div>
  <button v-else @click.prevent="editBlog">Delete or suspend</button>
</div>
  `
})

Vue.component('failing-blogs-list', {
  data () {
    return {
      blogs: [],
      messages: []
    }
  },
  mounted () {
    axios
    .get('/api/v1/admin/failing-blogs')
    .then( res => {
      this.blogs = res.data
    })
  },
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
    },
    deleteBlog(blog, reason) {
      // TODO:
      this.addMessage({class: 'flash-success', text: 'I am deleting!'})
      console.log("I'm deleting " + blog.url)
      console.log(`the reason for deleting is ${reason}`)
      // delete blog from server
      // then add message
      // then remove from blogs list
    },
    suspendBlog(blog, reason) {
      // suspend blog on server
      let data = blog
      data.reason = reason
      axios
      .post('/api/v1/update/admin/suspend-blog', data)
      .then( res => {
        this.addMessage(res.data) // then add message
        Vue.delete(this.blogs, this.blogs.indexOf(blog)) // then remove from blogs list
      })
    }
  },
  template: `
  <section>
    <h2>Failing feeds</h2>
    <section v-if="blogs" class="claimed-blogs">
      <p>
      These blog feeds are currently failing. 
      You can either delete them completely, or suspend them pending further research or changes. 
      Posts published whilst a blog is suspended will never be included, even if you lift the suspension later. 
      </p>
      <p>
      Note that this may be a temporary glitch: always do your homework before deleting a blog.
      </p>
      <form v-for="blog in blogs" class="claimed-blogs">
        <failing-blog 
        v-bind:blog="blog"
        @delete-blog="deleteBlog"
        @suspend-blog="suspendBlog"></failing-blog>
      </form>
    </section>
    <div v-else>You have no failing feeds to attend to.</div>
  </section>
  `
})

new Vue({
  el: '#main',
  data () {
    return {
      approvals: [],
    }
  },
  mounted() {
    axios
    .get('/api/v1/admin/blogs-for-approval')
    .then( res => {
      this.approvals = res.data
    })
    .catch( e => {
      console.log(e)
    })
  }
})