# Rockpool

Support a community and store what you need from the ocean of information.

Successor to and complete rewrite of [CommunityTweets](https://github.com/hughrun/CommunityTweets).

Rockpool is an Express app interfacing with MongoDB to provide:

* harvesting of article metadata via RSS and storage in MongoDB ✅
* web interface to discover articles via search or tag browse ✅
* announcements of new articles via Twitter and/or Mastodon ✅
* passwordless login ✅
* self-registration of blogs by owners ✅
* claiming of blogs by owners (for legacy DB) ✅
* deletion of blog listings by authorised owners ✅
* admin access to approve and edit blog listings ✅
* subscription to all articles via Pocket ✅
* automatic OPML file with all blogs ✅
* editing of blog category by authorised owners ✅

This is a Work In Progress

## Documentation

1. [Installation](docs/installation.md)
2. [Database structure](docs/database.md)  
3. [Searching](docs/search.md)
4. [User dashboard](docs/dashboard.md)
5. [Admin dashboard](docs/admin.md)

## Contributing

[See Contributing guide](docs/contributing.md)

## License

**After 10 May 2019:** AGPL 3.0+  
**Prior to 10 May 2019:** GPL 3.0+

Copyright (C) 2019 - 2020 Hugh Rundle

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
