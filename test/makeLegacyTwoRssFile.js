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
    It's a Jazz blog!
    </title>
    <description>
    A blog about Jazz
    </description>
    <link>https://another.legacy.blog</link>
    <generator>Rockpool Testing</generator>
    <lastBuildDate> ${today} </lastBuildDate>
    <atom:link href="https://another.legacy.blog/rss" rel="self" type="application/rss+xml"/>
    <ttl>60</ttl>
      <item>
        <title>
        I don't actually know much about Jazz
        </title>
        <dc:creator>
        Dizzy
        </dc:creator>
        <link>
        https://another.legacy.blog/4
        </link>
        <guid isPermaLink="true">https://another.legacy.blog/4</guid>
        <pubDate>${today}</pubDate>
        <description>
              <![CDATA[ Wherein I confess my ignorance ]]>
        </description>
        <category>Jazz</category>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        Trumpets!!!
        </title>
        <dc:creator>
        Ella
        </dc:creator>
        <link>
        https://another.legacy.blog/3
        </link>
        <guid isPermaLink="true">https://another.legacy.blog/3</guid>
        <pubDate>${yesterday}</pubDate>
        <description>
              <![CDATA[ The horns, the horns ]]>
        </description>
        <category>Jazz</category>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        New New Orleans
        </title>
        <dc:creator>
        Dizzy
        </dc:creator>
        <link>
        https://another.legacy.blog/2
        </link>
        <guid isPermaLink="true">https://another.legacy.blog/2</guid>
        <pubDate>${lastMonth}</pubDate>
        <description>
              <![CDATA[ Brushin' the drums ]]>
        </description>
        <category>Jazz</category>
        <category>notrockpool</category>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
      <item>
        <title>
        White people ruin everything
        </title>
        <dc:creator>
        Dizzy
        </dc:creator>
        <link>
        https://another.legacy.blog/1
        </link>
        <guid isPermaLink="true">https://another.legacy.blog/1</guid>
        <pubDate>${lastYear}</pubDate>
        <description>
              <![CDATA[ Ugh ]]>
        </description>
        <category>Jazz</category>
        <content:encoded>
        <![CDATA[ <p> Here is the content of the post. </p>]]>
        </content:encoded>
      </item>
  </channel>
</rss>
`
fs.writeFileSync('test/sites/legacyTwoRss.xml', rssfile)