// Sorry 😅 I didn't want to use babel
'use strict';

const fs = require('fs');
const GitHubApi = require('github');
const ejs = require('ejs');

const DEBUG = process.env.NODE_ENV === 'development';
const AUTH_TOKEN = process.env.AUTH_TOKEN;

const templateFilePath = `${__dirname}/template.md`;
const outputFilePath = `${__dirname}/../README.md`;

let data = require('./../data.json');

const github = new GitHubApi({
  debug: DEBUG,
  followRedirects: false,
  timeout: 5000,
  Promise: Promise
});

github.authenticate({
  type: "oauth",
  token: AUTH_TOKEN
});

const repositories = data.curated
  .map(item => {
    const fetchReposPromise = item.repos
      .map(repoPath => {
        const separatedRepoPath = repoPath.split('/');
        return github.repos.get({
          user: separatedRepoPath[0],
          repo: separatedRepoPath[1]
        });
      });

    return Promise
      .all(fetchReposPromise)
      .then(result => {
        return {
          language: item.language,
          repos: result.sort((a, b) => a.stargazers_count < b.stargazers_count ? 1 : -1)
        };
      });
  });

Promise
  .all(repositories)
  .then(curated => {
    data = Object.assign(data, { curated });
    const template = fs.readFileSync(templateFilePath, 'utf8');
    const markdown = ejs.render(template, data);

    fs.writeFileSync(outputFilePath, markdown);
  })
  .catch(error => {
    console.error(error);
  });
