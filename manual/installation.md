# Installation Instructions

**THESE INSTRUCTIONS ARE INCOMPLETE AND LIABLE TO CHANGE AT ANY MOMENT. ROCKPOOL IS NOT YET READY EVEN FOR A TEST INSTALLATION**

## Database

**Rockpool** uses MongoDB as the database for all data.

## Security

Your database **must** use https and **must** have [Access Control](https://docs.mongodb.com/manual/tutorial/enable-authentication/) enabled. Although Mongo will allow you to use a locally installed database without authentication, **Rockpool** expects a username and password. This is deliberate, so that you don't accidentally forget to secure your DB.

  TODO: **MORE ON SECURING MONGO HERE**

## Settings

Copy `settings-example.json` to a file called `settings.json`. This is where all your custom values will go, including database login info etc. Keep it secret, keep it safe.

---
[Home](/) <br>
[Search](search.md)