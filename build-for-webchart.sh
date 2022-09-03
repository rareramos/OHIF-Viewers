:

yarn install && 
yarn build:package && 
cp README.webchart.md platform/viewer/dist/README.md && 
(git status ; git branch -vv ; echo "Release notes:" ; git log --pretty=format:"%h%x09%an%x09%ad%x09%s" | head -n 100) >> platform/viewer/dist/README.md &&
scp platform/viewer/dist/* zeus:wcrc/master/webchart/system/public/ohif
