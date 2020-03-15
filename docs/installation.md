# Installation Instructions

To install `rockpool`, you should follow these steps in order:

1. Register an app with [Pocket](https://getpocket.com), and optionally with [Twitter](https://developer.twitter.com/en/docs/basics/getting-started) and [Mastodon](https://docs.joinmastodon.org/)
2. Ensure you have the SMTP details for an admin email account. The recommended way to do this is via [Mailgun](https://www.mailgun.com/) or a similar service.

3. Obtain app credentials for Mastodon and Twitter accounts, if you plan to use them.
4. [Install](https://docs.docker.com/compose/install/) `docker` and `docker-compose`
5. Download rockpool either using `git clone` or [via zip download](https://github.com/hughrun/rockpool/releases)

6. Copy `settings-example.json` to `settings.json` and fill in the relevant values

7. Update password fields: the `pwd` value in `mongo-init.js` must match the `mongo_password` value in `settings.json` and should not be the default value.

8. Check the `markdown/help.md` file says what you want: if not, adjust the wording. This is a [markdown](https://daringfireball.net/projects/markdown/) file so ensure you use markdown syntax. It will be processed into HTML in a later step.

8. Set up your reverse-proxy server. See **Setting up your web server** below for tips on this.
9. Run `docker-compose up -d --build`

10. At this point, if you have a legacy database you will need to migrate your DB in to the `mongo` container. See **Migrating from a legacy database** below. It is unlikely you will need to do this.
11. Run `docker exec -it rockpool_app sh`
12. You should now be inside the `rockpool_app` container. Run `npm run setup`. This creates indexes in the database, sets up your admin user, and updates the text of the `help` page if you have made changes to `markdown/help.md`. Then run `exit` to exit out of the container.
13. Enjoy your new Rockpool app!

## Download Rockpool code

You can download the latest Rockpool code using [`git`](https://git-scm.com/):
```shell
git clone https://github.com/hughrun/rockpool.git
```
You should use the latest _release_ - the latest code that is not packaged into a version release may not be stable. Move into the `rockpool` directory and _fetch_ all the tagged releases:
```shell
cd rockpool
git fetch --tags
```
You now want to _check out_ the latest **stable** version. This is probably the highest-numbered tag, however note that tags including `rc` are _release candidate_ versions and you should only use these releases if you like living on the edge.
```shell
git checkout v1.0.0
```
Alternatively, find the latest stable version in [releases](https://github.com/hughrun/rockpool/releases) and download the zip file, then transfer the contents to your server.

## Create settings file

Copy `settings-example.json` to a file called `settings.json`. This is where all your custom values will go, including database login info etc.

```shell
cp settings-example.json settings.json
```

Keep it secret, keep it safe: never check your settings.json into a git repo!

## Register external services

### Mastodon

The official documentation for Mastodon is ok for general users, but incomplete for 'power users' and casual system administrators. To register your application, ignore the official instructions telling you to do it via the API, and simply log in to the user account you want to use for your app's announcements. Navigate to `https://masotodon.example.com/settings/applications`. You can then click `New Application` and fill in the application name and website details, and save. Back in `settings/applications` you can now click on the name of the app to get the `access_token`. This is the value your need to enter as the mastodon `"access_token"` in `settings.json`.

### Pocket

You will need to have an account with [Pocket](https://getpocket.com). This a free 'read it later' app, now owned by Mozilla, and built-in to the Firefox browser. Log in, and then visit the [Developer API page](https://getpocket.com/developer/). Click `Create new app`, enter the relevant information (you are building for the platform 'Web', though it doesn't really seem to matter), accept the Terms of Service and `Create Application`.

You will now be able to see a _Consumer key_ against your app's listing [on the My Apps page](https://getpocket.com/developer/apps/). This is what you need to enter in Rockpool's `settings.json` as the value for `"pocket_consumer_key"`.

### Twitter

Twitter is a PITA to register new applications with, because they have a vetting service where some 24 year old techbro from "the Bay Area" decides whether your app is worthy of joining their giant binfire. We use the "standard API" in Rockpool. Read [the Twitter developer docs](https://developer.twitter.com/en/docs/basics/getting-started) to get started. The four _tokens_, _keys_ and _secrets_ Twitter provides will need to be entered against the relevant value in Rockpool's `settings.json` once your app is approved.

## Obtain SMTP details

Rockpool utilises email as a key tool for communicating with users and administrators, and most importantly, powering password-free logins. We use the [emailjs](https://github.com/eleith/emailjs) package to do this. You will need:

* a dedicated email address (it is not recommended to use an existing personal address)
* SMTP server details for your email provider
* username and password for the email account

You can use a free email service like Gmail or Hotmail for this, however I recommend [Mailgun](https://www.mailgun.com) or a similar service designed for this sort of thing. Unless you have an enormous number of extremely active users, you will be able to use Mailgun's free tier.

Once you are set up, enter the relevant details in `settings.json`:
```json
  "email" : {
    "user": "postmaster@mg.example.com", 
    "password": "my_awesome_password", 
    "host": "smtp.mailgun.org",
    "from": "hello@example.com" 
  },
```
## Finalise settings

You should now review the rest of the values in `settings.json` and change them as appropriate.

| setting | description   | required? |
| ---: | :------ | :---: |
| `admin_user` | The email address of the first Rockpool administrator. This allows you to set someone (yourself, probably!) as a default administrator when they log in: effectively they are pre-registered. Note that changing this later doesn't remove previous admin users, it simply creates an additional admin | `required` |
| `announce_articles_newer_than_hours` | Any blog posts older than this number of hours will be ingested to the database but not announced via Twitter or Mastodon. | `required` |
| `app_description` | Brief description of your app - appears in the header | `optional` |
| `app_name` | The name of your app. Will appear in the header and the title of each page, as well as in emails and a few other places | `required` |
| `app_tagline` | Appears in the header | `optional`
| `app_url` | The base URL of your app. This is used in administration emails and login links. | `required` |
| `blog_categories` | Categories that community members can choose from when registering a blog | `required` |
| `blog_club_hashtag` | Hashtag used when tooting or tweeting posts containing the `blog_club_tag` | `optional` unless there is a blog_club_name in which case it is required.|
| `blog_club_name` | Name of your blog club. | `optional` |
| `blog_club_tag` | Tag (category) used by bloggers when participating in your blog club. | `optional` unless there is a blog_club_name |
| `blog_club_url` | Website for your blog club. | `optional` unless there is a blog_club_name |
| `deliver_tokens_by` | **In production this must always be set to `"email"`**. In development you can choose to set this to `"clipboard"` so that your login code is sent to the clipboard instead of via email. In test this should always be set to `"clipboard"`. Note that this will throw error in Alpine Linux containers so currently running tests should not be attempted using Docker. | `required` |
| `email` | Rockpool requires an SMTP email account to send system emails, using [emailjs](https://github.com/eleith/emailjs). You can use a personal Outlook or Hotmail etc account, but I recommend a service like [Mailgun](https://www.mailgun.com/) which will be free unless your app becomes enormously popular. | `required` in production and development |
| `excluded_tags` | articles with one or more of these tags will be ignored by the app and neither ingested nor announced | `required`, but may be an empty array. |
| `filtered_tags` | None of these tags will be added to the database record of a post (i.e. these are like "stop words" for tags) | `required`, but may be an empty array. |
| `legacy_db` | Indicates whether the database has been migrated from a `CommunityTweets` application. Near certain you should set to `false`. | `required` |
| `mastodon` | An object for all information relating to Mastodon. | `required` |
| `mastodon.use_mastodon` | Boolean indicating whether you are using Mastodon with your app. If set to `false` you do not need to enter any other values in `mastodon`. | `required` |
| `mastodon.hours_between_toots` | number indicating the number of hours between tooting the same article. | `required` if using Mastodon |
| `mastodon.number_of_toots_per_article` | how many times to toot the same article | `required` if using Mastodon |
| `mastodon.domain_name` | Domain name (Just the domain - _without_ `https://` protocol) of the Mastodon server your app's account is part of. | `required` if using Twitter |
| `mastodon.access_token` | Mastodon access token for your app. | `required` if using Mastodon |
| `minutes_between_announcements` | The number of minutes between announcements on Twitter and Mastodon. Generally you will want a bit of a gap between them, but the more posts your community is publishing, the smaller (i.e. more frequent) this number will need to be, otherwise you may end up with a backlog. | `required` |
| `minutes_between_checking_announcements` | The number of minutes between checking whether any articles need to be added to the announcements queue. | `required` |
| `minutes_between_checking_feeds` | The number of minutes between checking each blog's RSS feed for new articles. The larger the number of blogs in your database, the larger this number should be: if you check too frequently on a large database the loop will not have finished when you start running it again. | `required` |
| `mongo_db` | The name of the database. If you change the default database name (`rockpool`) you need to also change it in `docker-compose.yml` and `mongo-init.js`. | `required` |
| `mongo_url` | The URL of your mongodb instance. In most cases this should be `""mongo:27017"` - do not change it unless you really know what you are doing. | `required` |
| `mongo_password` | Use a good strong password for your mongo user. | `required` |
| `mongo_user` | The username of your mongo user. Note this is the username in mongo, not the operating system user. If you change the default user name (`rockpool`) you need to also change it in `mongo-init.js`. | `required` |
| `org_name` | Name of the organisation responsible for administering your community. Appears in the footer | `required` |
| `org_url` | Website address of your organisation's website. Appears in the footer | `required` |
| `pocket_consumer_key` | This is your `consumer_key` from Pocket. | `required` |
| `session_secret`  | Secret used by `express-session` [to sign session cookies](https://github.com/expressjs/session#secret). Should be a random string or phrase. | `required` |
| `show_credits` | Indicates whether to show "Made by Hugh Rundle for newCardigan" in the footer | `required` |
| `tag_transforms` | An object of key:value pairs where any tags on the left (the key) will be changed to the tag on the right (the value) before being ingested into the database. You can use this to normalise tags within the app despite not having any control over how users tag their articles. If you're interested, my blog has [more information about how this works and the philosophy behind it](https://www.hughrundle.net/better-out-than-in/). | `required`, but may be an empty object. |
| `twitter` | An object for all information relating to Twitter. | `required` |
| `twitter.access_token` | Twitter [access_token](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.access_token_secret` | Twitter [access_token_secret](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.consumer_key` | Twitter [consumer key](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.consumer_secret` | Twitter [consumer secret](https://developer.twitter.com/en/docs/basics/authentication/oauth-1-0a) | `required` if using Twitter |
| `twitter.hours_between_tweets` | number indicating the number of hours between tweeting the same article. | `required` if using Twitter |
| `twitter.number_of_tweets_per_article` | how many times to tweet the same article | `required` if using Twitter |
| `twitter.use_twitter` | Boolean indicating whether you are using Twitter with your app. If set to `false` you do not need to enter any other values in `twitter`. | `required` |

## Edit the help page

Check the `markdown/help.md` file and adjust the wording to suit your app and your users. It's likely that at the very least you will want to change this section to match your app's name and what you have entered as the `excluded_tags` in `settings.json`:

```markdown
If you write a blog post that is 'off topic' and don't want it to be included in the _Rockpool_ database or tweeted/tooted, you can exclude it from being ingested by assigning one of the following tags to the post using your blogging software:

* `notrockpool`
```

This is a [markdown](https://daringfireball.net/projects/markdown/) file so ensure you use markdown syntax. It will be processed into HTML in a later step.

## Install Docker and Compose

**Rockpool** runs in Docker and uses MongoDB for all data. You will need both _Docker_ and _Docker Compose_.

One of the advantages of using Docker is that you should (at least in theory) be able to run Rockpool on any operating system. Check out the Docker website to [get started](https://docs.docker.com/). You will also need to [install Docker Compose](https://docs.docker.com/compose/install/). Note that the official docs can be a little confusing. Digital Ocean has some [somewhat easier to understand instructions](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-18-04) for installing Docker and [Docker Compose](https://www.digitalocean.com/community/tutorials/how-to-install-docker-compose-on-ubuntu-18-04) on a Ubuntu server. If you are using a Mac, [Homebrew](https://formulae.brew.sh/formula/docker) is your friend.

### A note on volumes and your mongo database

Docker is designed to use 'throw away' containers. However, we obviously don't want our database to be deleted every time we make a change to our app. We use a "named volume" for the mongo database, so that when the app stops or you run a command like `docker-compose down` we don't lose it. If you run `docker volume ls` you will see a volume called `rockpool_mongodata`. **Do not delete this volume** - it is where your database lives. Be _very_ careful about running docker cleanup commands like `docker volume prune` as this will delete your database if your app is not running.

## Set up DNS

If you're running Rockpool as a production service you'll need a domain name (or subdomain) that resolves to your server. Check your domain name provider's documentation for the best way edit your DNS settings.

## Set up your web server

Your app will be available via port `3000` on your server. You will need a web server such as Apache, nginx, or caddy to act as a reverse-proxy to make it available at a url like `https://www.example.com`. **Do not run Rockpool without TLS (https) in place**. Allowing http connections is extremely insecure and may allow unauthorised or spoofed access to your app. The only exception to this is if you need to briefly bring up your app to allow Lets Encrypt to check that it actually exists (see below).

### nginx

nginx is a good choice, because it's fast and often used as a reverse-proxy. You could use a configuration like this:

```nginx
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

You should then use `certbot` to add Lets Encrypt certificates and update your config so you can run your app on https. You will only be able to do this once your app is running, otherwise Let's Encrypt won't be able to confirm your domain exists. If you have installed certbot you can do this by running:

```shell
sudo certbot --nginx
```
Don't forget to read [the documentation about how to auto-renew your certificates](https://certbot.eff.org/docs/using.html#automated-renewals).

### caddy

[Caddy](https://caddyserver.com/) is a newer system that has the advantage of automatically incorporating Lets Encrypt certificates, and a very simple syntax. A Caddyfile would look something like this:

```
rockpool.example.com

proxy / localhost:3000
```

### Changing the port number

If you already have something else runnning on port 3000, or want to change the port for some other reason, you can do this by changing the `ports` value of `app` in the `docker-compose.yml` file. For example to run the app on port 4000, make the following change:

```yaml
ports:
  - 4000:3000
```

This maps port 3000 inside the container (where the app is running) to port 4000 on your server.

## Start the app

You should now have everything ready - it's time to start your app!

Run this command from inside your `rockpool` directory:
```shell
docker-compose up -d --build
```
At this point, if you have a legacy database you will need to migrate your existing DB in to the `mongo` container. See [Migrating from a legacy database](#migrating-from-a-legacy-database) below. (It is very unlikely you will need to do this).

Now we need to run the setup script. Run the following commands to enter your app's docker container, run the setup script, and exit the container again. The setup script creates indexes in the database, sets up your rockpool admin user, and processes `markdown/help.md` to create a help page at `/views/help.html`:
```shell
docker exec -it rockpool_app sh
npm run setup
exit
```
Your app should now be running and ready for use.

## Upgrading

From time to time a new version of Rockpool may be released, with new features or updates. You can get the upgraded code using `git pull`, but will need to take a few precautions.

If you want to save any changes to your docker-compose file (e.g. a change to a port), you may need to make a backup of your file:
```shell
cp docker-compose.yml docker-compose.yml-backup
```
You do not need to make a copy of your `settings.json` file, but do check the release notes to see whether there are any changes or additions to `settings-example.json` as you may need to copy them across.

Now from your `rockpool` directory run:
```git
git fetch --tags
```
This should download all changes in the git repository, with information about each tagged release. You have probably made changes to at least `mongo-init.js` to create a stronger password, and may have changed assets such as the CSS file or images. To prevent git moaning about unsaved changes, run:
```shell
git stash
```
Now you need to 'check out' the relevant release. e.g.
```shell
git checkout v1.0.2
```
You are now on the new branch. Check that `settings.json` is still correct and up to date, and adjust if necessary. Then check for any changes you need to make in `docker-compose.yml`. If the changes you made are minor (e.g. a port number), make a note of what you previously changed earlier (probably just the password) and change that in the new (default) docker-compose.yml rather than overwriting it with the older file. Otherwise, when ready, run:

```shell
cp docker-compose.yml-backup docker-compose.yml
```
This will copy your backup over the top of the default docker-compose.yml. You should now make any adjustments necessary to update the file. 

You are now ready to _build_ from the updated code base and launch:
```shell
docker-compose up -d --build
```

## Making changes to files

If you make changes to any files, you may need to run some commands before you see any changes. The most important thing to remember is that _Rockpool_ is running inside a series of Docker containers, so if you adjust something on your server, you need to get those files into the right container.

### Changing the help file or default admin user

1. Make your changes to `settings.json` or `markdown/help.md`
2. Run `docker-compose up -d --build`. This will rebuild the docker containers and bring everything up again.
3. Once the app is running, run `docker exec -it rockpool_app sh`
4. You should now be inside the `rockpool_app` container. Run `npm run setup`. This sets your admin user as an admin, and updates the text of the `help` page if you have made changes to `markdown/help.md`. Note that this will _not_ remove admin rights from any previous default admin user: you will need to do that through the app if you do longer want them to have admin rights.
5. Run `exit` to exit out of the container.

### Changing assets like css files and images

If you just want to change the colours, fonts etc, you only need to follow the first steps, to re-build the `rockpool_app` container:

1. Make your changes.
2. Run `docker-compose up -d --build`. This will rebuild the docker containers and bring everything up again.

Note that you will need to `git stash` these changes before fetching any updates.

## Backups and legacy databases

### Creating a backup of your database 

You can make a backup of your database using [`mongodump`](https://docs.mongodb.com/manual/reference/program/mongodump/). You should _always_ do this before upgrading to a new version of Rockpool, in case something horrible happens and you have to start again.

Enter the mongo container:
```shell
docker exec -it mongodb bash
```
Use `mongodump` to take a copy. Because the database is using authorisation mode we need to use the username and password from `settings.json`. Assuming you have kept all the default settings including the insecure default password (not recommended!):
```shell
mongodump -d rockpool -u rockpool -p my_great_password
```
Now exit the container:
```shell
exit
```
Copy the file you just created, into your server's `/tmp` folder (or somewhere else you want to keep backup files).
```shell
docker cp mongodb:/dump/. /tmp
```
Your backup will now be at `/tmp/rockpool`

### Restoring your database from backup

You can use [`mongorestore`](https://docs.mongodb.com/manual/reference/program/mongorestore/) to restore your backup. Assuming you have a backup at `/tmp/rockpool_backup`, from your server command line run:

```shell
docker cp /tmp/rockpool_backup mongodb:/dump
```
This copies your backup into the `/dump` folder inside the mongo container. Let's go in and take a look:
```shell
docker exec -it mongodb bash
```
Now we use `mongorestore` to restore the backup. Note that we are using `--drop` here: this drops the current database before we restore the backup. If you don't use `--drop`, `mongorestore` will duplicate everthing in your database because it peforms an _insert_ rather than an _update_. Your backup file must have a user with the same name and credentials as the existing database. In practice this should generally not be a problem, since the database you are restoring is a backup of that same database and your user is created when you build the image. The following command assumes you already created a backup in this container and therefore have a `/dump` directory.
```shell
mongorestore -d rockpool /dump/rockpool_backup -u rockpool -p my_great_password --drop
```
If it is a fresh container (i.e. has been rebuilt since you took your backup) then the mongodump will have dumped the collections straight into `/dump`. In that case run it slightly differently:
```shell
mongorestore -d rockpool /dump -u rockpool -p my_great_password --drop
```
You should see several rows of messages saying mongo has finished restoring each collection, then `done` and a return to the command prompt. Exit the container:
```shell
exit
```
You are now using your backup version of the database - you do not need to restart the app.

### Migrating from a legacy database

In the unlikely event you were using [CommunityTweets](https://github.com/hughrun/CommunityTweets), you will need to migrate your database to the new `rockpool` structure. 

You should use [`mongodump`](https://docs.mongodb.com/manual/reference/program/mongodump/) to make a copy of your legacy database from its current location. Move it to your server using something like [`scp`](https://linux.die.net/man/1/scp) or via the ability for `mongodump` to copy from remote servers.

Now copy the file into the container:
```shell
docker cp /tmp/rockpool_backup mongodb:/dump
```
This copies your backup into the `/dump` folder inside the mongo container. Let's go in and take a look:
```shell
docker exec -it mongodb bash
```
The /dump folder didn't exist until we used `docker cp`, so the database bson files are all directly in `/dump`:
```shell
mongorestore -d rockpool /dump -u rockpool -p my_great_password
```
You should see several rows of messages saying mongo has finished restoring each collection, then `done` and a return to the command prompt. Exit the container:
```shell
exit
```

The important exception to a normal restore is that if you run `mongorestore` with the `--drop` flag on a legacy database it will fail because you won't have the `rockpool` user in your legacy database. As long as you import your database before you do anything else, all will be well. 

Once you start using it with rockpool, any further database restores should be from a new backup taken following the instructions in _Creating a backup of your database_.

With a legacy database, you will now need to migrate the data structure to match the new _rockpool_ structure. Exit out of the mongo container, and then move into the rockpool container:
```shell
docker exec -it rockpool_app sh
```
Now run the migrate script:
```shell
npm run migrate
```
Now run the setup script against your database:
```shell
npm run setup
```
And exit
```shell
exit
```
You should now see all the blogs from your database in the `/browse` page, and latest articles at `/`.

## A note on Security

Rockpool is designed to be run in Docker containers via `docker-compose`. Your Mongo database is bound to `localhost` inside the mongo container, and runs with `--auth`, requiring a registered account to log in. If you try to run Rockpool without running mongo in `--auth` mode it will throw an error. You should change both the default administrator password (in `docker-compose.yml` as `MONGO_INITDB_ROOT_PASSWORD`) and the default `mongo_password` to strong and long passwords. This should secure your Mongo database against most likely security breaches, as long as an attacker does not get access to your host server. If you choose to run Rockpool with an external mongo database, you are responsible for any changes you make to the setup and should familiarise yourself with Mongo security best practices. Note that if you bind port 27017 in the `mongodb` container to a port in the host it will provide **full access to the outside world despite the localhost binding**, because it will look to Mongo like the connection is coming from inside the container.

Rockpool should always run over https. You can use [Let's Encrypt](https://letsencrypt.org/) to obtain and install certificates free of charge, or use [caddy](https://caddyserver.com/) as your web server and it will automatically register Lets Encrypt certificates.

---
[Home](/README.md)  
[Database structure](database.md)  
[Installation](installation.md)  
[Search](search.md)  
[User dashboard](dashboard.md)  
[Admin dashboard](admin.md)  
[Browse page](browse.md)  
[Contributing](docs/contributing.md)  