yarn run build
git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis CI"
git status
git add .
git status
git branch
git checkout master
git branch
git commit -m "Automatic update of README.md"
git status
git branch
echo "Test value: $TEST"
git push https://$GITHUB_AUTH_TOKEN@github.com/mohebifar/made-in-iran master