Vue.component('message-list', {
  // el: '#user-messages',
  props: ['messages'],
  template: `
<div v-if="messages" id="user-messages">
  <ul v-for="msg in messages" class="blog-list">
    <li v-bind:class="msg.class">{{ msg.text }}</li>
  </ul>
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
        // TODO:this is where we push up to parent
        this.$emit('reject-blog', this.blog)
      })
      .catch( err => {
        console.log(err)
        msg = {
          class: 'flash-error',
          text: 'Something went wrong rejecting that blog.'
        }
        this.$emit('add-message', msg)
        // messages.push(msg)
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

// Define a new component 
Vue.component('blogs-for-approval', {
  props: ['blogs', 'email'],
  data () {
    return {
      messages: []
    }
  },
  template: `
  <div>
  <message-list v-bind:messages="messages"></message-list>
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
</div>
  `,
  methods: {
    addMessage(msg) {
      this.messages.push(msg)
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
        messages.push(res.data)
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
    }
  }
})

var unapprovedBlogs = new Vue({
  el: '#blogs-for-approval',
  data() {
    return {
      approvals: []
    }
  },
  mounted() {
    axios
    .get('/api/v1/admin/blogs-for-approval')
    .then( response => {
      this.approvals = response.data
    })
    .catch( e => {
      console.log(e)
    })
  }
})