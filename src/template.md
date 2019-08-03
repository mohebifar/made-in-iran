# Made in Iran

> A list of neat projects made in Iran.

If you want to contribute, note that you should only update `data.json`.

## Contents
<% for (i in curated) { %> - [<%= curated[i].category %>](#<%= curated[i].anchor %>)
<% } %>

<% for (i in curated) { %>
<h3><a name="<%= curated[i].anchor %>"></a><%= curated[i].category %></h3>

:star2: | Name | Description | 🌍
--- | --- | --- | ---
<% for (j in curated[i].repos) { %>[![GitHub stars](https://img.shields.io/github/stars/<%= curated[i].repos[j].owner.login %>/<%= curated[i].repos[j].name %>.svg?label=)](https://github.com/<%= curated[i].repos[j].owner.login %>/<%= curated[i].repos[j].name %>/stargazers) | [@<%= curated[i].repos[j].owner.login %>](<%= curated[i].repos[j].owner.html_url %>)/[**<%= curated[i].repos[j].name %>**](<%= curated[i].repos[j].html_url %>) | <%= curated[i].repos[j].description %> | <% if(curated[i].repos[j].homepage) { %>[:arrow_upper_right:](<%= curated[i].repos[j].homepage %>)<% } %>
<% } %>
<% } %>
