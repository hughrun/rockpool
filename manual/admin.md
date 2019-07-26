# Admin dashboard

The admin dashboard allows users with admin permission to:

* approve or deny blog claims (legacy DB) and registrations
* delete failing feeds
* add and remove other administrators

## Accessing the admin dashboard

The administrator dashboard provides access to admin functionality and can be accessed by users with a `permission` value set to `admin`. A button to the admin dashboard will appear on an administrator's user dashboard.

## Managing blog approvals

Pending approvals will be listed under _Awaiting approval_. Each blog will be listed under information about the user, includig their email address, twitter handle and mastodon account (if these are listed). This may assist the administrator in making a decision about whether to approve the registration or claim. What suffices as adequate 'proof' of ownership of the blog is up to the administrators of each app, though guidelines should be provided on the Help page.

Blogs/claims may be approved or denied. If denied, a reason must be provided. All blog approvals and denials will send an email to the registering user.

## Managing failing feeds

Feeds 'fail' when they can no longer be parsed by `feedparser`. This usually happens because the site is down, but can also happen if the RSS or Atom feed is no longer readable for some reason. Feeds that failed last time Rockpool attempted to read them will be listed under _Failing feeds_. This can be a good way to identify sites that have disappeared completely, become 'private', or can no longer be parsed for some other reason.

Caution is advised before deleting these blogs: feeds can 'fail' temporarily for all sorts of reasons, including temporary server downtime. However if a feed has been failing for a long time you may wish to proactively delete the blog from your database rather than waiting for the owner to do so. Deleting a failing feed will send an email to the blog owner (if there is one).

## Managing other administrators

You can make another user an administrator by entering their email address in the text field under _Administrators_. Note that the user must already be registered in your Rockpool database. All users with admin rights are listed under _Administrators_, except for the logged-in user. **All admins have the ability to remove all other admins and add any other user as an admin**. Be careful who you give admin rights to. On the other hand, you should ensure that at least two people have admin rights, in case something happens. To remove an admin simply click the **Remove as admin** button next to their email address. Note that an administrator cannot remove their own admin permission.

---
[Home](/)  
[Database structure](database.md)  
[Installation](installation.md)  
[Search](search.md)  
[User dashboard](dashboard.md)  
[Admin dashboard](admin.md)  
