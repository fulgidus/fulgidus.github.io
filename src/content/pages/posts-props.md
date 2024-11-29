---
title: Posts Props
---

Props in blog:

| Field       | Req  | Description                                                                                                     |
| :---------- | :--- | :-------------------------------------------------------------------------------------------------------------- |
| title       | Yes  | Title of the article.                                                                                           |
| description | No   | Description of the article.                                                                                     |
| duration    | No   | The estimated viewing time of the article.                                                                      |
| image       | No   | Hero image of the article.                                                                                      |
| imageAlt    | No   | Description of the image of the article.                                                                        |
| imageSize   | No   | Size of the image of the article (xs/sm/md/lg/xl).                                                              |
| pubDate     | No   | The publication date of the article.                                                                            |
| draft       | No   | The draft state of the article (visible only in dev env).                                                       |
| unlisted    | No   | The unlisted state of the article (never visible in lists, but routed and available both in dev and prod envs). |
| lang        | No   | Article language, default en-US.                                                                                |
| tags        | No   | A list of topics to whom the article is related to.                                                             |
| redirect    | No   | The redirected address of the article.                                                                          |
| video       | No   | The article contains a video.                                                                                   |

Props in pages:

| Field       | Req  | Description                 |
| :---------- | :--- | :-------------------------- |
| title       | Yes  | Title of the article.       |
| description | No  | Description of the article. |
| image       | No   | Hero image of the article.  |
| tags        | No   | A list of topics to whom the page is related to.                                                             |
        
