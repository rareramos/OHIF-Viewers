:

yarn install && yarn build:package && cp README.webchart.md platform/viewer/dist/README.md && scp platform/viewer/dist/* zeus:wcrc/master/webchart/system/public/ohif
