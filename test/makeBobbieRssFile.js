const fs = require('fs');

let now = Date.now() // now
let date1 = new Date(now - 3.5e+6) 
let date2 = new Date(now - 2.592e+10) // 300 days ago


let today = date1.toUTCString()
let lastYear = date2.toUTCString()

let rssfile = `<?xml version="1.0" encoding="UTF-8" ?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
  <channel>
    <title>
    Bobbie's Dog Blog
    </title>
    <description>
    A blog about dogs
    </description>
    <link>https://bobbie.blog</link>
    <generator>Rockpool Testing</generator>
    <lastBuildDate> ${today} </lastBuildDate>
    <atom:link href="https://bobbie.blog/rss" rel="self" type="application/rss+xml"/>
    <ttl>60</ttl>
      <item>
        <title>
        This post has a very long title because my name is Bob and I just don't know how to keep my titles short, it is a real problem that I am trying to overcome
        </title>
        <dc:creator>
        Bob
        </dc:creator>
        <link>
        https://bobbie.blog/2
        </link>
        <guid isPermaLink="true">https://bobbie.blog/2</guid>
        <pubDate>${today}</pubDate>
        <description>
              <![CDATA[ Another post about dogs, duh ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        This post is old
        </title>
        <dc:creator>
        Bob
        </dc:creator>
        <link>
        https://bobbie.blog/1
        </link>
        <guid isPermaLink="true">https://bobbie.blog/1</guid>
        <pubDate>${lastYear}</pubDate>
        <description>
              <![CDATA[ Poochies! ]]>
        </description>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
  </channel>
</rss>
`
fs.writeFileSync('test/sites/bobbieRss.xml', rssfile)