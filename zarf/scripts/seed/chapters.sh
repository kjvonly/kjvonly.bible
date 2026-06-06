#!/bin/bash

# chapters
pushd ../../../data/json.gz/
/bin/ls -1 | grep '^[[:digit:]]' | xargs -I {} -P 10 sh -c  'nak event -c $(cat "$1" | xxd -p -c 0) -k 37770 -d kjvonly/bible/kjvs/"${1%%.*}" --tag "m=json.gz.hex" ws://localhost:3334' sh {}

## blossom
/bin/ls -1 | grep '^[[:alpha:]]' | grep 'gz' | xargs -I {} -P 12 sh -c  'nak blossom upload --server http://localhost:3335 $1' sh {}
/bin/ls -1  | grep  '^[[:alpha:]]' | xargs -I {} -P 12 sh -c 'nak event --tag x=$(sha256sum "$1" | awk "{print \$1}")  -c "$1" -k 37778 -d kjvonly/bible/kjvs/"${1%%.*}" --tag "type=chapters" --tag "m=json.gz" --tag "url=http://localhost:3335/"$(sha256sum "$1" | awk "{print \$1}").gz ws://localhost:3334' sh {} 

popd

echo kjvs.json.gz | xargs -I {}  sh -c  'nak blossom upload --server http://localhost:3335 $1' sh {}
echo kjvs.json.gz | xargs -I {}  sh -c 'nak event --tag x=$(sha256sum "$1" | awk "{print \$1}")  -c "KJV Bible with Strongs Concordance" -k 37778 -d kjvonly/"${1%%.*}" --tag "type=chapters" --tag "m=json.gz" --tag "url=http://localhost:3335/"$(sha256sum "$1" | awk "{print \$1}").gz ws://localhost:3334' sh {} 


echo kjv.json.gz | xargs -I {}  sh -c  'nak blossom upload --server http://localhost:3335 $1' sh {}
echo kjv.json.gz | xargs -I {}  sh -c 'nak event --tag x=$(sha256sum "$1" | awk "{print \$1}")  -c "KJV Bible" -k 37778 -d kjvonly/"${1%%.*}" --tag "type=chapters" --tag "m=json.gz" --tag "url=http://localhost:3335/"$(sha256sum "$1" | awk "{print \$1}").gz ws://localhost:3334' sh {}


