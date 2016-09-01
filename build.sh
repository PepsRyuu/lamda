#!/usr/bin/env bash

# If error code, stop script
set -e
npm config set strict-ssl false
PHANTOMJS_CDNURL=http://cnpmjs.org/downloads npm install

node build-tasks.js test-lamda

LICENSE=`cat LICENSE`
rm -rf lamda/dist
mkdir lamda/dist
node node_modules/uglify-js/bin/uglifyjs lamda/lamda.js \
    -o lamda/dist/lamda.min.js \
    --mangle --compress --verbose \
    --preamble "/*${LICENSE}*/" 

# Prepare the Optimizer Test Environment
cd lamda-optimizer
npm install
npm install ../lamda 
rm -rf target
mkdir -p target/test
cp test/index.html target/test/
cp test/tests.js target/test/
cd ..

# Test the Optimizer
node build-tasks.js test-optimizer

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
