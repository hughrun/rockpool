# Maintenance and backups

## Upgrading

From time to time a new version of Rockpool may be released, with new features or updates. You can get the upgraded code using `git pull` / `get fetch`, but will need to take a few precautions.

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
You are now on the new branch. 

There are two ways to re-apply the changes you previously _stashed_ (but be careful).

**Option 1**
This is recommended if you have made changes to styles, fonts etc. You should always check the Release notes before running `stash pop` as you may overwrite an important change. Once you have noted anything that needs to be adjusted, run:
```shell
git stash pop
```
This should re-apply any changes you made, and will then display the current state of your git branch (like `git status`).

**Option 2**
Check that `settings.json` is still correct and up to date, and adjust if necessary. Then check for any changes you need to make in `docker-compose.yml`. If the changes you made are minor (e.g. a port number), make a note of what you previously changed earlier (probably just the password) and change that in the new (default) `docker-compose.yml` rather than overwriting it with the older file. Otherwise, when ready, run:

```shell
cp docker-compose.yml-backup docker-compose.yml
```
This will copy your backup over the top of the default docker-compose.yml. You should now make any adjustments necessary to update the file. Remember that you will probably need to change the default password in `mongo-init.js` again.

You are now ready to _build_ from the updated code base, relaunch the app, and run `setup` again:
```shell
docker-compose up -d --build
docker exec -d rockpool_app npm run setup
```

## Making changes to files

Some key files you may want to change are:

* `settings.json`
* `markdown/help.md`
* images and fonts in `public/assets`
* `sass/style.scss` for stylesheet changes

If you make changes to any files, you may need to run some commands before you see any changes. The most important thing to remember is that _Rockpool_ is running inside a series of Docker containers, so if you adjust something on your server, you need to get those files into the right container.

1. Make your changes.
2. Run the command:
```shell
docker-compose up -d --build
```
This will rebuild the docker containers and bring everything up again.
3. Once the app is running:
```shell
docker exec -d rockpool_app npm run setup
```
This sets your admin user as an admin, applies any style changes you made in `style.scss`, and updates the text of the `help` page if you have made changes to `markdown/help.md`. Note that this will _not_ remove admin rights from any previous default admin user: you will need to do that through the app if you do longer want them to have admin rights.

Note that you will need to `git stash` any changes before fetching any new releases, and then `git stash pop` after applying updates, to re-instate your files.

## Backups and legacy databases

### Creating a backup of your database 

You can make a backup of your database using [`mongodump`](https://docs.mongodb.com/manual/reference/program/mongodump/). You should _always_ do this before upgrading to a new version of Rockpool, in case something horrible happens and you have to start again.

Use `mongodump` to take a copy. Because the database is using authorisation mode we need to use the username and password from `settings.json`. Assuming you have kept all the default settings including the insecure default password (not recommended!):
```shell
docker exec -d mongodb mongodump -d rockpool -u rockpool -p my_great_password
```
Copy the file you just created, into your host server's `/tmp` folder (or somewhere else you want to keep backup files).
```shell
docker cp mongodb:/dump/. ~/tmp
```
Your backup will now be at `/tmp/rockpool` on your host machine. You should keep it somewhere safe.

To ensure you don't have filename conflicts next time you do this, you should now delete the backup you made inside the container:
```shell
docker exec -d mongodb rm -r /dump/rockpool
```

### Restoring your database from backup

You can use [`mongorestore`](https://docs.mongodb.com/manual/reference/program/mongorestore/) to restore your backup. Assuming you have a backup at `/tmp/rockpool_backup`, from your server command line run:

```shell
docker cp ~/tmp/rockpool_backup mongodb:/dump
```
This copies your backup into the `/dump` folder inside the mongo container. 

Now we use `mongorestore` to restore the backup. Note that we are using `--drop` here: this wipes the current database before we restore the backup. If you don't use `--drop`, `mongorestore` will duplicate everthing in your database because it peforms an _insert_ rather than an _update_. Your backup file must have a user with the same name and credentials as the existing database. In practice this should generally not be a problem, since the database you are restoring is a backup of that same database and your user is created when you build the image. 

In the most likely scenario - where you have rebuilt your container - run this command:

```shell
docker exec -d mongodb mongorestore -d rockpool /dump -u rockpool -p my_great_password --drop
```

Use this version of the command if you already created a backup in this same container and therefore have a `/dump` directory:

```shell
docker exec -d mongodb mongorestore -d rockpool /dump/rockpool_backup -u rockpool -p my_great_password --drop
```

You should now be using your backup version of the database - you do not need to restart the app.

### Migrating from a legacy database

In the unlikely event you were using [CommunityTweets](https://github.com/hughrun/CommunityTweets), you will need to migrate your database to the new `rockpool` structure. These instructions are primarily for Hugh to remember how to do this.

You should use [`mongodump`](https://docs.mongodb.com/manual/reference/program/mongodump/) to make a copy of your legacy database from its current location. Move it to your server using something like [`scp`](https://linux.die.net/man/1/scp) or via the ability for `mongodump` to copy from remote servers.

Now copy the file into the container:
```shell
docker cp /tmp/rockpool_backup mongodb:/dump
```
This copies your backup into the `/dump` folder inside the mongo container. The /dump folder didn't exist until we used `docker cp`, so the database bson files are all directly in `/dump`. Now use `mongorestore` to import the database into mongo. The important exception to a normal restore is that when you run `mongorestore` on a legacy database you should **not** use the `--drop` flag because you won't have the `rockpool` user in your legacy database. As long as you import your database before you do anything else, all will be well:
```shell
docker exec -d mongodb mongorestore -d rockpool /dump -u rockpool -p my_great_password
```
Once you start using it with rockpool, any further database restores should be from a new backup taken following the instructions in _Creating a backup of your database_.

With a legacy database, you will now need to migrate the data structure to match the new _rockpool_ structure. Wait 20 seconds or so to let Mongo start up, and then run the migrate script and the setup script:
```shell
docker exec -d rockpool_app npm run migrate
docker exec -d rockpool_app npm run setup
```
Depending on how big your database is, after a minute or two you should see all the blogs from your database in the `/browse` page, and latest articles at `/`.

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