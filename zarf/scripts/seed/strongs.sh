#!/bin/bash
# strongs
pushd ../../../data/strongs.json.gz/

/bin/ls -1 | grep -E '^(g|h)' |  xargs -I {} -P 10 sh -c  'nak event -c $(cat "$1" | xxd -p -c 0) -k 37770 -d kjvonly/bible/strongs/"${1%%.*}" --tag "m=json.gz.hex" ws://localhost:3334' sh {} 

## blossom
nak blossom upload --server http://localhost:3335  all.json.gz
/bin/ls -1 all.json.gz | xargs -I {} -P 12 sh -c 'nak event --tag x=$(sha256sum "$1" | awk "{print \$1}")  -c "$1" -k 37778 -d kjvonly/bible/strongs/"${1%%.*}" --tag "m=json.gz" --tag "url=http://localhost:3335/"$(sha256sum "$1" | awk "{print \$1}").gz ws://localhost:3334' sh {}

popd

