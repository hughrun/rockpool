# Installation Instructions

**THESE INSTRUCTIONS ARE INCOMPLETE AND LIABLE TO CHANGE AT ANY MOMENT.**

To install `rockpool`, you should follow these steps in order:

1. install mongodb
2. install nodejs
3. download rockpool either using `git` or via zip download
4. copy `settings-example.json` to `settings.json` and fill in the relevant values
5. run `npm install`
6. optionally run `npm migrate`
7. run `npm run setup`

## Installing MongoDB

**Rockpool** uses MongoDB for all data.

TODO: info on installing Mongo

### Security

Your database **must** use https and **must** have [Access Control](https://docs.mongodb.com/manual/tutorial/enable-authentication/) enabled. Although Mongo will allow you to use a locally installed database without authentication, **Rockpool** expects a username and password. This is deliberate, so that you don't accidentally forget to secure your DB.

TODO: **MORE ON SECURING MONGO HERE**

## Settings

Copy `settings-example.json` to a file called `settings.json`. This is where all your custom values will go, including database login info etc. Keep it secret, keep it safe.

TODO: more info about settings here

## Migrating from a legacy database

In the unlikely event you were using [CommunityTweets](https://github.com/hughrun/CommunityTweets), you will need to migrate your database to the new `rockpool` structure. From the command line run:

```shell
npm run migrate
```
### Setting up 

To set up your `rockpool` you need to run the setup script. Before doing so, you should have set up MongoDB, and checked that `settings.json` includes all relevant fields. Now run the script from the command line:

```shell
npm run setup
```

---
[Home](/README.md)  
[Database structure](database.md)  
[Installation](installation.md)  
[Search](search.md)  
[User dashboard](dashboard.md)  
[Admin dashboard](admin.md)  
