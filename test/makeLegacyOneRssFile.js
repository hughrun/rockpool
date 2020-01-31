const fs = require('fs');

let now = Date.now() // now
let date1 = new Date(now - 3.6e+6) // an hour ago
let date2 = new Date(now - 8.64e+7) // 24 hours ago
let date3 = new Date(now - 2.592e+9) // 30 days ago
let date4 = new Date(now - 2.592e+10) // 300 days ago


let today = date1.toUTCString()
let yesterday = date2.toUTCString()
let lastMonth = date3.toUTCString()
let lastYear = date4.toUTCString()

let rssfile = `
<?xml version="1.0" encoding="UTF-8" ?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
  <channel>
    <title>
    Legacy Blog One
    </title>
    <description>
    A blog about nothing
    </description>
    <link>https://legacy.blog</link>
    <generator>Rockpool Testing</generator>
    <lastBuildDate> ${today} </lastBuildDate>
    <atom:link href="https://legacy.blog/rss" rel="self" type="application/rss+xml"/>
    <ttl>60</ttl>
      <item>
        <title>
        Today's Legacy One Blog Post
        </title>
        <dc:creator>
        Alice
        </dc:creator>
        <link>
        https://legacy.blog/4
        </link>
        <guid isPermaLink="true">https://legacy.blog/4</guid>
        <pubDate>${today}</pubDate>
        <description>
              <![CDATA[ A short description here. ]]>
        </description>
        <category>GLAM Blog Club</category>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        Yesterday, all my problems seemed to far away
        </title>
        <dc:creator>
        Alice
        </dc:creator>
        <link>
        https://legacy.blog/3
        </link>
        <guid>ABCD-1234</guid>
        <pubDate>${yesterday}</pubDate>
        <description>
              <![CDATA[ Short description here ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        I love to count!
        </title>
        <dc:creator>
        Bob
        </dc:creator>
        <link>
        https://legacy.blog/2
        </link>
        <guid isPermaLink="true">https://legacy.blog/2</guid>
        <pubDate>${lastMonth}</pubDate>
        <description>
              <![CDATA[ Test descriptions are boring ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        Star wars is massively over-rated
        </title>
        <dc:creator>
        Alice
        </dc:creator>
        <link>
        https://legacy.blog/1
        </link>
        <guid isPermaLink="true">https://legacy.blog/1</guid>
        <pubDate>${lastYear}</pubDate>
        <description>
              <![CDATA[ A long time ago in a galaxy close by ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
  </channel>
</rss>
`
fs.writeFileSync('test/sites/legacyOneRss.xml', rssfile)