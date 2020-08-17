# Rockpool

Support a community and store what you need from the ocean of information.

Successor to and complete rewrite of [CommunityTweets](https://github.com/hughrun/CommunityTweets).

Rockpool is an Express app using MongoDB, designed to run with Docker Compose. It ingests metadata about articles from RSS feeds ("blog posts") and optionally tweets and/or toots links to those post when they are published. Users can register and manage their accounts via passwordless login using one time login links sent via email, and connect the feed to their Pocket accounts for automatic ingest to their Pocket list, or download an OPML file to import manually into an RSS reader.

## Documentation

1. [Installation](docs/installation.md)
2. [Maintenance](maintenance.md)
3. [Database structure](docs/database.md)
4. [Searching](docs/search.md)
5. [User dashboard](docs/dashboard.md)
6. [Admin dashboard](docs/admin.md)
7. [Browse page](docs/browse.md)
8. [Contributing](docs/contributing.md)

## License

**After 10 May 2019:** AGPL 3.0+  
**Prior to 10 May 2019:** GPL 3.0+  

Copyright (C) 2019 - 2020 Hugh Rundle