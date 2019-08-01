export GIT_AUTHOR_EMAIL="deploy@travis-ci.org"
export GIT_AUTHOR_NAME="Deployment Bot (from Travis CI)"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
git status
git add .
git checkout master
git commit -m "Automatic update of README.md"
git push https://$GITHUB_AUTH_TOKEN@github.com/mohebifar/made-in-iran master
