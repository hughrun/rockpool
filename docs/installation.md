# Installation Instructions

To install `rockpool`, you should follow these steps in order:

1. Register an app with [Pocket](https://getpocket.com), and optionally with [Twitter](https://developer.twitter.com/en/docs/basics/getting-started) and [Mastodon](https://docs.joinmastodon.org/)
2. Ensure you have the SMTP details for an admin email account. The recommended way to do this is via [Mailgun](https://www.mailgun.com/) or a similar service.
3. Obtain app credentials for Mastodon and Twitter accounts, if you plan to use them.
4. [Install](https://docs.docker.com/compose/install/) `docker` and `docker-compose`
5. Download rockpool either using `git clone` or [via zip download](https://github.com/hughrun/rockpool/releases)
6. Copy `settings-example.json` to `settings.json` and fill in the relevant values
7. Update password fields: the `pwd` value in `mongo-init.js` must match the `mongo_password` value in `settings.json` and should not be the default value.
8. Set up your reverse-proxy server. See **Setting up your web server** below for tips on this.
9. Run `docker-compose up -d --build`
10. At this point, if you have a legacy database you will need to migrate your DB in to the `mongo` container. See **Migrating from a legacy database** below. It is unlikely you will need to do this.
11. Run `docker exec -it rockpool_app sh`
12. You should now be inside the `rockpool_app` container. Run `npm run setup`. This creates indexes in the database, sets up your admin user, and updates the text of the `help` page if you have made changes to `markdown/help.md`. Then run `exit` to exit out of the container.
13. Enjoy your new Rockpool app!

**Note:** Currently there are no svg image files in `public/assets`. This is because of the licensing restrictions on the images I use in production. I will put some placeholder images in the repo soon, as well as making it easier to change colours and fonts.

## Registering external services

### Mastodon

The official documentation for Mastodon is ok for general users, but incomplete for 'power users' and casual system administrators. To register your application, log in to the user account you want to use for it and navigate to `https://example.com/settings/applications`. You can then simply click `New Application` and fill in the application name and website details, and save. Back in `settings/applications` you can now click on the name of the app to get the `access_token` which is what you need for Rockpool.

### Twitter

Twitter is a PITA to register new applications with, because they have a vetting service where some 24 year old techbro from "the Bay Area" decides whether your app is worthy of joining their giant binfire. We use the "standard API" in Rockpool. Read [the Twitter developer docs](https://developer.twitter.com/en/docs/basics/getting-started) to get started.

## Installing Docker and Compose

**Rockpool** runs in Docker and uses MongoDB for all data.

TODO: info on installing Docker and docker-compose.

Docker is designed to created 'throw away' containers. However, we obviously don't want our database to be deleted every time we make a change to our app. We use a "named volume" for the mongo database, so what when the app stops or you run a command like `docker-compose down` we don't lose it. If you run `docker volume ls` you will see a volume called `rockpool_mongodata`. **Do not delete this volume** - it is where your database lives. Be _very_ careful about running docker cleanup commands like `docker volume prune` as this will delete your data if your app is not running.

## Security

Rockpool is designed to be run in Docker containers via `docker-compose`. Your Mongo database is bound to `localhost` inside the mongo container, and runs with `--auth`, requiring a registered account to log in. You should change both the default administrator password (in `docker-compose.yml` as `MONGO_INITDB_ROOT_PASSWORD`) and the default `mongo_password` to strong and long passwords. This should secure your Mongo database against most likely security breaches, as long as an attacker does not get access to your host server. If you choose to run Rockpool with an external mongo database, you are responsible for any changes you make to the setup and should familiarise yourself with Mongo security best practices.

Rockpool will not allow any users to log in unless it is running over https. You can use [Let's Encrypt](https://letsencrypt.org/) to obtain and install certificates free of charge.

## Settings

Copy `settings-example.json` to a file called `settings.json`. This is where all your custom values will go, including database login info etc. Keep it secret, keep it safe.

| setting | description   | required? |
| ---: | :------ | :---: |
| `admin_user` | The email address of the first administrator. This allows you to set someone (you, probably) as a default administrator when they log in: effectively they are pre-registered | `required` |
| `announce_articles_newer_than_hours` | Any blog posts older than this number of hours will be ingested to the database but not announced via Twitter or Mastodon. | `required` |
| `app_description` | Appears in the header | `optional` |
| `app_name` | The name of your app. Will appear in the header and the title of each page, as well as in emails and a few other places | `required` |
| `app_tagline` | Appears in the header | `optional`
| `app_url` | The URL of your app. This is used in administration emails | `required` |
| `blog_categories` | Categories that community members can choose from when registering a blog | `required` |
| `blog_club_hashtag` | Hashtag used when tooting or tweeting posts containing the `blog_club_tag` | `optional` unless there is a blog_club_name |
| `blog_club_name` | Name of your blog club. | `optional` |
| `blog_club_tag` | Tag (category) used by bloggers when participating in your blog club. | `optional` unless there is a blog_club_name |
| `blog_club_url` | Website for your blog club. | `optional` unless there is a blog_club_name |
| `deliver_tokens_by` | **In production this must always be set to `"email"`**. In development you can set this to `"clipboard"` so that your login code is sent to the clipboard instead of via email. In test this should always be set to `"clipboard"`. | `required` |
| `email` | Rockpool requires an SMTP email account to send system emails, using [emailjs](https://github.com/eleith/emailjs). You can use a personal Outlook or Hotmail etc account, but I recommend a service like [Mailgun](https://www.mailgun.com/) which will be free unless your app becomes enormously popular. | `required` in production and development |
| `excluded_tags` | articles with one or more of these tags will be ignored by the app and not ingested or announced | `required`, but may be an empty array. |
| `filtered_tags` | None of these tags will be added to the database record of a post (i.e. these are like "stop words") | `required`, but may be an empty array. |
| `legacy_db` | Indicates whether the database has been migrated from a `CommunityTweets` application. Should nearly always be set to `false`. | `required` |
| `mastodon` | An object for all information relating to Mastodon. | `required` |
| `mastodon.use_mastodon` | Boolean indicating whether you are using Mastodon with your app. If set to `false` you do not need to enter any other values in `mastodon`. | `required` |
| `mastodon.hours_between_toots` | number indicating the number of hours between tooting the same article. | `required` if using Mastodon |
| `mastodon.number_of_toots_per_article` | how many times to toot the same article | `required` if using Mastodon |
| `mastodon.domain_name` | Domain name of the Mastodon server your app's account is part of. | `required` if using Twitter |
| `mastodon.access_token` | Mastodon access token for your app. | `required` if using Mastodon |
| `minutes_between_announcements` | The number of minutes between announcements on Twitter and Mastodon. Generally you will want a bit of a gap between them, but the more posts your community is publishing, the smaller this number will need to be, otherwise you may end up with a backlog. | `required` |
| `minutes_between_checking_announcements` | The number of minutes between checking whether any articles need to be added to the announcements queue. | `required` |
| `minutes_between_checking_feeds` | The number of minutes between checking each blog's RSS feed for new articles. | `required` |
| `mongo_db` | The name of the database | `required` |
| `mongo_url` | The URL of your mongodb instance. In most cases this should be `""mongo:27017"` - do not change it unless you really know what you are doing. | `required` |
| `mongo_password` | Use a good password for your mongo user. | `required` |
| `mongo_user` | The username of your mongo user. Note this is the username in mongo, not the operating system user. | `required` |
| `org_name` | Name of the organisation responsible for administering your community. Appears in the footer | `required` |
| `org_url` | Website address of your organisation's website. Appears in the footer | `required` |
| `pocket_consumer_key` | You need to [register your app with Pocket](https://getpocket.com/developer/docs/authentication) (see setup instuctions). This is your `consumer_key` from Pocket. | `required` |
| `session_secret`  | Secret used by `express-session` [to sign session cookies](https://github.com/expressjs/session#secret). Should be a random phrase. | `required` |
| `show_credits` | Indicates whether to show "Made by Hugh Rundle for newCardigan" in the footer | `required` |
| `tag_transforms` | An object of key:value pairs where any tags on the left (the key) will be changed to the tag on the right (the value) before being ingested into the database. You can use this to normalise tags within the app despite not having any control over how users tag their articles. If you're interested, my blog has [more information about how this works and the philosophy behind it](https://www.hughrundle.net/better-out-than-in/). | `required`, but may be an empty object. |
| `twitter` | An object for all information relating to Twitter. | `required` |
| `twitter.use_twitter` | Boolean indicating whether you are using Twitter with your app. If set to `false` you do not need to enter any other values in `twitter`. | `required` |
| `twitter.hours_between_tweets` | number indicating the number of hours between tweeting the same article. | `required` if using Twitter |
| `twitter.number_of_tweets_per_article` | how many times to tweet the same article | `required` if using Twitter |
| `twitter.consumer_key` | Twitter [consumer key](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.consumer_secret` | Twitter [consumer secret](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.access_token` | Twitter [access_token](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.access_token_secret` | Twitter [access_token_secret](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |

## Setting up your web server

Your app should be available on port `3000` on your server. You will need a web server such as Apache, nginx, or caddy to act as a reverse-proxy to make it available at a url like `https://www.example.com`. 

### nginx

nginx is a good choice, because it's often used as a reverse-proxy. You could use a configuration like this:

```
server {
 server_name rockpool.example.com;
 location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

You should then use `certbot` to add Lets Encrypt certificates and update your config so you can run your app on https. If you have installed certbot you can do this by running:

```
sudo certbot --nginx
```

### caddy

[Caddy](https://caddyserver.com/) is a newer system that has the advantage of automatically incorporating Lets Encrypt certificates, and a very simple syntax. A Caddyfile would look something like this:

```
rockpool.example.com

proxy / localhost:3000
```

### Changing the port number

If you already have something else runnning on port 3000, or want to change the port for some other reason, you can easily do this by changing the `ports` value of `app` in the `docker-compose.yml` file. For example to run the app on port 4000, make the following change:

```
ports:
  - "4000:3000"
```

This maps port 3000 inside the container (where the app is running) to port 4000 on your server.

## Migrating from a legacy database

In the unlikely event you were using [CommunityTweets](https://github.com/hughrun/CommunityTweets), you will need to migrate your database to the new `rockpool` structure. More instructions will be listed here shortly.

## Upgrading

TODO:

## Making changes to files

If you make changes to any files, you will need to run some commands before you see any changes. The most important thing to remember is that _Rockpool_ is running inside a series of Docker containers, so if you adjust something on your server, you need to get those files into the right container.

### Changing the help file or default admin user

1. Make your changes to `settings.json` or `markdown/help.md`
2. Run `docker-compose up -d --rebuild`. This will rebuild the docker containers and bring everything up again.
3. Once the app is running, run `docker exec -it rockpool_app sh`
4. You should now be inside the `rockpool_app` container. Run `npm run setup`. This sets your admin user as an admin, and updates the text of the `help` page if you have made changes to `markdown/help.md`. Note that this will _not_ remove admin rights from any previous default admin user: you will need to do that through the app if you do longer want them to have admin rights.
5. Run `exit` to exit out of the container.

### Changing assets like css files and images

If you just want to change the colours, fonts etc, you only need to follow the first steps, to re-build the `rockpool_app` container.

1. Make your changes.
2. Run `docker-compose up -d --rebuild`. This will rebuild the docker containers and bring everything up again.

---
[Home](/README.md)  
[Database structure](database.md)  
[Installation](installation.md)  
[Search](search.md)  
[User dashboard](dashboard.md)  
[Admin dashboard](admin.md)  
[Browse page](browse.md)  