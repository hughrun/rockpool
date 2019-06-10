# User dashboard

The user dashboard allows users to:

* register a blog
* subscribe to the main feed using their Pocket account
* provide and edit Twitter and Mastodon usernames
* update their email address
* access the admin interface if they are an admin

## Logging in

Rockpool uses [`passwordless`](https://github.com/florianheinemann/passwordless) for logins, removing the need to store passwords, and enabling a smooth and simple login mechanism. Since users are unlikely to need to log in regularly, this keeps things simple.

## User details

Users initially can provide a Twitter handle and Mastodon handle. These will be used when tweeting or tooting their latest posts, e.g. _"Introducing Rockpool - by @hughrundle [link]"_. The email field cannot be blank (otherwise they will never be able to log in again!) but the other two can be. If a user changes their email address they will automatically be logged out so that there is no confusion about which email is the correct one.

## Registering a blog

TODO

## Editing and deleting a blog

TODO

## Subscribing with Pocket

TODO

---
[Home](/) <br>
[Installation](installation.md)
[Search](search.md)