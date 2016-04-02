#!/usr/bin/env bash

# If error code, stop script
set -e
npm config set strict-ssl false
npm install

node build-tasks.js test

if [ "$#" -ne 0 ] && [ $1 = "--release" ]
then
    # Increment package json
    node build-tasks.js update-version $2
    VERSION=`node build-tasks.js get-version`

    # Merge to master and publish
    git add lamda/package.json
    git add lamda-optimizer/package.json
    git commit -am "Released ${VERSION}"
    git tag "${VERSION}" --force
    git push origin HEAD:master --tags

    # Release
    cd lamda
    npm publish
    cd ../lamda-optimizer
    npm publish
fi
