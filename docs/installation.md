# Installation Instructions

**THESE INSTRUCTIONS ARE INCOMPLETE AND LIABLE TO CHANGE AT ANY MOMENT.**

To install `rockpool`, you should follow these steps in order:

1. Register an app with [Pocket](), and optionally with [Twitter](https://developer.twitter.com/en/docs/basics/getting-started) and [Mastodon](https://docs.joinmastodon.org/)
2. Ensure you have the SMTP details for an admin email account. The recommended way to do this is via [Mailgun](https://www.mailgun.com/) or a similar service.
2. install Docker
3. download rockpool either using `git` or [via zip download](https://github.com/hughrun/rockpool/releases)
4. copy `settings-example.json` to `settings.json` and fill in the relevant values
5. run `NODE_ENV=production npm run setup`
6. optionally run `NODE_ENV=production npm run migrate`
7. run `npm run setup`

## Registering external services

### Mastodon

The official documentation for Mastodon is ok for general users, but incomplete for 'power users' and casual system administrators. To register your application, log in to the user account you want to use for it and navigate to `https://example.com/settings/applications`. You can then simply click `New Application` and fill in the application name and website details, and save. Back in `settings/applications` you can now click on the name of the app to get the `access_token` which is what you need for Rockpool.

### Twitter

Twitter is a PITA to register new applications with, because they have a vetting service where some 24 year old techbro from "the Bay Area" decides whether your app is worthy of joining their giant binfire. We use the "standard API" in Rockpool. Read [the Twitter developer docs](https://developer.twitter.com/en/docs/basics/getting-started) to get started.

## Installing Docker

**Rockpool** runs in Docker and uses MongoDB for all data.

TODO: info on installing Docker and docker-compose.

### Security

Your database **must** use https and **must** have [Access Control](https://docs.mongodb.com/manual/tutorial/enable-authentication/) enabled. Although Mongo will allow you to use a locally installed database without authentication, **Rockpool** expects a username and password. This is deliberate, so that you don't accidentally forget to secure your DB.

TODO: **MORE ON SECURING MONGO HERE**

## Settings

Copy `settings-example.json` to a file called `settings.json`. This is where all your custom values will go, including database login info etc. Keep it secret, keep it safe.

| setting | description   | required? |
| ---:  |   :---        |   :--- |
| `app_name` | The name of your app. Will appear in the header and the title of each page, as well as in emails and a few other places | `required` |
| `app_tagline` | Appears in the header | `optional`
| `app_description` | Appears in the header | `optional` |
| `org_name` | Name of the organisation responsible for administering your community. Appears in the footer | `required` |
| `org_url` | Website address of your organisation's website. Appears in the footer | `required` |
| `blog_club_name` | Name of your blog club. | `optional` |
| `blog_club_url` | Website for your blog club. | `optional` unless there is a blog_club_name |
| `blog_club_tag` | Tag (category) used by bloggers when participating in your blog club. | `optional` unless there is a blog_club_name |
| `blog_club_hashtag` | Hashtag used when tooting or tweeting posts containing the `blog_club_tag` | `optional` unless there is a blog_club_name |
| `blog_categories` | Categories that community members can choose from when registering a blog | `required` |
| `excluded_tags` | articles with one or more of these tags will be ignored by the app and not ingested or announced | `required`, but may be an empty array. |
| `filtered_tags` | None of these tags will be added to the database record of a post (i.e. these are like "stop words") | `required`, but may be an empty array. |
| `legacy_db` | Indicates whether the database has been migrated from a `CommunityTweets` application. Should nearly always be set to `false`. | `required` |
| `tag_transforms` | An object of key:value pairs where any tags on the left (the key) will be changed to the tag on the right (the value) before being ingested into the database. You can use this to normalise tags within the app despite not having any control over how users tag their articles. If you're interested, my blog has [more information about how this works and the philosophy behind it](https://www.hughrundle.net/better-out-than-in/). | `required`, but may be an empty object. |
| `show_credits` | Indicates whether to show "Made by Hugh Rundle for newCardigan" in the footer | `required` |
| **production** | There are a number of values within the `production` object setting usernames, passwords, keys and so on. | `required` |
| `admin_user` | The email address of the first administrator. This allows you to set someone (you, probably) as a default administrator when they log in: effectively they are pre-registered | `required` |
| `app_url` | The URL of your app. This is used in administration emails | `required` |
| `mongo_url` | The URL of your mongodb instance. In most cases this should be `"mongodb://localhost"` | `required` |
| `mongo_port` | The port number of your mongodb instance. In most cases this should be `"27017"` | `required` |
| `mongo_user` | The username of your mongo user. Note this is the username in mongo, not the operating system user. | `required` |
| `mongo_password` | Use a good password for your mongo user. | `required` |
| `express_session_secret`  | Secret used by `express-session` [to sign session cookies](https://github.com/expressjs/session#secret). Should be a random phrase. | `required` |
| `cookie_parser_secret`  | Secret used by [`cookie-parser`](https://github.com/expressjs/cookie-parser#readme). Should be a random phrase. | `required` |
| `mongo_db` | The name of the database | `required` |
| `deliver_tokens_by` | In development you can set this to `"clipboard"` so that your login code is sent to the clipboard instead of via email. In test this should always be set to `"clipboard"`. **In production this must always be set to `"email"`**. | `required` |
| `email` | Rockpool requires an SMTP email account to send system emails, using [emailjs](https://github.com/eleith/emailjs). You can use a personal Outlook or Hotmail etc account, but I recommend a service like [Mailgun](https://www.mailgun.com/) which will be free unless your app becomes enormously popular. | `required` in production and development |
| `pocket_consumer_key` | You need to [register your app with Pocket](https://getpocket.com/developer/docs/authentication) (see setup instuctions). This is your `consumer_key` from Pocket. | `required` |
| `twitter` | An object for all information relating to Twitter. | `required` |
| `twitter.use_twitter` | Boolean indicating whether you are using Twitter with your app. If set to `false` you do not need to enter any other values in `twitter`. | required |
| `twitter.hours_between_tweets` | number indicating the number of hours between tweeting the same article. | `required` if using Twitter |
| `twitter.number_of_tweets_per_article` | how many times to tweet the same article | `required` if using Twitter |
| `twitter.consumer_key` | Twitter [consumer key](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.consumer_secret` | Twitter [consumer secret](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.access_token` | Twitter [access_token](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.access_token_secret` | Twitter [access_token_secret](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `mastodon` | An object for all information relating to Mastodon. | `required` |
| `mastodon.use_mastodon` | Boolean indicating whether you are using Mastodon with your app. If set to `false` you do not need to enter any other values in `mastodon`. | required |
| `mastodon.hours_between_toots` | number indicating the number of hours between tooting the same article. | `required` if using Mastodon |
| `mastodon.number_of_toots_per_article` | how many times to toot the same article | `required` if using Mastodon |
| `mastodon.domain_name` | Domain name of the Mastodon server your app's account is part of. | `required` if using Twitter |
| `mastodon.access_token` | Mastodon access token for your app. | `required` if using Mastodon |
| `announce_articles_newer_than_hours` | Any blog posts older than this number of hours will be ingested to the database but not announced via Twitter or Mastodon. | `required` |
| `minutes_between_announcements` | The number of minutes between announcements on Twitter and Mastodon. Generally you will want a bit of a gap between them, but the more posts your community is publishing, the smaller this number will need to be, otherwise you may end up with a backlog. | `required` |
| **development** | There are a number of values within the `development` object setting usernames, passwords, keys and so on. | required if doing development work |
| **test** | There are a number of values within the `test` object. Some values are unique to `test`. Do not change any values in `test` as you may break the test suite. | `required` if running tests |

## Migrating from a legacy database

In the unlikely event you were using [CommunityTweets](https://github.com/hughrun/CommunityTweets), you will need to migrate your database to the new `rockpool` structure. From the command line run:

```shell
NODE_ENV=production npm run migrate
```
### Setting up 

To set up your `rockpool` you need to run the setup script. Before doing so, you should have set up MongoDB, and checked that `settings.json` includes all relevant fields. Now run the script from the command line:

```shell
NODE_ENV=production npm run setup
```

---
[Home](/README.md)  
[Database structure](database.md)  
[Installation](installation.md)  
[Search](search.md)  
[User dashboard](dashboard.md)  
[Admin dashboard](admin.md)  
