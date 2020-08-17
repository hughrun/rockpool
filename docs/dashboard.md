# User dashboard

The user dashboard allows users to:

* update their email address
* provide and edit Twitter and Mastodon usernames
* register or delete their blog/s
* subscribe/unsubscribe to new blog articles using their Pocket account
* access the admin interface if they are an admin

## Logging in

Rockpool uses [`passwordless`](https://github.com/florianheinemann/passwordless) for logins, removing the need to store passwords, and enabling a smooth and simple login mechanism. Since users are unlikely to need to log in regularly, this keeps things simple.

To log in, go to the login page (`/letmein`), enter a valide email address, and submit the form. On receiving the login email, click the link and you will be logged in to the app.

## User details

Users initially can provide a Twitter handle and Mastodon handle. These will be used when tweeting or tooting their latest posts, e.g. _"Introducing Rockpool - by @hughrundle [link]"_. The email field cannot be blank (otherwise they will never be able to log in again!) but the other two can be. If a user changes their email address they will automatically be logged out so that there is no confusion about which email is the correct one.

## Registering a blog

To register a blog, click the `Register a new blog` button. Enter the blog URL, select a category from the drop down list, and click **Register new blog**. Available categories are listed in the `blog_categories` array in `settings.json`. Note that unlike previous versions of _Aus GLAM Blogs_, it is the main URL of the blog you enter here, not the URL of the RSS feed.

Until it is approved by an admin, your blog will be listed under _Your Blogs_ as awaiting approval.

## Claiming a blog

In legacy databases, users can _claim_ an unowned blog. This is done on the [Browse page](browse.md), rather than the user dashboard.

## Cancelling a pending blog

If you have registered or claimed a blog but your registration hasn't yet been approved, you can cancel it. Simply click 'cancel' next to the 'unnapproved' blog.

## Editing and deleting a blog

Once your blog (or claim) is approved, your blog will be listed under _Your Blogs_ and you will have the option to _edit_ or _delete_ it. Editing allows you to change the category the blog is listed under. Deleting will remove the blog from the database and stop further articles from being added, but will not delete old article listings.

## Subscribing with Pocket

Rockpool allows users to subscribe to the 'firehose' of articles via Pocket, which will add every article to your Pocket list as it is ingested into the app.

To subscribe via Pocket, go to the `/subscribe` page and click on the Pocket icon. This will take you through the Pocket app authorisation process where you log in to Pocket (if necessary), then authorise the app. You will then be returned to the `/user` page (not `/subscribe`) if succesful, or back to the `/subscribe` page if there is an error. To subscribe via Pocket users must be logged in.

To unsubscribe, simply click the **Cancel Pocket subscription** button in the user dashboard. You should also remove access to the app from [your Pocket Connected Applications page](https://getpocket.com/connected_applications).

---
[Home](/README.md)  
[Database structure](database.md)  
[Installation](installation.md)  
[Maintenance](maintenance.md)  
[Search](search.md)  
[User dashboard](dashboard.md)  
[Admin dashboard](admin.md)  
[Browse page](browse.md)  
[Contributing](docs/contributing.md)  