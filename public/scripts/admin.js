const messages = []

var userMessages =  new Vue({
  el: '#user-messages',
  data() {
    return {
      messages: messages
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

// Define a new component called button-counter
Vue.component('blogs-for-approval', {
  props: ['blogs', 'email', 'reason'],
  template: `
  <ul v-for="blog in blogs" class="blog-list">
  <li>
    <form>
      <a v-bind:href="blog.url" v-bind:class="{ deleting: blog.rejecting }">{{ blog.url }}</a>
      <div v-if="blog.rejecting">
        <label for="reject-reason">Reason for rejecting:</label><br>
        <textarea v-model="reason" cols="40" rows="6" required></textarea>
        <button class="confirm-button" v-on:click.prevent="confirmRejection(blog)">Confirm rejection</button>
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
      .then( () => {
        Vue.delete(this.blogs, this.blogs.indexOf(blog))
      })
      .catch( err => {
        msg = {
          class: 'flash-error',
          text: 'Something went wrong approving that blog.'
        }
        messages.push(msg)
      })
    },
    reject(blog) {
      blog.rejecting = true
      Vue.set(this.blogs, this.blogs.indexOf(blog), blog)
    },
    confirmRejection(blog) {
      if (this.reason) {
      axios
      .post('/api/v1/update/admin/reject-blog', {
        user: this.email,
        url: blog.url,
        blog: blog.idString,
        reason: this.reason
      })
      .then( () => {
        Vue.delete(this.blogs, this.blogs.indexOf(blog))
      })
      .catch( err => {
        msg = {
          class: 'flash-error',
          text: 'Something went wrong rejecting that blog.'
        }
        messages.push(msg)
      })
      } else {
        msg = {
          class: 'flash-error',
          text: 'You must provide a reason for rejecting this blog. Your reason will be emailed to the user.'
        }
        messages.push(msg)
      }
    }
  },
  mounted () {

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